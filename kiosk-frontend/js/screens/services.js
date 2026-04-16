/* ─── services.js — Écran de sélection du service ─── */

const ServicesScreen = {

  // Icônes pour chaque service (mapping par nom ou id)
  _icons: {
    'Médecine générale': '🩺',
    'Radiologie':        '📡',
    'Échographie':       '📋',
    'Analyses sanguines':'🔬',
    'Vaccination':       '💉',
    'Dentiste':          '🦷',
  },

  _defaultIcon: '🏥',

  async onEnter() {
    const grid = document.getElementById('services-grid');

    // Actualiser le step indicator si visiteur
    if (App.state.estVisiteur) {
      const stepIndicator = document.getElementById('service-step-indicator');
      // Pour le visiteur, pas besoin de montrer les 4 étapes
      // On adapte juste visuellement
    }

    // Charger les services
    grid.innerHTML = `
      <div class="service-loading">
        <div class="spinner"></div>
        <p>Chargement des services...</p>
      </div>`;

    try {
      const data = await Api.getServices();
      this.render(data.services);

      // Si un service a été préséléctionné, on scrolle vers lui ou on l'encadre
      if (App.state.servicePreselectionne) {
        const id = App.state.servicePreselectionne;
        const card = document.querySelector(`.service-card[data-id="${id}"]`);
        if (card) {
          card.classList.add('highlighted');
          // Légère temporisation pour le smooth scroll
          setTimeout(() => {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      }
    } catch (err) {
      grid.innerHTML = '';
      App.showError('service-error', 'Impossible de charger les services. Veuillez réessayer.');
    }
  },

  render(services) {
    const grid = document.getElementById('services-grid');
    grid.innerHTML = '';

    services.forEach(s => {
      const icon = this._icons[s.nom] || this._defaultIcon;
      const attente = parseInt(s.personnes_en_attente) || 0;
      const tempsMin = parseInt(s.temps_attente_estime) || 0;
      const badgeClass = attente >= 5 ? 'service-card-badge badge-busy' : 'service-card-badge';

      const card = document.createElement('div');
      card.className = 'service-card';
      card.dataset.id = s.id_service;
      card.onclick = () => this.select(s);
      card.innerHTML = `
        <div class="service-card-icon">${icon}</div>
        <div class="service-card-name">${s.nom}</div>
        <div class="service-card-desc">${s.description || ''}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span class="service-card-wait">⏱ ~${s.duree_moyenne} min/patient</span>
          <span class="${badgeClass}">${attente} en attente</span>
        </div>
        <div class="service-card-footer">
          <span class="service-card-tarif">${parseFloat(s.tarif).toFixed(2)} MAD</span>
          ${tempsMin > 0
            ? `<span class="service-card-wait">≈ ${tempsMin} min d'attente</span>`
            : `<span class="service-card-wait" style="color:var(--success);">Pas d'attente</span>`
          }
        </div>
      `;
      grid.appendChild(card);
    });
  },

  async select(service) {
    App.state.serviceChoisi = service;
    // Les passages spontanés doivent également être payés
    App.goTo('payment');
  },
};
