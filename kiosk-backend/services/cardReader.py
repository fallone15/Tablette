import sys
import json
import time

try:
    from smartcard.CardMonitoring import CardMonitor, CardObserver
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyscard"])
    from smartcard.CardMonitoring import CardMonitor, CardObserver

class ACOSReaderObserver(CardObserver):
    def update(self, observable, actions):
        (addedcards, removedcards) = actions
        
        for card in addedcards:
            try:
                # La carte est insérée, on se connecte
                card.connection = card.createConnection()
                card.connection.connect()
                
                print("\n==================================================", flush=True)
                print(">> CARTE DETECTEE", flush=True)
                
                # Selectionner fichier patient A0A0
                SELECT_FILE = [0x80, 0xA4, 0x00, 0x00, 0x02, 0xA0, 0xA0]
                response, sw1, sw2 = card.connection.transmit(SELECT_FILE)
                
                if sw1 == 0x90 or sw1 == 0x91:
                    print(f">> Fichier A0A0 selectionne avec succes ({hex(sw1)} {hex(sw2)})", flush=True)
                    
                    # Lire les 32 octets du fichier
                    READ_CMD = [0x80, 0xB2, 0x00, 0x00, 0x20]
                    response, sw1, sw2 = card.connection.transmit(READ_CMD)
                    
                    if sw1 == 0x90:
                        # Extraire le texte lu
                        contenu = bytes(response).decode('utf-8', errors='ignore').strip('\x00')
                        print(f">> DONNEES BRUTES LUES : '{contenu}'", flush=True)
                        
                        # Parsing (comme dans votre script d'origine)
                        if '|' in contenu:
                            parties = contenu.split('|')
                            cardId = parties[0].strip()
                        else:
                            cardId = contenu[:8].strip()
                            
                        print(f">> NUMERO RFID EXTRAIT : '{cardId}'", flush=True)
                        print("==================================================", flush=True)
                        
                        # Envoi au backend Node.js au format JSON
                        msg = {
                            "event": "card_inserted",
                            "cardId": cardId,
                            "method": "acos3_python"
                        }
                        print(json.dumps(msg), flush=True)
                        
                    else:
                        print(f">> Echec de la lecture (SW1={hex(sw1)} SW2={hex(sw2)})", flush=True)
                else:
                    print(f">> Echec selection A0A0 (SW1={hex(sw1)} SW2={hex(sw2)})", flush=True)
                    
                    # Tentative lecture UID matériel classique (si ce n'est pas une ACOS3 programmée)
                    GET_UID = [0xFF, 0xCA, 0x00, 0x00, 0x00]
                    response, sw1, sw2 = card.connection.transmit(GET_UID)
                    if sw1 == 0x90:
                        uid_hex = "".join([f"{b:02X}" for b in response])
                        print(f">> UID Matériel lu : '{uid_hex}'", flush=True)
                        msg = {
                            "event": "card_inserted",
                            "cardId": uid_hex,
                            "method": "hardware_uid"
                        }
                        print(json.dumps(msg), flush=True)
                        
            except Exception as e:
                print(f">> ERREUR de lecture: {str(e)}", flush=True)

        for card in removedcards:
            print(">> CARTE RETIREE", flush=True)
            print(json.dumps({"event": "card_removed"}), flush=True)

if __name__ == '__main__':
    print("Demarrage du moniteur de carte Python...", flush=True)
    cardmonitor = CardMonitor()
    cardobserver = ACOSReaderObserver()
    cardmonitor.addObserver(cardobserver)
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        cardmonitor.deleteObserver(cardobserver)
