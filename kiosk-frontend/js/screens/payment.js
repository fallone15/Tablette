/* ─── payment.js — Écran de Paiement et Choix Caisse/Carte ─── */

const PaymentScreen = {
  
  onEnter() {
    const amountEl = document.getElementById('payment-amount');
    
    if (!App.state.serviceChoisi) {
      this.cancel();
      return;
    }
    
    const tarif = parseFloat(App.state.serviceChoisi.tarif || 0).toFixed(2);
    amountEl.textContent = `${tarif} MAD`;
  },

  async payCB() {
    App.showLoading('Paiement en cours... Veuillez patienter.');
    
    // Simulation du temps de traitement TPE
    setTimeout(async () => {
      try {
        const payload = {
          id_patient: App.state.patient ? App.state.patient.id_patient : null,
          id_service: App.state.serviceChoisi.id_service,
          est_visiteur: App.state.estVisiteur,
          motif: App.state.motif,
          id_rendez_vous: App.state.rdvChoisi ? App.state.rdvChoisi.id_rendez_vous : null,
          mode_paiement: 'CB_BORNE'
        };
        
        // Le paiement a "réussi", on génère le ticket docteur
        const res = await Api.checkin(payload);
        
        if (res.success) {
          App.state.ticket = res.ticket;
          App.state.ticket.paiement = 'CB_BORNE';
          App.hideLoading();
          App.goTo('ticket');
        }
      } catch (err) {
        App.hideLoading();
        App.showError('service-error', 'Erreur lors de l\\ enregistrement du paiement et du ticket. Veuillez réessayer.');
      }
    }, 2500); // 2.5 secondes de simu
  },

  async payCash() {
    App.showLoading('Émission du ticket Caisse...');
    
    try {
      // Pour les espèces, on ne bloque pas la file d'attente du médecin mais on donne un ticket caisse
      const payload = {
        id_service: App.state.serviceChoisi.id_service
      };
      
      const res = await Api.cashierTicket(payload);
      
      if (res.success) {
        App.state.ticket = res.ticket;
        App.state.ticket.paiement = 'ESPECES_CAISSIERE';
        App.hideLoading();
        App.goTo('ticket');
      }
    } catch (err) {
      App.hideLoading();
      App.showError('service-error', 'Impossible de générer le ticket de Caisse.');
    }
  },

  cancel() {
    App.goTo('welcome');
  }
};
