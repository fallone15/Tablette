/* ─── voice-assistant.js — Assistant Vocal CareTrack (TTS & STT) ─── */

const VoiceAssistant = {
  active: false,
  speaking: false,
  listening: false,
  recognition: null,
  synthesis: window.speechSynthesis,
  currentUtterance: null,
  currentAudio: null, // Track currently playing custom audio recording

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
      'patient-confirm': {
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
          action: () => {
            if (App.state.estVisiteur) {
              console.log("🚫 Payment by card not allowed for visitors via voice command.");
              return;
            }
            PaymentScreen.payCB();
          }
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

  deactivate() {
    this.active = false;
    const btn = document.getElementById('voice-toggle-btn');
    const tooltip = document.getElementById('voice-tooltip');
    if (btn) {
      btn.classList.remove('active');
      btn.classList.remove('speaking');
      btn.classList.remove('listening');
    }
    if (tooltip) {
      tooltip.style.display = 'block';
    }
    this.stopSpeaking();
    this.stopListening();
    console.log("🎙️ Assistant vocal : DÉSACTIVÉ (Retour accueil)");
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
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
      } catch (e) {}
      this.currentAudio = null;
    }
    if (this.synthesis && this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.speaking = false;
    const btn = document.getElementById('voice-toggle-btn');
    if (btn) btn.classList.remove('speaking');
  },

  // Lit un fichier audio personnalisé s'il existe, sinon se replie sur le TTS
  playAudioOrFallback(key, fallbackText) {
    const lang = App.state.lang;
    const audioUrl = `audio/${lang}/${key}.mp3?t=${Date.now()}`;
    
    this.stopSpeaking();
    this.stopListening();
    
    const audio = new Audio(audioUrl);
    this.currentAudio = audio;
    
    audio.oncanplaythrough = () => {
      if (this.currentAudio !== audio) return;
      
      this.speaking = true;
      const btn = document.getElementById('voice-toggle-btn');
      if (btn) btn.classList.add('speaking');
      
      audio.play().catch(e => {
        console.warn("⚠️ Impossible de lancer la lecture audio :", e);
        this.speak(fallbackText);
      });
    };
    
    audio.onended = () => {
      if (this.currentAudio === audio) {
        this.currentAudio = null;
      }
      this.speaking = false;
      const btn = document.getElementById('voice-toggle-btn');
      if (btn) btn.classList.remove('speaking');
      
      if (this.active) {
        this.startListening();
      }
    };
    
    audio.onerror = () => {
      if (this.currentAudio !== audio) return;
      this.currentAudio = null;
      console.log(`🔊 Audio personnalisé absent (${audioUrl}). Utilisation de la synthèse vocale.`);
      this.speak(fallbackText);
    };
  },

  // Analyse et lecture intelligente de l'écran en cours (système hybride)
  speakCurrentScreen() {
    const screen = App.currentScreen;

    switch (screen) {
      case 'welcome':
        this.playAudioOrFallback('voice_intro_welcome', App.t('voice_intro_welcome'));
        break;
      case 'rfid-scan':
        this.playAudioOrFallback('voice_guide_rfid', App.t('voice_guide_rfid'));
        break;
      case 'pin-entry':
        this.playAudioOrFallback('voice_guide_pin', App.t('voice_guide_pin'));
        break;
      case 'patient-confirm': {
        const patientName = document.getElementById('patient-name')?.textContent || "";
        const fallbackText = (patientName ? patientName + ". " : "") + App.t('voice_guide_confirm');
        this.playAudioOrFallback('voice_guide_confirm', fallbackText);
        break;
      }
      case 'appointments':
        this.playAudioOrFallback('voice_guide_appts', App.t('voice_guide_appts'));
        break;
      case 'payment': {
        const amount = document.getElementById('payment-amount')?.textContent || "";
        const promptKey = App.state.estVisiteur ? 'voice_guide_payment_guest' : 'voice_guide_payment';
        const fallbackText = (amount ? App.t('payment_amount') + " " + amount + ". " : "") + App.t(promptKey);
        this.playAudioOrFallback(promptKey, fallbackText);
        break;
      }
      case 'service-select':
        this.playAudioOrFallback('voice_guide_service', App.t('voice_guide_service'));
        break;
      case 'guest-flow':
        this.playAudioOrFallback('voice_guide_guest', App.t('voice_guide_guest'));
        break;
      case 'ticket': {
        const num = document.getElementById('ticket-number')?.textContent || "";
        const fallbackText = (num ? App.t('ticket_number_label') + " " + num + ". " : "") + App.t('voice_guide_ticket');
        this.playAudioOrFallback('voice_guide_ticket', fallbackText);
        break;
      }
      case 'catalog':
        this.playAudioOrFallback('voice_guide_catalog', App.t('voice_guide_catalog'));
        break;
      default:
        this.stopSpeaking();
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
