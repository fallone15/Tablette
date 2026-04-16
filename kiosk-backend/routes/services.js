const express = require('express');
const router = express.Router();
const { pool } = require('../server');

/**
 * GET /api/kiosk/services
 * Liste des services actifs avec statistiques de file d'attente en temps réel
 */
router.get('/services', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id_service,
        s.nom,
        s.description,
        s.tarif,
        s.duree_moyenne,
        COUNT(c.id_consultation) FILTER (
          WHERE c.statut = 'en_attente' AND DATE(c.heure_arrivee) = CURRENT_DATE
        ) AS personnes_en_attente,
        COALESCE(
          COUNT(c.id_consultation) FILTER (
            WHERE c.statut = 'en_attente' AND DATE(c.heure_arrivee) = CURRENT_DATE
          ) * s.duree_moyenne, 0
        ) AS temps_attente_estime
      FROM public.services s
      LEFT JOIN public.consultations c ON c.id_service = s.id_service
      WHERE s.actif = true
      GROUP BY s.id_service, s.nom, s.description, s.tarif, s.duree_moyenne
      ORDER BY s.nom
    `);

    res.json({ services: result.rows });

  } catch (err) {
    console.error('Erreur récupération services:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des services' });
  }
});

module.exports = router;
