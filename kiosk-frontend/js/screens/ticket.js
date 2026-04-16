/* ─── ticket.js — Écran du ticket de passage ─── */

const TicketScreen = {
  _countdown: 60,
  _interval: null,

  onEnter() {
    const ticket = App.state.ticket;
    if (!ticket) { App.goTo('welcome'); return; }

    const isCashier = ticket.type === 'CASHIER';

    // Numéro
    document.getElementById('ticket-number').textContent = ticket.numero_file;

    // Date et heure du ticket
    const now = new Date();
    document.getElementById('ticket-datetime').innerHTML =
      `${now.toLocaleDateString('fr-FR')}<br>${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

    // Service & Tarif
    document.getElementById('ticket-service').textContent = ticket.service.nom;
    document.getElementById('ticket-tarif').textContent = `${parseFloat(ticket.service.tarif).toFixed(2)} MAD`;

    const docRow = document.getElementById('ticket-medecin-row');
    const salleRow = document.getElementById('ticket-salle-row');
    const heureRow = document.getElementById('ticket-heure-row');
    const posWrap = document.getElementById('ticket-position');
    const alertBox = document.getElementById('ticket-payment-alert');
    const typeLabel = document.getElementById('ticket-type-label');
    const fMsg1 = document.getElementById('ticket-footer-msg1');
    const fMsg2 = document.getElementById('ticket-footer-msg2');

    if (isCashier) {
      // Configuration Ticket CAISSE
      typeLabel.textContent = "NUMÉRO DE CAISSE";
      document.querySelector('.ticket-heading').textContent = "Ticket de Caisse";
      document.querySelector('.ticket-success-icon').textContent = "💵";

      docRow.classList.add('hidden');
      salleRow.classList.add('hidden');
      heureRow.classList.add('hidden');
      posWrap.classList.add('hidden');
      alertBox.classList.remove('hidden');

      fMsg1.textContent = "Merci de patienter jusqu'à l'appel de votre numéro à l'accueil.";
      fMsg2.textContent = "Une fois le règlement effectué, vous recevrez votre ticket de consultation.";

    } else {
      // Configuration Ticket DOCTEUR
      typeLabel.textContent = "Votre numéro";
      document.querySelector('.ticket-heading').textContent = "Votre ticket de passage";
      document.querySelector('.ticket-success-icon').textContent = "✅";

      docRow.classList.remove('hidden');
      heureRow.classList.remove('hidden');
      alertBox.classList.add('hidden');

      const existingBadge = alertBox.parentNode.querySelector('.motif-badge-free');
      if (existingBadge) {
        existingBadge.remove();
      }

      if (ticket.is_rdv || ticket.paiement === 'CB_BORNE') {
        const badge = document.createElement('span');
        badge.className = 'motif-badge motif-badge-free';
        badge.style.display = 'inline-block';
        badge.style.marginTop = '4px';
        badge.textContent = ticket.is_rdv ? '✅ Consultation pré-payée' : '✅ Payé par carte';
        alertBox.parentNode.insertBefore(badge, alertBox);
      }

      if (ticket.is_rdv) {
        posWrap.innerHTML = `Heure de RDV respectée`;
      } else {
        posWrap.innerHTML = `Vous êtes le <strong>N°${ticket.position}</strong> en attente`;
        posWrap.classList.remove('hidden');
      }

      document.getElementById('ticket-medecin').textContent = `Dr. ${ticket.medecin.prenom} ${ticket.medecin.nom}`;

      if (ticket.salle) {
        document.getElementById('ticket-salle').textContent =
          `Salle ${ticket.salle.numero}${ticket.salle.etage != null ? ` — Étage ${ticket.salle.etage}` : ''}`;
      } else {
        document.getElementById('ticket-salle').textContent = 'À déterminer';
      }
      salleRow.classList.remove('hidden');

      if (ticket.heure_estimee) {
        const he = new Date(ticket.heure_estimee);
        document.getElementById('ticket-heure').textContent =
          he.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      } else {
        document.getElementById('ticket-heure').textContent = 'Sous peu';
      }

      fMsg1.textContent = "Merci de vous installer en salle d'attente.";
      fMsg2.textContent = "Un soignant vous appellera par votre numéro.";
    }

    // Countdown auto retour accueil
    this._countdown = 60;
    const countdownEl = document.getElementById('ticket-countdown');
    countdownEl.textContent = this._countdown;

    if (this._interval) clearInterval(this._interval);
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