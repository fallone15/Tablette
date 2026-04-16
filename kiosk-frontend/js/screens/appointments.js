/* ─── appointments.js — Écran de sélection des RDV du jour ─── */

const AppointmentsScreen = {
  _appointments: [],

  async onEnter() {
    const list = document.getElementById('appointments-list');
    list.innerHTML = `
      <div class="service-loading">
        <div class="spinner"></div>
        <p>Vérification de vos rendez-vous...</p>
      </div>`;

    if (!App.state.patient) {
      this.skip();
      return;
    }

    try {
      const data = await Api.getAppointments(App.state.patient.id_patient);
      this._appointments = data.appointments || [];

      if (this._appointments.length === 0) {
        // Pas de RDV, on passe à la sélection de service normale
        this.skip();
      } else {
        this.render(this._appointments);
      }
    } catch (err) {
      console.error('Erreur loaded RDV', err);
      // En cas d'erreur on laisse passer au flux normal par sécurité
      this.skip();
    }
  },

  render(appointments) {
    const list = document.getElementById('appointments-list');
    list.innerHTML = '';

    appointments.forEach(rdv => {
      const isPaid = rdv.statut === 'confirme';
      const timeStr = rdv.heure_rdv.substring(0, 5); // ex: 14:30

      const card = document.createElement('div');
      card.className = 'service-card';
      // Style en ligne pour adapter la carte
      card.style.flexDirection = 'row';
      card.style.alignItems = 'center';
      card.style.gap = '20px';
      card.style.minHeight = '120px';

      card.innerHTML = `
        <div style="font-size:32px; font-weight:800; color:var(--primary);">${timeStr}</div>
        <div style="flex:1;">
          <div style="font-size:18px; font-weight:700;">${rdv.service_nom}</div>
          <div style="color:var(--text-secondary); font-size:14px;">Dr. ${rdv.medecin_prenom} ${rdv.medecin_nom} (${rdv.specialite})</div>
          <div style="margin-top:8px;">
            ${isPaid 
              ? '<span class="motif-badge motif-badge-free">✅ Payé en ligne</span>' 
              : '<span class="motif-badge">💵 À régler sur place</span>'}
          </div>
        </div>
        <div style="font-size:24px; font-weight:700; color:var(--text-primary);">
          ${parseFloat(rdv.tarif).toFixed(2)} MAD
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
    App.state.rdvChoisi = rdv; // Sauvegarde du RDV complet

    const isPaid = rdv.statut === 'confirme';

    if (isPaid) {
      // Direct au check-in car déjà payé
      App.showLoading('Génération de votre ticket...');
      try {
        const payload = {
          id_patient: App.state.patient.id_patient,
          id_service: rdv.id_service,
          id_rendez_vous: rdv.id_rendez_vous,
          est_visiteur: false,
          motif: rdv.motif,
          mode_paiement: 'EN_LIGNE'
        };
        const res = await Api.checkin(payload);
        if (res.success) {
          App.state.ticket = res.ticket;
          App.hideLoading();
          App.goTo('ticket');
        }
      } catch (err) {
        App.hideLoading();
        App.showError('service-error', 'Erreur lors de la génération du ticket.');
      }
    } else {
      // Non payé -> redirection vers écran de paiement
      App.goTo('payment');
    }
  },

  skip() {
    App.state.rdvChoisi = null;
    App.goTo('service-select');
  }
};
