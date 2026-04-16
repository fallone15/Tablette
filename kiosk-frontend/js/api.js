/* ─── api.js — Couche d'appel HTTP vers le backend kiosk ─── */

const API_BASE = 'http://localhost:3001/api/kiosk';

const Api = {

  async post(endpoint, data) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw { status: res.status, ...json };
    return json;
  },

  async get(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`);
    const json = await res.json();
    if (!res.ok) throw { status: res.status, ...json };
    return json;
  },

  /** Vérifier si une carte RFID existe */
  verifyRfid(carte_rfid) {
    return this.post('/verify-rfid', { carte_rfid });
  },

  /** Identifier le patient (RFID + PIN) */
  identify(carte_rfid, code_pin) {
    return this.post('/identify', { carte_rfid, code_pin });
  },

  /** Récupérer la liste des services */
  getServices() {
    return this.get('/services');
  },

  /** Enregistrer la consultation (checkin) */
  checkin(data) {
    return this.post('/checkin', data);
  },
};
