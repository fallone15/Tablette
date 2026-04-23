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
    const localeMap = { fr: 'fr-FR', en: 'en-US', ar: 'ar-MA' };
    const locale = localeMap[App.state.lang] || 'fr-FR';
    const now = new Date();
    document.getElementById('ticket-datetime').innerHTML =
      `${now.toLocaleDateString(locale)}<br>${now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;

    // Service & Tarif
    document.getElementById('ticket-service').textContent = ticket.service.nom;
    document.getElementById('ticket-tarif').textContent = `${parseFloat(ticket.service.tarif).toFixed(2)} ${App.t('mad')}`;

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
      typeLabel.textContent = App.t('ticket_cashier_label');
      document.querySelector('.ticket-heading').textContent = App.t('ticket_cashier_title');
      document.querySelector('.ticket-success-icon').textContent = "💵";

      docRow.classList.add('hidden');
      salleRow.classList.add('hidden');
      heureRow.classList.add('hidden');
      posWrap.classList.add('hidden');
      alertBox.classList.remove('hidden');

      fMsg1.textContent = App.t('ticket_msg_cashier1');
      fMsg2.textContent = App.t('ticket_msg_cashier2');

    } else {
      // Configuration Ticket DOCTEUR
      typeLabel.textContent = App.t('ticket_number_label');
      document.querySelector('.ticket-heading').textContent = App.t('ticket_success');
      document.querySelector('.ticket-success-icon').textContent = "✅";

      docRow.classList.remove('hidden');
      heureRow.classList.remove('hidden');
      alertBox.classList.add('hidden');

      const existingBadge = alertBox.parentNode.querySelector('.motif-badge-free');
      if (existingBadge) {
        existingBadge.remove();
      }

      if (ticket.is_rdv || ticket.paiement === 'stripe') {
        const badge = document.createElement('span');
        badge.className = 'motif-badge motif-badge-free';
        badge.style.display = 'inline-block';
        badge.style.marginTop = '4px';
        badge.textContent = ticket.is_rdv ? App.t('ticket_prepaid') : App.t('ticket_paid_card');
        alertBox.parentNode.insertBefore(badge, alertBox);
      }

      if (ticket.is_rdv) {
        posWrap.innerHTML = App.t('ticket_rdv_on_time');
      } else {
        posWrap.innerHTML = App.t('ticket_position', { n: ticket.position });
        posWrap.classList.remove('hidden');
      }

      document.getElementById('ticket-medecin').textContent = `Dr. ${ticket.medecin.prenom} ${ticket.medecin.nom}`;

      if (ticket.salle) {
        document.getElementById('ticket-salle').textContent =
          `${App.t('ticket_room')} ${ticket.salle.numero}${ticket.salle.etage != null ? ` — ${App.t('floor')} ${ticket.salle.etage}` : ''}`;
      } else {
        document.getElementById('ticket-salle').textContent = App.t('tbd');
      }
      salleRow.classList.remove('hidden');

      if (ticket.heure_estimee) {
        const he = new Date(ticket.heure_estimee);
        document.getElementById('ticket-heure').textContent =
          he.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      } else {
        document.getElementById('ticket-heure').textContent = App.t('soon');
      }

      fMsg1.textContent = App.t('ticket_msg_1');
      fMsg2.textContent = App.t('ticket_msg_2');
    }

    // Countdown auto retour accueil
    this._countdown = 60;
    const countdownEl = document.getElementById('ticket-countdown');
    countdownEl.innerHTML = App.t('ticket_countdown', { n: this._countdown });

    if (this._interval) clearInterval(this._interval);
    this._interval = setInterval(() => {
      this._countdown--;
      countdownEl.innerHTML = App.t('ticket_countdown', { n: this._countdown });
      if (this._countdown <= 0) {
        clearInterval(this._interval);
        App.goTo('welcome');
      }
    }, 1000);

    App._ticketTimer = this._interval;
  },
};