# ═══════════════════════════════════════════════════════════════════════════════
# cardReader.ps1 — Lecteur carte à puce à contact ISO 7816
# Compatible : Gemalto (Thales) reader + ACOS (ACS) cards
# Utilise WinSCard.dll (PC/SC natif Windows) via P/Invoke
# Sortie : JSON sur stdout, lu par Node.js (child_process)
# ═══════════════════════════════════════════════════════════════════════════════

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ─── Déclaration P/Invoke WinSCard ───────────────────────────────────────────
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class WinSCard {

    [DllImport("winscard.dll", CharSet=CharSet.Unicode)]
    public static extern int SCardEstablishContext(
        uint dwScope, IntPtr pvReserved1, IntPtr pvReserved2,
        out IntPtr phContext);

    [DllImport("winscard.dll", CharSet=CharSet.Unicode)]
    public static extern int SCardListReadersW(
        IntPtr hContext, string mszGroups,
        char[] mszReaders, ref uint pcchReaders);

    [DllImport("winscard.dll", CharSet=CharSet.Unicode)]
    public static extern int SCardConnect(
        IntPtr hContext, string szReader,
        uint dwShareMode, uint dwPreferredProtocols,
        out IntPtr phCard, out uint pdwActiveProtocol);

    [DllImport("winscard.dll")]
    public static extern int SCardDisconnect(IntPtr hCard, uint dwDisposition);

    [DllImport("winscard.dll")]
    public static extern int SCardReleaseContext(IntPtr hContext);

    [DllImport("winscard.dll", CharSet=CharSet.Unicode)]
    public static extern int SCardGetStatusChange(
        IntPtr hContext, uint dwTimeout,
        [In, Out] SCARD_READERSTATE[] rgReaderStates, uint cReaders);

    [DllImport("winscard.dll")]
    public static extern int SCardTransmit(
        IntPtr hCard,
        ref SCARD_IO_REQUEST pioSendPci,
        byte[] pbSendBuffer, uint cbSendLength,
        IntPtr pioRecvPci,
        byte[] pbRecvBuffer, ref uint pcbRecvLength);

    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    public struct SCARD_READERSTATE {
        [MarshalAs(UnmanagedType.LPWStr)]
        public string szReader;
        public IntPtr pvUserData;
        public uint dwCurrentState;
        public uint dwEventState;
        public uint cbAtr;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst=36)]
        public byte[] rgbAtr;

        public SCARD_READERSTATE(string reader) {
            szReader        = reader;
            pvUserData      = IntPtr.Zero;
            dwCurrentState  = 0;
            dwEventState    = 0;
            cbAtr           = 0;
            rgbAtr          = new byte[36];
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct SCARD_IO_REQUEST {
        public uint dwProtocol;
        public uint cbPciLength;
    }

    public const uint SCARD_SCOPE_USER        = 0;
    public const uint SCARD_SHARE_SHARED      = 2;
    public const uint SCARD_SHARE_EXCLUSIVE   = 1;
    public const uint SCARD_PROTOCOL_T0       = 1;
    public const uint SCARD_PROTOCOL_T1       = 2;
    public const uint SCARD_STATE_UNAWARE     = 0;
    public const uint SCARD_STATE_CHANGED     = 2;
    public const uint SCARD_STATE_PRESENT     = 32;   // 0x0020
    public const uint SCARD_STATE_EMPTY       = 16;   // 0x0010
    public const uint SCARD_LEAVE_CARD        = 0;
    public const int  SCARD_S_SUCCESS         = 0;
    public const int  SCARD_E_TIMEOUT         = unchecked((int)0x8010000A);
    public const int  SCARD_E_NO_READERS      = unchecked((int)0x8010002E);
    public const int  SCARD_E_SERVICE_STOPPED = unchecked((int)0x8010001E);
}
"@ -ErrorAction SilentlyContinue

function Write-Json($obj) {
    $json = $obj | ConvertTo-Json -Compress
    [Console]::WriteLine($json)
    [Console]::Out.Flush()
}

function Bytes-ToHex($bytes, $len) {
    ($bytes[0..($len - 1)] | ForEach-Object { '{0:X2}' -f $_ }) -join ''
}

# ─── Établir contexte PC/SC ───────────────────────────────────────────────────
$context = [IntPtr]::Zero
$rc = [WinSCard]::SCardEstablishContext([WinSCard]::SCARD_SCOPE_USER, [IntPtr]::Zero, [IntPtr]::Zero, [ref]$context)
if ($rc -ne 0) {
    Write-Json @{ event='error'; message="Impossible d'initialiser PC/SC (code $rc). Le service 'Carte à puce' est-il démarré ?"; code=$rc }
    exit 1
}

