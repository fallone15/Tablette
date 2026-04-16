/* ─── rfid.js — Écran de scan RFID ─── */

const RfidScreen = {
  _timeout: 60,
  _interval: null,

  onEnter() {
    // Reset
    document.getElementById('rfid-input').value = '';
    App.hideError('rfid-error');
    this._timeout = 60;

    // Focus auto sur le champ
    setTimeout(() => document.getElementById('rfid-input').focus(), 300);

    // Barre de timeout
    const bar = document.getElementById('rfid-timeout-bar');
    const text = document.getElementById('rfid-timeout-text');
    bar.style.width = '100%';

    this._interval = setInterval(() => {
      this._timeout--;
      const pct = (this._timeout / 60) * 100;
      bar.style.width = pct + '%';
      text.textContent = `Retour automatique dans ${this._timeout}s`;

      if (this._timeout <= 0) {
        clearInterval(this._interval);
        App.goTo('welcome');
      }
    }, 1000);

    App._rfidTimer = this._interval;
  },

  async submit() {
    const input = document.getElementById('rfid-input');
    const carteRfid = input.value.trim();

    if (!carteRfid) {
      App.showError('rfid-error', 'Veuillez entrer ou scanner un numéro de carte.');
      return;
    }

    App.showLoading('Lecture de la carte...');

    try {
      const data = await Api.verifyRfid(carteRfid);

      if (data.found) {
        App.state.rfid = carteRfid;
        App.hideLoading();

        // Pré-remplir le prénom sur l'écran PIN
        document.getElementById('pin-prenom').textContent = data.prenom || 'Patient';

        App.goTo('pin-entry');
      } else {
        App.hideLoading();
        App.showError('rfid-error', 'Carte non reconnue. Vérifiez votre carte ou inscrivez-vous en tant que nouveau patient.');
      }
    } catch (err) {
      App.hideLoading();
      if (err.status === 404) {
        App.showError('rfid-error', 'Carte non reconnue. Vérifiez votre carte ou inscrivez-vous en tant que nouveau patient.');
      } else {
        App.showError('rfid-error', 'Erreur de connexion au serveur. Veuillez réessayer.');
      }
    }
  },
};
