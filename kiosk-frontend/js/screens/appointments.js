/* ─── appointments.js — Écran de sélection des RDV du jour ─── */

const AppointmentsScreen = {
  _appointments: [],

  async onEnter() {
    const list = document.getElementById('appointments-list');
    list.innerHTML = `
      <div class="service-loading">
        <div class="spinner"></div>
        <p>${App.t('appts_loading')}</p>
      </div>`;

    if (!App.state.patient) {
      this.skip();
      return;
    }

    try {
      const data = await Api.getAppointments(App.state.patient.id_patient);
      this._appointments = data.appointments || [];

      if (this._appointments.length === 0) {
        this.skip();
      } else {
        this.render(this._appointments);
      }
    } catch (err) {
      console.error('Erreur loaded RDV', err);
      this.skip();
    }
  },

  render(appointments) {
    const list = document.getElementById('appointments-list');
    list.innerHTML = '';

    appointments.forEach(rdv => {
      const isPaid = rdv.statut === 'confirme';
      const timeStr = rdv.heure_rdv.substring(0, 5);

      const card = document.createElement('button'); // Changed to button for accessibility
      card.className = 'service-card';
      card.style.flexDirection = 'row';
      card.style.alignItems = 'center';
      card.style.gap = '20px';
      card.style.minHeight = '120px';
      card.style.textAlign = 'inherit'; // Support RTL
      card.style.width = '100%';
      card.style.border = '1px solid var(--border)';
      card.style.background = 'var(--bg-card)';
      card.style.borderRadius = 'var(--radius-md)';
      card.style.cursor = 'pointer';

      card.innerHTML = `
        <div style="font-size:32px; font-weight:800; color:var(--primary);">${timeStr}</div>
        <div style="flex:1;">
          <div style="font-size:18px; font-weight:700;">${rdv.service_nom}</div>
          <div style="color:var(--text-secondary); font-size:14px;">Dr. ${rdv.medecin_prenom} ${rdv.medecin_nom} (${rdv.specialite})</div>
          <div style="margin-top:8px;">
            <span class="motif-badge ${isPaid ? 'motif-badge-free' : ''}">${isPaid ? App.t('status_paid') : App.t('status_unpaid')}</span>
          </div>
        </div>
        <div style="font-size:24px; font-weight:700; color:var(--text-primary);">
          ${parseFloat(rdv.tarif).toFixed(2)} ${App.t('mad')}
        </div>
      `;

      card.onclick = () => this.select(rdv);
      list.appendChild(card);
    });
  },

  async select(rdv) {
    App.state.serviceChoisi = {
      id_service: rdv.id_service,
      nom: rdv.service_nom,
      tarif: rdv.tarif,
      duree_moyenne: rdv.duree_moyenne
    };
    App.state.rdvChoisi = rdv;

    const isPaid = rdv.statut === 'confirme';

    if (isPaid) {
      App.showLoading(App.t('ticket_generating'));
      try {
        const payload = {
          id_patient: App.state.patient.id_patient,
          id_service: rdv.id_service,
          id_rendez_vous: rdv.id_rendez_vous,
          est_visiteur: false,
          motif: rdv.motif,
          mode_paiement: 'stripe'
        };
        const res = await Api.checkin(payload);
        if (res.success) {
          App.state.ticket = res.ticket;
          App.hideLoading();
          App.goTo('ticket');
        } else {
          App.hideLoading();
          App.showError('appointments-error', res.message || 'error_ticket');
        }
      } catch (err) {
        App.hideLoading();
        App.showError('appointments-error', 'error_ticket');
      }
    } else {
      App.goTo('payment');
    }
  },

  skip() {
    App.state.rdvChoisi = null;
    App.goTo('service-select');
  }
};
