const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'hospital',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function migrate() {
  try {
    console.log('Adding "code" column to services...');
    await pool.query('ALTER TABLE services ADD COLUMN IF NOT EXISTS code VARCHAR(5);');
    
    console.log('Updating existing services with codes...');
    await pool.query("UPDATE services SET code = 'GEN' WHERE nom = 'Médecine Générale';");
    await pool.query("UPDATE services SET code = 'GYN' WHERE nom = 'Gynécologie';");
    await pool.query("UPDATE services SET code = 'PED' WHERE nom = 'Pédiatrie';");
    await pool.query("UPDATE services SET code = 'RAD' WHERE nom = 'Radiologie';");
    await pool.query("UPDATE services SET code = 'CAR' WHERE nom = 'Cardiologie';");
    
    // Default code for others
    await pool.query("UPDATE services SET code = UPPER(LEFT(nom, 3)) WHERE code IS NULL;");

    console.log('Migration finished!');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    await pool.end();
    process.exit(1);
  }
}

migrate();
