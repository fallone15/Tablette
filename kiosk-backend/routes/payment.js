/* ─── payment.js — Route Paiement Stripe ─── */

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { pool } = require('../server');
const router = express.Router();

// ─── Utilitaires ──────────────────────────────────────────────────────────────
// ─── Génération numéro de file séquentiel par service (ex: GYN-1) ───────────
async function generateServiceTicketNumber(id_service) {
  try {
    // 1. Récupérer le code du service
    const serviceRes = await pool.query('SELECT code FROM public.services WHERE id_service = $1', [id_service]);
    const code = serviceRes.rows[0]?.code || 'GEN';

    // 2. Compter le nombre de patients aujourd'hui pour ce service (Consultations + Tickets)
    const countRes = await pool.query(`
      SELECT (
        (SELECT COUNT(*) FROM public.consultations WHERE id_service = $1 AND DATE(heure_arrivee) = CURRENT_DATE)
        +
        (SELECT COUNT(*) FROM public.tickets WHERE id_service = $1 AND DATE(heure_arrivee) = CURRENT_DATE)
      ) AS total
    `, [id_service]);

    const nextNumber = parseInt(countRes.rows[0].total) + 1;
    return `${code}-${nextNumber}`;
  } catch (err) {
    console.error('Erreur génération numéro file:', err);
    return 'ERR-' + Math.floor(Math.random() * 1000);
  }
}

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
    ORDER BY consultations_en_attente ASC
    LIMIT 1
  `, [id_service]);
  return result.rows[0] || null;
}


async function calcHeurEstimee(id_medecin, duree_moyenne = 15) {
  const result = await pool.query(`
    SELECT (
      (SELECT COUNT(*) FROM public.consultations WHERE id_medecin = $1 AND statut = 'en_attente' AND DATE(heure_arrivee) = CURRENT_DATE)
      +
      (SELECT COUNT(*) FROM public.tickets WHERE id_medecin = $1 AND statut = 'en_attente' AND DATE(heure_arrivee) = CURRENT_DATE)
    ) AS nb
  `, [id_medecin]);

  const nbEnAttente = parseInt(result.rows[0].nb) || 0;
  const minutesAttente = nbEnAttente * (duree_moyenne || 15);
  const heureEstimee = new Date(Date.now() + minutesAttente * 60 * 1000);
  return heureEstimee;
}


/**
 * POST /api/payment/create-payment-intent
 * Crée une PaymentIntent Stripe
 */
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, id_patient, id_service, est_visiteur, motif, id_rendez_vous } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Montant invalide' });
    }

    // Créer une PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Montant en centimes
      currency: 'mad',
      metadata: {
        id_patient,
        id_service,
        est_visiteur,
        motif,
        id_rendez_vous,
      },
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('❌ Erreur création PaymentIntent:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/payment/confirm
 * Confirme le paiement et crée la consultation
 */
router.post('/confirm', async (req, res) => {
  try {
    const {
      paymentIntentId,
      id_patient,
      id_service,
      est_visiteur,
      motif,
      id_rendez_vous,
    } = req.body;

    // Récupérer le PaymentIntent depuis Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Le paiement n\'a pas été effectué',
      });
    }

    // Vérifier que le service existe
    const serviceRes = await pool.query('SELECT * FROM public.services WHERE id_service = $1 AND actif = true', [id_service]);
    if (serviceRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service introuvable' });
    }
    const service = serviceRes.rows[0];

    let medecin = null;
    let rdvFound = false;

    // Si lié à un RDV existant, prendre le médecin du RDV
    if (id_rendez_vous) {
      const rdvRes = await pool.query(`
        SELECT r.*, m.id_medecin, m.nom, m.prenom, m.specialite
        FROM public.rendez_vous r
        JOIN public.medecins m ON r.medecin_id = m.id_medecin
        WHERE r.id = $1
      `, [id_rendez_vous]);
      
      if (rdvRes.rows.length > 0) {
        rdvFound = true;
        medecin = {
          id_medecin: rdvRes.rows[0].id_medecin,
          nom: rdvRes.rows[0].nom,
          prenom: rdvRes.rows[0].prenom,
          specialite: rdvRes.rows[0].specialite
        };
      }
    }

    // Sinon trouver un médecin dispo
    if (!medecin) {
      medecin = await findMedecinDisponible(id_service);
      if (!medecin) {
        return res.status(503).json({ success: false, message: 'Aucun médecin disponible' });
      }
    }

    // Générer le numéro de ticket séquentiel (ex: GYN-1)
    const numeroFile = await generateServiceTicketNumber(id_service);

    // Heure estimée
    const heureEstimee = await calcHeurEstimee(medecin.id_medecin, service.duree_moyenne);

    // Chercher une salle libre
    const salleRes = await pool.query(`
      SELECT id_salle, numero_salle FROM public.salles 
      WHERE id_service = $1 AND occupee = false AND actif = true 
      LIMIT 1
    `, [id_service]);
    const salleId = salleRes.rows[0]?.id_salle || null;

    // Créer la consultation ou le ticket
    let insertionResult;
    const final_motif = motif || (est_visiteur ? 'Consultation (borne d\'accueil - Visiteur)' : 'Consultation (borne d\'accueil)');
    
    if (est_visiteur) {
      insertionResult = await pool.query(`
        INSERT INTO public.tickets (
          id_service, id_medecin, id_salle,
          numero_file, heure_arrivee, heure_estimee,
          statut, motif, montant_paye, mode_paiement
        ) VALUES ($1, $2, $3, $4, NOW(), $5, 'en_cours', $6, $7, 'stripe')
        RETURNING *
      `, [
        id_service, medecin.id_medecin, salleId,
        numeroFile, heureEstimee, final_motif, service.tarif
      ]);
    } else {
      insertionResult = await pool.query(`
        INSERT INTO public.consultations (
          id_patient, id_service, id_medecin, id_salle,
          numero_file, heure_arrivee, heure_estimee,
          statut, motif, montant_paye, mode_paiement
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'en_cours', $7, $8, 'stripe')
        RETURNING *
      `, [
        id_patient || null, id_service, medecin.id_medecin, salleId,
        numeroFile, heureEstimee, final_motif, service.tarif
      ]);
    }

    const consultData = insertionResult.rows[0];

    // Récupérer la position dans la file agrégée
    const positionRes = await pool.query(`
      SELECT (
        (SELECT COUNT(*) FROM public.consultations WHERE id_medecin = $1 AND statut = 'en_attente' AND DATE(heure_arrivee) = CURRENT_DATE AND id_consultation <= $2)
        +
        (SELECT COUNT(*) FROM public.tickets WHERE id_medecin = $1 AND statut = 'en_attente' AND DATE(heure_arrivee) = CURRENT_DATE AND id <= $2)
      ) AS position
    `, [medecin.id_medecin, consultData.id || consultData.id_consultation]);


    res.json({
      success: true,
      ticket: {
        type: 'DOCTOR',
        numero_file: consultData.numero_file,
        position: parseInt(positionRes.rows[0].position) || 1,
        service: { nom: service.nom, tarif: service.tarif, duree_moyenne: service.duree_moyenne },
        medecin: { nom: medecin.nom, prenom: medecin.prenom, specialite: medecin.specialite },
        salle: salleId ? { id: salleId } : null,
        heure_arrivee: consultData.heure_arrivee,
        heure_estimee: heureEstimee,
        est_visiteur: !!est_visiteur,
        is_rdv: rdvFound,
        mode_paiement: 'stripe'
      }
    });

    // Mettre à jour le statut du RDV si présent
    if (id_rendez_vous) {
      await pool.query('UPDATE public.rendez_vous SET statut = \'arrive\' WHERE id = $1', [id_rendez_vous]);
    }
  } catch (error) {
    console.error('❌ Erreur confirmation paiement:', error.message, error.detail);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/payment/webhook
 * Webhook Stripe pour les confirmations de paiement
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('⚠️  STRIPE_WEBHOOK_SECRET non configuré');
    return res.json({ received: true });
  }

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log(`✅ Paiement réussi: ${event.data.object.id}`);
        break;
      case 'payment_intent.payment_failed':
        console.log(`❌ Paiement échoué: ${event.data.object.id}`);
        break;
      default:
        console.log(`ℹ️  Événement Stripe: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Erreur webhook:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
