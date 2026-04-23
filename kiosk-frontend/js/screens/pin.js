/* ─── pin.js — Écran de saisie du code PIN ─── */

const PinScreen = {
  _code: '',
  _attempts: 0,
  _maxAttempts: 3,

  addDigit(d) {
    if (this._code.length >= 4) return;
    this._code += d;
    this._updateDots();

    // Vibration tactile (si supportée)
    if (navigator.vibrate) navigator.vibrate(30);
  },

  clear() {
    if (this._code.length === 0) return;
    this._code = this._code.slice(0, -1);
    this._updateDots();
  },

  _updateDots() {
    const dots = document.querySelectorAll('#pin-dots .pin-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('filled', i < this._code.length);
    });
  },

  reset() {
    this._code = '';
    this._updateDots();
    document.getElementById('pin-error').classList.add('hidden');
  },

  async confirm() {
    if (this._code.length !== 4) {
      this._showError(App.t('pin_error_digits'));
      return;
    }

    if (this._attempts >= this._maxAttempts) {
      this._showError(App.t('pin_error_too_many'));
      return;
    }

    App.showLoading(App.t('loading'));

    try {
      const data = await Api.identify(App.state.rfid, this._code);

      if (data.success) {
        App.state.patient = data.patient;
        App.hideLoading();
        this.reset();
        this._attempts = 0;

        // Mettre à jour l'écran de confirmation
        ConfirmScreen.populate(data.patient);
        App.goTo('patient-confirm');
      }
    } catch (err) {
      App.hideLoading();
      this._attempts++;

      if (err.code === 'WRONG_PIN' || err.status === 401) {
        const restant = this._maxAttempts - this._attempts;
        this._showError(App.t('pin_error_incorrect'));
        if (restant > 0) {
          document.getElementById('pin-attempts').textContent = App.t('pin_error_attempts', { n: restant });
          document.getElementById('pin-attempts').classList.remove('hidden');
        } else {
          this._showError(App.t('pin_error_final'));
          setTimeout(() => {
            this.reset();
            this._attempts = 0;
            App.goTo('welcome');
          }, 5000);
        }
      } else {
        this._showError(App.t('rfid_error_server'));
      }

      // Reset le code saisi
      this._code = '';
      this._updateDots();
    }
  },

  _showError(msg) {
    const el = document.getElementById('pin-error');
    el.textContent = msg;
    el.classList.remove('hidden');
    // Animation shake
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'shake 0.4s ease';
  },
};
