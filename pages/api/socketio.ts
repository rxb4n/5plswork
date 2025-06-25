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
  cleanupInactiveRooms,
  clearAllRooms,
  updateRoomActivity,
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

// Room activity tracking
const roomActivityTracker = new Map<string, {
  lastActivity: Date
  warningIssued: boolean
  players: Set<string>
}>()

// Cooperation mode challenge tracking
const cooperationChallenges = new Map<string, {
  challengeId: string
  categoryId: string
  language: string
  targetPlayerId: string
  startTime: Date
  timeout?: NodeJS.Timeout
}>()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket.server.io) {
    await ensureDbInitialized()

    console.log("🚀 Initializing Socket.IO server...")

    // Clear all existing rooms immediately
    console.log("🧹 Clearing all existing rooms from system...");
    const clearedRooms = await clearAllRooms();
    console.log(`✅ Cleared ${clearedRooms} existing rooms`);

    const io = new SocketIOServer(res.socket.server, {
      path: "/api/socketio",
      addTrailingSlash: false,
      serveClient: false,
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
      transports: ["polling"],
      allowUpgrades: false,
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
      maxHttpBufferSize: 1e6,
      cookie: false,
      perMessageDeflate: false,
      httpCompression: false,
    })

    // Enhanced error handling
    io.engine.on("connection_error", (err) => {
      console.log("❌ Socket.IO Engine connection error:")
      console.log("  - Request URL:", err.req?.url)
      console.log("  - Request method:", err.req?.method)
      console.log("  - Error code:", err.code)
      console.log("  - Error message:", err.message)
      
      if (err.message && err.message.includes("namespace")) {
        console.log("🚨 NAMESPACE ERROR DETECTED:")
        console.log("  - This is likely a client-side namespace configuration issue")
      }
    })

    // Set up automatic room cleanup mechanism
    console.log("🔧 Setting up automatic room cleanup mechanism...");

    function updateRoomActivityTracker(roomId: string, playerId?: string) {
      const now = new Date();
      const existing = roomActivityTracker.get(roomId);

      if (existing) {
        existing.lastActivity = now;
        existing.warningIssued = false;
        if (playerId) {
          existing.players.add(playerId);
        }
      } else {
        roomActivityTracker.set(roomId, {
          lastActivity: now,
          warningIssued: false,
          players: new Set(playerId ? [playerId] : [])
        });
      }

      updateRoomActivity(roomId).catch(err => {
        console.error(`Failed to update room activity in DB for ${roomId}:`, err);
      });

      console.log(`📊 Activity updated for room ${roomId} (${roomActivityTracker.get(roomId)?.players.size || 0} tracked players)`);
    }

    async function issueInactivityWarning(roomId: string) {
      const warningMessage = {
        type: "inactivity_warning",
        message: "⚠️ Room will be closed in 30 seconds due to inactivity",
        countdown: 30,
        timestamp: new Date().toISOString()
      };

      io.to(roomId).emit("room-warning", warningMessage);
      console.log(`⚠️ Inactivity warning sent to room ${roomId}`);
    }

    // Periodic cleanup process (every 60 seconds)
    const cleanupInterval = setInterval(async () => {
      try {
        const now = new Date();
        const INACTIVITY_THRESHOLD = 120000; // 120 seconds
        const WARNING_THRESHOLD = 90000; // 90 seconds

        console.log(`🔍 Checking ${roomActivityTracker.size} rooms for activity...`);

        for (const [roomId, activity] of roomActivityTracker.entries()) {
          const timeSinceLastActivity = now.getTime() - activity.lastActivity.getTime();

          if (timeSinceLastActivity > WARNING_THRESHOLD && !activity.warningIssued) {
            await issueInactivityWarning(roomId);
            activity.warningIssued = true;
          }

          if (timeSinceLastActivity > INACTIVITY_THRESHOLD) {
            console.log(`🚨 Room ${roomId} inactive for ${Math.round(timeSinceLastActivity / 1000)}s, removing`);
            
            io.to(roomId).emit("room-closed", {
              type: "inactivity_cleanup",
              message: "Room closed due to inactivity",
              reason: "inactivity",
              timestamp: new Date().toISOString()
            });

            roomActivityTracker.delete(roomId);
          }
        }

        const cleanedInactive = await cleanupInactiveRooms(io, INACTIVITY_THRESHOLD);
        if (cleanedInactive > 0) {
          console.log(`🧹 Database cleanup: ${cleanedInactive} inactive rooms removed`);
          broadcastAvailableRooms(io);
        }

        const cleanedEmpty = await cleanupEmptyRooms(io);
        if (cleanedEmpty > 0) {
          console.log(`🧹 Database cleanup: ${cleanedEmpty} empty rooms removed`);
          broadcastAvailableRooms(io);
        }

        await cleanupOldRooms(io);

      } catch (error) {
        console.error("❌ Error during periodic cleanup:", error);
      }
    }, 60000);

    console.log("✅ Automatic cleanup mechanism started (checking every 60 seconds)");

    process.on('SIGTERM', () => {
      console.log('🛑 Shutting down cleanup interval...');
      clearInterval(cleanupInterval);
    });

    process.on('SIGINT', () => {
      console.log('🛑 Shutting down cleanup interval...');
      clearInterval(cleanupInterval);
    });

    // Main connection handler
    io.on("connection", (socket) => {
      console.log("✅ Socket.IO client connected successfully:")
      console.log("  - Socket ID:", socket.id)
      console.log("  - Transport:", socket.conn.transport.name)

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
            console.error(`❌ Failed to create room ${roomId} in database`)
            return callback({ error: "Failed to create room", status: 500 })
          }
          
          // Join the socket to the room
          socket.join(roomId)
          updateRoomActivityTracker(roomId, playerId)
          
          console.log(`✅ Room ${roomId} created successfully`)
          callback({ room })
          broadcastAvailableRooms(io)
          
        } catch (error) {
          console.error(`❌ Error creating room ${roomId}:`, error)
          callback({ error: "Failed to create room", status: 500 })
        }
      })

      socket.on("join-room", async ({ roomId, playerId, data }, callback) => {
        try {
          console.log(`👤 Player ${playerId} (${data.name}) joining room ${roomId}`)
          const room = await getRoom(roomId)
          if (!room) {
            console.error(`❌ Room ${roomId} not found`)
            return callback({ error: "Room not found", status: 404 })
          }
          
          if (room.game_state === "playing") {
            console.log(`🚫 Blocked join attempt - Room ${roomId} is currently playing`)
            return callback({ 
              error: "Cannot join: Game is already in progress. Please wait for the game to finish.", 
              status: 403 
            })
          }

          if (room.game_mode === "cooperation" && room.players.length >= 2) {
            return callback({
              error: "Cannot join: Cooperation mode is limited to 2 players.",
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
            console.error(`❌ Failed to add player ${playerId} to room ${roomId}`)
            return callback({ error: "Failed to join room", status: 500 })
          }
          
          // Join the socket to the room
          socket.join(roomId)
          updateRoomActivityTracker(roomId, playerId)
          
          const updatedRoom = await getRoom(roomId)
          console.log(`✅ Player ${playerId} joined room ${roomId}. Room now has ${updatedRoom?.players.length} players`)
          
          callback({ room: updatedRoom })
          io.to(roomId).emit("room-update", { room: updatedRoom })
          broadcastAvailableRooms(io)
          
        } catch (error) {
          console.error(`❌ Error joining room ${roomId}:`, error)
          callback({ error: "Failed to join room", status: 500 })
        }
      })

      socket.on("room-activity-ping", ({ roomId, playerId }) => {
        if (roomId && playerId) {
          updateRoomActivityTracker(roomId, playerId)
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

      socket.on("update-game-mode", async ({ roomId, playerId, data }, callback) => {
        try {
          console.log(`🎮 Updating game mode for room ${roomId} to ${data.gameMode}`)
          const room = await getRoom(roomId)
          if (!room) {
            return callback({ error: "Room not found", status: 404 })
          }
          const player = room.players.find((p) => p.id === playerId)
          if (!player || !player.is_host) {
            return callback({ error: "Only the room creator can update the game mode", status: 403 })
          }
          
          updateRoomActivityTracker(roomId, playerId)

          const updateData: any = { game_mode: data.gameMode }
          if (data.gameMode === "cooperation") {
            updateData.cooperation_lives = 3
            updateData.cooperation_score = 0
            updateData.used_words = []
            updateData.current_category = null
            updateData.current_challenge_player = null
            updateData.cooperation_waiting = false
          }
          
          const success = await updateRoom(roomId, updateData)
          if (!success) {
            return callback({ error: "Failed to update game mode", status: 500 })
          }
          const updatedRoom = await getRoom(roomId)
          callback({ room: updatedRoom })
          io.to(roomId).emit("room-update", { room: updatedRoom })
          broadcastAvailableRooms(io)
          
          console.log(`✅ Game mode updated to ${data.gameMode}`)
        } catch (error) {
          console.error(`❌ Error updating game mode for room ${roomId}:`, error)
          callback({ error: "Failed to update game mode", status: 500 })
        }
      })

      socket.on("change-game-mode", async ({ roomId, playerId }, callback) => {
        try {
          console.log(`🔄 Changing game mode for room ${roomId} by host ${playerId}`)
          const room = await getRoom(roomId)
          if (!room) {
            return callback({ error: "Room not found", status: 404 })
          }
          const player = room.players.find((p) => p.id === playerId)
          if (!player || !player.is_host) {
            return callback({ error: "Only the room creator can change the game mode", status: 403 })
          }
          
          updateRoomActivityTracker(roomId, playerId)
          
          const success = await updateRoom(roomId, { 
            game_mode: null,
            host_language: null,
            cooperation_lives: null,
            cooperation_score: null,
            used_words: null,
            current_category: null,
            current_challenge_player: null,
            cooperation_waiting: null
          })
          if (!success) {
            return callback({ error: "Failed to reset game mode", status: 500 })
          }

          for (const p of room.players) {
            await updatePlayer(p.id, { 
              ready: false,
              language: null
            })
          }

          const updatedRoom = await getRoom(roomId)
          callback({ room: updatedRoom })
          
          io.to(roomId).emit("game-mode-changed", {
            type: "mode_reset",
            message: "Host is changing the game mode",
            newMode: "selection",
            timestamp: new Date().toISOString()
          })
          
          io.to(roomId).emit("room-update", { room: updatedRoom })
          broadcastAvailableRooms(io)
          
          console.log(`✅ Game mode reset for room ${roomId}`)
        } catch (error) {
          console.error(`❌ Error changing game mode for room ${roomId}:`, error)
          callback({ error: "Failed to change game mode", status: 500 })
        }
      })

      socket.on("update-host-language", async ({ roomId, playerId, data }, callback) => {
        try {
          console.log(`🌐 Updating host language for room ${roomId} to ${data.hostLanguage}`)
          const room = await getRoom(roomId)
          if (!room) {
            return callback({ error: "Room not found", status: 404 })
          }
          const player = room.players.find((p) => p.id === playerId)
          if (!player || !player.is_host) {
            return callback({ error: "Only the room creator can update the host language", status: 403 })
          }
          
          updateRoomActivityTracker(roomId, playerId)
          
          const success = await updateRoom(roomId, { host_language: data.hostLanguage })
          if (!success) {
            return callback({ error: "Failed to update host language", status: 500 })
          }
          const updatedRoom = await getRoom(roomId)
          callback({ room: updatedRoom })
          io.to(roomId).emit("room-update", { room: updatedRoom })
          broadcastAvailableRooms(io)
          
          console.log(`✅ Host language updated to ${data.hostLanguage}`)
        } catch (error) {
          console.error(`❌ Error updating host language for room ${roomId}:`, error)
          callback({ error: "Failed to update host language", status: 500 })
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
          
          updateRoomActivityTracker(roomId, playerId)
          
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
          
          if ((room.game_mode === "practice" || room.game_mode === "cooperation") && !player.language) {
            return callback({ error: "Select a language first", status: 400 })
          }
          if (room.game_mode === "competition" && !room.host_language) {
            return callback({ error: "Host must select a language first", status: 400 })
          }
          if (!room.game_mode) {
            return callback({ error: "Game mode must be selected first", status: 400 })
          }
          
          updateRoomActivityTracker(roomId, playerId)
          
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
          
          updateRoomActivityTracker(roomId, playerId)
          
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
          
          if (!room.game_mode) {
            return callback({ error: "Game mode must be selected first", status: 400 })
          }
          
          if (room.game_mode === "practice") {
            const playersWithoutLanguage = room.players.filter((p) => !p.language)
            if (playersWithoutLanguage.length > 0) {
              console.log(`❌ Players without language: ${playersWithoutLanguage.map(p => p.name).join(", ")}`)
              return callback({ 
                error: `All players must select a language. Missing: ${playersWithoutLanguage.map(p => p.name).join(", ")}`, 
                status: 400 
              })
            }
          } else if (room.game_mode === "competition") {
            if (!room.host_language) {
              return callback({ error: "Host must select a competition language first", status: 400 })
            }
          } else if (room.game_mode === "cooperation") {
            if (room.players.length !== 2) {
              return callback({ error: "Cooperation mode requires exactly 2 players", status: 400 })
            }
            const playersWithoutLanguage = room.players.filter((p) => !p.language)
            if (playersWithoutLanguage.length > 0) {
              return callback({ 
                error: `All players must select a language. Missing: ${playersWithoutLanguage.map(p => p.name).join(", ")}`, 
                status: 400 
              })
            }
          }
          
          const playersNotReady = room.players.filter((p) => !p.ready)
          if (playersNotReady.length > 0) {
            console.log(`❌ Players not ready: ${playersNotReady.map(p => p.name).join(", ")}`)
            return callback({ 
              error: `All players must be ready. Not ready: ${playersNotReady.map(p => p.name).join(", ")}`, 
              status: 400 
            })
          }

          console.log(`✅ All requirements met - starting game with ${room.players.length} players`)

          updateRoomActivityTracker(roomId, playerId)

          const updateData: any = { game_state: "playing", question_count: 0 }
          if (room.game_mode === "cooperation") {
            updateData.cooperation_waiting = true
          }

          const roomUpdateSuccess = await updateRoom(roomId, updateData)
          if (!roomUpdateSuccess) {
            console.log(`❌ Failed to update room state`)
            return callback({ error: "Failed to start game", status: 500 })
          }

          const updatedRoom = await getRoom(roomId)
          console.log(`✅ Game started successfully`)

          callback({ room: updatedRoom })
          io.to(roomId).emit("room-update", { room: updatedRoom })

          if (room.game_mode === "cooperation") {
            io.to(roomId).emit("cooperation-waiting", { isWaiting: true })
            setTimeout(() => {
              startCooperationChallenge(roomId, io)
            }, 2000)
          }
          
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

          const { answer, timeLeft, correctAnswer, isPracticeMode } = data
          
          const isCorrect = answer === correctAnswer
          const isTimeout = timeLeft <= 0 || answer === ""
          
          let newScore = player.score
          
          if (isCorrect) {
            const pointsChange = Math.max(1, Math.round(10 - (10 - timeLeft)))
            newScore = player.score + pointsChange
            console.log(`✅ Correct answer! Player ${playerId} earned ${pointsChange} points`)
          } else if (!isPracticeMode) {
            newScore = Math.max(0, player.score - 5)
            console.log(`❌ Wrong answer in competition mode! Player ${playerId} loses 5 points`)
          } else {
            console.log(`❌ Wrong answer in practice mode - no penalty`)
          }
          
          updateRoomActivityTracker(roomId, playerId)
          
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

      // Cooperation mode handlers
      socket.on("cooperation-answer", async ({ roomId, playerId, data }, callback) => {
        try {
          console.log(`🤝 Processing cooperation answer for player ${playerId}`)
          
          const room = await getRoom(roomId)
          if (!room || room.game_mode !== "cooperation") {
            return callback({ error: "Invalid room or game mode", status: 400 })
          }

          const { challengeId, answer, isCorrect, wordId } = data

          if (isCorrect) {
            const newUsedWords = [...(room.used_words || []), wordId]
            const newScore = (room.cooperation_score || 0) + 1

            await updateRoom(roomId, {
              used_words: newUsedWords,
              cooperation_score: newScore,
              cooperation_waiting: true
            })

            console.log(`✅ Cooperation correct answer! New score: ${newScore}`)

            // Send waiting state and start next challenge
            io.to(roomId).emit("cooperation-waiting", { isWaiting: true })
            setTimeout(() => {
              startCooperationChallenge(roomId, io)
            }, 3000)
          }

          const updatedRoom = await getRoom(roomId)
          io.to(roomId).emit("room-update", { room: updatedRoom })

        } catch (error) {
          console.error(`❌ Error processing cooperation answer:`, error)
        }
      })

      socket.on("cooperation-timeout", async ({ roomId, playerId, data }, callback) => {
        try {
          console.log(`⏰ Cooperation timeout for player ${playerId}`)
          
          const room = await getRoom(roomId)
          if (!room || room.game_mode !== "cooperation") {
            return
          }

          const newLives = Math.max(0, (room.cooperation_lives || 3) - 1)
          
          if (newLives === 0) {
            await updateRoom(roomId, {
              cooperation_lives: newLives,
              game_state: "finished"
            })
            console.log(`💀 Cooperation game over! Final score: ${room.cooperation_score || 0}`)
          } else {
            await updateRoom(roomId, {
              cooperation_lives: newLives,
              cooperation_waiting: true
            })
            console.log(`💔 Lost a life! Lives remaining: ${newLives}`)

            // Send waiting state and start next challenge
            io.to(roomId).emit("cooperation-waiting", { isWaiting: true })
            setTimeout(() => {
              startCooperationChallenge(roomId, io)
            }, 3000)
          }

          const updatedRoom = await getRoom(roomId)
          io.to(roomId).emit("room-update", { room: updatedRoom })

        } catch (error) {
          console.error(`❌ Error processing cooperation timeout:`, error)
        }
      })

      // Handle cooperation typing events
      socket.on("cooperation-typing", ({ roomId, playerId, text }) => {
        socket.to(roomId).emit("cooperation-typing", { playerId, text })
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
          
          updateRoomActivityTracker(roomId, playerId)
          
          await updateRoom(roomId, {
            game_state: "lobby",
            game_mode: null,
            host_language: null,
            winner_id: null,
            question_count: 0,
            target_score: 100,
            cooperation_lives: null,
            cooperation_score: null,
            used_words: null,
            current_category: null,
            current_challenge_player: null,
            cooperation_waiting: null
          })
          
          for (const p of room.players) {
            await updatePlayer(p.id, { score: 0, ready: false, language: null })
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
          
          const activity = roomActivityTracker.get(roomId)
          if (activity) {
            activity.players.delete(playerId)
            if (activity.players.size === 0) {
              roomActivityTracker.delete(roomId)
            }
          }
          
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
    console.log("✅ Socket.IO server initialized successfully with comprehensive cleanup system")
  } else {
    console.log("🔄 Socket.IO server already initialized, skipping...")
  }

  res.status(200).end()
}

// Function to start a cooperation challenge
async function startCooperationChallenge(roomId: string, io: SocketIOServer) {
  try {
    const room = await getRoom(roomId)
    if (!room || room.game_mode !== "cooperation" || room.game_state !== "playing") {
      return
    }

    // Check if game should end
    if ((room.cooperation_lives || 3) <= 0) {
      await updateRoom(roomId, { game_state: "finished" })
      const finalRoom = await getRoom(roomId)
      io.to(roomId).emit("room-update", { room: finalRoom })
      return
    }

    // Select a random player and their language
    const players = room.players.filter(p => p.language)
    if (players.length === 0) return

    const randomPlayer = players[Math.floor(Math.random() * players.length)]
    const challengeLanguage = randomPlayer.language!

    console.log(`🎯 Starting cooperation challenge for room ${roomId} in ${challengeLanguage}`)

    // Get a random category challenge
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/get-cooperation-category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: challengeLanguage })
    })

    if (response.ok) {
      const data = await response.json()
      const challenge = data.category

      // Update room with current challenge info
      await updateRoom(roomId, {
        current_category: challenge.categoryId,
        current_challenge_player: randomPlayer.id,
        cooperation_waiting: false
      })

      // Send challenge to all players
      io.to(roomId).emit("cooperation-challenge", { challenge })
      console.log(`✅ Cooperation challenge sent to room ${roomId}:`, challenge)
    } else {
      console.error("Failed to fetch cooperation category")
    }

  } catch (error) {
    console.error("Error starting cooperation challenge:", error)
  }
}

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
        maxPlayers: row.game_mode === "cooperation" ? 2 : 8,
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