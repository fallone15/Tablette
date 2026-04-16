/* ─── app.js — Routeur principal et état global ─── */

const App = {
  // État global partagé entre tous les écrans
  state: {
    rfid: null,           // Numéro de carte scanné
    patient: null,        // Données patient (si identifié)
    estVisiteur: false,   // true = nouveau patient sans carte
    motif: null,          // Motif de consultation (visiteur)
    serviceChoisi: null,  // Service sélectionné
    servicePreselectionne: null, // Service pré-sélectionné via le motif
    ticket: null,         // Ticket retourné par l'API
    rdvChoisi: null,      // RDV web selectionné
  },

  // Écran courant
  currentScreen: 'welcome',
  _history: [], // Historique de navigation

  // Timer pour le countdown RFID
  _rfidTimer: null,
  // Timer countdown ticket
  _ticketTimer: null,

  init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
    this.goTo('welcome');
    // Écouter la touche Entrée sur le champ RFID
    document.getElementById('rfid-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') RfidScreen.submit();
    });
  },

  updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('clock').textContent = `${h}:${m}:${s}`;

    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date-display').textContent =
      now.toLocaleDateString('fr-FR', opts);
  },

  // Navigation entre écrans
  goTo(screenName, isBack = false) {
    if (!isBack && this.currentScreen !== 'welcome' && this.currentScreen !== screenName && this.currentScreen !== 'ticket' && screenName !== 'welcome') {
      this._history.push(this.currentScreen);
    }

    // Masquer l'écran actuel
    const current = document.querySelector('.screen.active');
    if (current) current.classList.remove('active');

    // Afficher le nouvel écran
    const next = document.getElementById(`screen-${screenName}`);
    if (!next) { console.error('Écran introuvable:', screenName); return; }
    next.classList.add('active');
    this.currentScreen = screenName;

    // Nettoyages / actions selon l'écran
    this._clearTimers();

    if (screenName === 'welcome') {
      this.resetState();
      this._history = [];
    }
    if (screenName === 'rfid-scan') {
      RfidScreen.onEnter();
    }
    if (screenName === 'guest-flow') {
      GuestScreen.onEnter();
    }
    if (screenName === 'service-select') {
      ServicesScreen.onEnter();
    }
    if (screenName === 'appointments') {
      AppointmentsScreen.onEnter();
    }
    if (screenName === 'payment') {
      PaymentScreen.onEnter();
    }
    if (screenName === 'ticket') {
      TicketScreen.onEnter();
    }

    this._updateCancelBtn();
  },

  back() {
    const prev = this._history.pop();
    if (prev) {
      this.goTo(prev, true);
    } else {
      this.goTo('welcome');
    }
  },

  cancel() {
    this.goTo('welcome');
  },

  _updateCancelBtn() {
    const btn = document.getElementById('global-cancel-btn');
    if (!btn) return;
    if (this.currentScreen === 'welcome' || this.currentScreen === 'ticket') {
      btn.classList.add('hidden');
    } else {
      btn.classList.remove('hidden');
    }
  },

  resetState() {
    this.state = {
      rfid: null, patient: null, estVisiteur: false,
      motif: null, serviceChoisi: null, servicePreselectionne: null, ticket: null, rdvChoisi: null,
    };
  },

  _clearTimers() {
    if (this._rfidTimer) { clearInterval(this._rfidTimer); this._rfidTimer = null; }
    if (this._ticketTimer) { clearInterval(this._ticketTimer); this._ticketTimer = null; }
  },

  // Afficher/masquer l'overlay de chargement
  showLoading(message = 'Traitement en cours...') {
    document.getElementById('loading-message').textContent = message;
    document.getElementById('screen-loading').classList.remove('hidden');
  },

  hideLoading() {
    document.getElementById('screen-loading').classList.add('hidden');
  },

  // Afficher une erreur (helper)
  showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
  },

  hideError(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.classList.add('hidden');
  },
};
