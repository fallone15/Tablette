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
        (
          SELECT COUNT(*) FROM public.consultations c
          WHERE c.id_service = s.id_service AND c.statut = 'en_attente' AND DATE(c.heure_arrivee) = CURRENT_DATE
        ) + (
          SELECT COUNT(*) FROM public.tickets t
          WHERE t.id_service = s.id_service AND t.statut = 'en_attente' AND DATE(t.heure_arrivee) = CURRENT_DATE
        ) AS personnes_en_attente,
        (
          (SELECT COUNT(*) FROM public.consultations c
          WHERE c.id_service = s.id_service AND c.statut = 'en_attente' AND DATE(c.heure_arrivee) = CURRENT_DATE
          ) + (
          SELECT COUNT(*) FROM public.tickets t
          WHERE t.id_service = s.id_service AND t.statut = 'en_attente' AND DATE(t.heure_arrivee) = CURRENT_DATE
          )
        ) * s.duree_moyenne AS temps_attente_estime
      FROM public.services s
      WHERE s.actif = true
      ORDER BY s.nom
    `);

    res.json({ services: result.rows });

  } catch (err) {
    console.error('Erreur récupération services:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des services' });
  }
});

/**
 * GET /api/kiosk/catalog
 * Récupère le catalogue des médecins et leurs disponibilités par service
 */
router.get('/catalog', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id_service, s.nom AS service_nom, s.description AS service_desc,
        m.id_medecin, m.nom AS medecin_nom, m.prenom AS medecin_prenom, m.specialite,
        d.jour_semaine, d.heure_debut, d.heure_fin
      FROM public.services s
      JOIN public.medecins m ON s.id_service = m.id_service
      JOIN public.disponibilites d ON m.id_medecin = d.medecin_id
      WHERE s.actif = true AND m.actif = true
      ORDER BY s.nom, m.nom, d.jour_semaine, d.heure_debut
    `);

    // Regrouper par service
    const catalogMap = new Map();

    result.rows.forEach(row => {
      let service = catalogMap.get(row.id_service);
      if (!service) {
        service = {
          id_service: row.id_service,
          nom: row.service_nom,
          description: row.service_desc,
          medecins: new Map()
        };
        catalogMap.set(row.id_service, service);
      }

      let medecin = service.medecins.get(row.id_medecin);
      if (!medecin) {
        medecin = {
          id_medecin: row.id_medecin,
          nom: row.medecin_nom,
          prenom: row.medecin_prenom,
          specialite: row.specialite,
          disponibilites: []
        };
        service.medecins.set(row.id_medecin, medecin);
      }

      medecin.disponibilites.push({
        jour_semaine: row.jour_semaine,
        heure_debut: row.heure_debut,
        heure_fin: row.heure_fin
      });
    });

    // Transformer les Map en tableaux
    const catalog = Array.from(catalogMap.values()).map(service => ({
      ...service,
      medecins: Array.from(service.medecins.values())
    }));

    res.json({ success: true, catalog });
  } catch (err) {
    console.error('Erreur récupération catalogue:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération du catalogue' });
  }
});

module.exports = router;
