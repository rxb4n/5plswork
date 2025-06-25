import { Server as SocketIOServer } from "socket.io"
import { NextApiRequest, NextApiResponse } from "next"
import {
  initDatabase,
  createRoom,
  getRoom,
  addPlayerToRoom,
  updatePlayer,
  updateRoom,
  removePlayerFromRoom,
  cleanupOldRooms,
  cleanupEmptyRooms,
  type Player,
} from "../../lib/database"

// Initialize database on startup
let dbInitialized = false

async function ensureDbInitialized() {
  if (!dbInitialized) {
    try {
      await initDatabase()
      dbInitialized = true
      console.log("✅ Database initialized successfully")
    } catch (error) {
      console.error("❌ Failed to initialize database:", error)
      throw error
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CRITICAL: Ensure Socket.IO server is only initialized once
  if (!res.socket.server.io) {
    await ensureDbInitialized()

    console.log("🚀 Initializing Socket.IO server...")

    const io = new SocketIOServer(res.socket.server, {
      path: "/api/socketio",
      addTrailingSlash: false,
      // CRITICAL: Namespace configuration
      serveClient: false,
      // CORS configuration
      cors: {
        origin: process.env.NODE_ENV === "production" 
          ? [
              "https://oneplswork.onrender.com", 
              "https://*.onrender.com"
            ]
          : "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      // Transport configuration for Render.com
      transports: ["polling"],
      allowUpgrades: false,
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
      maxHttpBufferSize: 1e6,
      // Additional configuration for cloud platforms
      cookie: false,
      perMessageDeflate: false,
      httpCompression: false,
    })

    // CRITICAL: Enhanced error handling for namespace issues
    io.engine.on("connection_error", (err) => {
      console.log("❌ Socket.IO Engine connection error:")
      console.log("  - Request URL:", err.req?.url)
      console.log("  - Request method:", err.req?.method)
      console.log("  - Request headers:", JSON.stringify(err.req?.headers, null, 2))
      console.log("  - Error code:", err.code)
      console.log("  - Error message:", err.message)
      console.log("  - Error context:", err.context)
      console.log("  - Error type:", err.type)
      
      // Log namespace-specific errors
      if (err.message && err.message.includes("namespace")) {
        console.log("🚨 NAMESPACE ERROR DETECTED:")
        console.log("  - This is likely a client-side namespace configuration issue")
        console.log("  - Check that client is connecting to the correct namespace")
        console.log("  - Ensure no trailing slashes or incorrect paths")
      }
    })

    // Enhanced connection logging
    io.engine.on("initial_headers", (headers, req) => {
      console.log("📋 Socket.IO Initial headers for:", req.url)
      console.log("  - User-Agent:", req.headers['user-agent'])
      console.log("  - Origin:", req.headers.origin)
      console.log("  - Referer:", req.headers.referer)
    })

    // Log all incoming connections with detailed info
    io.engine.on("connection", (socket) => {
      console.log("🔌 Engine connection established:")
      console.log("  - Socket ID:", socket.id)
      console.log("  - Transport:", socket.transport.name)
      console.log("  - Request URL:", socket.request.url)
      console.log("  - Request headers:", JSON.stringify(socket.request.headers, null, 2))
    })

    // Schedule periodic room cleanup (every 10 minutes)
    setInterval(async () => {
      try {
        await cleanupOldRooms(io)
        const emptyRoomsDeleted = await cleanupEmptyRooms(io)
        if (emptyRoomsDeleted > 0) {
          broadcastAvailableRooms(io)
        }
      } catch (error) {
        console.error("Failed to cleanup old rooms:", error)
      }
    }, 10 * 60 * 1000)

    // CRITICAL: Main connection handler with namespace validation
    io.on("connection", (socket) => {
      console.log("✅ Socket.IO client connected successfully:")
      console.log("  - Socket ID:", socket.id)
      console.log("  - Transport:", socket.conn.transport.name)
      console.log("  - Namespace:", socket.nsp.name)
      console.log("  - Handshake:", JSON.stringify(socket.handshake, null, 2))

      // Validate namespace
      if (socket.nsp.name !== "/") {
        console.error("❌ Invalid namespace detected:", socket.nsp.name)
        socket.emit("error", { 
          message: "Invalid namespace", 
          namespace: socket.nsp.name,
          expected: "/",
          status: 400 
        })
        socket.disconnect(true)
        return
      }

      // Enhanced connection event logging
      socket.conn.on("upgrade", () => {
        console.log("⬆️ Socket upgraded to:", socket.conn.transport.name)
      })

      socket.conn.on("upgradeError", (err) => {
        console.log("❌ Socket upgrade error:", err)
      })

      socket.on("connect_error", (error) => {
        console.error("❌ Client connection error:", error)
      })

      // Emit connection success event
      socket.emit("connection-success", { 
        socketId: socket.id,
        transport: socket.conn.transport.name,
        namespace: socket.nsp.name
      })

      socket.on("create-room", async ({ roomId, playerId, data }, callback) => {
        try {
          console.log(`🏠 Creating room ${roomId} with target score ${data?.targetScore}`)
          const targetScore = [100, 250, 500].includes(Number(data?.targetScore)) ? Number(data.targetScore) : 100
          const room = await createRoom(roomId, { target_score: targetScore })
          if (!room) {
            return callback({ error: "Failed to create room", status: 500 })
          }
          socket.join(roomId)
          callback({ room })
          io.to(roomId).emit("room-update", { room })
          
          broadcastAvailableRooms(io)
          
          console.log(`✅ Room ${roomId} created successfully`)
        } catch (error) {
          console.error(`❌ Error creating room ${roomId}:`, error)
          callback({ error: "Failed to create room", status: 500 })
        }
      })

      socket.on("join-room", async ({ roomId, playerId, data }, callback) => {
        try {
          console.log(`👤 Player ${playerId} joining room ${roomId}`)
          const room = await getRoom(roomId)
          if (!room) {
            return callback({ error: "Room not found", status: 404 })
          }
          
          if (room.game_state === "playing") {
            console.log(`🚫 Blocked join attempt - Room ${roomId} is currently playing`)
            return callback({ 
              error: "Cannot join: Game is already in progress. Please wait for the game to finish.", 
              status: 403 
            })
          }
          
          const player: Omit<Player, "last_seen"> = {
            id: playerId,
            name: data.name,
            language: null,
            ready: false,
            score: 0,
            is_host: data.isHost || false,
            current_question: null,
          }
          const success = await addPlayerToRoom(roomId, player)
          if (!success) {
            return callback({ error: "Failed to join room", status: 500 })
          }
          socket.join(roomId)
          const updatedRoom = await getRoom(roomId)
          callback({ room: updatedRoom })
          io.to(roomId).emit("room-update", { room: updatedRoom })
          
          broadcastAvailableRooms(io)
          
          console.log(`✅ Player ${playerId} joined room ${roomId}`)
        } catch (error) {
          console.error(`❌ Error joining room ${roomId}:`, error)
          callback({ error: "Failed to join room", status: 500 })
        }
      })

      socket.on("get-available-rooms", async ({}, callback) => {
        try {
          console.log("🔍 Fetching available rooms...")
          const availableRooms = await getAvailableRooms()
          console.log(`✅ Found ${availableRooms.length} available rooms`)
          callback({ rooms: availableRooms })
        } catch (error) {
          console.error("❌ Error fetching available rooms:", error)
          callback({ error: "Failed to fetch available rooms", rooms: [] })
        }
      })

      socket.on("update-language", async ({ roomId, playerId, data }, callback) => {
        try {
          console.log(`🌐 Updating language for player ${playerId} to ${data.language}`)
          const room = await getRoom(roomId)
          if (!room) {
            return callback({ error: "Room not found", status: 404 })
          }
          const player = room.players.find((p) => p.id === playerId)
          if (!player) {
            return callback({ error: "Player not found", status: 404 })
          }
          const shouldResetReady = !player.language
          const success = await updatePlayer(playerId, {
            language: data.language,
            ready: shouldResetReady ? false : player.ready,
          })
          if (!success) {
            return callback({ error: "Failed to update language", status: 500 })
          }
          const updatedRoom = await getRoom(roomId)
          callback({ room: updatedRoom })
          io.to(roomId).emit("room-update", { room: updatedRoom })
          console.log(`✅ Language updated for player ${playerId}`)
        } catch (error) {
          console.error(`❌ Error updating language for player ${playerId}:`, error)
          callback({ error: "Failed to update language", status: 500 })
        }
      })

      socket.on("toggle-ready", async ({ roomId, playerId }, callback) => {
        try {
          console.log(`⚡ Toggling ready for player ${playerId}`)
          const room = await getRoom(roomId)
          if (!room) {
            return callback({ error: "Room not found", status: 404 })
          }
          const player = room.players.find((p) => p.id === playerId)
          if (!player) {
            return callback({ error: "Player not found", status: 404 })
          }
          if (!player.language) {
            return callback({ error: "Select a language first", status: 400 })
          }
          const success = await updatePlayer(playerId, { ready: !player.ready })
          if (!success) {
            return callback({ error: "Failed to toggle ready status", status: 500 })
          }
          const updatedRoom = await getRoom(roomId)
          callback({ room: updatedRoom })
          io.to(roomId).emit("room-update", { room: updatedRoom })
          console.log(`✅ Ready toggled for player ${playerId}`)
        } catch (error) {
          console.error(`❌ Error toggling ready for player ${playerId}:`, error)
          callback({ error: "Failed to toggle ready status", status: 500 })
        }
      })

      socket.on("update-target-score", async ({ roomId, playerId, data }, callback) => {
        try {
          console.log(`🎯 Updating target score for room ${roomId} to ${data.targetScore}`)
          const room = await getRoom(roomId)
          if (!room) {
            return callback({ error: "Room not found", status: 404 })
          }
          const player = room.players.find((p) => p.id === playerId)
          if (!player || !player.is_host) {
            return callback({ error: "Only the room creator can update the target score", status: 403 })
          }
          const targetScore = Number(data.targetScore)
          if (![100, 250, 500].includes(targetScore)) {
            return callback({ error: "Invalid target score", status: 400 })
          }
          const success = await updateRoom(roomId, { target_score: targetScore })
          if (!success) {
            return callback({ error: "Failed to update target score", status: 500 })
          }
          const updatedRoom = await getRoom(roomId)
          callback({ room: updatedRoom })
          io.to(roomId).emit("room-update", { room: updatedRoom })
          console.log(`✅ Target score updated to ${targetScore}`)
        } catch (error) {
          console.error(`❌ Error updating target score for room ${roomId}:`, error)
          callback({ error: "Failed to update target score", status: 500 })
        }
      })

      socket.on("start-game", async ({ roomId, playerId }, callback) => {
        try {
          console.log(`🎮 Starting game - Room: ${roomId}, Host: ${playerId}`)
          
          const room = await getRoom(roomId)
          if (!room) {
            console.log(`❌ Room ${roomId} not found`)
            return callback({ error: "Room not found", status: 404 })
          }
          
          const player = room.players.find((p) => p.id === playerId)
          if (!player || !player.is_host) {
            console.log(`❌ Player ${playerId} is not host`)
            return callback({ error: "Only the room creator can start the game", status: 403 })
          }
          
          const playersWithoutLanguage = room.players.filter((p) => !p.language)
          if (playersWithoutLanguage.length > 0) {
            console.log(`❌ Players without language: ${playersWithoutLanguage.map(p => p.name).join(", ")}`)
            return callback({ 
              error: `All players must select a language. Missing: ${playersWithoutLanguage.map(p => p.name).join(", ")}`, 
              status: 400 
            })
          }
          
          const playersNotReady = room.players.filter((p) => !p.ready)
          if (playersNotReady.length > 0) {
            console.log(`❌ Players not ready: ${playersNotReady.map(p => p.name).join(", ")}`)
            return callback({ 
              error: `All players must be ready. Not ready: ${playersNotReady.map(p => p.name).join(", ")}`, 
              status: 400 
            })
          }

          console.log(`✅ STRICT checks passed - ALL ${room.players.length} players have languages and are ready`)

          const roomUpdateSuccess = await updateRoom(roomId, { game_state: "playing", question_count: 0 })
          if (!roomUpdateSuccess) {
            console.log(`❌ Failed to update room state`)
            return callback({ error: "Failed to start game", status: 500 })
          }

          const updatedRoom = await getRoom(roomId)
          console.log(`✅ Game started successfully with STRICT requirements met`)

          callback({ room: updatedRoom })
          io.to(roomId).emit("room-update", { room: updatedRoom })
          
          broadcastAvailableRooms(io)
        } catch (error) {
          console.error(`❌ Error starting game for room ${roomId}:`, error)
          callback({ error: "Failed to start game", status: 500 })
        }
      })

      socket.on("answer", async ({ roomId, playerId, data }, callback) => {
        try {
          console.log(`📝 Processing answer for player ${playerId}`)
          
          const room = await getRoom(roomId)
          if (!room) {
            return callback({ error: "Room not found", status: 404 })
          }
          
          const player = room.players.find((p) => p.id === playerId)
          if (!player) {
            return callback({ error: "Player not found", status: 404 })
          }

          const { answer, timeLeft, correctAnswer } = data
          
          const isCorrect = answer === correctAnswer
          const isTimeout = timeLeft <= 0 || answer === ""
          
          let newScore = player.score
          
          if (isCorrect) {
            const pointsChange = Math.max(1, Math.round(10 - (10 - timeLeft)))
            newScore = player.score + pointsChange
            console.log(`✅ Correct answer! Player ${playerId} earned ${pointsChange} points`)
          } else {
            newScore = Math.max(0, player.score - 5)
            console.log(`❌ Wrong answer/timeout! Player ${playerId} loses 5 points`)
          }
          
          await updatePlayer(playerId, { score: newScore })
          
          if (newScore >= room.target_score && newScore > 0) {
            console.log(`🏆 Player ${playerId} reached target score ${room.target_score}`)
            await updateRoom(roomId, { game_state: "finished", winner_id: playerId })
            const finalRoom = await getRoom(roomId)
            callback({ room: finalRoom })
            io.to(roomId).emit("room-update", { room: finalRoom })
            
            broadcastAvailableRooms(io)
            return
          }

          const updatedRoom = await getRoom(roomId)
          callback({ room: updatedRoom })
          io.to(roomId).emit("room-update", { room: updatedRoom })
          console.log(`✅ Answer processed for player ${playerId}, new score: ${newScore}`)
        } catch (error) {
          console.error(`❌ Error processing answer for player ${playerId}:`, error)
          callback({ error: "Failed to process answer", status: 500 })
        }
      })

      socket.on("restart", async ({ roomId, playerId }, callback) => {
        try {
          const room = await getRoom(roomId)
          if (!room) {
            return callback({ error: "Room not found", status: 404 })
          }
          const player = room.players.find((p) => p.id === playerId)
          if (!player || !player.is_host) {
            return callback({ error: "Only the room creator can restart the game", status: 403 })
          }

          console.log(`🔄 Restarting game in room ${roomId}`)
          
          await updateRoom(roomId, {
            game_state: "lobby",
            winner_id: null,
            question_count: 0,
            target_score: 100,
          })
          
          for (const p of room.players) {
            await updatePlayer(p.id, { score: 0, ready: false })
          }

          const updatedRoom = await getRoom(roomId)
          callback({ room: updatedRoom })
          io.to(roomId).emit("room-update", { room: updatedRoom })
          
          broadcastAvailableRooms(io)
          
          console.log(`✅ Game restarted in room ${roomId}`)
        } catch (error) {
          console.error(`❌ Error restarting game for room ${roomId}:`, error)
          callback({ error: "Failed to restart game", status: 500 })
        }
      })

      socket.on("leave-room", async ({ roomId, playerId }) => {
        try {
          console.log(`🚪 Player ${playerId} leaving room ${roomId}`)
          
          const { roomId: actualRoomId, wasHost, roomDeleted } = await removePlayerFromRoom(playerId, io)
          
          if (!actualRoomId) {
            console.log(`⚠️ Player ${playerId} was not found in any room`)
            return
          }
          
          socket.leave(actualRoomId)
          
          if (roomDeleted) {
            console.log(`🗑️ Room ${actualRoomId} was automatically deleted (empty)`)
            broadcastAvailableRooms(io)
            return
          }
          
          const room = await getRoom(actualRoomId)
          
          if (!room) {
            console.log(`⚠️ Room ${actualRoomId} no longer exists after player removal`)
            broadcastAvailableRooms(io)
            return
          }
          
          if (wasHost) {
            console.log(`🚨 HOST LEFT ROOM ${actualRoomId} - Notifying all remaining players to refresh`)
            io.to(actualRoomId).emit("host-left")
            setTimeout(() => {
              io.to(actualRoomId).emit("error", { message: "Host left the room", status: 404 })
            }, 500)
          } else {
            io.to(actualRoomId).emit("room-update", { room })
          }
          
          broadcastAvailableRooms(io)
          
          console.log(`✅ Player ${playerId} left room ${actualRoomId}`)
        } catch (error) {
          console.error(`❌ Error handling leave-room for player ${playerId}:`, error)
          io.to(roomId).emit("error", { message: "Failed to leave room", status: 500 })
        }
      })

      socket.on("disconnect", async (reason) => {
        console.log("🔌 Socket.IO client disconnected:", socket.id, "Reason:", reason)
      })

      // CRITICAL: Handle namespace-related errors
      socket.on("error", (error) => {
        console.error("❌ Socket error:", error)
        if (error.message && error.message.includes("namespace")) {
          console.log("🚨 Namespace error detected on socket:", socket.id)
          socket.emit("namespace-error", { 
            message: "Invalid namespace configuration",
            socketId: socket.id,
            namespace: socket.nsp.name
          })
        }
      })
    })

    res.socket.server.io = io
    console.log("✅ Socket.IO server initialized successfully with namespace validation")
  } else {
    console.log("🔄 Socket.IO server already initialized, skipping...")
  }

  res.status(200).end()
}

// Function to get available rooms
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
        SELECT r.id, r.target_score, COUNT(p.id) as player_count
        FROM rooms r
        LEFT JOIN players p ON r.id = p.room_id
        WHERE r.game_state = 'lobby'
        AND r.last_activity > NOW() - INTERVAL '1 hour'
        GROUP BY r.id, r.target_score
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
      }))

      console.log(`📊 Found ${availableRooms.length} available rooms`)
      return availableRooms
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("❌ Error fetching available rooms:", error)
    return []
  }
}

// Function to broadcast available rooms to all connected clients
async function broadcastAvailableRooms(io: SocketIOServer) {
  try {
    const availableRooms = await getAvailableRooms()
    io.emit("available-rooms-update", { rooms: availableRooms })
    console.log(`📡 Broadcasted ${availableRooms.length} available rooms to all clients`)
  } catch (error) {
    console.error("❌ Error broadcasting available rooms:", error)
  }
}

// Disable body parsing for Socket.IO
export const config = {
  api: {
    bodyParser: false,
  },
}