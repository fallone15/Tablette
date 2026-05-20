/* ─── rfid.js — Écran de scan RFID ─── */

const RfidScreen = {
  _timeout: 60,
  _interval: null,

  onEnter() {
    // Reset
    const input = document.getElementById('rfid-input');
    input.value = '';
    App.hideError('rfid-error');
    this._timeout = 60;

    // ── Saisie manuelle / lecteur HID clavier (fallback) ──────────────────
    input._badgeHandler = (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        e.preventDefault();
        RfidScreen.submit();
      }
    };
    input.removeEventListener('keydown', input._badgeHandler);
    input.addEventListener('keydown', input._badgeHandler);
    setTimeout(() => input.focus(), 300);

    // Barre de timeout
    const bar = document.getElementById('rfid-timeout-bar');
    const text = document.getElementById('rfid-timeout-text');
    bar.style.width = '100%';

    this._interval = setInterval(() => {
      this._timeout--;
      const pct = (this._timeout / 60) * 100;
      bar.style.width = pct + '%';
      text.innerHTML = App.t('rfid_timeout', { n: this._timeout });

      if (this._timeout <= 0) {
        clearInterval(this._interval);
        App.goTo('welcome');
      }
    }, 1000);

    App._rfidTimer = this._interval;

    // ── Connexion WebSocket lecteur carte à puce PC/SC (Gemalto + ACOS) ──
    this._connectCardWebSocket();
  },

  onLeave() {
    // Fermer le WebSocket proprement en quittant l'écran
    clearTimeout(this._wsRetry);
    if (this._ws) {
      this._ws.onclose = null; // désactive la reconnexion auto
      this._ws.close();
      this._ws = null;
    }
    clearInterval(this._interval);
  },

  // ─── WebSocket PC/SC ────────────────────────────────────────────────────────
  _ws: null,
  _wsRetry: null,

  _connectCardWebSocket() {
    if (this._ws) {
      try { this._ws.close(); } catch(e) {}
      this._ws = null;
    }

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const host = location.hostname || 'localhost';
    const port = 3001;
    const wsUrl = `${proto}://${host}:${port}/ws/card`;

    console.log('🃏 [CardReader] Connexion WebSocket:', wsUrl);
    try {
      this._ws = new WebSocket(wsUrl);
    } catch (e) {
      console.warn('[CardReader] WebSocket non supporté:', e.message);
      return;
    }

    this._ws.onopen = () => {
      console.log('🃏 [CardReader] Lecteur connecté');
      this._setReaderStatus('ready');
    };

    this._ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch(e) { return; }

      console.log('[CardReader WS]', msg);

      if (msg.type === 'reader_detected') {
        this._setReaderStatus('ready');
      }

    if (msg.type === 'card_inserted') {
        if (msg.cardId) {
          const input = document.getElementById('rfid-input');
          input.value = msg.cardId;
          this._setReaderStatus('reading');
          // Passer 'true' pour indiquer que c'est un scan automatique (bypasse le PIN)
          setTimeout(() => RfidScreen.submit(true), 400);
        } else {
          this._setReaderStatus('error');
          App.showError('rfid-error', 'rfid_error_reader');
        }
      }

      if (msg.type === 'card_removed') {
        this._setReaderStatus('ready');
        const input = document.getElementById('rfid-input');
        if (input) input.value = '';
      }

      if (msg.type === 'reader_error' || msg.type === 'reader_disconnected') {
        this._setReaderStatus('disconnected');
        App.showError('rfid-error', 'rfid_error_reader');
      }
    };

    this._ws.onerror = () => {
      this._setReaderStatus('disconnected');
    };

    this._ws.onclose = () => {
      // Reconnexion automatique après 3s si l'écran RFID est toujours actif
      this._wsRetry = setTimeout(() => {
        const screen = document.getElementById('screen-rfid-scan');
        if (screen && screen.classList.contains('active')) {
          this._connectCardWebSocket();
        }
      }, 3000);
    };
  },

  // ─── Indicateur visuel du lecteur ──────────────────────────────────────────
  _setReaderStatus(status) {
    const nfcIcon = document.querySelector('.nfc-icon');
    const subtitle = document.querySelector('.rfid-subtitle');

    const states = {
      ready:        { icon: '📶', text: 'Insérez votre carte ACOS dans le lecteur Gemalto' },
      reading:      { icon: '⏳', text: 'Lecture en cours...' },
      disconnected: { icon: '🔌', text: 'Lecteur absent — saisie manuelle disponible' },
      error:        { icon: '❌', text: 'Impossible de lire la carte — vérifiez le lecteur' },
    };

    const s = states[status] || states.ready;
    if (nfcIcon) nfcIcon.textContent = s.icon;
    if (subtitle) subtitle.textContent = s.text;
  },

  async submit(isAutoScan = false) {
    const input = document.getElementById('rfid-input');
    const carteRfid = input.value.trim();

    if (!carteRfid) {
      App.showError('rfid-error', 'rfid_error_no_card');
      return;
    }

    App.showLoading(App.t('loading'));

    try {
      if (isAutoScan) {
        // Mode scan automatique : on bypasse le code PIN
        const data = await Api.identify(carteRfid, null, true);
        if (data.success) {
          App.state.rfid = carteRfid;
          App.state.patient = data.patient;
          App.hideLoading();

          // Mettre à jour l'écran de confirmation et y aller directement
          ConfirmScreen.populate(data.patient);
          App.goTo('patient-confirm');
        }
      } else {
        // Mode manuel : on vérifie juste que le RFID existe, puis on demande le PIN
        const data = await Api.verifyRfid(carteRfid);

        if (data.found) {
          App.state.rfid = carteRfid;
          App.hideLoading();

          // Pré-remplir le prénom sur l'écran PIN
          App.state.tempPrenom = data.prenom || 'Patient';

          App.goTo('pin-entry');
        } else {
          App.hideLoading();
          App.showError('rfid-error', 'rfid_error_invalid');
        }
      }
    } catch (err) {
      App.hideLoading();
      if (err.status === 404 || err.code === 'CARD_NOT_FOUND') {
        App.showError('rfid-error', 'rfid_error_invalid');
      } else {
        App.showError('rfid-error', 'rfid_error_server');
      }
    }
  },
};
