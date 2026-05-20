/* ─── voice-assistant.js — Assistant Vocal CareTrack (TTS & STT) ─── */

const VoiceAssistant = {
  active: false,
  speaking: false,
  listening: false,
  recognition: null,
  synthesis: window.speechSynthesis,
  currentUtterance: null,

  // Configuration des langues pour la synthèse vocale
  langCodes: {
    fr: 'fr-FR',
    en: 'en-US',
    ar: 'ar-MA' // Arabe marocain si dispo, sinon fallback ar-AE
  },

  // Commandes vocales acceptées par écran
  commands: {
    global: {
      retour: () => App.back(),
      annuler: () => App.cancel(),
      aide: () => VoiceAssistant.speakCurrentScreen()
    },
    screens: {
      'welcome': {
        carte: () => App.goTo('rfid-scan'),
        nouveau: () => App.goTo('guest-flow'),
        catalogue: () => App.goTo('catalog')
      },
      'screen-patient-confirm': {
        oui: () => ConfirmScreen.yes(),
        non: () => App.goTo('welcome')
      },
      'payment': {
        carte: () => PaymentScreen.payCB(),
        espèces: () => PaymentScreen.payCash()
      },
      'ticket': {
        imprimer: () => window.print(),
        accueil: () => App.goTo('welcome'),
        maison: () => App.goTo('welcome')
      }
    }
  },

  init() {
    this.createWidget();
    this.initSpeechRecognition();
    
    // Hook dans le routeur principal pour parler automatiquement lors du changement d'écran
    const originalGoTo = App.goTo;
    App.goTo = function(screenName, isBack) {
      originalGoTo.apply(App, [screenName, isBack]);
      // Attendre un court instant que l'écran soit affiché pour parler
      setTimeout(() => {
        if (VoiceAssistant.active) {
          VoiceAssistant.speakCurrentScreen();
        }
      }, 300);
    };

    // Parler si la langue change
    const originalSetLanguage = App.setLanguage;
    App.setLanguage = function(lang) {
      originalSetLanguage.apply(App, [lang]);
      if (VoiceAssistant.active) {
        VoiceAssistant.speakCurrentScreen();
      }
    };
  },

  // Création dynamique du Widget Visual Premium
  createWidget() {
    const widget = document.createElement('div');
    widget.id = 'voice-assistant-widget';
    widget.className = 'voice-widget';
    widget.innerHTML = `
      <button class="voice-btn" id="voice-toggle-btn" title="Activer l'assistant vocal">
        <div class="voice-icon-wrap">
          <span class="voice-mic-icon">🎙️</span>
        </div>
        <div class="sound-wave">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
      </button>
      <div class="voice-tooltip" id="voice-tooltip">
        <span data-i18n="voice_assistant_help">Besoin d'aide vocale ? Cliquez ici !</span>
      </div>
    `;
    document.body.appendChild(widget);

    document.getElementById('voice-toggle-btn').addEventListener('click', () => this.toggle());
  },

  toggle() {
    this.active = !this.active;
    const btn = document.getElementById('voice-toggle-btn');
    const tooltip = document.getElementById('voice-tooltip');

    if (this.active) {
      btn.classList.add('active');
      if (tooltip) tooltip.style.display = 'none';
      this.speakCurrentScreen();
    } else {
      btn.classList.remove('active');
      this.stopSpeaking();
      this.stopListening();
    }
    console.log(`🎙️ Assistant vocal : ${this.active ? 'ACTIF' : 'INACTIF'}`);
  },

  // Initialisation de la reconnaissance vocale
  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("⚠️ La reconnaissance vocale n'est pas supportée par ce navigateur.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
      this.listening = true;
      document.getElementById('voice-toggle-btn').classList.add('listening');
    };

    this.recognition.onend = () => {
      this.listening = false;
      document.getElementById('voice-toggle-btn').classList.remove('listening');
      // Relancer l'écoute si l'assistant est toujours actif et ne parle pas
      if (this.active && !this.speaking) {
        setTimeout(() => this.startListening(), 1000);
      }
    };

    this.recognition.onresult = (event) => {
      const resultText = event.results[0][0].transcript.toLowerCase().trim();
      console.log(`🗣️ Commande entendue : "${resultText}"`);
      this.handleVoiceCommand(resultText);
    };

    this.recognition.onerror = (event) => {
      console.error("❌ Erreur de reconnaissance vocale :", event.error);
    };
  },

  startListening() {
    if (!this.recognition || this.listening || !this.active) return;
    try {
      this.recognition.lang = this.langCodes[App.state.lang] || 'fr-FR';
      this.recognition.start();
    } catch (e) {
      console.error(e);
    }
  },

  stopListening() {
    if (this.recognition && this.listening) {
      this.recognition.stop();
    }
  },

  // Synthèse vocale (Text-To-Speech)
  speak(text) {
    if (!this.synthesis) return;
    this.stopSpeaking();
    this.stopListening();

    this.speaking = true;
    document.getElementById('voice-toggle-btn').classList.add('speaking');

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.lang = this.langCodes[App.state.lang] || 'fr-FR';
    
    // Essayer de trouver une voix naturelle dans la langue choisie
    const voices = this.synthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(App.state.lang));
    if (voice) this.currentUtterance.voice = voice;

    this.currentUtterance.onend = () => {
      this.speaking = false;
      document.getElementById('voice-toggle-btn').classList.remove('speaking');
      // Commencer à écouter les commandes vocales après avoir fini de parler
      if (this.active) {
        this.startListening();
      }
    };

    this.currentUtterance.onerror = () => {
      this.speaking = false;
      document.getElementById('voice-toggle-btn').classList.remove('speaking');
    };

    this.synthesis.speak(this.currentUtterance);
  },

  stopSpeaking() {
    if (this.synthesis && this.synthesis.speaking) {
      this.synthesis.cancel();
      this.speaking = false;
      document.getElementById('voice-toggle-btn').classList.remove('speaking');
    }
  },

  // Analyse et lecture intelligente de l'écran en cours
  speakCurrentScreen() {
    const screen = App.currentScreen;
    let text = "";

    // 1. Détermination du texte à prononcer selon l'écran actif
    switch (screen) {
      case 'welcome':
        text = App.t('voice_intro_welcome');
        break;
      case 'rfid-scan':
        text = App.t('rfid_title') + ". " + App.t('rfid_subtitle');
        break;
      case 'pin-entry':
        text = App.t('pin_title') + ". Veuillez composer vos quatre chiffres sur le clavier numérique.";
        break;
      case 'screen-patient-confirm':
        const patientName = document.getElementById('patient-name')?.textContent || "";
        text = App.t('confirm_title') + " " + patientName + " ? Dites : Oui, ou dites : Non.";
        break;
      case 'appointments':
        text = App.t('appts_title') + ". " + App.t('appts_subtitle');
        break;
      case 'payment':
        const amount = document.getElementById('payment-amount')?.textContent || "";
        text = App.t('payment_title') + ". Le montant est de " + amount + ". Dites : Carte, pour régler par carte bancaire. Ou dites : Espèces, pour payer à l'accueil.";
        break;
      case 'service-select':
        text = App.t('service_title') + ". " + App.t('service_subtitle');
        break;
      case 'guest-flow':
        text = App.t('guest_title') + ". " + App.t('guest_subtitle1') + ". Veuillez sélectionner une spécialité dans la liste.";
        break;
      case 'ticket':
        const num = document.getElementById('ticket-number')?.textContent || "";
        text = App.t('ticket_success') + ". Votre numéro d'attente est le " + num + ". " + App.t('ticket_msg_1') + " " + App.t('ticket_msg_2');
        break;
      case 'catalog':
        text = App.t('catalog_title') + ". " + App.t('catalog_subtitle');
        break;
      default:
        text = "";
    }

    if (text) {
      this.speak(text);
    }
  },

  // Analyseur de commandes vocales reçues
  handleVoiceCommand(text) {
    // 1. Commandes Globales (Retour, Annuler...)
    for (const [command, action] of Object.entries(this.commands.global)) {
      if (text.includes(command)) {
        action();
        return;
      }
    }

    // 2. Commandes Spécifiques à l'Écran Courant
    const currentScreen = App.currentScreen;
    const screenCommands = this.commands.screens[currentScreen];

    if (screenCommands) {
      for (const [command, action] of Object.entries(screenCommands)) {
        if (text.includes(command)) {
          action();
          return;
        }
      }
    }

    console.log(`ℹ️ Commande non reconnue dans ce contexte : "${text}"`);
  }
};

// Auto-chargement des voix système au démarrage
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    console.log("🔊 Voix de synthèse système chargées.");
  };
}
