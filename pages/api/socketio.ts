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
  type Question,
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

// Word database
const WORD_DATABASE = [
  { english: "Apple", french: "Pomme", german: "Apfel", russian: "яблоко", japanese: "Ringo", spanish: "Manzana" },
  { english: "Car", french: "Voiture", german: "Auto", russian: "машина", japanese: "Kuruma", spanish: "Coche" },
  { english: "House", french: "Maison", german: "Haus", russian: "дом", japanese: "Ie", spanish: "Casa" },
  { english: "Water", french: "Eau", german: "Wasser", russian: "вода", japanese: "Mizu", spanish: "Agua" },
  { english: "Book", french: "Livre", german: "Buch", russian: "книга", japanese: "Hon", spanish: "Libro" },
  { english: "Cat", french: "Chat", german: "Katze", russian: "кот", japanese: "Neko", spanish: "Gato" },
  { english: "Dog", french: "Chien", german: "Hund", russian: "собака", japanese: "Inu", spanish: "Perro" },
  { english: "Tree", french: "Arbre", german: "Baum", russian: "дерево", japanese: "Ki", spanish: "Árbol" },
  { english: "Sun", french: "Soleil", german: "Sonne", russian: "солнце", japanese: "Taiyou", spanish: "Sol" },
  { english: "Moon", french: "Lune", german: "Mond", russian: "луна", japanese: "Tsuki", spanish: "Luna" },
  { english: "Food", french: "Nourriture", german: "Essen", russian: "еда", japanese: "Tabemono", spanish: "Comida" },
  { english: "Love", french: "Amour", german: "Liebe", russian: "любовь", japanese: "Ai", spanish: "Amor" },
  { english: "Time", french: "Temps", german: "Zeit", russian: "время", japanese: "Jikan", spanish: "Tiempo" },
  { english: "Money", french: "Argent", german: "Geld", russian: "деньги", japanese: "Okane", spanish: "Dinero" },
  { english: "Friend", french: "Ami", german: "Freund", russian: "друг", japanese: "Tomodachi", spanish: "Amigo" },
  { english: "Family", french: "Famille", german: "Familie", russian: "семья", japanese: "Kazoku", spanish: "Familia" },
  { english: "School", french: "École", german: "Schule", russian: "школа", japanese: "Gakkou", spanish: "Escuela" },
  { english: "Work", french: "Travail", german: "Arbeit", russian: "работа", japanese: "Shigoto", spanish: "Trabajo" },
  { english: "Music", french: "Musique", german: "Musik", russian: "музыка", japanese: "Ongaku", spanish: "Música" },
  { english: "Color", french: "Couleur", german: "Farbe", russian: "цвет", japanese: "Iro", spanish: "Color" },
  { english: "Red", french: "Rouge", german: "Rot", russian: "красный", japanese: "Aka", spanish: "Rojo" },
  { english: "Blue", french: "Bleu", german: "Blau", russian: "синий", japanese: "Ao", spanish: "Azul" },
  { english: "Green", french: "Vert", german: "Grün", russian: "зелёный", japanese: "Midori", spanish: "Verde" },
  { english: "Yellow", french: "Jaune", german: "Gelb", russian: "жёлтый", japanese: "Kiiro", spanish: "Amarillo" },
  { english: "Black", french: "Noir", german: "Schwarz", russian: "чёрный", japanese: "Kuro", spanish: "Negro" },
  { english: "Eat", french: "Manger", german: "Essen", russian: "есть", japanese: "Taberu", spanish: "Comer" },
  { english: "Drink", french: "Boire", german: "Trinken", russian: "пить", japanese: "Nomu", spanish: "Beber" },
  { english: "Run", french: "Courir", german: "Laufen", russian: "бегать", japanese: "Hashiru", spanish: "Correr" },
  { english: "Walk", french: "Marcher", german: "Gehen", russian: "ходить", japanese: "Aruku", spanish: "Caminar" },
  { english: "Sleep", french: "Dormir", german: "Schlafen", russian: "спать", japanese: "Neru", spanish: "Dormir" },
]

// Counter for generating unique question IDs
let questionCounter = 0

