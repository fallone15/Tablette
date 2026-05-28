# 📱 Borne d'Accueil Tactile CareTrack (Tablette)

Ce projet correspond à la **Borne d'Accueil Tactile CareTrack** (conçue pour une utilisation sur tablette). Elle permet aux patients de s'enregistrer de manière autonome dans l'établissement de santé, soit par carte RFID (avec code PIN), soit par enregistrement rapide sans carte (Guest). La borne prend en charge le paiement des consultations (en ligne via Stripe ou en espèces au secrétariat), fournit une assistance vocale multilingue interactive, et permet d'imprimer un ticket de passage.

L'application est divisée en un **Frontend** moderne (HTML5 / Vanilla CSS / Vanilla JS) et un **Backend** REST & WebSocket (Node.js / Express / PostgreSQL / Python).

---

## 🛠️ Architecture du Projet

Le dépôt [Tablette](file:///d:/Tablette) est structuré comme suit :

```text
├── kiosk-frontend/          # Interface tactile (Client)
│   ├── css/
│   │   ├── kiosk.css        # Styles visuels premium (Glassmorphism, animations)
│   │   └── voice-assistant.css # Indicateurs et animations de l'assistant vocal
│   ├── js/
│   │   ├── screens/         # Logique spécifique par écran
│   │   │   ├── appointments.js  # Validation & check-in de rendez-vous
│   │   │   ├── catalog.js       # Liste et disponibilités des médecins
│   │   │   ├── confirm.js       # Confirmation d'identité patient
│   │   │   ├── guest.js         # Parcours sans carte (visiteur rapide)
│   │   │   ├── payment.js       # Choix du moyen de paiement (Stripe / Espèces)
│   │   │   ├── pin.js           # Pavé numérique et validation de code PIN
│   │   │   ├── rfid.js          # Attente de scan de carte RFID
│   │   │   ├── services.js      # Grille des spécialités & temps d'attente
│   │   │   └── ticket.js        # Affichage, QR et impression du ticket final
│   │   ├── api.js           # Client API (fetch vers le backend)
│   │   ├── app.js           # Gestionnaire d'état et navigation de l'application
│   │   ├── translations.js  # Base i18n (FR, EN, AR, Darija)
│   │   └── voice-assistant.js # Assistant vocal (TTS, Speech Recognition)
│   ├── audio/               # Fichiers audio préenregistrés (MP3) par langue
│   ├── index.html           # Structure principale de l'application Borne
│   └── recorder.html        # Console d'enregistrement studio pour l'assistant
│
├── kiosk-backend/           # Serveur de la borne (Serveur)
│   ├── routes/              # Endpoints API Express
│   │   ├── auth.js          # Authentification RFID + Code PIN
│   │   ├── kiosk.js         # Logique métier, tickets, et affectation médecins
│   │   ├── payment.js       # Création & confirmation de paiement Stripe
│   │   └── services.js      # Listes des spécialités et catalogue
│   ├── services/            # Services d'intégration matérielle
│   │   ├── cardReader.js    # Pont WebSocket entre Python et Node.js
│   │   ├── cardReader.py    # Script Python d'écoute des lecteurs de cartes à puce (pyscard)
│   │   └── cardReader.ps1   # Script PowerShell d'écoute (alternative Windows)
│   ├── migrate_codes.js     # Script de mise à jour des codes services
│   ├── server.js            # Fichier d'entrée Express & WebSocket
│   ├── package.json         # Dépendances Node.js du backend
│   └── .env.example         # Gabarit pour la configuration locale
│
├── hospital.sql             # Dump de la base de données PostgreSQL
└── scripts_vocaux.md        # Scripts et phrases officielles à enregistrer
```

---

## 🌟 Fonctionnalités Clés

### 1. 💳 Identification Hybride (RFID & Code PIN)
- **Lecteur de cartes PC/SC** : Le script [cardReader.py](file:///d:/Tablette/kiosk-backend/services/cardReader.py) écoute en arrière-plan les lecteurs de cartes à puce (ex: Thales/Gemalto) à contact ISO 7816 ou NFC.
- **Support des cartes ACOS3** : Lecture du fichier sécurisé `A0A0` pour extraire l'ID du patient (ex: `PAT9660`). En cas de carte standard, le système bascule sur la lecture de l'UID matériel brut.
- **Saisie de code PIN** : Un pavé numérique tactile sécurisé ([pin.js](file:///d:/Tablette/kiosk-frontend/js/screens/pin.js)) permet au patient de s'authentifier à l'aide de son PIN haché en base de données avec `bcryptjs`.
- **Saisie manuelle de secours** : Possibilité de saisir le numéro de carte directement à l'écran si le lecteur est absent.

### 2. 🎙️ Assistant Vocal Intégral & Commande Vocale
- **Studio d'Enregistrement Dédié** : [recorder.html](file:///d:/Tablette/kiosk-frontend/recorder.html) permet aux administrateurs d'enregistrer des fichiers MP3 pour chaque consigne directement depuis le microphone de la tablette et de les envoyer au serveur.
- **Assistance Vocale Multilingue** : Les voix guident l'utilisateur à chaque étape dans 4 langues : Français (fr), Anglais (en), Arabe standard (ar) et Darija marocain (ary).
- **Navigation Vocale Mains-libres** : L'intégration de la Web Speech API ([voice-assistant.js](file:///d:/Tablette/kiosk-frontend/js/voice-assistant.js)) permet de répondre vocalement aux invites (ex. dire *"Oui"*, *"Non"*, *"Carte"*, *"Espèces"*).
- **Fallback Intelligent** : En l'absence de fichier audio enregistré, le système utilise la synthèse vocale (`SpeechSynthesis`) locale du navigateur.

### 3. 📅 Gestion des Consultations & Rendez-vous du Jour
- **Check-in de RDV** : Détecte automatiquement les rendez-vous pris en ligne par le patient pour la journée courante ([appointments.js](file:///d:/Tablette/kiosk-frontend/js/screens/appointments.js)).
- **Parcours Visiteur (Guest)** : Permet à un utilisateur sans dossier médical de s'enregistrer directement en choisissant une spécialité ([guest.js](file:///d:/Tablette/kiosk-frontend/js/screens/guest.js)).
- **Orientation Intelligente** : Recherche en temps réel du médecin disponible dans le service concerné ([kiosk.js](file:///d:/Tablette/kiosk-backend/routes/kiosk.js)), calcul du temps d'attente estimé, et attribution d'une salle de consultation libre.

### 4. 💰 Module de Paiement Intégral (Stripe / Caisse)
- **Paiement par Carte (Stripe)** : Création d'une `PaymentIntent` via le SDK Stripe ([payment.js](file:///d:/Tablette/kiosk-backend/routes/payment.js)) permettant de régler la consultation directement par carte sur la borne.
- **Paiement en Espèces (Caisse)** : Émet un ticket d'attente préliminaire à présenter à la caisse d'accueil avant d'entrer dans la file d'attente active des médecins.

### 5. 🖨️ Émission de Ticket
- Impression physique du ticket de passage avec le numéro de file (ex: `RAD-3`), le nom du service, le médecin affecté, le numéro de salle et l'heure estimée de passage.

---

## 🛠️ Configuration & Installation

### 1. Base de données
La borne d'accueil utilise la même base de données PostgreSQL `hospital` que le portail principal d'administration.
- Créez la base de données PostgreSQL localement.
- Importez le fichier [hospital.sql](file:///d:/Tablette/hospital.sql) :
  ```bash
  psql -U postgres -d hospital -f hospital.sql
  ```

### 2. Configuration du Backend
1. Accédez au dossier [kiosk-backend/](file:///d:/Tablette/kiosk-backend).
2. Créez un fichier `.env` à partir du fichier [.env.example](file:///d:/Tablette/kiosk-backend/.env.example) :
   ```env
   PORT=3001
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=hospital
   DB_USER=postgres
   DB_PASSWORD=votre_mot_de_passe
   STRIPE_SECRET_KEY=sk_test_...
   GUEST_PATIENT_ID=999
   ```
3. Installez les dépendances Node.js :
   ```bash
   npm install
   ```
4. Exécutez le script de migration (pour ajouter les codes de service si non présents) :
   ```bash
   node migrate_codes.js
   ```

### 3. Dépendances du Lecteur RFID (Python)
Le moniteur de carte s'appuie sur la bibliothèque Python `pyscard` pour dialoguer avec l'API Windows Smart Card (WinSCard).
- Installez la dépendance :
  ```bash
  pip install pyscard
  ```
*Note : Le serveur Node.js tentera d'installer automatiquement `pyscard` au premier démarrage s'il n'est pas détecté.*

---

## 🚀 Démarrage

### Mode Développement
Démarrez le serveur avec rechargement automatique en cas de modification (nodemon) :
```bash
cd kiosk-backend
npm run dev
```

### Mode Production
Démarrez le serveur normalement :
```bash
cd kiosk-backend
npm start
```

### Accès aux Applications
- **Borne d'accueil tactile** : [http://localhost:3001](http://localhost:3001)
- **CareTrack Studio (Enregistreur de voix)** : [http://localhost:3001/recorder.html](http://localhost:3001/recorder.html)
- **WebSocket Lecteur Carte** : `ws://localhost:3001/ws/card`

---

## 💡 Notes de Développement
- **Fichiers Audio** : Les phrases lues par l'assistant vocal sont documentées dans [scripts_vocaux.md](file:///d:/Tablette/scripts_vocaux.md). Lors de l'enregistrement depuis le studio, les fichiers sont sauvegardés dans [kiosk-frontend/audio/](file:///d:/Tablette/kiosk-frontend/audio/).
- **Gestion des Écrans** : Le frontend utilise un modèle Single Page Application (SPA). Le fichier [app.js](file:///d:/Tablette/kiosk-frontend/js/app.js) gère le routage virtuel entre les divs `.screen` en masquant/affichant les blocs de code associés.
