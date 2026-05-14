const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../server');

/**
 * POST /api/kiosk/identify
 * Identification du patient par carte RFID + code PIN
 */
router.post('/identify', async (req, res) => {
  const { carte_rfid, code_pin, auto_scan } = req.body;

  if (!carte_rfid) {
    return res.status(400).json({ error: 'RFID requis' });
  }
  if (!auto_scan && !code_pin) {
    return res.status(400).json({ error: 'Code PIN requis' });
  }

  try {
    // Recherche du patient par carte RFID
    const result = await pool.query(
      `SELECT id_patient, nom, prenom, date_naissance, sexe, email, telephone,
              groupe_sanguin, allergies, code_pin, actif, photo_url
       FROM public.patients
       WHERE carte_rfid = $1 AND actif = true`,
      [carte_rfid.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Carte non reconnue', code: 'CARD_NOT_FOUND' });
    }

    const patient = result.rows[0];

    // Vérification du code PIN (sauf si auto_scan)
    if (!auto_scan) {
      const pinValide = await bcrypt.compare(String(code_pin), patient.code_pin);

      if (!pinValide) {
        return res.status(401).json({ error: 'Code PIN incorrect', code: 'WRONG_PIN' });
      }
    }

    // Retourner les données sans le code_pin
    const { code_pin: _, ...patientData } = patient;

    // Calculer l'âge
    const naissance = new Date(patientData.date_naissance);
    const age = Math.floor((Date.now() - naissance) / (365.25 * 24 * 3600 * 1000));

    res.json({
      success: true,
      patient: {
        ...patientData,
        age,
        carte_rfid,
      }
    });

  } catch (err) {
    console.error('Erreur identification:', err);
    res.status(500).json({ error: 'Erreur lors de l\'identification' });
  }
});

/**
 * POST /api/kiosk/verify-rfid
 * Vérifier si une carte RFID existe (avant de demander le PIN)
 */
router.post('/verify-rfid', async (req, res) => {
  const { carte_rfid } = req.body;

  if (!carte_rfid) {
    return res.status(400).json({ error: 'RFID requis' });
  }

  try {
    const result = await pool.query(
      `SELECT id_patient, nom, prenom FROM public.patients
       WHERE carte_rfid = $1 AND actif = true`,
      [carte_rfid.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ found: false });
    }

    res.json({ found: true, prenom: result.rows[0].prenom });

  } catch (err) {
    console.error('Erreur vérification RFID:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
