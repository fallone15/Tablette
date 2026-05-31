/* ─── payment.js — Écran de Paiement avec Stripe ─── */

const PaymentScreen = {
  stripeElements: null,
  cardElement: null,
  paymentIntentId: null,

  onEnter() {
    const amountEl = document.getElementById('payment-amount');
    
    if (!App.state.serviceChoisi) {
      this.cancel();
      return;
    }
    
    const tarif = parseFloat(App.state.serviceChoisi.tarif || 0).toFixed(2);
    amountEl.textContent = `${tarif} MAD`;

    // --- Visiteurs (pas du système) : caisse uniquement ---
    const cbBtn = document.getElementById('pay-cb-btn');
    const cashBtn = document.getElementById('pay-cash-btn');
    const notice = document.getElementById('payment-guest-notice');

    if (App.state.estVisiteur) {
      // Masquer le bouton CB
      if (cbBtn) cbBtn.style.display = 'none';
      // Le bouton caisse prend toute la largeur
      if (cashBtn) cashBtn.style.flex = '1 1 100%';
      // Afficher le bandeau d'info
      if (notice) notice.classList.remove('hidden');
    } else {
      // Patient du système : tout afficher
      if (cbBtn) cbBtn.style.display = '';
      if (cashBtn) cashBtn.style.flex = '1';
      if (notice) notice.classList.add('hidden');
    }
  },

  // Initialiser Stripe Elements
  initStripe() {
    if (this.stripeElements) return; // Déjà initialisé

    try {
      this.stripeElements = stripe.elements();
      this.cardElement = this.stripeElements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#424242',
            fontFamily: 'Inter, sans-serif',
          },
        },
      });

      const cardContainer = document.getElementById('card-element');
      if (cardContainer) {
        this.cardElement.mount(cardContainer);
      }
    } catch (err) {
      console.error('❌ Erreur initialisation Stripe:', err);
      App.showError('stripe-error', 'Erreur d\'initialisation du paiement');
    }
  },

  // Paiement par Carte Bancaire avec Stripe
  async payCB() {
    App.showLoading(App.t('payment_init'));
    
    try {
      const tarif = parseFloat(App.state.serviceChoisi.tarif || 0);

      // Créer une PaymentIntent côté serveur
      const paymentIntentRes = await Api.createPaymentIntent({
        amount: tarif,
        id_patient: App.state.patient ? App.state.patient.id_patient : null,
        id_service: App.state.serviceChoisi.id_service,
        est_visiteur: App.state.estVisiteur,
        motif: App.state.motif,
        id_rendez_vous: App.state.rdvChoisi ? App.state.rdvChoisi.id_rendez_vous : null,
      });

      if (!paymentIntentRes.success) {
        App.hideLoading();
        App.showError('payment-error', paymentIntentRes.message || App.t('error_loading'));
        return;
      }

      this.paymentIntentId = paymentIntentRes.paymentIntentId;
      const clientSecret = paymentIntentRes.clientSecret;

      App.hideLoading();
      
      // Afficher la modale de paiement Stripe
      this.showStripeModal(clientSecret);

    } catch (err) {
      App.hideLoading();
      console.error('❌ Erreur Stripe:', err);
      App.showError('payment-error', App.t('error_loading') + ': ' + err.message);
    }
  },

  showStripeModal(clientSecret) {
    // Créer une modale simple pour Stripe
    const modal = document.createElement('div');
    modal.id = 'stripe-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        padding: 40px;
        border-radius: 12px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        color: #333;
      ">
        <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 20px;">${App.t('payment_card_details')}</h3>
        <div id="card-element" style="
          margin: 20px 0;
          padding: 12px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          min-height: 50px;
        "></div>
        <div id="card-errors" style="color: #fa755a; margin: 10px 0; font-weight: 500;"></div>
        <div style="display: flex; gap: 10px; margin-top: 30px;">
          <button onclick="PaymentScreen.cancelPayment()" style="
            flex: 1;
            padding: 12px;
            border: 2px solid #ddd;
            background: white;
            color: #333;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
          ">${App.t('cancel').replace('✕ ', '')}</button>
          <button onclick="PaymentScreen.confirmPayment('${clientSecret}')" style="
            flex: 1;
            padding: 12px;
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
          ">${App.t('payment_pay')}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Initialiser les éléments Stripe
    this.initStripe();

    // Gérer les erreurs de carte
    if (this.cardElement) {
      this.cardElement.on('change', (event) => {
        const displayError = document.getElementById('card-errors');
        if (event.error) {
          displayError.textContent = event.error.message;
        } else {
          displayError.textContent = '';
        }
      });
    }
  },

  async confirmPayment(clientSecret) {
    App.showLoading(App.t('payment_processing'));

    try {
      const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: this.cardElement,
          billing_details: { name: 'Patient' },
        },
      });

      if (error) {
        App.hideLoading();
        const displayError = document.getElementById('card-errors');
        if (displayError) {
          displayError.textContent = error.message;
        }
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        const confirmRes = await Api.confirmPayment({
          paymentIntentId: this.paymentIntentId,
          id_patient: App.state.patient ? App.state.patient.id_patient : null,
          id_service: App.state.serviceChoisi.id_service,
          est_visiteur: App.state.estVisiteur,
          motif: App.state.motif,
          id_rendez_vous: App.state.rdvChoisi ? App.state.rdvChoisi.id_rendez_vous : null,
        });

        if (confirmRes.success) {
          App.state.ticket = confirmRes.ticket;
          App.state.ticket.paiement = 'stripe';
          
          const modal = document.getElementById('stripe-modal');
          if (modal) modal.remove();
          
          App.hideLoading();
          App.goTo('ticket');
        } else {
          throw new Error(confirmRes.message || App.t('error_loading'));
        }
      }
    } catch (err) {
      App.hideLoading();
      const displayError = document.getElementById('card-errors');
      if (displayError) {
        displayError.textContent = App.t('error_loading') + ': ' + err.message;
      }
      console.error('❌ Erreur paiement:', err);
    }
  },

  cancelPayment() {
    const modal = document.getElementById('stripe-modal');
    if (modal) modal.remove();
    App.hideLoading();
  },

  async payCash() {
    App.showLoading(App.t('payment_cashier_loading'));
    
    try {
      const payload = {
        id_service: App.state.serviceChoisi.id_service,
        id_patient: App.state.patient ? App.state.patient.id_patient : null,
        carte_rfid: App.state.patient ? App.state.patient.carte_rfid : null,
        id_rendez_vous: App.state.rdvChoisi ? App.state.rdvChoisi.id_rendez_vous : null
      };
      
      const res = await Api.cashierTicket(payload);
      
      if (res.success) {
        App.state.ticket = res.ticket;
        App.state.ticket.paiement = 'especes';
        App.hideLoading();
        App.goTo('ticket');
      }
    } catch (err) {
      App.hideLoading();
      App.showError('service-error', 'error_ticket_cashier');
    }
  },

  cancel() {
    App.goTo('welcome');
  }
};

