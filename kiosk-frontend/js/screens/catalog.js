/* ─── catalog.js — Écran Catalogue des Médecins ─── */

const CatalogScreen = {
  _jours: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],

  async onEnter() {
    const container = document.getElementById('catalog-container');
    container.innerHTML = `
      <div class="service-loading">
        <div class="spinner"></div>
        <p>Chargement du catalogue...</p>
      </div>`;

    try {
      const data = await Api.getCatalog();
      if (data.success) {
        this.render(data.catalog, container);
      } else {
        throw new Error('Failed to fetch catalog');
      }
    } catch (err) {
      container.innerHTML = `
        <div class="error-msg" style="display: block;">
          Impossible de charger le catalogue pour le moment.
        </div>`;
      console.error('Erreur catalogue:', err);
    }
  },

  render(catalog, container) {
    container.innerHTML = '';
    
    if (!catalog || catalog.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Aucun médecin disponible dans le catalogue.</p>';
      return;
    }

    catalog.forEach(service => {
      // Pour chaque service, on crée un bloc
      const serviceBlock = document.createElement('div');
      serviceBlock.style.background = 'var(--bg-card)';
      serviceBlock.style.border = '1px solid var(--border)';
      serviceBlock.style.borderRadius = 'var(--radius-lg)';
      serviceBlock.style.padding = '20px';
      serviceBlock.style.marginBottom = '20px';

      const serviceTitle = document.createElement('h3');
      serviceTitle.style.margin = '0 0 16px 0';
      serviceTitle.style.color = 'var(--primary)';
      serviceTitle.textContent = service.nom;
      serviceBlock.appendChild(serviceTitle);

      const doctorsGrid = document.createElement('div');
      doctorsGrid.style.display = 'grid';
      doctorsGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
      doctorsGrid.style.gap = '16px';

      service.medecins.forEach(medecin => {
        const docCard = document.createElement('div');
        docCard.style.background = 'rgba(255, 255, 255, 0.03)';
        docCard.style.border = '1px solid var(--border)';
        docCard.style.borderRadius = 'var(--radius-md)';
        docCard.style.padding = '16px';
        
        let horairesHtml = '<ul style="list-style: none; padding: 0; margin: 10px 0 0 0; font-size: 14px; color: var(--text-secondary);">';
        
        if (medecin.disponibilites && medecin.disponibilites.length > 0) {
          // Tri par jour de la semaine
          medecin.disponibilites.sort((a, b) => a.jour_semaine - b.jour_semaine);
          
          medecin.disponibilites.forEach(disp => {
            const jourNom = this._jours[disp.jour_semaine] || `Jour ${disp.jour_semaine}`;
            const debut = String(disp.heure_debut).substring(0, 5);
            const fin = String(disp.heure_fin).substring(0, 5);
            horairesHtml += `<li style="margin-bottom: 4px;"><strong>${jourNom}</strong> : ${debut} - ${fin}</li>`;
          });
        } else {
          horairesHtml += '<li>Aucun horaire renseigné</li>';
        }
        horairesHtml += '</ul>';

        docCard.innerHTML = `
          <div style="font-weight: 700; font-size: 18px; margin-bottom: 4px;">Dr. ${medecin.prenom} ${medecin.nom}</div>
          <div style="font-size: 13px; color: var(--primary); font-weight: 600; margin-bottom: 12px;">${medecin.specialite || service.nom}</div>
          <div style="font-size: 14px; font-weight: 500; border-bottom: 1px solid var(--border); padding-bottom: 8px;">Horaires :</div>
          ${horairesHtml}
        `;
        doctorsGrid.appendChild(docCard);
      });

      serviceBlock.appendChild(doctorsGrid);
      container.appendChild(serviceBlock);
    });
  }
};
