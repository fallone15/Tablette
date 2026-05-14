require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Pool } = require('pg');
const { startCardWebSocket, startCardReader } = require('./services/cardReader');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Connexion PostgreSQL ─────────────────────────────────────────────────────
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'hospital',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erreur connexion PostgreSQL:', err.message);
  } else {
    console.log('✅ Connecté à PostgreSQL');
    release();
  }
});

// Exporter le pool pour les routes
module.exports.pool = pool;

// ─── Middlewares ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger simple
app.use((req, res, next) => {
  const now = new Date().toLocaleTimeString('fr-FR');
  console.log(`[${now}] ${req.method} ${req.path}`);
  next();
});

// ─── Servir les fichiers statiques du frontend ──────────────────────────────────
app.use(express.static(path.join(__dirname, '../kiosk-frontend')));

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const kioskRoutes = require('./routes/kiosk');
const paymentRoutes = require('./routes/payment');

app.use('/api/kiosk', authRoutes);
app.use('/api/kiosk', servicesRoutes);
app.use('/api/kiosk', kioskRoutes);
app.use('/api/payment', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CareTrack Kiosk API', port: PORT });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint non trouvé' });
});

// Gestion erreurs globale
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
const server = http.createServer(app);

// WebSocket lecteur carte à puce
startCardWebSocket(server);

// Démarrage écoute PC/SC (Gemalto + ACOS)
startCardReader();

server.listen(PORT, () => {
  console.log(`\n🏥 CareTrack Kiosk API démarrée`);
  console.log(`🚀 http://localhost:${PORT}`);
  console.log(`📋 Health: http://localhost:${PORT}/health`);
  console.log(`🃏 CardReader WS: ws://localhost:${PORT}/ws/card\n`);
});
