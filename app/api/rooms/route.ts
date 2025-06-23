import { type NextRequest, NextResponse } from "next/server"
import {
  initDatabase,
  createRoom,
  getRoom,
  addPlayerToRoom,
  updatePlayer,
  updateRoom,
  deleteRoom,
  removePlayerFromRoom,
  cleanupOldRooms,
  ensureRoomHasHost,
  type Player,
} from "../../../lib/database"

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
  { english: "Apple", french: "Pomme", german: "Apfel", russian: "яблоко" },
  { english: "Car", french: "Voiture", german: "Auto", russian: "машина" },
  { english: "House", french: "Maison", german: "Haus", russian: "дом" },
  { english: "Water", french: "Eau", german: "Wasser", russian: "вода" },
  { english: "Book", french: "Livre", german: "Buch", russian: "книга" },
  { english: "Cat", french: "Chat", german: "Katze", russian: "кот" },
  { english: "Dog", french: "Chien", german: "Hund", russian: "собака" },
  { english: "Tree", french: "Arbre", german: "Baum", russian: "дерево" },
  { english: "Sun", french: "Soleil", german: "Sonne", russian: "солнце" },
  { english: "Moon", french: "Lune", german: "Mond", russian: "луна" },
  { english: "Food", french: "Nourriture", german: "Essen", russian: "еда" },
  { english: "Love", french: "Amour", german: "Liebe", russian: "любовь" },
  { english: "Time", french: "Temps", german: "Zeit", russian: "время" },
  { english: "Money", french: "Argent", german: "Geld", russian: "деньги" },
  { english: "Friend", french: "Ami", german: "Freund", russian: "друг" },
  { english: "Family", french: "Famille", german: "Familie", russian: "семья" },
  { english: "School", french: "École", german: "Schule", russian: "школа" },
  { english: "Work", french: "Travail", german: "Arbeit", russian: "работа" },
  { english: "Music", french: "Musique", german: "Musik", russian: "музыка" },
  { english: "Color", french: "Couleur", german: "Farbe", russian: "цвет" },
  { english: "Red", french: "Rouge", german: "Rot", russian: "красный" },
  { english: "Blue", french: "Bleu", german: "Blau", russian: "синий" },
  { english: "Green", french: "Vert", german: "Grün", russian: "зелёный" },
  { english: "Yellow", french: "Jaune", german: "Gelb", russian: "жёлтый" },
  { english: "Black", french: "Noir", german: "Schwarz", russian: "чёрный" },
]

