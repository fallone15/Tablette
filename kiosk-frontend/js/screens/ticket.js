/* ─── ticket.js — Écran du ticket de passage ─── */

const TicketScreen = {
  _countdown: 60,
  _interval: null,

  onEnter() {
    const ticket = App.state.ticket;
    if (!ticket) { App.goTo('welcome'); return; }

    // Numéro de passage
    document.getElementById('ticket-number').textContent = ticket.numero_file;

    // Position
    const posEl = document.getElementById('ticket-position');
    posEl.innerHTML = `Vous êtes le <strong>N°${ticket.position}</strong> en attente`;

    // Date et heure du ticket
    const now = new Date();
    document.getElementById('ticket-datetime').innerHTML =
      `${now.toLocaleDateString('fr-FR')}<br>${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

    // Service
    document.getElementById('ticket-service').textContent = ticket.service.nom;

    // Médecin
    document.getElementById('ticket-medecin').textContent =
      `Dr. ${ticket.medecin.prenom} ${ticket.medecin.nom}`;

    // Salle
    const salleRow = document.getElementById('ticket-salle-row');
    if (ticket.salle) {
      document.getElementById('ticket-salle').textContent =
        `Salle ${ticket.salle.numero}${ticket.salle.etage != null ? ` — Étage ${ticket.salle.etage}` : ''}`;
      salleRow.classList.remove('hidden');
    } else {
      document.getElementById('ticket-salle').textContent = 'À déterminer';
    }

    // Heure estimée
    if (ticket.heure_estimee) {
      const he = new Date(ticket.heure_estimee);
      document.getElementById('ticket-heure').textContent =
        he.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else {
      document.getElementById('ticket-heure').textContent = 'Sous peu';
    }

    // Tarif
    document.getElementById('ticket-tarif').textContent =
      `${parseFloat(ticket.service.tarif).toFixed(2)} MAD`;

    // Countdown auto retour accueil
    this._countdown = 60;
    const countdownEl = document.getElementById('ticket-countdown');
    countdownEl.textContent = this._countdown;

    this._interval = setInterval(() => {
      this._countdown--;
      countdownEl.textContent = this._countdown;
      if (this._countdown <= 0) {
        clearInterval(this._interval);
        App.goTo('welcome');
      }
    }, 1000);

    App._ticketTimer = this._interval;
  },
};
