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
        <p>Chargement...</p>
      </div>`;

    try {
      const data = await Api.getServices();
      this.renderMotifs(data.services, container);
    } catch (err) {
      container.innerHTML = `
        <p style="color:var(--text-muted);font-size:14px;padding:12px;">
          Impossible de charger les services. Vous pouvez continuer sans motif.
        </p>`;
    }
  },

  renderMotifs(services, container) {
    container.innerHTML = '';
    services.forEach(s => {
      const icon = this._icons[s.nom] || '🏥';
      const attente = parseInt(s.personnes_en_attente) || 0;
      const btn = document.createElement('button');
      btn.className = 'motif-btn';
      btn.innerHTML = `
        <span class="motif-icon">${icon}</span>
        <span class="motif-label">${s.nom}</span>
        ${attente > 0
          ? `<span class="motif-badge">${attente} en attente</span>`
          : `<span class="motif-badge motif-badge-free">Libre</span>`
        }
      `;
      btn.onclick = () => this.setMotif(btn, s.nom, s.id_service);
      container.appendChild(btn);
    });
  },

  setMotif(btn, motif, serviceId = null) {
    document.querySelectorAll('#motif-options .motif-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    this._motif = motif;
    this._serviceId = serviceId;
  },

  proceed() {
    App.state.estVisiteur = true;
    App.state.motif = this._motif || 'Visiteur borne (sans carte)';
    // Si un service a été pré-sélectionné via le motif, l'enregistrer dans l'état
    // pour que l'écran service-select puisse le mettre en valeur
    App.state.servicePreselectionne = this._serviceId;
    App.goTo('service-select');
  },
};
