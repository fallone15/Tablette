const express = require('express');
const router = express.Router();
const { pool } = require('../server');

// ─── Génération numéro de file unique ────────────────────────────────────────
function generateNumeroFile(prefix = 'K-') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = prefix;
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ─── Trouver un médecin disponible pour un service ───────────────────────────
async function findMedecinDisponible(id_service) {
  const result = await pool.query(`
    SELECT m.id_medecin, m.nom, m.prenom, m.specialite,
           (
             SELECT COUNT(*) FROM public.consultations c2 
             WHERE c2.id_medecin = m.id_medecin AND c2.statut = 'en_attente' AND DATE(c2.heure_arrivee) = CURRENT_DATE
           ) + (
             SELECT COUNT(*) FROM public.tickets t 
             WHERE t.id_medecin = m.id_medecin AND t.statut = 'en_attente' AND DATE(t.heure_arrivee) = CURRENT_DATE
           ) AS consultations_en_attente
    FROM public.medecins m
    JOIN public.disponibilites d ON m.id_medecin = d.medecin_id
    WHERE m.id_service = $1
      AND m.actif = true
      -- Vérifier le jour d'aujourd'hui
      AND d.jour_semaine = EXTRACT(DOW FROM NOW())
      -- Vérifier l'horaire actuel
      AND (
        (d.heure_debut < d.heure_fin AND CURRENT_TIME >= d.heure_debut AND CURRENT_TIME < d.heure_fin)
        OR
        (d.heure_debut >= d.heure_fin AND (CURRENT_TIME >= d.heure_debut OR CURRENT_TIME < d.heure_fin))
      )
    GROUP BY m.id_medecin, m.nom, m.prenom, m.specialite
    ORDER BY consultations_en_attente ASC
    LIMIT 1

  `, [id_service]);

  return result.rows[0] || null;
}

// ─── Calculer l'heure estimée de passage ─────────────────────────────────────
async function calcHeurEstimee(id_medecin, duree_moyenne) {
  const result = await pool.query(`
    SELECT (
      (SELECT COUNT(*) FROM public.consultations WHERE id_medecin = $1 AND statut = 'en_attente' AND DATE(heure_arrivee) = CURRENT_DATE)
      +
      (SELECT COUNT(*) FROM public.tickets WHERE id_medecin = $1 AND statut = 'en_attente' AND DATE(heure_arrivee) = CURRENT_DATE)
    ) AS nb

  `, [id_medecin]);

  const nbEnAttente = parseInt(result.rows[0].nb) || 0;
  const minutesAttente = nbEnAttente * duree_moyenne;
  const heureEstimee = new Date(Date.now() + minutesAttente * 60 * 1000);
  return heureEstimee;
}

// ─── Trouver ou créer un patient visiteur générique ──────────────────────────
async function getOrCreateGuestPatient() {
  const existing = await pool.query(`SELECT id_patient FROM public.patients WHERE carte_rfid = 'KIOSK-GUEST' LIMIT 1`);
  if (existing.rows.length > 0) return existing.rows[0].id_patient;

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
  return insert.rows[0].id_patient;
}

// ─── GET /api/kiosk/appointments/:id_patient ──────────────────────────────────
/**
 * Récupère les rendez-vous du jour pour un patient (online bookings)
 */
