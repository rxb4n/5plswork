const { Pool } = require('pg');

// Database migration script to add missing columns
async function migrateDatabase() {
  // Check if DATABASE_URL is provided
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL environment variable is not set');
    console.log('📝 To run database migrations, you need to:');
    console.log('   1. Set up your Supabase project');
    console.log('   2. Add DATABASE_URL to your environment variables');
    console.log('   3. Run this migration script again');
    console.log('');
    console.log('💡 If you\'re using Supabase, your DATABASE_URL should look like:');
    console.log('   postgresql://postgres:[password]@[host]:5432/postgres');
    return;
  }

  let pool;
  let client;
  
  try {
    console.log('🔧 Starting database migration...');
    console.log('🔗 Connecting to database...');
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    client = await pool.connect();
    console.log('✅ Database connection established');
    
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
    
    // Check and add cooperation mode columns
    const cooperationColumns = [
      { name: 'cooperation_lives', type: 'INTEGER DEFAULT 3' },
      { name: 'cooperation_score', type: 'INTEGER DEFAULT 0' },
      { name: 'used_words', type: 'TEXT[]' },
      { name: 'current_category', type: 'VARCHAR(50)' },
      { name: 'current_challenge_player', type: 'VARCHAR(50)' }
    ];

    for (const column of cooperationColumns) {
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'rooms' AND column_name = '${column.name}'
      `);
      
      if (columnCheck.rows.length === 0) {
        console.log(`➕ Adding ${column.name} column...`);
        await client.query(`
          ALTER TABLE rooms 
          ADD COLUMN ${column.name} ${column.type}
        `);
        console.log(`✅ ${column.name} column added successfully`);
      } else {
        console.log(`✅ ${column.name} column already exists`);
      }
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
    // Rollback on error if client exists
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('❌ Error during rollback:', rollbackError.message);
      }
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Database connection refused');
      console.log('');
      console.log('🔧 Troubleshooting steps:');
      console.log('   1. Verify your DATABASE_URL is correct');
      console.log('   2. Ensure your database server is running and accessible');
      console.log('   3. Check if you need to whitelist your IP address');
      console.log('   4. For Supabase: verify your connection string from the dashboard');
    } else if (error.code === 'ENOTFOUND') {
      console.error('❌ Database host not found');
      console.log('   Check your DATABASE_URL host address');
    } else {
      console.error('❌ Migration failed:', error.message);
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    if (pool) {
      await pool.end();
    }
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
      console.error('❌ Migration script failed');
      process.exit(1);
    });
}

module.exports = { migrateDatabase };