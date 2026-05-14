/* ─── api.js — Couche d'appel HTTP vers le backend kiosk ─── */

const API_BASE = 'http://localhost:3001/api/kiosk';
const API_PAYMENT = 'http://localhost:3001/api/payment';

const Api = {

  async post(endpoint, data, baseUrl = API_BASE) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
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

  /** Identifier le patient (RFID + PIN ou RFID seul si auto_scan) */
  identify(carte_rfid, code_pin, auto_scan = false) {
    return this.post('/identify', { carte_rfid, code_pin, auto_scan });
  },

  /** Récupérer la liste des services */
  getServices() {
    return this.get('/services');
  },

  /** Récupérer les RDV du jour pour un patient */
  getAppointments(patientId) {
    return this.get(`/appointments/${patientId}`);
  },

  /** Récupérer le catalogue des médecins et leurs disponibilités */
  getCatalog() {
    return this.get('/catalog');
  },

  /** Vérifier la disponibilité des médecins pour un service */
  checkDoctorAvailability(id_service) {
    return this.get(`/check-doctor-availability/${id_service}`);
  },

  /** Enregistrer la consultation (checkin patient ou visiteur payé) */
  checkin(data) {
    return this.post('/checkin', data);
  },

  /** Générer un ticket de caisse (pour payer) */
  cashierTicket(data) {
    return this.post('/cashier-ticket', data);
  },

  // ─── Paiement Stripe ───────────────────────────────────────────────────
  /** Créer une PaymentIntent Stripe */
  createPaymentIntent(data) {
    return this.post('/create-payment-intent', data, API_PAYMENT);
  },

  /** Confirmer le paiement Stripe */
  confirmPayment(data) {
    return this.post('/confirm', data, API_PAYMENT);
  },
};
