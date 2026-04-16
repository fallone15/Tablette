/* ─── confirm.js — Écran de confirmation patient ─── */

const ConfirmScreen = {

  populate(patient) {
    // Nom complet
    document.getElementById('patient-name').textContent =
      `${patient.prenom} ${patient.nom}`;

    // Méta infos
    const sexeLabel = patient.sexe === 'homme' ? 'Homme' : patient.sexe === 'femme' ? 'Femme' : 'Autre';
    const ageText = patient.age ? `${patient.age} ans` : '';
    const naissance = patient.date_naissance
      ? new Date(patient.date_naissance).toLocaleDateString('fr-FR')
      : '';
    document.getElementById('patient-meta').textContent =
      `${sexeLabel} · ${ageText} · Né(e) le ${naissance}`;

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
      allergEl.textContent = `⚠ Allergies: ${patient.allergies.join(', ')}`;
      allergEl.classList.remove('hidden');
    } else {
      allergEl.textContent = '✓ Pas d\'allergies connues';
      allergEl.className = 'patient-badge';
    }

    // Photo
    const photoEl = document.getElementById('patient-photo');
    const avatarEl = document.getElementById('patient-avatar');

    if (patient.photo_url) {
      photoEl.src = `http://localhost:3000/uploads/${patient.photo_url}`;
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