router.get('/appointments/:id_patient', async (req, res) => {
  const { id_patient } = req.params;
  try {
    const result = await pool.query(`
      SELECT r.id AS id_rendez_vous, r.date_rdv, r.heure_rdv, r.statut, r.motif,
             m.nom AS medecin_nom, m.prenom AS medecin_prenom, m.specialite, m.id_medecin,
             s.nom AS service_nom, s.id_service, s.tarif, s.duree_moyenne
      FROM public.rendez_vous r
      JOIN public.medecins m ON r.medecin_id = m.id_medecin
      JOIN public.services s ON m.id_service = s.id_service
      WHERE r.patient_id = $1
        AND r.date_rdv = CURRENT_DATE
        AND r.statut IN ('confirme', 'en_attente')
      ORDER BY r.heure_rdv ASC
    `, [id_patient]);

    res.json({ success: true, appointments: result.rows });
  } catch (err) {
    console.error('Erreur fetch appointments:', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ─── GET /api/kiosk/check-doctor-availability/:id_service ──────────────────────
/**
 * Vérifie si au moins un médecin est disponible pour un service
 * Vérifie: jour de la semaine + horaires de travail + pas en consultation
 */
router.get('/check-doctor-availability/:id_service', async (req, res) => {
  const { id_service } = req.params;
  
  try {
    // Récupérer le jour de la semaine actuel (0=dimanche en JS, mais PostgreSQL utilise généralement lundi=0)
    // Vérifier avec EXTRACT(DOW FROM NOW()) : dimanche=0, lundi=1, ..., samedi=6
    const result = await pool.query(`
      SELECT m.id_medecin, m.nom, m.prenom, m.specialite,
             d.heure_debut, d.heure_fin,
             (
               SELECT COUNT(*) FROM public.consultations c
               WHERE c.id_medecin = m.id_medecin AND c.statut = 'en_attente' AND DATE(c.heure_arrivee) = CURRENT_DATE
             ) + (
               SELECT COUNT(*) FROM public.tickets t
               WHERE t.id_medecin = m.id_medecin AND t.statut = 'en_attente' AND DATE(t.heure_arrivee) = CURRENT_DATE
             ) AS consultations_en_attente
      FROM public.medecins m
      JOIN public.disponibilites d ON m.id_medecin = d.medecin_id
      WHERE m.id_service = $1 
        AND m.actif = true
        AND d.jour_semaine = EXTRACT(DOW FROM NOW())
        AND (
          (d.heure_debut < d.heure_fin AND CURRENT_TIME >= d.heure_debut AND CURRENT_TIME < d.heure_fin)
          OR
          (d.heure_debut >= d.heure_fin AND (CURRENT_TIME >= d.heure_debut OR CURRENT_TIME < d.heure_fin))
        )
      GROUP BY m.id_medecin, m.nom, m.prenom, m.specialite, d.heure_debut, d.heure_fin
      ORDER BY m.id_medecin
    `, [id_service]);


    const available = result.rows.length > 0;

    res.json({
      success: true,
      available: available,
      doctors: result.rows,
      message: available 
        ? `${result.rows.length} médecin(s) disponible(s)` 
        : 'Aucun médecin disponible pour ce service aujourd\'hui à cette heure'
    });
  } catch (err) {
    console.error('Erreur vérification médecins:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur.' });
  }
});

// ─── POST /api/kiosk/checkin ──────────────────────────────────────────────────
/**
 * Enregistrement d'une consultation (doit être payée ou va devenir un checkin validé)
 * Body: { id_patient, id_service, motif, est_visiteur, id_rendez_vous (opt), mode_paiement (opt) }
 */
router.post('/checkin', async (req, res) => {
  const { id_patient, id_service, motif, est_visiteur, id_rendez_vous, mode_paiement } = req.body;

  if (!id_service) {
    return res.status(400).json({ error: 'Service requis' });
  }

  try {
    const serviceRes = await pool.query('SELECT * FROM public.services WHERE id_service = $1 AND actif = true', [id_service]);
    if (serviceRes.rows.length === 0) return res.status(404).json({ error: 'Service introuvable' });
    const service = serviceRes.rows[0];

    let patient_id = id_patient;
    if (est_visiteur || !id_patient) {
      patient_id = await getOrCreateGuestPatient();
    }

    let medecin = null;
    let rdvHeure = null;
    let rdvFound = false;

    // Si lié à un RDV existant
    if (id_rendez_vous) {
      const rdvRes = await pool.query(`
        SELECT r.*, m.id_medecin, m.nom, m.prenom, m.specialite
        FROM public.rendez_vous r
        JOIN public.medecins m ON r.medecin_id = m.id_medecin
        WHERE r.id = $1 AND r.patient_id = $2
      `, [id_rendez_vous, patient_id]);
      
      if (rdvRes.rows.length > 0) {
        rdvFound = true;
        medecin = {
          id_medecin: rdvRes.rows[0].id_medecin,
          nom: rdvRes.rows[0].nom,
          prenom: rdvRes.rows[0].prenom,
          specialite: rdvRes.rows[0].specialite
        };
        // heure_rdv est un time, on le combine avec la date du jour pour l'heure estimée
        const timeParts = String(rdvRes.rows[0].heure_rdv).split(':');
        const now = new Date();
        now.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
        rdvHeure = now;
      }
    }

    // Sinon trouver un médecin dispo
    if (!medecin) {
      medecin = await findMedecinDisponible(id_service);
      if (!medecin) {
        return res.status(503).json({ error: 'Aucun médecin disponible', code: 'NO_DOCTOR_AVAILABLE' });
      }
    }

    const heureEstimee = rdvFound ? rdvHeure : await calcHeurEstimee(medecin.id_medecin, service.duree_moyenne);

    const salleRes = await pool.query(`
      SELECT id_salle, numero_salle, batiment, etage
      FROM public.salles WHERE id_service = $1 AND occupee = false AND actif = true LIMIT 1
    `, [id_service]);
    const salle = salleRes.rows[0] || null;

    let numeroFile;
    let tentatives = 0;
    const tableDest = est_visiteur ? 'public.tickets' : 'public.consultations';
    
    do {
      numeroFile = generateNumeroFile();
      const checkConsult = await pool.query('SELECT 1 FROM public.consultations WHERE numero_file = $1', [numeroFile]);
      const checkTicket = await pool.query('SELECT 1 FROM public.tickets WHERE numero_file = $1', [numeroFile]);
      if (checkConsult.rows.length === 0 && checkTicket.rows.length === 0) break;
      tentatives++;
    } while (tentatives < 10);

    const prefix_motif = id_rendez_vous ? `[RDV WEB #${id_rendez_vous}] ` : '';
    const final_motif = motif ? (prefix_motif + motif) : (prefix_motif + (est_visiteur ? 'Passage borne (visiteur)' : 'Passage borne'));

    let insertionResult;
    if (est_visiteur) {
      // Insertion anonyme dans la table TICKETS
      insertionResult = await pool.query(`
        INSERT INTO public.tickets (
          id_service, id_medecin, id_salle,
          numero_file, heure_arrivee, heure_estimee,
          statut, motif, montant_paye, mode_paiement
        ) VALUES ($1, $2, $3, $4, NOW(), $5, 'en_attente', $6, $7, $8)
        RETURNING *
      `, [
        id_service, medecin.id_medecin, salle ? salle.id_salle : null,
        numeroFile, heureEstimee, final_motif, service.tarif, mode_paiement || 'CB'
      ]);
    } else {
      // Insertion classique dans CONSULTATIONS
      insertionResult = await pool.query(`
        INSERT INTO public.consultations (
          id_patient, id_service, id_medecin, id_salle,
          numero_file, heure_arrivee, heure_estimee,
          statut, motif, montant_paye, mode_paiement
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'en_attente', $7, $8, $9)
        RETURNING *
      `, [
        patient_id, id_service, medecin.id_medecin, salle ? salle.id_salle : null,
        numeroFile, heureEstimee, final_motif, service.tarif, mode_paiement || 'CB'
      ]);
    }

    const positionRes = await pool.query(`
      SELECT (
        (SELECT COUNT(*) FROM public.consultations WHERE id_medecin = $1 AND statut = 'en_attente' AND DATE(heure_arrivee) = CURRENT_DATE AND id_consultation <= $2)
        +
        (SELECT COUNT(*) FROM public.tickets WHERE id_medecin = $1 AND statut = 'en_attente' AND DATE(heure_arrivee) = CURRENT_DATE AND id <= $2)
      ) AS position
    `, [medecin.id_medecin, insertionResult.rows[0].id || insertionResult.rows[0].id_consultation]);

    // Mettre à jour le statut du RDV si présent pour éviter les doubles check-ins
    if (id_rendez_vous) {
      await pool.query('UPDATE public.rendez_vous SET statut = \'arrive\' WHERE id = $1', [id_rendez_vous]);
    }

    res.json({
      success: true,
      ticket: {
        type: 'DOCTOR',
        numero_file: numeroFile,
        position: parseInt(positionRes.rows[0].position) || 1,
        service: { nom: service.nom, tarif: service.tarif, duree_moyenne: service.duree_moyenne },
        medecin: { nom: medecin.nom, prenom: medecin.prenom, specialite: medecin.specialite },
        salle: salle ? { numero: salle.numero_salle, batiment: salle.batiment, etage: salle.etage } : null,
        heure_arrivee: insertionResult.rows[0].heure_arrivee,
        heure_estimee: heureEstimee,
        est_visiteur: !!est_visiteur,
        is_rdv: rdvFound
      }
    });

  } catch (err) {
    console.error('Erreur checkin:', err);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement' });
  }
});

// ─── POST /api/kiosk/cashier-ticket ───────────────────────────────────────────
/**
 * Génère un ticket de caisse pour ceux devant régler en espèces.
 */
router.post('/cashier-ticket', async (req, res) => {
  const { id_service } = req.body;
  
  if (!id_service) {
    return res.status(400).json({ error: 'Service requis pour ticket de caisse' });
  }

  try {
    const serviceRes = await pool.query('SELECT * FROM public.services WHERE id_service = $1', [id_service]);
    if (serviceRes.rows.length === 0) return res.status(404).json({ error: 'Service introuvable' });
    const service = serviceRes.rows[0];

    const numeroFile = generateNumeroFile('C-');
    
    res.json({
      success: true,
      ticket: {
        type: 'CASHIER',
        numero_file: numeroFile,
        service: { nom: service.nom, tarif: service.tarif },
      }
    });

  } catch (err) {
    console.error('Erreur cashier ticket:', err);
    res.status(500).json({ error: 'Erreur lors de l\'émission du ticket de caisse' });
  }
});

// ─── GET /api/kiosk/queue/:id_service ─────────────────────────────────────────
router.get('/queue/:id_service', async (req, res) => {
  const { id_service } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        (
          (SELECT COUNT(*) FROM public.consultations WHERE id_service = $1 AND statut = 'en_attente' AND DATE(heure_arrivee) = CURRENT_DATE)
          +
          (SELECT COUNT(*) FROM public.tickets WHERE id_service = $1 AND statut = 'en_attente' AND DATE(heure_arrivee) = CURRENT_DATE)
        ) AS personnes_en_attente,
        s.duree_moyenne, s.nom AS service_nom
      FROM public.services s
      WHERE s.id_service = $1
    `, [id_service]);


    const data = result.rows[0] || { personnes_en_attente: 0, duree_moyenne: 30 };
    const temps = parseInt(data.personnes_en_attente) * parseInt(data.duree_moyenne);
    res.json({ personnes_en_attente: parseInt(data.personnes_en_attente), temps_attente_estime: temps, service_nom: data.service_nom });
  } catch (err) {
    console.error('Erreur queue:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
