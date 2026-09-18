const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

// Fires once when the pool successfully opens its first connection —
// useful to confirm credentials are correct as soon as the server boots.
pool.on('connect', () => {
  console.log('✅ PostgreSQL pool connected');
});

// Fires on any unexpected error from an idle client — without this,
// a dropped DB connection can silently crash the whole process.
pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL error on idle client:', err);
});

module.exports = pool;