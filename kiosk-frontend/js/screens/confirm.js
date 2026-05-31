/* ─── confirm.js — Écran de confirmation patient ─── */

const ConfirmScreen = {

  populate(patient) {
    // Nom complet
    document.getElementById('patient-name').textContent =
      `${patient.prenom} ${patient.nom}`;

    // Méta infos
    const localeMap = { fr: 'fr-FR', en: 'en-US', ar: 'ar-MA', ary: 'ar-MA' };
    const locale = localeMap[App.state.lang] || 'fr-FR';

    const sexeKey = patient.sexe === 'homme' ? 'male' : patient.sexe === 'femme' ? 'female' : 'other';
    const sexeLabel = App.t(sexeKey);
    
    const ageText = patient.age ? App.t('years_old', { n: patient.age }) : '';
    const naissance = patient.date_naissance
      ? new Date(patient.date_naissance).toLocaleDateString(locale)
      : '';
      
    const bornText = naissance ? App.t('born_on', { date: naissance }) : '';
    
    document.getElementById('patient-meta').textContent =
      `${sexeLabel} · ${ageText} · ${bornText}`;

    // Groupe sanguin
    const bloodEl = document.getElementById('patient-blood');
    if (patient.groupe_sanguin) {
      bloodEl.textContent = `🩸 ${patient.groupe_sanguin}`;
      bloodEl.classList.remove('hidden');
    } else {
      bloodEl.classList.add('hidden');
    }

    // Allergies
    const allergEl = document.getElementById('patient-allergies');
    if (patient.allergies && patient.allergies.length > 0 && patient.allergies[0] !== '') {
      allergEl.textContent = `⚠ ${App.t('allergies_label')}: ${patient.allergies.join(', ')}`;
      allergEl.classList.remove('hidden');
    } else {
      allergEl.textContent = `✓ ${App.t('no_allergies')}`;
      allergEl.className = 'patient-badge';
    }

    // Photo
    const photoEl = document.getElementById('patient-photo');
    const avatarEl = document.getElementById('patient-avatar');

    if (patient.photo_url) {
      photoEl.src = `http://${window.location.hostname}:3000/uploads/${patient.photo_url}`;
      photoEl.classList.remove('hidden');
      avatarEl.classList.add('hidden');
      photoEl.onerror = () => {
        photoEl.classList.add('hidden');
        avatarEl.classList.remove('hidden');
      };
    } else {
      photoEl.classList.add('hidden');
      avatarEl.classList.remove('hidden');
    }
  },

  yes() {
    App.state.estVisiteur = false;
    App.goTo('appointments');
  },
};
