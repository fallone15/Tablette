/* ─── app.js — Routeur principal et état global ─── */

const App = {
  // État global partagé entre tous les écrans
  state: {
    lang: 'fr',           // Langue actuelle (fr, en, ar)
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
    this.setLanguage('fr'); // Français par défaut
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
    this.goTo('welcome');
    
    // Écouter la touche Entrée sur le champ RFID
    const rfidInput = document.getElementById('rfid-input');
    if (rfidInput) {
      rfidInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') RfidScreen.submit();
      });
    }
  },

  // --- Système de Traduction (i18n) ---
  t(key, params = {}) {
    if (typeof translations === 'undefined') return key;
    const lang = this.state.lang;
    let text = translations[lang][key] || (translations['fr'] ? translations['fr'][key] : key) || key;
    
    // Remplacement des paramètres {n}, {name}, etc.
    Object.keys(params).forEach(p => {
      text = text.replace(`{${p}}`, params[p]);
    });
    return text;
  },

  setLanguage(lang) {
    if (!['fr', 'en', 'ar'].includes(lang)) lang = 'fr';
    this.state.lang = lang;
    
    // Gestion du sens de lecture (RTL pour Arabe)
    document.body.dir = (lang === 'ar') ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    
    // Mise à jour de la classe active sur les boutons de langue
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Traduction automatique des éléments statiques (data-i18n)
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = this.t(key);
      } else {
        el.innerHTML = this.t(key);
      }
    });

    this.updateClock(); // Pour rafraîchir la date formatée
    console.log(`🌐 Langue changée pour : ${lang}`);
  },

  updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('clock').textContent = `${h}:${m}:${s}`;

    const locales = { fr: 'fr-FR', en: 'en-US', ar: 'ar-MA' };
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById('date-display');
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString(locales[this.state.lang] || 'fr-FR', opts);
    }
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
      this.setLanguage('fr'); // Retour au français à chaque nouvelle session
      this._history = [];
    }
    
    // Actions spécifiques à l'écran
    if (screenName === 'catalog') {
      if (typeof CatalogScreen !== 'undefined') CatalogScreen.onEnter();
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
    btn.innerHTML = this.t('cancel'); // Traduire le bouton annuler
    if (this.currentScreen === 'welcome' || this.currentScreen === 'ticket') {
      btn.classList.add('hidden');
    } else {
      btn.classList.remove('hidden');
    }
  },

  resetState() {
    this.state = {
      lang: this.state.lang, // Garder la langue actuelle avant le setLanguage(fr) de welcome
      rfid: null, patient: null, estVisiteur: false,
      motif: null, serviceChoisi: null, servicePreselectionne: null, ticket: null, rdvChoisi: null,
    };
  },

  _clearTimers() {
    if (this._rfidTimer) { clearInterval(this._rfidTimer); this._rfidTimer = null; }
    if (this._ticketTimer) { clearInterval(this._ticketTimer); this._ticketTimer = null; }
  },

  // Afficher/masquer l'overlay de chargement
  showLoading(message) {
    const msg = message || this.t('loading');
    const msgEl = document.getElementById('loading-message');
    if (msgEl) msgEl.textContent = msg;
    const overlay = document.getElementById('screen-loading');
    if (overlay) overlay.classList.remove('hidden');
  },

  hideLoading() {
    const overlay = document.getElementById('screen-loading');
    if (overlay) overlay.classList.add('hidden');
  },

  // Afficher un pop-up modal
  showPopup(message, titleKey = 'popup_error_title') {
    const popup = document.createElement('div');
    popup.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;

    popup.innerHTML = `
      <div style="
        background: white;
        padding: 40px;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        text-align: center;
      ">
        <h2 style="margin-top: 0; margin-bottom: 20px; font-size: 24px; color: #f06d10;">${titleKey.includes(' ') ? titleKey : this.t(titleKey)}</h2>
        <p style="margin: 20px 0; font-size: 16px; color: #333; line-height: 1.5;">${message.includes('_') || translations[this.state.lang][message] ? this.t(message) : message}</p>
        <button onclick="this.closest('div').parentElement.remove()" style="
          margin-top: 20px;
          padding: 12px 30px;
          background: #101011;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        ">${this.t('ok')}</button>
      </div>
    `;

    document.body.appendChild(popup);
  },

  // Afficher une erreur (helper)
  showError(elementId, messageKey) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = this.t(messageKey);
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
  },

  hideError(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.classList.add('hidden');
  },
};
