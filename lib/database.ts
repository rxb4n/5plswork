import { Pool, PoolClient } from "pg";
import { Server as SocketIOServer } from "socket.io";

// Database connection with better error handling for Render
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle database connection:", err);
});

export interface Question {
  questionId: string;
  english: string;
  correctAnswer: string;
  options: string[];
}

export interface Player {
  id: string;
  name: string;
  language: "french" | "german" | "russian" | "japanese" | "spanish" | null;
  ready: boolean;
  score: number;
  is_host: boolean;
  current_question: Question | null;
  last_seen: Date;
}

export interface Room {
  id: string;
  players: Player[];
  game_state: "lobby" | "playing" | "finished";
  game_mode: "practice" | "competition" | "cooperation" | null;
  host_language: "french" | "german" | "russian" | "japanese" | "spanish" | null;
  winner_id?: string;
  last_activity: Date;
  created_at: Date;
  question_count: number;
  target_score: number;
  // Cooperation mode specific fields with language-specific word tracking
  cooperation_lives?: number;
  cooperation_score?: number;
  used_words?: string[]; // Now stores language-specific word IDs like "word_001_french"
  current_category?: string;
  current_challenge_player?: string;
  cooperation_waiting?: boolean;
}

// Enhanced database initialization with cooperation mode support
export async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log("🔧 Initializing database...");

    // Create rooms table with all required columns
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id VARCHAR(6) PRIMARY KEY,
        game_state VARCHAR(20) DEFAULT 'lobby',
        winner_id VARCHAR(50),
        last_activity TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        question_count INTEGER DEFAULT 0,
        target_score INTEGER DEFAULT 100 NOT NULL
      )
    `);

    // Check and add game_mode column if it doesn't exist
    const gameModeCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rooms' AND column_name = 'game_mode'
    `);
    
    if (gameModeCheck.rows.length === 0) {
      console.log("➕ Adding game_mode column to rooms table...");
      await client.query(`
        ALTER TABLE rooms 
        ADD COLUMN game_mode VARCHAR(20)
      `);
      console.log("✅ game_mode column added successfully");
    }

    // Check and add host_language column if it doesn't exist
    const hostLanguageCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rooms' AND column_name = 'host_language'
    `);
    
    if (hostLanguageCheck.rows.length === 0) {
      console.log("➕ Adding host_language column to rooms table...");
      await client.query(`
        ALTER TABLE rooms 
        ADD COLUMN host_language VARCHAR(20)
      `);
      console.log("✅ host_language column added successfully");
    }

    // Check and add cooperation mode columns
    const cooperationColumns = [
      { name: 'cooperation_lives', type: 'INTEGER DEFAULT 3' },
      { name: 'cooperation_score', type: 'INTEGER DEFAULT 0' },
      { name: 'used_words', type: 'TEXT[]' },
      { name: 'current_category', type: 'VARCHAR(50)' },
      { name: 'current_challenge_player', type: 'VARCHAR(50)' },
      { name: 'cooperation_waiting', type: 'BOOLEAN DEFAULT FALSE' }
    ];

    for (const column of cooperationColumns) {
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'rooms' AND column_name = '${column.name}'
      `);
      
      if (columnCheck.rows.length === 0) {
        console.log(`➕ Adding ${column.name} column to rooms table...`);
        await client.query(`
          ALTER TABLE rooms 
          ADD COLUMN ${column.name} ${column.type}
        `);
        console.log(`✅ ${column.name} column added successfully`);
      }
    }

    // Create players table
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id VARCHAR(50) PRIMARY KEY,
        room_id VARCHAR(6) REFERENCES rooms(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        language VARCHAR(20),
        ready BOOLEAN DEFAULT FALSE,
        score INTEGER DEFAULT 0,
        is_host BOOLEAN DEFAULT FALSE,
        current_question JSONB,
        last_seen TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
      CREATE INDEX IF NOT EXISTS idx_rooms_last_activity ON rooms(last_activity);
      CREATE INDEX IF NOT EXISTS idx_players_last_seen ON players(last_seen);
    `);

    // Verify schema
    const schemaCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'rooms'
      ORDER BY ordinal_position
    `);
    
    console.log("📋 Verified rooms table schema:");
    schemaCheck.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    console.log("✅ Database initialized successfully with language-specific word tracking");
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// NEW: Clear all existing rooms from the system
export async function clearAllRooms(io?: SocketIOServer): Promise<number> {
  const client = await pool.connect();
  try {
    console.log("🧹 Starting complete room cleanup...");

    // Get all existing rooms before deletion
    const existingRoomsResult = await client.query("SELECT id FROM rooms");
    const roomIds = existingRoomsResult.rows.map(row => row.id);

    if (roomIds.length === 0) {
      console.log("✅ No existing rooms to clear");
      return 0;
    }

    console.log(`🗑️ Found ${roomIds.length} existing rooms to clear:`, roomIds);

    // Notify all clients in these rooms if Socket.IO is available
    if (io) {
      roomIds.forEach(roomId => {
        io.to(roomId).emit("room-closed", {
          type: "system_cleanup",
          message: "System maintenance: All rooms have been cleared",
          reason: "system_restart",
          timestamp: new Date().toISOString()
        });

        io.to(roomId).emit("error", {
          message: "Room closed due to system maintenance",
          status: 503,
          reason: "system_cleanup"
        });

        // Disconnect all sockets in the room
        io.in(roomId).disconnectSockets(true);
      });
    }

    // Delete all rooms (CASCADE will handle players)
    const deleteResult = await client.query("DELETE FROM rooms");
    
    console.log(`✅ Cleared ${deleteResult.rowCount} rooms from database`);
    return deleteResult.rowCount;
  } catch (error) {
    console.error("❌ Error clearing all rooms:", error);
    return 0;
  } finally {
    client.release();
  }
}

// Room operations
export async function createRoom(roomId: string, options: { target_score?: number } = { target_score: 100 }): Promise<Room | null> {
  const client = await pool.connect();
  try {
    await client.query("INSERT INTO rooms (id, target_score, last_activity) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO NOTHING", [roomId, options.target_score || 100]);
    console.log(`Created room ${roomId} with target_score ${options.target_score || 100}`);
    return await getRoom(roomId);
  } catch (error) {
    console.error(`Error creating room ${roomId}:`, error);
    return null;
  } finally {
    client.release();
  }
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const client = await pool.connect();
  try {
    const roomResult = await client.query("SELECT * FROM rooms WHERE id = $1", [roomId]);

    if (roomResult.rows.length === 0) return null;

    const playersResult = await client.query("SELECT * FROM players WHERE room_id = $1 ORDER BY created_at", [roomId]);

    const room = roomResult.rows[0];
    const players = playersResult.rows.map((p) => {
      return {
        id: p.id,
        name: p.name,
        language: p.language,
        ready: p.ready,
        score: p.score,
        is_host: p.is_host,
        current_question: null, // Always null - questions handled by client
        last_seen: p.last_seen,
      };
    });

    console.log(`📊 Retrieved room ${roomId} with ${players.length} players`);

    return {
      id: room.id,
      players,
      game_state: room.game_state,
      game_mode: room.game_mode,
      host_language: room.host_language,
      winner_id: room.winner_id,
      last_activity: room.last_activity,
      created_at: room.created_at,
      question_count: room.question_count,
      target_score: room.target_score || 100,
      // Cooperation mode fields with language-specific word tracking
      cooperation_lives: room.cooperation_lives,
      cooperation_score: room.cooperation_score,
      used_words: room.used_words || [], // Array of language-specific word IDs
      current_category: room.current_category,
      current_challenge_player: room.current_challenge_player,
      cooperation_waiting: room.cooperation_waiting,
    };
  } catch (error) {
    console.error(`Error getting room ${roomId}:`, error);
    return null;
  } finally {
    client.release();
  }
}

export async function addPlayerToRoom(roomId: string, player: Omit<Player, "last_seen">): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if room exists
    const roomCheck = await client.query("SELECT id FROM rooms WHERE id = $1", [roomId]);
    if (roomCheck.rows.length === 0) {
      console.error(`Room ${roomId} does not exist`);
      await client.query("ROLLBACK");
      return false;
    }

    // Get current players
    const existingPlayers = await client.query("SELECT * FROM players WHERE room_id = $1", [roomId]);

    // Determine if this player should be host
    const shouldBeHost = existingPlayers.rows.length === 0 || player.is_host;

    console.log(`Adding player ${player.id} to room ${roomId}. Should be host: ${shouldBeHost}`);

    await client.query(
      `INSERT INTO players (id, room_id, name, language, ready, score, is_host, current_question)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NULL)
       ON CONFLICT (id) DO UPDATE SET
       name = $3, last_seen = NOW(), is_host = $7, current_question = NULL`,
      [
        player.id,
        roomId,
        player.name,
        player.language,
        player.ready,
        player.score,
        shouldBeHost,
      ]
    );

    // Update room activity timestamp
    await client.query("UPDATE rooms SET last_activity = NOW() WHERE id = $1", [roomId]);

    // Ensure one host
    await ensureRoomHasHost(roomId, client);

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`Error adding player ${player.id} to room ${roomId}:`, error);
    return false;
  } finally {
    client.release();
  }
}

// Ensure a room always has exactly one host
export async function ensureRoomHasHost(roomId: string, client?: PoolClient): Promise<void> {
  const queryClient = client || await pool.connect();
  try {
    if (!client) await queryClient.query("BEGIN");

    const playersResult = await queryClient.query("SELECT * FROM players WHERE room_id = $1 ORDER BY created_at", [roomId]);
    const players = playersResult.rows;

    if (players.length === 0) {
      if (!client) await queryClient.query("COMMIT");
      return;
    }

    const hosts = players.filter((p) => p.is_host);
    console.log(`Room ${roomId} has ${players.length} players and ${hosts.length} hosts`);

    if (hosts.length === 0) {
      const newHost = players[0];
      console.log(`Making player ${newHost.id} (${newHost.name}) the host of room ${roomId}`);
      await queryClient.query("UPDATE players SET is_host = TRUE WHERE id = $1", [newHost.id]);
    } else if (hosts.length > 1) {
      console.log(`Room ${roomId} has multiple hosts, keeping only the first one`);
      for (let i = 1; i < hosts.length; i++) {
        await queryClient.query("UPDATE players SET is_host = FALSE WHERE id = $1", [hosts[i].id]);
      }
    }

    if (!client) await queryClient.query("COMMIT");
  } catch (error) {
    if (!client) await queryClient.query("ROLLBACK");
    console.error(`Error ensuring room ${roomId} has host:`, error);
  } finally {
    if (!client) queryClient.release();
  }
}

// NEW: Update room activity timestamp
export async function updateRoomActivity(roomId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query("UPDATE rooms SET last_activity = NOW() WHERE id = $1", [roomId]);
    return result.rowCount > 0;
  } catch (error) {
    console.error(`Error updating room activity for ${roomId}:`, error);
    return false;
  } finally {
    client.release();
  }
}

export async function updatePlayer(playerId: string, updates: Partial<Player>): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updateFields: string[] = [];
    const values: any[] = [playerId];
    let paramIndex = 2;

    Object.entries(updates).forEach(([key, value]) => {
      // Skip current_question updates - not stored in DB anymore
      if (key === "current_question") {
        return;
      } else {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      // Just update last_seen
      await client.query("UPDATE players SET last_seen = NOW() WHERE id = $1", [playerId]);
      await client.query("COMMIT");
      return true;
    }

    const query = `UPDATE players SET ${updateFields.join(", ")}, last_seen = NOW() WHERE id = $1`;
    console.log(`🔧 Executing update query for player ${playerId}:`, query);
    console.log(`🔧 Query values:`, values);
    
    const result = await client.query(query, values);
    console.log(`✅ Update result for player ${playerId}: ${result.rowCount} rows affected`);

    // Update room activity when player is updated
    const playerRoomResult = await client.query("SELECT room_id FROM players WHERE id = $1", [playerId]);
    if (playerRoomResult.rows.length > 0) {
      const roomId = playerRoomResult.rows[0].room_id;
      await client.query("UPDATE rooms SET last_activity = NOW() WHERE id = $1", [roomId]);
    }

    // If we're updating host status, ensure room has proper host
    if (updates.hasOwnProperty("is_host")) {
      const playerResult = await client.query("SELECT room_id FROM players WHERE id = $1", [playerId]);
      if (playerResult.rows.length > 0) {
        await ensureRoomHasHost(playerResult.rows[0].room_id, client);
      }
    }

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`Error updating player ${playerId}:`, error);
    return false;
  } finally {
    client.release();
  }
}

export async function updateRoom(roomId: string, updates: Partial<Omit<Room, "players">>): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updateFields: string[] = [];
    const values: any[] = [roomId];
    let paramIndex = 2;

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'used_words') {
        // Handle array fields specially for PostgreSQL
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
      } else {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    });

    if (updateFields.length === 0) {
      await client.query("COMMIT");
      return true;
    }

    const query = `UPDATE rooms SET ${updateFields.join(", ")}, last_activity = NOW() WHERE id = $1`;
    console.log(`🔧 Updating room ${roomId}:`, query, values);
    
    const result = await client.query(query, values);
    console.log(`✅ Room update result: ${result.rowCount} rows affected`);

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`❌ Error updating room ${roomId}:`, error);
    console.error(`❌ Query was: UPDATE rooms SET ${Object.keys(updates).join(", ")} WHERE id = $1`);
    console.error(`❌ Values were:`, [roomId, ...Object.values(updates)]);
    return false;
  } finally {
    client.release();
  }
}

export async function deleteRoom(roomId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    console.log(`🗑️ Deleting room ${roomId}`);
    const result = await client.query("DELETE FROM rooms WHERE id = $1", [roomId]);
    console.log(`✅ Room ${roomId} deleted successfully (${result.rowCount} rows affected)`);
    return true;
  } catch (error) {
    console.error(`Error deleting room ${roomId}:`, error);
    return false;
  } finally {
    client.release();
  }
}

// ENHANCED: Remove player and auto-cleanup empty rooms
export async function removePlayerFromRoom(playerId: string, io?: SocketIOServer): Promise<{ roomId: string | null; wasHost: boolean; roomDeleted: boolean }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get the room ID before removing the player
    const playerResult = await client.query("SELECT room_id, is_host FROM players WHERE id = $1", [playerId]);

    if (playerResult.rows.length === 0) {
      await client.query("COMMIT");
      return { roomId: null, wasHost: false, roomDeleted: false }; // Player doesn't exist
    }

    const { room_id: roomId, is_host: wasHost } = playerResult.rows[0];

    // Remove the player
    await client.query("DELETE FROM players WHERE id = $1", [playerId]);
    console.log(`Removed player ${playerId} from room ${roomId}. Was host: ${wasHost}`);

    // Check if room is now empty
    const remainingPlayersResult = await client.query("SELECT COUNT(*) as count FROM players WHERE room_id = $1", [roomId]);
    const remainingPlayerCount = parseInt(remainingPlayersResult.rows[0].count);

    console.log(`Room ${roomId} now has ${remainingPlayerCount} players remaining`);

    let roomDeleted = false;

    if (remainingPlayerCount === 0) {
      // Room is empty - delete it immediately
      console.log(`🗑️ Room ${roomId} is empty, deleting automatically...`);
      await client.query("DELETE FROM rooms WHERE id = $1", [roomId]);
      roomDeleted = true;
      console.log(`✅ Empty room ${roomId} deleted successfully`);

      // Notify any lingering clients that room is closed
      if (io) {
        io.to(roomId).emit("error", { message: "Room closed - no players remaining", status: 404 });
      }
    } else {
      // Room still has players - ensure someone is host if the host left
      if (wasHost) {
        await ensureRoomHasHost(roomId, client);
      }
      // Update room activity
      await client.query("UPDATE rooms SET last_activity = NOW() WHERE id = $1", [roomId]);
    }

    await client.query("COMMIT");
    return { roomId, wasHost, roomDeleted };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`Error removing player ${playerId}:`, error);
    return { roomId: null, wasHost: false, roomDeleted: false };
  } finally {
    client.release();
  }
}

// NEW: Find and cleanup inactive rooms
export async function cleanupInactiveRooms(io?: SocketIOServer, inactivityThresholdMs: number = 120000): Promise<number> {
  const client = await pool.connect();
  try {
    console.log(`🔍 Checking for rooms inactive for more than ${inactivityThresholdMs / 1000} seconds...`);

    // Find rooms that have been inactive for the threshold period
    const inactiveRoomsResult = await client.query(`
      SELECT r.id, r.last_activity, COUNT(p.id) as player_count
      FROM rooms r
      LEFT JOIN players p ON r.id = p.room_id
      WHERE r.last_activity < NOW() - INTERVAL '${inactivityThresholdMs} milliseconds'
      GROUP BY r.id, r.last_activity
      ORDER BY r.last_activity ASC
    `);

    if (inactiveRoomsResult.rows.length === 0) {
      console.log("✅ No inactive rooms found");
      return 0;
    }

    console.log(`🚨 Found ${inactiveRoomsResult.rows.length} inactive rooms:`);
    inactiveRoomsResult.rows.forEach(row => {
      const inactiveFor = Date.now() - new Date(row.last_activity).getTime();
      console.log(`  - Room ${row.id}: ${row.player_count} players, inactive for ${Math.round(inactiveFor / 1000)}s`);
    });

    let cleanedUpCount = 0;

    // Process each inactive room
    for (const roomRow of inactiveRoomsResult.rows) {
      const roomId = roomRow.id;
      const playerCount = parseInt(roomRow.player_count);

      try {
        console.log(`🧹 Cleaning up inactive room ${roomId} (${playerCount} players)...`);

        // Notify all clients in the room
        if (io) {
          io.to(roomId).emit("room-closed", {
            type: "inactivity_cleanup",
            message: "Room closed due to inactivity",
            reason: "inactivity",
            timestamp: new Date().toISOString()
          });

          io.to(roomId).emit("error", {
            message: "Room closed due to inactivity",
            status: 408,
            reason: "timeout"
          });

          // Disconnect all sockets in the room
          io.in(roomId).disconnectSockets(true);
        }

        // Delete the room (CASCADE will handle players)
        const deleteResult = await client.query("DELETE FROM rooms WHERE id = $1", [roomId]);
        
        if (deleteResult.rowCount > 0) {
          cleanedUpCount++;
          console.log(`✅ Inactive room ${roomId} cleaned up successfully`);
        }

      } catch (error) {
        console.error(`❌ Error cleaning up room ${roomId}:`, error);
      }
    }

    console.log(`🧹 Cleanup completed: ${cleanedUpCount} inactive rooms removed`);
    return cleanedUpCount;

  } catch (error) {
    console.error("❌ Error during inactive room cleanup:", error);
    return 0;
  } finally {
    client.release();
  }
}

// Cleanup old rooms (for scheduled cleanup)
export async function cleanupOldRooms(io?: SocketIOServer): Promise<void> {
  const client = await pool.connect();
  try {
    // Delete rooms older than 4 hours or inactive for 1 hour
    const result = await client.query(`
      DELETE FROM rooms 
      WHERE created_at < NOW() - INTERVAL '4 hours'
         OR last_activity < NOW() - INTERVAL '1 hour'
      RETURNING id
    `);

    if (io && result.rows.length > 0) {
      result.rows.forEach((row) => {
        io.to(row.id).emit("error", { message: "Room has been closed due to inactivity.", status: 404 });
      });
    }

    console.log(`Cleaned up ${result.rowCount} old rooms`);
  } catch (error) {
    console.error("Error cleaning up rooms:", error);
  } finally {
    client.release();
  }
}

// Clean up empty rooms immediately
export async function cleanupEmptyRooms(io?: SocketIOServer): Promise<number> {
  const client = await pool.connect();
  try {
    // Find rooms with no players
    const emptyRoomsResult = await client.query(`
      SELECT r.id 
      FROM rooms r 
      LEFT JOIN players p ON r.id = p.room_id 
      WHERE p.room_id IS NULL
    `);

    if (emptyRoomsResult.rows.length === 0) {
      return 0;
    }

    const emptyRoomIds = emptyRoomsResult.rows.map(row => row.id);
    console.log(`🗑️ Found ${emptyRoomIds.length} empty rooms to clean up:`, emptyRoomIds);

    // Delete empty rooms
    const deleteResult = await client.query(`
      DELETE FROM rooms 
      WHERE id = ANY($1::varchar[])
      RETURNING id
    `, [emptyRoomIds]);

    // Notify any lingering clients
    if (io) {
      deleteResult.rows.forEach((row) => {
        io.to(row.id).emit("error", { message: "Room closed - no players remaining", status: 404 });
      });
    }

    console.log(`✅ Cleaned up ${deleteResult.rowCount} empty rooms`);
    return deleteResult.rowCount;
  } catch (error) {
    console.error("Error cleaning up empty rooms:", error);
    return 0;
  } finally {
    client.release();
  }
}

// Health check for database
export async function healthCheck(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}