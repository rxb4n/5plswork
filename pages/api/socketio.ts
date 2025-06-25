// Function to get available rooms with enhanced game mode information
async function getAvailableRooms() {
  try {
    const { Pool } = require("pg")
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    })

    const client = await pool.connect()
    
    try {
      const roomsResult = await client.query(`
        SELECT r.id, r.target_score, r.game_mode, r.host_language, COUNT(p.id) as player_count
        FROM rooms r
        LEFT JOIN players p ON r.id = p.room_id
        WHERE r.game_state = 'lobby'
        AND r.last_activity > NOW() - INTERVAL '1 hour'
        GROUP BY r.id, r.target_score, r.game_mode, r.host_language
        HAVING COUNT(p.id) > 0 AND COUNT(p.id) < 8
        ORDER BY r.created_at DESC
        LIMIT 20
      `)

      const availableRooms = roomsResult.rows.map(row => ({
        id: row.id,
        playerCount: parseInt(row.player_count),
        maxPlayers: 8,
        status: "waiting" as const,
        targetScore: row.target_score || 100,
        gameMode: row.game_mode,
        hostLanguage: row.host_language,
      }))

      console.log(`📊 Found ${availableRooms.length} available rooms with game mode info`)
      return availableRooms
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("❌ Error fetching available rooms:", error)
    return []
  }
}