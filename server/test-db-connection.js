// just to check weather the db is working and getting safely connected or not 

const pool = require('../server/backend/src/config/db');

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() AS current_time, current_database() AS db_name');
    console.log('✅ Connection successful!');
    console.log('   Current time on DB server:', result.rows[0].current_time);
    console.log('   Connected to database:', result.rows[0].db_name);

    // Bonus: confirm your Day 1 tables actually exist
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('   Tables found:', tables.rows.map(r => r.table_name).join(', ') || '(none)');

  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    await pool.end(); // close the pool so the script actually exits
  }
}

testConnection();