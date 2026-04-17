/* ─── payment.js — Route Paiement Stripe ─── */

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { pool } = require('../server');
const router = express.Router();

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function generateNumeroFile(prefix = 'K-') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = prefix;
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function findMedecinDisponible(id_service) {
  const result = await pool.query(`
    SELECT m.id_medecin, m.nom, m.prenom, m.specialite
    FROM public.medecins m
    JOIN public.disponibilites d ON m.id_medecin = d.medecin_id
    WHERE m.id_service = $1 
      AND m.actif = true
      -- Vérifier le jour d'aujourd'hui
      AND d.jour_semaine = EXTRACT(DOW FROM NOW())
      -- Vérifier l'horaire actuel (gère aussi les créneaux passant minuit)
      AND (
        (d.heure_debut < d.heure_fin AND CURRENT_TIME >= d.heure_debut AND CURRENT_TIME < d.heure_fin)
        OR
        (d.heure_debut >= d.heure_fin AND (CURRENT_TIME >= d.heure_debut OR CURRENT_TIME < d.heure_fin))
      )
    ORDER BY m.id_medecin
    LIMIT 1
  `, [id_service]);
  return result.rows[0] || null;
}

async function calcHeurEstimee(medecin_id, duree_moyenne = 15) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + (duree_moyenne || 15));
  return now;
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

    // Trouver un médecin
    const medecin = await findMedecinDisponible(id_service);
    if (!medecin) {
      return res.status(503).json({ success: false, message: 'Aucun médecin disponible' });
    }

    // Générer un numéro de file unique
    let numeroFile;
    let tentatives = 0;
    do {
      numeroFile = generateNumeroFile();
      const check = await pool.query('SELECT 1 FROM public.consultations WHERE numero_file = $1', [numeroFile]);
      if (check.rows.length === 0) break;
      tentatives++;
    } while (tentatives < 10);

    if (tentatives >= 10) {
      return res.status(500).json({ success: false, message: 'Impossible de générer un numéro de file' });
    }

    // Heure estimée
    const heureEstimee = await calcHeurEstimee(medecin.id_medecin, service.duree_moyenne);

    // Chercher une salle libre
    const salleRes = await pool.query(`
      SELECT id_salle, numero_salle FROM public.salles 
      WHERE id_service = $1 AND occupee = false AND actif = true 
      LIMIT 1
    `, [id_service]);
    const salleId = salleRes.rows[0]?.id_salle || null;

    // Créer la consultation
    const consultQuery = `
      INSERT INTO public.consultations (
        id_patient,
        id_service,
        id_medecin,
        id_salle,
        numero_file,
        heure_arrivee,
        heure_estimee,
        statut,
        motif,
        montant_paye,
        mode_paiement
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'en_attente', $7, $8, 'stripe')
      RETURNING *;
    `;

    const consultRes = await pool.query(consultQuery, [
      id_patient || null,
      id_service,
      medecin.id_medecin,
      salleId,
      numeroFile,
      heureEstimee,
      motif || 'Consultation (borne d\'accueil)',
      service.tarif,
    ]);

    const consultation = consultRes.rows[0];

    // Récupérer la position dans la file
    const positionRes = await pool.query(`
      SELECT COUNT(*) AS position FROM public.consultations
      WHERE id_medecin = $1 AND statut = 'en_attente' AND DATE(heure_arrivee) = CURRENT_DATE AND id_consultation <= $2
    `, [medecin.id_medecin, consultation.id_consultation]);

    res.json({
      success: true,
      ticket: {
        type: 'DOCTOR',
        numero_file: consultation.numero_file,
        position: parseInt(positionRes.rows[0].position) || 1,
        service: { nom: service.nom, tarif: service.tarif, duree_moyenne: service.duree_moyenne },
        medecin: { nom: medecin.nom, prenom: medecin.prenom, specialite: medecin.specialite },
        salle: salleId ? { id: salleId } : null,
        heure_arrivee: consultation.heure_arrivee,
        heure_estimee: heureEstimee,
        est_visiteur: !!est_visiteur,
        is_rdv: false,
        mode_paiement: 'stripe'
      }
    });
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
