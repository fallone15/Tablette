const express = require('express');
const router = express.Router();
const { pool } = require('../server');

// ─── Génération numéro de file unique ────────────────────────────────────────
function generateNumeroFile() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'K-';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ─── Trouver un médecin disponible pour un service ───────────────────────────
async function findMedecinDisponible(id_service) {
  const result = await pool.query(`
    SELECT m.id_medecin, m.nom, m.prenom, m.specialite
    FROM public.medecins m
    WHERE m.id_service = $1
      AND m.disponible = true
      AND m.actif = true
    ORDER BY (
      SELECT COUNT(*) FROM public.consultations c
      WHERE c.id_medecin = m.id_medecin
        AND c.statut = 'en_attente'
        AND DATE(c.heure_arrivee) = CURRENT_DATE
    ) ASC
    LIMIT 1
  `, [id_service]);

  return result.rows[0] || null;
}

// ─── Calculer l'heure estimée de passage ─────────────────────────────────────
async function calcHeurEstimee(id_medecin, duree_moyenne) {
  // Compter les consultations en attente pour ce médecin aujourd'hui
  const result = await pool.query(`
    SELECT COUNT(*) AS nb
    FROM public.consultations
    WHERE id_medecin = $1
      AND statut = 'en_attente'
      AND DATE(heure_arrivee) = CURRENT_DATE
  `, [id_medecin]);

  const nbEnAttente = parseInt(result.rows[0].nb) || 0;
  const minutesAttente = nbEnAttente * duree_moyenne;
  const heureEstimee = new Date(Date.now() + minutesAttente * 60 * 1000);
  return heureEstimee;
}

// ─── Trouver ou créer un patient visiteur générique ──────────────────────────
async function getOrCreateGuestPatient() {
  // Chercher un patient système existant
  const existing = await pool.query(`
    SELECT id_patient FROM public.patients WHERE carte_rfid = 'KIOSK-GUEST' LIMIT 1
  `);

  if (existing.rows.length > 0) {
    return existing.rows[0].id_patient;
  }

  // Créer le patient visiteur générique (une seule fois)
  const bcrypt = require('bcryptjs');
  const pinHash = await bcrypt.hash('0000', 10);

  const insert = await pool.query(`
    INSERT INTO public.patients (
      carte_rfid, nom, prenom, date_naissance, sexe,
      email, telephone, code_pin, actif, email_verified
    ) VALUES (
      'KIOSK-GUEST', 'VISITEUR', 'Borne Accueil', '2000-01-01', 'autre',
      'kiosk-guest@caretrack.internal', '0000000000', $1, true, true
    ) RETURNING id_patient
  `, [pinHash]);

  console.log('✅ Patient visiteur générique créé, id:', insert.rows[0].id_patient);
  return insert.rows[0].id_patient;
}

// ─── POST /api/kiosk/checkin ──────────────────────────────────────────────────
/**
 * Enregistrement d'une consultation à la borne
 * Body: { id_patient (optionnel), id_service, motif (optionnel), est_visiteur }
 */
router.post('/checkin', async (req, res) => {
  const { id_patient, id_service, motif, est_visiteur } = req.body;

  if (!id_service) {
    return res.status(400).json({ error: 'Service requis' });
  }

  try {
    // Récupérer les infos du service (pour la durée)
    const serviceRes = await pool.query(
      'SELECT * FROM public.services WHERE id_service = $1 AND actif = true',
      [id_service]
    );
    if (serviceRes.rows.length === 0) {
      return res.status(404).json({ error: 'Service introuvable' });
    }
    const service = serviceRes.rows[0];

    // Déterminer le patient_id
    let patient_id = id_patient;
    if (est_visiteur || !id_patient) {
      patient_id = await getOrCreateGuestPatient();
    }

    // Trouver un médecin disponible
    const medecin = await findMedecinDisponible(id_service);
    if (!medecin) {
      return res.status(503).json({
        error: 'Aucun médecin disponible pour ce service en ce moment',
        code: 'NO_DOCTOR_AVAILABLE'
      });
    }

    // Calculer heure estimée
    const heureEstimee = await calcHeurEstimee(medecin.id_medecin, service.duree_moyenne);

    // Trouver une salle libre pour ce service
    const salleRes = await pool.query(`
      SELECT id_salle, numero_salle, batiment, etage
      FROM public.salles
      WHERE id_service = $1 AND occupee = false AND actif = true
      LIMIT 1
    `, [id_service]);
    const salle = salleRes.rows[0] || null;

    // Générer un numéro de file unique
    let numeroFile;
    let tentatives = 0;
    do {
      numeroFile = generateNumeroFile();
      const check = await pool.query(
        'SELECT 1 FROM public.consultations WHERE numero_file = $1',
        [numeroFile]
      );
      if (check.rows.length === 0) break;
      tentatives++;
    } while (tentatives < 10);

    // Insérer la consultation
    const consult = await pool.query(`
      INSERT INTO public.consultations (
        id_patient, id_service, id_medecin, id_salle,
        numero_file, heure_arrivee, heure_estimee,
        statut, motif
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'en_attente', $7)
      RETURNING *
    `, [
      patient_id,
      id_service,
      medecin.id_medecin,
      salle ? salle.id_salle : null,
      numeroFile,
      heureEstimee,
      motif || (est_visiteur ? 'Passage borne accueil (visiteur)' : 'Passage borne accueil')
    ]);

    const consultation = consult.rows[0];

    // Compter la position dans la file
    const positionRes = await pool.query(`
      SELECT COUNT(*) AS position
      FROM public.consultations
      WHERE id_medecin = $1
        AND statut = 'en_attente'
        AND DATE(heure_arrivee) = CURRENT_DATE
        AND id_consultation <= $2
    `, [medecin.id_medecin, consultation.id_consultation]);

    const position = parseInt(positionRes.rows[0].position) || 1;

    res.json({
      success: true,
      ticket: {
        numero_file: numeroFile,
        position,
        service: {
          nom: service.nom,
          tarif: service.tarif,
          duree_moyenne: service.duree_moyenne,
        },
        medecin: {
          nom: medecin.nom,
          prenom: medecin.prenom,
          specialite: medecin.specialite,
        },
        salle: salle ? {
          numero: salle.numero_salle,
          batiment: salle.batiment,
          etage: salle.etage,
        } : null,
        heure_arrivee: consultation.heure_arrivee,
        heure_estimee: heureEstimee,
        est_visiteur: !!est_visiteur,
      }
    });

  } catch (err) {
    console.error('Erreur checkin:', err);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement' });
  }
});

/**
 * GET /api/kiosk/queue/:id_service
 * Infos en temps réel sur la file d'un service
 */
router.get('/queue/:id_service', async (req, res) => {
  const { id_service } = req.params;

  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS personnes_en_attente,
        s.duree_moyenne,
        s.nom AS service_nom
      FROM public.consultations c
      JOIN public.services s ON s.id_service = c.id_service
      WHERE c.id_service = $1
        AND c.statut = 'en_attente'
        AND DATE(c.heure_arrivee) = CURRENT_DATE
      GROUP BY s.duree_moyenne, s.nom
    `, [id_service]);

    const data = result.rows[0] || { personnes_en_attente: 0, duree_moyenne: 30 };
    const temps = parseInt(data.personnes_en_attente) * parseInt(data.duree_moyenne);

    res.json({
      personnes_en_attente: parseInt(data.personnes_en_attente),
      temps_attente_estime: temps,
      service_nom: data.service_nom,
    });

  } catch (err) {
    console.error('Erreur queue:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
