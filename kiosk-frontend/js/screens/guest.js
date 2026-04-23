/* ─── guest.js — Flux visiteur (sans carte) ─── */

const GuestScreen = {
  _motif: null,
  _serviceId: null,

  // Icônes par nom de service (fallback sur 🏥)
  _icons: {
    'Médecine générale': '🩺',
    'Radiologie':        '📡',
    'Échographie':       '🔊',
    'Analyses sanguines':'🔬',
    'Vaccination':       '💉',
    'Dentiste':          '🦷',
  },

  async onEnter() {
    this._motif = null;
    this._serviceId = null;
    const container = document.getElementById('motif-options');

    // Afficher le spinner
    container.innerHTML = `
      <div class="service-loading" style="padding:20px;">
        <div class="spinner"></div>
        <p>${App.t('loading')}...</p>
      </div>`;

    try {
      const data = await Api.getServices();
      this.renderMotifs(data.services, container);
    } catch (err) {
      container.innerHTML = `
        <p style="color:var(--text-muted);font-size:14px;padding:12px;">
          ${App.t('error_loading')}
        </p>`;
    }
  },

  renderMotifs(services, container) {
    container.innerHTML = '';
    // Enable the grid layout matching services.js
    container.className = 'services-grid';
    container.style.marginTop = '20px';
    
    this._services = services; // Stocker pour accès ultérieur
    services.forEach(s => {
      const icon = this._icons[s.nom] || '🏥';
      const attente = parseInt(s.personnes_en_attente) || 0;
      const tempsMin = parseInt(s.temps_attente_estime) || 0;
      const badgeClass = attente >= 5 ? 'service-card-badge badge-busy' : 'service-card-badge';

      const card = document.createElement('div');
      card.className = 'service-card';
      if (this._serviceId === s.id_service) {
        card.classList.add('highlighted');
      }
      card.dataset.id = s.id_service;
      card.onclick = () => this.setMotif(card, s);
      
      card.innerHTML = `
        <div class="service-card-icon">${icon}</div>
        <div class="service-card-name">${s.nom}</div>
        <div class="service-card-desc">${s.description || ''}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span class="service-card-wait">${App.t('service_wait', { n: s.duree_moyenne })}</span>
          <span class="${badgeClass}">${App.t('service_queue', { n: attente })}</span>
        </div>
        <div class="service-card-footer">
          <span class="service-card-tarif">${parseFloat(s.tarif).toFixed(2)} ${App.t('mad')}</span>
          ${tempsMin > 0
            ? `<span class="service-card-wait">${App.t('service_total_wait', { n: tempsMin })}</span>`
            : `<span class="service-card-wait" style="color:var(--success);">${App.t('service_no_wait')}</span>`
          }
        </div>
      `;
      container.appendChild(card);
    });
  },

  setMotif(card, service) {
    document.querySelectorAll('#motif-options .service-card').forEach(b => b.classList.remove('highlighted'));
    card.classList.add('highlighted');
    this._motif = service.nom;
    this._serviceId = service.id_service;
    this._serviceData = service; // Stocker les données du service
  },

  proceed() {
    if (!this._serviceId) {
      App.showPopup(App.t('guest_error_specialty'));
      return;
    }
    
    App.state.estVisiteur = true;
    App.state.motif = this._motif || 'Visiteur borne (sans carte)';
    App.state.serviceChoisi = this._serviceData; 
    
    App.showLoading(App.t('loading_doctors'));
    
    this.checkAndProceedToPayment();
  },

  async checkAndProceedToPayment() {
    try {
      const availRes = await Api.checkDoctorAvailability(App.state.serviceChoisi.id_service);
      
      if (!availRes.available) {
        App.hideLoading();
        App.showPopup(App.t('no_doctor'));
        return;
      }
      
      App.hideLoading();
      App.goTo('payment');
    } catch (err) {
      App.hideLoading();
      App.showError('guest-error', 'error_loading');
      console.error('❌ Erreur vérification médecins:', err);
    }
  },
};
