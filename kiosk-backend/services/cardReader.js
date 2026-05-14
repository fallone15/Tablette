/**
 * cardReader.js — Bridge Node.js ↔ PowerShell PC/SC
 *
 * Architecture :
 *   cardReader.ps1 (PowerShell/WinSCard) → stdout JSON → Node.js → WebSocket → Frontend
 *
 * Compatible : Lecteur Gemalto (Thales) + Cartes ACOS (ACS) à contact ISO 7816
 * Aucune compilation native requise (WinSCard.dll est natif Windows).
 */

const { spawn }  = require('child_process');
const path       = require('path');
const { WebSocketServer } = require('ws');

// ─── Clients WebSocket connectés ──────────────────────────────────────────────
let wsClients = new Set();

/**
 * Démarre le serveur WebSocket partagé avec le serveur HTTP Express.
 * Le frontend se connecte sur ws://localhost:PORT/ws/card
 */
function startCardWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/card' });

  wss.on('connection', (ws) => {
    wsClients.add(ws);
    console.log(`🔌 [CardReader] Client WS connecté (${wsClients.size} actif(s))`);

    ws.on('close', () => {
      wsClients.delete(ws);
      console.log(`🔌 [CardReader] Client WS déconnecté (${wsClients.size} restant(s))`);
    });
    ws.on('error', () => wsClients.delete(ws));

    ws.send(JSON.stringify({ type: 'ready', message: 'Lecteur carte prêt' }));
  });

  console.log('🃏 [CardReader] WebSocket sur /ws/card');
  return wss;
}

/**
 * Diffuse un objet JSON à tous les clients WebSocket connectés.
 */
function broadcast(payload) {
  const msg = JSON.stringify(payload);
  for (const client of wsClients) {
    try {
      if (client.readyState === 1 /* OPEN */) client.send(msg);
    } catch (e) {
      wsClients.delete(client);
    }
  }
}

/**
 * Démarre le processus PowerShell qui surveille le lecteur PC/SC.
 * Relance automatiquement en cas d'arrêt.
 */
function startCardReader() {
  const scriptPath = path.join(__dirname, 'cardReader.py');

  console.log('🎴 [CardReader] Démarrage du lecteur via Python...');

  const ps = spawn('python', [
    '-u', // Mode unbuffered pour avoir les logs instantanément
    scriptPath,
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let lineBuffer = '';

  ps.stdout.on('data', (chunk) => {
    lineBuffer += chunk.toString('utf8');
    const lines = lineBuffer.split('\n');
    lineBuffer  = lines.pop(); // garde le fragment incomplet

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let msg;
      try {
        msg = JSON.parse(trimmed);
      } catch {
        // Ligne non-JSON (debug PowerShell, etc.)
        console.log('[CardReader PS]', trimmed);
        continue;
      }

      switch (msg.event) {
        case 'reader_detected':
          console.log(`🎴 [CardReader] Lecteur : "${msg.reader}"`);
          broadcast({
            type: 'reader_detected',
            reader: msg.reader,
          });
          break;

        case 'card_inserted':
          console.log(`✅ [CardReader] Carte détectée | ID: ${msg.cardId} | ATR: ${msg.atr} | méthode: ${msg.method}`);
          broadcast({
            type:     'card_inserted',
            cardId:   msg.cardId,   // Ex: "PAT9660" ou "3B6F00FF52..."
            atr:      msg.atr,
            method:   msg.method,
            reader:   msg.reader,
          });
          break;

        case 'card_removed':
          console.log(`⏏️  [CardReader] Carte retirée`);
          broadcast({ type: 'card_removed' });
          break;

        case 'warning':
          console.warn(`⚠️  [CardReader] ${msg.message}`);
          break;

        case 'error':
          console.error(`❌ [CardReader] ${msg.message}`);
          broadcast({ type: 'reader_error', message: msg.message });
          break;

        default:
          console.log('[CardReader]', msg);
      }
    }
  });

  ps.stderr.on('data', (chunk) => {
    const text = chunk.toString('utf8').trim();
    if (text) console.error('[CardReader ERR]', text);
  });

  ps.on('close', (code) => {
    console.warn(`⚠️  [CardReader] Script terminé (code ${code}). Relance dans 5s...`);
    broadcast({ type: 'reader_disconnected' });
    setTimeout(startCardReader, 5000);
  });

  ps.on('error', (err) => {
    console.error('❌ [CardReader] Impossible de lancer PowerShell:', err.message);
    console.error('   → Vérifier que PowerShell est accessible dans le PATH.');
    setTimeout(startCardReader, 10000);
  });
}

module.exports = { startCardWebSocket, startCardReader };