function generateQuestion(language: "french" | "german" | "russian") {
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

  return {
    english: randomWord.english,
    correctAnswer,
    options,
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure database is initialized
    await ensureDbInitialized()

    const body = await request.json()
    const { action, roomId, playerId, data } = body

    console.log(`API Call: ${action} for room ${roomId} by player ${playerId}`)

    // Validate required parameters
    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 })
    }

    if (!roomId && action !== "ping") {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 })
    }

    if (!playerId && action !== "ping") {
      return NextResponse.json({ error: "Player ID is required" }, { status: 400 })
    }

    // Cleanup old rooms periodically
    if (Math.random() < 0.1) {
      // 10% chance
      try {
        await cleanupOldRooms()
      } catch (error) {
        console.warn("Failed to cleanup old rooms:", error)
      }
    }

    switch (action) {
      case "create":
        try {
          const newRoom = await createRoom(roomId)
          if (!newRoom) {
            return NextResponse.json({ error: "Failed to create room" }, { status: 500 })
          }
          return NextResponse.json({ success: true, room: newRoom })
        } catch (error) {
          console.error("Error creating room:", error)
          return NextResponse.json({ error: "Failed to create room" }, { status: 500 })
        }

      case "join":
        try {
          const room = await getRoom(roomId)
          if (!room) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 })
          }

          // Determine if this player should be the host
          const shouldBeHost = room.players.length === 0

          const player: Omit<Player, "last_seen"> = {
            id: playerId,
            name: data.name,
            language: null,
            ready: false,
            score: 0,
            is_host: shouldBeHost,
            current_question: null,
          }

          console.log(`Player ${playerId} joining room ${roomId}. Should be host: ${shouldBeHost}`)

          const success = await addPlayerToRoom(roomId, player)
          if (!success) {
            return NextResponse.json({ error: "Failed to join room" }, { status: 500 })
          }

          // Ensure room has proper host assignment
          await ensureRoomHasHost(roomId)

          const updatedRoom = await getRoom(roomId)
          return NextResponse.json({ room: updatedRoom })
        } catch (error) {
          console.error("Error joining room:", error)
          return NextResponse.json({ error: "Failed to join room" }, { status: 500 })
        }

      case "leave":
        try {
          await removePlayerFromRoom(playerId)
          const roomAfterLeave = await getRoom(roomId)
          if (!roomAfterLeave || roomAfterLeave.players.length === 0) {
            await deleteRoom(roomId)
            return NextResponse.json({ success: true })
          }

          // Ensure there's still a host after player leaves
          await ensureRoomHasHost(roomId)

          const updatedRoom = await getRoom(roomId)
          return NextResponse.json({ room: updatedRoom })
        } catch (error) {
          console.error("Error leaving room:", error)
          return NextResponse.json({ error: "Failed to leave room" }, { status: 500 })
        }

      case "update-language":
        try {
          // Get current player state to preserve ready status if they already had a language
          const currentRoom = await getRoom(roomId)
          const currentPlayer = currentRoom?.players.find((p) => p.id === playerId)

          // Only reset ready status if the player didn't have a language before
          const shouldResetReady = !currentPlayer?.language

          await updatePlayer(playerId, {
            language: data.language,
            ready: shouldResetReady ? false : currentPlayer.ready,
          })

          const updatedRoom = await getRoom(roomId)
          return NextResponse.json({ room: updatedRoom })
        } catch (error) {
          console.error("Error updating language:", error)
          return NextResponse.json({ error: "Failed to update language" }, { status: 500 })
        }

      case "toggle-ready":
        try {
          const currentRoom = await getRoom(roomId)
          if (!currentRoom) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 })
          }

          const currentPlayer = currentRoom.players.find((p) => p.id === playerId)
          if (currentPlayer && currentPlayer.language) {
            await updatePlayer(playerId, { ready: !currentPlayer.ready })
          }
          const updatedRoom = await getRoom(roomId)
          return NextResponse.json({ room: updatedRoom })
        } catch (error) {
          console.error("Error toggling ready:", error)
          return NextResponse.json({ error: "Failed to toggle ready" }, { status: 500 })
        }

      case "start-game":
        try {
          const gameRoom = await getRoom(roomId)
          if (!gameRoom) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 })
          }

          const host = gameRoom.players.find((p) => p.id === playerId)
          if (!host?.is_host) {
            return NextResponse.json({ error: "Only the host can start the game" }, { status: 403 })
          }

          // Check if all players have selected a language and are ready
          const playersWithLanguage = gameRoom.players.filter((p) => p.language)
          if (playersWithLanguage.length === 0) {
            return NextResponse.json({ error: "At least one player must select a language" }, { status: 400 })
          }

          if (!playersWithLanguage.every((p) => p.ready)) {
            return NextResponse.json({ error: "All players with languages must be ready" }, { status: 400 })
          }

          await updateRoom(roomId, {
            game_state: "playing",
            question_count: 0,
          })

          // Generate questions for all players with languages
          for (const player of playersWithLanguage) {
            if (player.language) {
              const question = generateQuestion(player.language)
              await updatePlayer(player.id, { current_question: question })
            }
          }

          const updatedRoom = await getRoom(roomId)
          return NextResponse.json({ room: updatedRoom })
        } catch (error) {
          console.error("Error starting game:", error)
          return NextResponse.json({ error: "Failed to start game" }, { status: 500 })
        }

      case "answer":
        try {
          const answerRoom = await getRoom(roomId)
          if (!answerRoom) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 })
          }

          const answeringPlayer = answerRoom.players.find((p) => p.id === playerId)
          if (answeringPlayer && answeringPlayer.current_question) {
            const { answer, timeLeft } = data
            const isCorrect = answer === answeringPlayer.current_question.correctAnswer

            if (isCorrect) {
              const points = Math.max(1, 10 - (10 - timeLeft))
              const newScore = answeringPlayer.score + points

              await updatePlayer(playerId, { score: newScore })

              if (newScore >= 100) {
                await updateRoom(roomId, {
                  game_state: "finished",
                  winner_id: playerId,
                })
                const finalRoom = await getRoom(roomId)
                return NextResponse.json({ room: finalRoom })
              }
            }

            // Generate next question
            if (answeringPlayer.language) {
              const nextQuestion = generateQuestion(answeringPlayer.language)
              await updatePlayer(playerId, { current_question: nextQuestion })
            }
          }
          const updatedRoom = await getRoom(roomId)
          return NextResponse.json({ room: updatedRoom })
        } catch (error) {
          console.error("Error processing answer:", error)
          return NextResponse.json({ error: "Failed to process answer" }, { status: 500 })
        }

      case "restart":
        try {
          const restartRoom = await getRoom(roomId)
          if (!restartRoom) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 })
          }

          const restartHost = restartRoom.players.find((p) => p.id === playerId)
          if (!restartHost?.is_host) {
            return NextResponse.json({ error: "Only the host can restart the game" }, { status: 403 })
          }

          await updateRoom(roomId, {
            game_state: "lobby",
            winner_id: null,
            question_count: 0,
          })

          // Reset all players
          for (const player of restartRoom.players) {
            await updatePlayer(player.id, {
              score: 0,
              ready: false,
              current_question: null,
            })
          }

          const updatedRoom = await getRoom(roomId)
          return NextResponse.json({ room: updatedRoom })
        } catch (error) {
          console.error("Error restarting game:", error)
          return NextResponse.json({ error: "Failed to restart game" }, { status: 500 })
        }

      case "ping":
        try {
          if (playerId) {
            // Just update last_seen timestamp
            await updatePlayer(playerId, {})
          }
          return NextResponse.json({ success: true })
        } catch (error) {
          console.error("Error processing ping:", error)
          return NextResponse.json({ error: "Failed to process ping" }, { status: 500 })
        }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Ensure database is initialized
    await ensureDbInitialized()

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")

    if (!roomId) {
      return NextResponse.json({ error: "Room ID required" }, { status: 400 })
    }

    const room = await getRoom(roomId)
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    // Ensure room has proper host before returning
    await ensureRoomHasHost(roomId)
    const updatedRoom = await getRoom(roomId)

    return NextResponse.json({ room: updatedRoom })
  } catch (error) {
    console.error("GET Error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
