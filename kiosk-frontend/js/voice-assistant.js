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
    ar: 'ar-MA',
    ary: 'ar-MA'
  },

  // Commandes vocales acceptées par écran avec variantes multilingues (Synonymes)
  commands: {
    global: {
      retour: {
        keywords: ['retour', 'back', 'رجوع', 'رجع'],
        action: () => App.back()
      },
      annuler: {
        keywords: ['annuler', 'cancel', 'إلغاء', 'حبس', 'بلاش'],
        action: () => App.cancel()
      },
      aide: {
        keywords: ['aide', 'help', 'مساعدة', 'عاوني'],
        action: () => VoiceAssistant.speakCurrentScreen()
      }
    },
    screens: {
      'welcome': {
        carte: {
          keywords: ['carte', 'card', 'بطاقة', 'كارط'],
          action: () => App.goTo('rfid-scan')
        },
        nouveau: {
          keywords: ['nouveau', 'new', 'جديد', 'بلا كارط', 'ما عنديش'],
          action: () => App.goTo('guest-flow')
        },
        catalogue: {
          keywords: ['catalogue', 'catalog', 'دليل', 'أطباء', 'طبيب'],
          action: () => App.goTo('catalog')
        }
      },
      'screen-patient-confirm': {
        oui: {
          keywords: ['oui', 'yes', 'نعم', 'إيه', 'أنا'],
          action: () => ConfirmScreen.yes()
        },
        non: {
          keywords: ['non', 'no', 'لا', 'ماشي أنا', 'لا لا'],
          action: () => App.goTo('welcome')
        }
      },
      'payment': {
        carte: {
          keywords: ['carte', 'card', 'بطاقة', 'بنكية'],
          action: () => PaymentScreen.payCB()
        },
        espèces: {
          keywords: ['espèces', 'cash', 'نقدا', 'نقداً', 'كاش', 'فلوس'],
          action: () => PaymentScreen.payCash()
        }
      },
      'ticket': {
        imprimer: {
          keywords: ['imprimer', 'print', 'طباعة', 'طبع'],
          action: () => window.print()
        },
        accueil: {
          keywords: ['accueil', 'home', 'الرئيسية', 'ميزون', 'دار', 'أكوي'],
          action: () => App.goTo('welcome')
        }
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
    
    const targetLang = this.langCodes[App.state.lang] || 'fr-FR';
    this.currentUtterance.lang = targetLang;
    
    // Essayer de trouver une voix naturelle dans la langue choisie
    const voices = this.synthesis.getVoices();
    let voice = voices.find(v => v.lang.toLowerCase() === targetLang.toLowerCase());
    if (!voice) {
      voice = voices.find(v => v.lang.toLowerCase().startsWith(targetLang.substring(0, 2).toLowerCase()));
    }
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
        text = App.t('pin_title') + ". " + (App.state.lang === 'ary' ? "عافاك دخل أربعة د الأرقام ديالك فالكلافي." : App.state.lang === 'ar' ? "يرجى كتابة أرقامك الأربعة على لوحة المفاتيح." : App.state.lang === 'en' ? "Please compose your four digits on the numeric keypad." : "Veuillez composer vos quatre chiffres sur le clavier numérique.");
        break;
      case 'screen-patient-confirm':
        const patientName = document.getElementById('patient-name')?.textContent || "";
        text = App.t('confirm_title') + " " + patientName + " ? " + (App.state.lang === 'ary' ? "قول : إيه، ولا قول : لا." : App.state.lang === 'ar' ? "قل : نعم، أو قل : لا." : App.state.lang === 'en' ? "Say: Yes, or say: No." : "Dites : Oui, ou dites : Non.");
        break;
      case 'appointments':
        text = App.t('appts_title') + ". " + App.t('appts_subtitle');
        break;
      case 'payment':
        const amount = document.getElementById('payment-amount')?.textContent || "";
        text = App.t('payment_title') + ". " + (App.state.lang === 'ary' ? "الثمن هو " + amount + ". قول : كارط، باش تخلص بالبطاقة البنكية. ولا قول : كاش، باش تخلص فالمكتب د الاستقبال." : App.state.lang === 'ar' ? "المبلغ هو " + amount + ". قل : بطاقة، للدفع بالبطاقة البنكية. أو قل : كاش، للدفع عند الاستقبال." : App.state.lang === 'en' ? "The amount is " + amount + ". Say: Card, to pay by bank card. Or say: Cash, to pay at the reception." : "Le montant est de " + amount + ". Dites : Carte, pour régler par carte bancaire. Ou dites : Espèces, pour payer à l'accueil.");
        break;
      case 'service-select':
        text = App.t('service_title') + ". " + App.t('service_subtitle');
        break;
      case 'guest-flow':
        text = App.t('guest_title') + ". " + App.t('guest_subtitle1') + ". " + (App.state.lang === 'ary' ? "عافاك عزل التخصص ديالك من الليستة." : App.state.lang === 'ar' ? "يرجى اختيار تخصص من القائمة." : App.state.lang === 'en' ? "Please select a specialty from the list." : "Veuillez sélectionner une spécialité dans la liste.");
        break;
      case 'ticket':
        const num = document.getElementById('ticket-number')?.textContent || "";
        text = App.t('ticket_success') + ". " + (App.state.lang === 'ary' ? "الرقم ديالك هو " + num + ". " : App.state.lang === 'ar' ? "رقمك هو " + num + ". " : App.state.lang === 'en' ? "Your number is " + num + ". " : "Votre numéro d'attente est le " + num + ". ") + App.t('ticket_msg_1') + " " + App.t('ticket_msg_2');
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
    for (const [key, cmd] of Object.entries(this.commands.global)) {
      if (cmd.keywords.some(kw => text.includes(kw))) {
        cmd.action();
        return;
      }
    }

    // 2. Commandes Spécifiques à l'Écran Courant
    const currentScreen = App.currentScreen;
    const screenCommands = this.commands.screens[currentScreen];

    if (screenCommands) {
      for (const [key, cmd] of Object.entries(screenCommands)) {
        if (cmd.keywords.some(kw => text.includes(kw))) {
          cmd.action();
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