function generateQuestion(language: "french" | "german" | "russian" | "japanese" | "spanish"): Question {
  const randomWord = WORD_DATABASE[Math.floor(Math.random() * WORD_DATABASE.length)]
  const correctAnswer = randomWord[language]

  const wrongAnswers: string[] = []
  while (wrongAnswers.length < 3) {
    const randomWrongWord = WORD_DATABASE[Math.floor(Math.random() * WORD_DATABASE.length)]
    const wrongAnswer = randomWrongWord[language]
    if (wrongAnswer !== correctAnswer && !wrongAnswers.includes(wrongAnswer)) {
      wrongAnswers.push(wrongAnswer)
    }
  }

  const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5)

  const question = {
    questionId: `q-${questionCounter++}-${Date.now()}`,
    english: randomWord.english,
    correctAnswer,
    options,
  }

  console.log(`Generated question ${question.questionId} for ${language}:`, question)
  return question
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

      socket.on("start-game", async ({ roomId, playerId }, callback) => {
        try {
          console.log(`=== STARTING GAME ===`)
          console.log(`Room: ${roomId}, Player: ${playerId}`)
          
          const room = await getRoom(roomId)
          if (!room) {
            console.log(`Room ${roomId} not found`)
            return callback({ error: "Room not found", status: 404 })
          }
          
          const player = room.players.find((p) => p.id === playerId)
          if (!player || !player.is_host) {
            console.log(`Player ${playerId} is not host or not found`)
            return callback({ error: "Only the room creator can start the game", status: 403 })
          }
          
          const playersWithLanguage = room.players.filter((p) => p.language)
          console.log(`Players with language: ${playersWithLanguage.length}`, playersWithLanguage.map(p => ({ id: p.id, name: p.name, language: p.language })))
          
          if (playersWithLanguage.length === 0) {
            return callback({ error: "At least one player must select a language", status: 400 })
          }
          
          if (!playersWithLanguage.every((p) => p.ready)) {
            return callback({ error: "All players with languages must be ready", status: 400 })
          }

          // Step 1: Update room to playing state
          console.log(`Step 1: Setting room ${roomId} to playing state`)
          const roomUpdateSuccess = await updateRoom(roomId, { game_state: "playing", question_count: 0 })
          console.log(`Room update success: ${roomUpdateSuccess}`)
          
          // Step 2: Generate and assign questions to all players with languages
          console.log(`Step 2: Generating questions for ${playersWithLanguage.length} players`)
          for (const p of playersWithLanguage) {
            if (p.language) {
              console.log(`Generating question for player ${p.id} (${p.name}) with language ${p.language}`)
              const question = generateQuestion(p.language)
              console.log(`Generated question for ${p.id}:`, question)
              
              const updateSuccess = await updatePlayer(p.id, { current_question: question })
              console.log(`Question assignment for player ${p.id}: ${updateSuccess ? 'SUCCESS' : 'FAILED'}`)
              
              if (!updateSuccess) {
                console.error(`Failed to assign question to player ${p.id}`)
              }
            }
          }

          // Step 3: Verify the updates by fetching the room again
          console.log(`Step 3: Verifying room state after updates`)
          const updatedRoom = await getRoom(roomId)
          
          if (!updatedRoom) {
            console.error(`Failed to retrieve updated room ${roomId}`)
            return callback({ error: "Failed to retrieve updated room", status: 500 })
          }
          
          console.log(`Updated room state:`, {
            gameState: updatedRoom.game_state,
            playerCount: updatedRoom.players.length,
            playersWithQuestions: updatedRoom.players.filter(p => p.current_question).length,
            players: updatedRoom.players.map(p => ({
              id: p.id,
              name: p.name,
              language: p.language,
              hasQuestion: !!p.current_question,
              questionId: p.current_question?.questionId,
              questionEnglish: p.current_question?.english
            }))
          })
          
          // Step 4: Send response and emit room update
          console.log(`Step 4: Sending response and emitting room update`)
          callback({ room: updatedRoom })
          io.to(roomId).emit("room-update", { room: updatedRoom })
          
          console.log(`=== GAME START COMPLETE ===`)
        } catch (error) {
          console.error(`Error starting game for room ${roomId}:`, error)
          callback({ error: "Failed to start game", status: 500 })
        }
      })

      socket.on("answer", async ({ roomId, playerId, data }, callback) => {
        try {
          const room = await getRoom(roomId)
          if (!room) {
            return callback({ error: "Room not found", status: 404 })
          }
          const player = room.players.find((p) => p.id === playerId)
          if (!player || !player.current_question) {
            return callback({ error: "Player or question not found", status: 404 })
          }

          const { answer, timeLeft } = data
          const isCorrect = answer === player.current_question.correctAnswer
          let newScore = player.score
          if (isCorrect) {
            const points = Math.max(1, Math.round(10 - (10 - timeLeft)))
            newScore = player.score + points
            await updatePlayer(playerId, { score: newScore })
            if (newScore >= room.target_score) {
              await updateRoom(roomId, { game_state: "finished", winner_id: playerId })
            }
          }
          if (player.language && room.game_state !== "finished") {
            const nextQuestion = generateQuestion(player.language)
            await updatePlayer(playerId, { current_question: nextQuestion })
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

      socket.on("leave-room", async ({ roomId, playerId }) => {
        try {
          await removePlayerFromRoom(playerId)
          socket.leave(roomId)
          const room = await getRoom(roomId)
          if (!room || room.players.length === 0) {
            io.to(roomId).emit("error", { message: "Room closed", status: 404 })
            return
          }
          io.to(roomId).emit("room-update", { room })
        } catch (error) {
          console.error(`Error leaving room ${roomId} for player ${playerId}:`, error)
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