const { Pool } = require('pg');

// Database migration script to add missing columns
async function migrateDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting database migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Check if game_mode column exists
    const gameModeCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rooms' AND column_name = 'game_mode'
    `);
    
    if (gameModeCheck.rows.length === 0) {
      console.log('➕ Adding game_mode column...');
      await client.query(`
        ALTER TABLE rooms 
        ADD COLUMN game_mode VARCHAR(20)
      `);
      console.log('✅ game_mode column added successfully');
    } else {
      console.log('✅ game_mode column already exists');
    }
    
    // Check if host_language column exists
    const hostLanguageCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rooms' AND column_name = 'host_language'
    `);
    
    if (hostLanguageCheck.rows.length === 0) {
      console.log('➕ Adding host_language column...');
      await client.query(`
        ALTER TABLE rooms 
        ADD COLUMN host_language VARCHAR(20)
      `);
      console.log('✅ host_language column added successfully');
    } else {
      console.log('✅ host_language column already exists');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('🎉 Database migration completed successfully!');
    
    // Verify the schema
    console.log('🔍 Verifying updated schema...');
    const schemaCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'rooms'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Current rooms table schema:');
    schemaCheck.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateDatabase };