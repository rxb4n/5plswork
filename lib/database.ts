import { Pool } from "pg";

export type Language = "french" | "german" | "russian" | "japanese" | "spanish";

export interface Question {
  questionId: string;
  english: string;
  correctAnswer: string;
  options: string[];
}

export interface Player {
  id: string;
  name: string;
  language: Language | null;
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
  winner_id?: string;
  last_activity: Date;
  created_at: Date;
  question_count: number;
  target_score: number;
}

// Database connection with better error handling for Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize database tables
export async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log("Initializing database...");

    // Create rooms table with target_score
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id VARCHAR(6) PRIMARY KEY,
        game_state VARCHAR(20) DEFAULT 'lobby',
        winner_id VARCHAR(50),
        last_activity TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        question_count INTEGER DEFAULT 0,
        target_score INTEGER DEFAULT 100
      )
    `);

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

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw new Error(`Database initialization failed: ${(error as Error).message}`);
  } finally {
    client.release();
  }
}

// Room operations
export async function createRoom(
  roomId: string,
  options: { target_score?: number } = { target_score: 100 }
): Promise<Room> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check for existing room
    const existingRoom = await client.query("SELECT id FROM rooms WHERE id = $1", [roomId]);
    if (existingRoom.rows.length > 0) {
      throw new Error("Room ID already exists");
    }

    // Insert room
    await client.query(
      "INSERT INTO rooms (id, game_state, target_score, last_activity, created_at) VALUES ($1, $2, $3, NOW(), NOW())",
      [roomId, "lobby", options.target_score || 100]
    );

    // Fetch the created room
    const room = await getRoom(roomId);
    if (!room) {
      throw new Error("Failed to retrieve created room");
    }

    await client.query("COMMIT");
    console.log(`Room ${roomId} created successfully with target_score ${room.target_score}`);
    return room;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`Error creating room ${roomId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const client = await pool.connect();
  try {
    const roomResult = await client.query("SELECT * FROM rooms WHERE id = $1", [roomId]);

    if (roomResult.rows.length === 0) return null;

    const playersResult = await client.query(
      "SELECT * FROM players WHERE room_id = $1 ORDER BY created_at",
      [roomId]
    );

    const room = roomResult.rows[0];
    return {
      id: room.id,
      players: playersResult.rows.map((p) => ({
        id: p.id,
        name: p.name,
        language: p.language,
        ready: p.ready,
        score: p.score,
        is_host: p.is_host,
        current_question: p.current_question || null,
        last_seen: p.last_seen,
      })),
      game_state: room.game_state,
      winner_id: room.winner_id,
      last_activity: room.last_activity,
      created_at: room.created_at,
      question_count: room.question_count,
      target_score: room.target_score,
    };
  } catch (error) {
    console.error(`Error getting room ${roomId}:`, error);
    throw new Error(`Failed to get room: ${(error as Error).message}`);
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
      throw new Error("Room not found");
    }

    // Get current players in the room
    const existingPlayers = await client.query("SELECT * FROM players WHERE room_id = $1", [roomId]);

    // Check for duplicate name
    const nameExists = existingPlayers.rows.some((p) => p.name === player.name);
    if (nameExists) {
      console.error(`Name ${player.name} already taken in room ${roomId}`);
      throw new Error("Name already taken");
    }

    // Determine if this player should be host
    const shouldBeHost = existingPlayers.rows.length === 0 || player.is_host;

    console.log(`Adding player ${player.id} to room ${roomId}. Should be host: ${shouldBeHost}`);

    await client.query(
      `INSERT INTO players (id, room_id, name, language, ready, score, is_host, current_question)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
       name = $3, last_seen = NOW(), is_host = $7`,
      [
        player.id,
        roomId,
        player.name,
        player.language,
        player.ready,
        player.score,
        shouldBeHost,
        player.current_question ? JSON.stringify(player.current_question) : null,
      ]
    );

    // Update room activity
    await client.query("UPDATE rooms SET last_activity = NOW() WHERE id = $1", [roomId]);

    // Ensure there's always exactly one host
    await ensureRoomHasHost(roomId);

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`Error adding player ${player.id} to room ${roomId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

// Ensure a room always has exactly one host
export async function ensureRoomHasHost(roomId: string): Promise<void> {
  const client = await pool.connect();
  try {
    // Get all players in the room
    const playersResult = await client.query(
      "SELECT * FROM players WHERE room_id = $1 ORDER BY created_at",
      [roomId]
    );

    if (playersResult.rows.length === 0) {
      console.log(`No players in room ${roomId}, no host needed`);
      return;
    }

    const players = playersResult.rows;
    const hosts = players.filter((p) => p.is_host);

    console.log(`Room ${roomId} has ${players.length} players and ${hosts.length} hosts`);

    if (hosts.length === 0) {
      // No host exists, make the first player (oldest) the host
      const newHost = players[0];
      console.log(`Making player ${newHost.id} (${newHost.name}) the host of room ${roomId}`);
      await client.query("UPDATE players SET is_host = TRUE WHERE id = $1", [newHost.id]);
    } else if (hosts.length > 1) {
      // Multiple hosts exist, keep only the first one
      console.log(`Room ${roomId} has multiple hosts, keeping only the first one`);
      for (let i = 1; i < hosts.length; i++) {
        await client.query("UPDATE players SET is_host = FALSE WHERE id = $1", [hosts[i].id]);
      }
    }
  } catch (error) {
    console.error(`Error ensuring host for room ${roomId}:`, error);
    throw new Error(`Failed to ensure host: ${(error as Error).message}`);
  } finally {
    client.release();
  }
}

export async function updatePlayer(playerId: string, updates: Partial<Player>): Promise<boolean> {
  const client = await pool.connect();
  try {
    const updateFields: string[] = [];
    const values: any[] = [playerId];
    let paramIndex = 2;

    Object.entries(updates).forEach(([key, value]) => {
      if (key === "current_question") {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value ? JSON.stringify(value) : null);
      } else {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    });

    if (updateFields.length === 0) {
      // Just update last_seen
      await client.query("UPDATE players SET last_seen = NOW() WHERE id = $1", [playerId]);
      return true;
    }

    const query = `UPDATE players SET ${updateFields.join(", ")}, last_seen = NOW() WHERE id = $1`;
    const result = await client.query(query, values);

    if (result.rowCount === 0) {
      console.error(`Player ${playerId} not found`);
      throw new Error("Player not found");
    }

    // If we're updating host status, ensure room has proper host
    if (updates.hasOwnProperty("is_host")) {
      const playerResult = await client.query("SELECT room_id FROM players WHERE id = $1", [
        playerId,
      ]);
      if (playerResult.rows.length > 0) {
        await ensureRoomHasHost(playerResult.rows[0].room_id);
      }
    }

    return true;
  } catch (error) {
    console.error(`Error updating player ${playerId}:`, error);
    throw new Error(`Failed to update player: ${(error as Error).message}`);
  } finally {
    client.release();
  }
}

export async function updateRoom(roomId: string, updates: Partial<Omit<Room, "players">>): Promise<boolean> {
  const client = await pool.connect();
  try {
    const updateFields: string[] = [];
    const values: any[] = [roomId];
    let paramIndex = 2;

    Object.entries(updates).forEach(([key, value]) => {
      updateFields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    if (updateFields.length === 0) return true;

    const query = `UPDATE rooms SET ${updateFields.join(", ")}, last_activity = NOW() WHERE id = $1`;
    const result = await client.query(query, values);

    if (result.rowCount === 0) {
      console.error(`Room ${roomId} not found`);
      throw new Error("Room not found");
    }

    return true;
  } catch (error) {
    console.error(`Error updating room ${roomId}:`, error);
    throw new Error(`Failed to update room: ${(error as Error).message}`);
  } finally {
    client.release();
  }
}

export async function deleteRoom(roomId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query("DELETE FROM rooms WHERE id = $1", [roomId]);
    console.log(`Deleted room ${roomId}`);
    return result.rowCount > 0;
  } catch (error) {
    console.error(`Error deleting room ${roomId}:`, error);
    throw new Error(`Failed to delete room: ${(error as Error).message}`);
  } finally {
    client.release();
  }
}

export async function removePlayerFromRoom(playerId: string): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get the room ID before removing the player
    const playerResult = await client.query("SELECT room_id, is_host FROM players WHERE id = $1", [
      playerId,
    ]);

    if (playerResult.rows.length === 0) {
      console.warn(`Player ${playerId} not found`);
      throw new Error("Player not found");
    }

    const { room_id: roomId, is_host } = playerResult.rows[0];

    // Remove the player
    await client.query("DELETE FROM players WHERE id = $1", [playerId]);

    console.log(`Removed player ${playerId} from room ${roomId}. Was host: ${is_host}`);

    // If the removed player was the host, ensure someone else becomes host
    if (is_host) {
      await ensureRoomHasHost(roomId);
    }

    // Check if room is empty
    const remainingPlayers = await client.query("SELECT id FROM players WHERE room_id = $1", [
      roomId,
    ]);
    if (remainingPlayers.rows.length === 0) {
      await deleteRoom(roomId);
      console.log(`Room ${roomId} deleted as no players remain`);
    }

    await client.query("COMMIT");
    return roomId;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`Error removing player ${playerId}:`, error);
    throw new Error(`Failed to remove player: ${(error as Error).message}`);
  } finally {
    client.release();
  }
}

// Cleanup old rooms
export async function cleanupOldRooms(): Promise<void> {
  const client = await pool.connect();
  try {
    // Delete rooms older than 4 hours or inactive for 1 hour
    const result = await client.query(`
      DELETE FROM rooms 
      WHERE created_at < NOW() - INTERVAL '4 hours'
         OR last_activity < NOW() - INTERVAL '1 hour'
    `);

    console.log(`Cleaned up ${result.rowCount} old rooms`);
  } catch (error) {
    console.error("Error cleaning up old rooms:", error);
    throw new Error(`Failed to clean up rooms: ${(error as Error).message}`);
  } finally {
    client.release();
  }
}

// Health check for database
export async function healthCheck(): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  } finally {
    client.release();
  }
}