# ─── Lister les lecteurs ──────────────────────────────────────────────────────
$size = [uint32]0
[WinSCard]::SCardListReadersW($context, $null, $null, [ref]$size) | Out-Null

if ($size -le 1) {
    Write-Json @{ event='error'; message='Aucun lecteur de carte détecté. Branchez le lecteur Gemalto et relancez.' }
    [WinSCard]::SCardReleaseContext($context) | Out-Null
    exit 1
}

$buf = New-Object char[] $size
[WinSCard]::SCardListReadersW($context, $null, $buf, [ref]$size) | Out-Null
$allReaders = (New-Object string($buf, 0, [int]$size)).Split([char]0) | Where-Object { $_ -ne '' }
$readerName = $allReaders[0]

Write-Json @{ event='reader_detected'; reader=$readerName; allReaders=$allReaders }

# ─── Boucle de surveillance PC/SC ────────────────────────────────────────────
$states = @( [WinSCard+SCARD_READERSTATE]::new($readerName) )
$states[0].dwCurrentState = [WinSCard]::SCARD_STATE_UNAWARE
$cardPresent = $false

while ($true) {
    $rc = [WinSCard]::SCardGetStatusChange($context, 500, $states, $states.Count)

    # Timeout → pas de changement, on reboucle
    if ($rc -eq [WinSCard]::SCARD_E_TIMEOUT) {
        continue
    }

    # Lecteur débranché ou service arrêté
    if ($rc -ne 0) {
        Write-Json @{ event='error'; message="Erreur PC/SC (code $rc). Lecteur débranché ?"; code=$rc }
        Start-Sleep -Seconds 2
        continue
    }

    $evtState = $states[0].dwEventState
    $isPresent = ($evtState -band [WinSCard]::SCARD_STATE_PRESENT) -ne 0

    # ── Carte insérée ─────────────────────────────────────────────────────────
    if ($isPresent -and -not $cardPresent) {
        $cardPresent = $true

        # ATR (Answer To Reset) — identifiant unique du type de carte
        $atrLen = [int]$states[0].cbAtr
        $atrHex = if ($atrLen -gt 0) { Bytes-ToHex $states[0].rgbAtr $atrLen } else { '' }

        # L'ID carte par défaut = ATR hex (unique par type ACOS, pas par carte individuelle)
        $cardId  = $atrHex
        $method  = 'atr'

        # Connexion à la carte pour lire les données
        $hCard   = [IntPtr]::Zero
        $proto   = [uint32]0
        $connRc  = [WinSCard]::SCardConnect(
            $context, $readerName,
            [WinSCard]::SCARD_SHARE_SHARED,
            ([WinSCard]::SCARD_PROTOCOL_T0 -bor [WinSCard]::SCARD_PROTOCOL_T1),
            [ref]$hCard, [ref]$proto)

        if ($connRc -eq 0) {
            $sendPci = New-Object WinSCard+SCARD_IO_REQUEST
            $sendPci.dwProtocol  = $proto
            $sendPci.cbPciLength = 8

            # ── Tentative 1 : Lecture du fichier patient ACOS3-24 (Fichier A0A0) ──
            if ($method -eq 'atr') {
                Write-Json @{ event='debug'; message="[Tentative 1] Envoi SELECT A0A0 (80 A4 00 00 02 A0 A0)" }
                $apduSelect = [byte[]](0x80, 0xA4, 0x00, 0x00, 0x02, 0xA0, 0xA0)
                $recvBuf2   = New-Object byte[] 64
                $recvLen2   = [uint32]64
                $sel = [WinSCard]::SCardTransmit($hCard, [ref]$sendPci, $apduSelect, $apduSelect.Length, [IntPtr]::Zero, $recvBuf2, [ref]$recvLen2)

                $sw1_sel = '{0:X2}' -f $recvBuf2[$recvLen2-2]
                $sw2_sel = '{0:X2}' -f $recvBuf2[$recvLen2-1]
                Write-Json @{ event='debug'; message="[Tentative 1] SELECT A0A0 -> SCardTransmit=$sel, SW1=$sw1_sel, SW2=$sw2_sel" }

                if ($sel -eq 0 -and $recvLen2 -ge 2 -and ($recvBuf2[$recvLen2-2] -eq 0x90 -or $recvBuf2[$recvLen2-2] -eq 0x91)) {
                    Write-Json @{ event='debug'; message="[Tentative 1] SELECT OK. Envoi READ RECORD 32 bytes (80 B2 00 00 20)" }
                    $apduRead = [byte[]](0x80, 0xB2, 0x00, 0x00, 0x20)
                    $recvBuf3 = New-Object byte[] 64
                    $recvLen3 = [uint32]64
                    $rd = [WinSCard]::SCardTransmit($hCard, [ref]$sendPci, $apduRead, $apduRead.Length, [IntPtr]::Zero, $recvBuf3, [ref]$recvLen3)

                    $sw1_rd = '{0:X2}' -f $recvBuf3[$recvLen3-2]
                    $sw2_rd = '{0:X2}' -f $recvBuf3[$recvLen3-1]
                    Write-Json @{ event='debug'; message="[Tentative 1] READ RECORD -> SCardTransmit=$rd, SW1=$sw1_rd, SW2=$sw2_rd" }

                    if ($rd -eq 0 -and $recvLen3 -gt 2 -and $recvBuf3[$recvLen3-2] -eq 0x90) {
                        $dataLen  = $recvLen3 - 2
                        $dataBytes= $recvBuf3[0..($dataLen - 1)]
                        $hexData  = Bytes-ToHex $dataBytes $dataLen
                        Write-Json @{ event='debug'; message="[Tentative 1] DATA Hex = $hexData" }

                        $asText   = [System.Text.Encoding]::UTF8.GetString($dataBytes).Replace("`0", "").Trim()
                        Write-Json @{ event='debug'; message="[Tentative 1] DATA Text = '$asText'" }

                        if ($asText.Contains('|')) {
                            $parts = $asText.Split('|')
                            if ($parts.Length -ge 1) {
                                $cardId = $parts[0].Trim()
                                $method = 'acos_pipe'
                                Write-Json @{ event='debug'; message="[Tentative 1] Pipe trouvé, extraction RFID = '$cardId'" }
                            }
                        } else {
                            if ($asText.Length -ge 8) {
                                $cardId = $asText.Substring(0, 8).Trim()
                                $method = 'acos_fixed'
                                Write-Json @{ event='debug'; message="[Tentative 1] Pas de pipe, extraction 8 chars = '$cardId'" }
                            } elseif ($asText.Length -gt 0) {
                                $cardId = $asText.Trim()
                                $method = 'acos_raw'
                                Write-Json @{ event='debug'; message="[Tentative 1] Extraction raw = '$cardId'" }
                            }
                        }
                    } else {
                        Write-Json @{ event='debug'; message="[Tentative 1] READ RECORD échoué. SW attendu 90 xx." }
                    }
                } else {
                    Write-Json @{ event='debug'; message="[Tentative 1] SELECT A0A0 échoué. SW attendu 90 xx ou 91 xx." }
                }
            }

            # ── Tentative 2 : GET RESPONSE UID (Fallback pour les autres cartes) ──
            if ($method -eq 'atr') {
                $apduGetUid = [byte[]](0xFF, 0xCA, 0x00, 0x00, 0x00)
                $recvBuf    = New-Object byte[] 64
                $recvLen    = [uint32]64
                $txRc = [WinSCard]::SCardTransmit($hCard, [ref]$sendPci, $apduGetUid, $apduGetUid.Length, [IntPtr]::Zero, $recvBuf, [ref]$recvLen)

                if ($txRc -eq 0 -and $recvLen -ge 2) {
                    $sw1 = $recvBuf[$recvLen - 2]
                    $sw2 = $recvBuf[$recvLen - 1]
                    if ($sw1 -eq 0x90 -and $sw2 -eq 0x00 -and $recvLen -gt 2) {
                        $cardId = Bytes-ToHex $recvBuf ($recvLen - 2)
                        $method = 'get_uid_apdu'
                    }
                }
            }

            [WinSCard]::SCardDisconnect($hCard, [WinSCard]::SCARD_LEAVE_CARD) | Out-Null
        } else {
            Write-Json @{ event='warning'; message="Impossible de se connecter à la carte (code $connRc)" }
        }

        Write-Json @{
            event    = 'card_inserted'
            cardId   = $cardId
            atr      = $atrHex
            method   = $method
            reader   = $readerName
        }
    }

    # ── Carte retirée ─────────────────────────────────────────────────────────
    if (-not $isPresent -and $cardPresent) {
        $cardPresent = $false
        Write-Json @{ event='card_removed'; reader=$readerName }
    }

    # Mettre à jour l'état courant pour la prochaine attente
    $states[0].dwCurrentState = $evtState -band (-bnot [WinSCard]::SCARD_STATE_CHANGED)
}
