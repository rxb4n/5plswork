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
  type Player,
} from "../../lib/database"

// Initialize database on startup
let dbInitialized = false

async function ensureDbInitialized() {
  if (!dbInitialized) {
    try {
      await initDatabase()
      dbInitialized = true
      console.log("Database initialized successfully")
    } catch (error) {
      console.error("Failed to initialize database:", error)
      throw error
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket.server.io) {
    await ensureDbInitialized()

    console.log("Initializing Socket.IO server...")

    const io = new SocketIOServer(res.socket.server, {
      path: "/api/socketio",
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === "production" 
          ? ["https://oneplswork.onrender.com", "https://*.onrender.com"]
          : "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["polling", "websocket"],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
      maxHttpBufferSize: 1e6,
    })

    // Schedule periodic room cleanup (every 10 minutes)
    setInterval(async () => {
      try {
        await cleanupOldRooms()
      } catch (error) {
        console.error("Failed to cleanup old rooms:", error)
      }
    }, 10 * 60 * 1000)

    io.on("connection", (socket) => {
      console.log("New Socket.IO connection:", socket.id)

      socket.on("create-room", async ({ roomId, playerId, data }, callback) => {
        try {
          console.log(`Creating room ${roomId} with target score ${data?.targetScore}`)
          const targetScore = [100, 250, 500].includes(Number(data?.targetScore)) ? Number(data.targetScore) : 100
          const room = await createRoom(roomId, { target_score: targetScore })
          if (!room) {
            return callback({ error: "Failed to create room", status: 500 })
          }
          socket.join(roomId)
          callback({ room })
          io.to(roomId).emit("room-update", { room })
        } catch (error) {
          console.error(`Error creating room ${roomId}:`, error)
          callback({ error: "Failed to create room", status: 500 })
        }
      })

      socket.on("join-room", async ({ roomId, playerId, data }, callback) => {
        try {
          console.log(`Player ${playerId} joining room ${roomId}`)
          const room = await getRoom(roomId)
          if (!room) {
            return callback({ error: "Room not found", status: 404 })
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
        } catch (error) {
          console.error(`Error joining room ${roomId}:`, error)
          callback({ error: "Failed to join room", status: 500 })
        }
      })

      socket.on("update-language", async ({ roomId, playerId, data }, callback) => {
        try {
          console.log(`Updating language for player ${playerId} to ${data.language}`)
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
        } catch (error) {
          console.error(`Error updating language for player ${playerId}:`, error)
          callback({ error: "Failed to update language", status: 500 })
        }
      })

      socket.on("toggle-ready", async ({ roomId, playerId }, callback) => {
        try {
          console.log(`Toggling ready for player ${playerId}`)
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
        } catch (error) {
          console.error(`Error toggling ready for player ${playerId}:`, error)
          callback({ error: "Failed to toggle ready status", status: 500 })
        }
      })

      socket.on("update-target-score", async ({ roomId, playerId, data }, callback) => {
        try {
          console.log(`Updating target score for room ${roomId} to ${data.targetScore}`)
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
        } catch (error) {
          console.error(`Error updating target score for room ${roomId}:`, error)
          callback({ error: "Failed to update target score", status: 500 })
        }
      })

      // SIMPLIFIED: Start game handler - just changes room state
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
          
          const playersWithLanguage = room.players.filter((p) => p.language)
          console.log(`Players with language: ${playersWithLanguage.length}`)
          
          if (playersWithLanguage.length === 0) {
            console.log(`❌ No players have selected a language`)
            return callback({ error: "At least one player must select a language", status: 400 })
          }
          
          if (!playersWithLanguage.every((p) => p.ready)) {
            console.log(`❌ Not all players with languages are ready`)
            return callback({ error: "All players with languages must be ready", status: 400 })
          }

          console.log(`✅ Pre-flight checks passed, updating room state to playing`)

          // Simply update room to playing state - questions will be fetched by client
          const roomUpdateSuccess = await updateRoom(roomId, { game_state: "playing", question_count: 0 })
          if (!roomUpdateSuccess) {
            console.log(`❌ Failed to update room state`)
            return callback({ error: "Failed to start game", status: 500 })
          }

          const updatedRoom = await getRoom(roomId)
          console.log(`✅ Game started successfully`)

          callback({ room: updatedRoom })
          io.to(roomId).emit("room-update", { room: updatedRoom })
        } catch (error) {
          console.error(`❌ Error starting game for room ${roomId}:`, error)
          callback({ error: "Failed to start game", status: 500 })
        }
      })

      // Answer handler - simplified
      socket.on("answer", async ({ roomId, playerId, data }, callback) => {
        try {
          console.log(`Processing answer for player ${playerId}`)
          
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
            // Correct answer: award points based on speed
            const pointsChange = Math.max(1, Math.round(10 - (10 - timeLeft)))
            newScore = player.score + pointsChange
          } else {
            // Wrong answer or timeout: apply -5 penalty
            newScore = Math.max(0, player.score - 5) // Don't go below 0
          }
          
          // Update player score
          await updatePlayer(playerId, { score: newScore })
          
          // Check if player won
          if (newScore >= room.target_score && newScore > 0) {
            await updateRoom(roomId, { game_state: "finished", winner_id: playerId })
            const finalRoom = await getRoom(roomId)
            callback({ room: finalRoom })
            io.to(roomId).emit("room-update", { room: finalRoom })
            return
          }

          const updatedRoom = await getRoom(roomId)
          callback({ room: updatedRoom })
          io.to(roomId).emit("room-update", { room: updatedRoom })
        } catch (error) {
          console.error(`Error processing answer for player ${playerId}:`, error)
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

          console.log(`Restarting game in room ${roomId}`)
          
          await updateRoom(roomId, {
            game_state: "lobby",
            winner_id: null,
            question_count: 0,
            target_score: 100,
          })
          
          for (const p of room.players) {
            await updatePlayer(p.id, { score: 0, ready: false, current_question: null })
          }

          const updatedRoom = await getRoom(roomId)
          callback({ room: updatedRoom })
          io.to(roomId).emit("room-update", { room: updatedRoom })
        } catch (error) {
          console.error(`Error restarting game for room ${roomId}:`, error)
          callback({ error: "Failed to restart game", status: 500 })
        }
      })

      // Leave room handler
      socket.on("leave-room", async ({ roomId, playerId }) => {
        try {
          console.log(`Player ${playerId} leaving room ${roomId}`)
          
          // Remove player from database
          await removePlayerFromRoom(playerId)
          
          // Remove from socket room
          socket.leave(roomId)
          
          // Get updated room state
          const room = await getRoom(roomId)
          
          if (!room || room.players.length === 0) {
            console.log(`Room ${roomId} is now empty`)
            // Notify any remaining clients that room is closed
            io.to(roomId).emit("error", { message: "Room closed", status: 404 })
            return
          }
          
          // Emit room update to remaining players
          io.to(roomId).emit("room-update", { room })
        } catch (error) {
          console.error(`Error handling leave-room for player ${playerId}:`, error)
          io.to(roomId).emit("error", { message: "Failed to leave room", status: 500 })
        }
      })

      socket.on("disconnect", async () => {
        console.log("Socket.IO client disconnected:", socket.id)
      })
    })

    res.socket.server.io = io
    console.log("Socket.IO server initialized successfully")
  }

  res.status(200).end()
}

// Disable body parsing for Socket.IO
export const config = {
  api: {
    bodyParser: false,
  },
}