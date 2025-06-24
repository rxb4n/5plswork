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

// Word database - THIS IS THE SOURCE OF ALL QUESTIONS
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
  { english: "Read", french: "Lire", german: "Lesen", russian: "читать", japanese: "Yomu", spanish: "Leer" },
  { english: "Write", french: "Écrire", german: "Schreiben", russian: "писать", japanese: "Kaku", spanish: "Escribir" },
  { english: "Speak", french: "Parler", german: "Sprechen", russian: "говорить", japanese: "Hanasu", spanish: "Hablar" },
  { english: "Listen", french: "Écouter", german: "Hören", russian: "слушать", japanese: "Kiku", spanish: "Escuchar" },
  { english: "Sing", french: "Chanter", german: "Singen", russian: "петь", japanese: "Utau", spanish: "Cantar" },
  { english: "Play", french: "Jouer", german: "Spielen", russian: "играть", japanese: "Asobu", spanish: "Jugar" },
  { english: "Dance", french: "Danser", german: "Tanzen", russian: "танцевать", japanese: "Odoru", spanish: "Bailar" },
  { english: "See", french: "Voir", german: "Sehen", russian: "видеть", japanese: "Miru", spanish: "Ver" },
  { english: "Learn", french: "Apprendre", german: "Lernen", russian: "учиться", japanese: "Manabu", spanish: "Aprender" },
  { english: "Think", french: "Penser", german: "Denken", russian: "думать", japanese: "Omou", spanish: "Pensar" },
  { english: "Give", french: "Donner", german: "Geben", russian: "давать", japanese: "Ageru", spanish: "Dar" },
  { english: "Take", french: "Prendre", german: "Nehmen", russian: "брать", japanese: "Toru", spanish: "Tomar" },
  { english: "Buy", french: "Acheter", german: "Kaufen", russian: "покупать", japanese: "Kau", spanish: "Comprar" },
  { english: "Sell", french: "Vendre", german: "Verkaufen", russian: "продавать", japanese: "Uru", spanish: "Vender" },
  { english: "Open", french: "Ouvrir", german: "Öffnen", russian: "открывать", japanese: "Akeru", spanish: "Abrir" },
  { english: "Close", french: "Fermer", german: "Schließen", russian: "закрывать", japanese: "Shimeru", spanish: "Cerrar" },
  { english: "Go", french: "Aller", german: "Gehen", russian: "идти", japanese: "Iku", spanish: "Ir" },
  { english: "Come", french: "Venir", german: "Kommen", russian: "приходить", japanese: "Kuru", spanish: "Venir" },
  { english: "Know", french: "Savoir", german: "Wissen", russian: "знать", japanese: "Shiru", spanish: "Saber" },
  { english: "Want", french: "Vouloir", german: "Wollen", russian: "хотеть", japanese: "Hoshii", spanish: "Querer" },
  { english: "Table", french: "Table", german: "Tisch", russian: "стол", japanese: "Teeburu", spanish: "Mesa" },
  { english: "Chair", french: "Chaise", german: "Stuhl", russian: "стул", japanese: "Isu", spanish: "Silla" },
  { english: "Door", french: "Porte", german: "Tür", russian: "дверь", japanese: "Tobira", spanish: "Puerta" },
  { english: "Window", french: "Fenêtre", german: "Fenster", russian: "окно", japanese: "Mado", spanish: "Ventana" },
  { english: "Bed", french: "Lit", german: "Bett", russian: "кровать", japanese: "Beddo", spanish: "Cama" },
  { english: "Kitchen", french: "Cuisine", german: "Küche", russian: "кухня", japanese: "Daidokoro", spanish: "Cocina" },
  { english: "Room", french: "Chambre", german: "Zimmer", russian: "комната", japanese: "Heya", spanish: "Habitación" },
  { english: "City", french: "Ville", german: "Stadt", russian: "город", japanese: "Toshi", spanish: "Ciudad" },
  { english: "Street", french: "Rue", german: "Straße", russian: "улица", japanese: "Toori", spanish: "Calle" },
  { english: "Park", french: "Parc", german: "Park", russian: "парк", japanese: "Kouen", spanish: "Parque" },
  { english: "Child", french: "Enfant", german: "Kind", russian: "ребёнок", japanese: "Kodomo", spanish: "Niño" },
  { english: "Man", french: "Homme", german: "Mann", russian: "мужчина", japanese: "Otoko", spanish: "Hombre" },
  { english: "Woman", french: "Femme", german: "Frau", russian: "женщина", japanese: "Onna", spanish: "Mujer" },
  { english: "Baby", french: "Bébé", german: "Baby", russian: "малыш", japanese: "Akachan", spanish: "Bebé" },
  { english: "Teacher", french: "Professeur", german: "Lehrer", russian: "учитель", japanese: "Sensei", spanish: "Profesor" },
  { english: "Student", french: "Étudiant", german: "Student", russian: "студент", japanese: "Gakusei", spanish: "Estudiante" },
  { english: "Doctor", french: "Médecin", german: "Arzt", russian: "врач", japanese: "Isha", spanish: "Médico" },
  { english: "Hospital", french: "Hôpital", german: "Krankenhaus", russian: "больница", japanese: "Byouin", spanish: "Hospital" },
  { english: "Store", french: "Magasin", german: "Geschäft", russian: "магазин", japanese: "Mise", spanish: "Tienda" },
  { english: "Market", french: "Marché", german: "Markt", russian: "рынок", japanese: "Ichiba", spanish: "Mercado" },
  { english: "Bread", french: "Pain", german: "Brot", russian: "хлеб", japanese: "Pan", spanish: "Pan" },
  { english: "Milk", french: "Lait", german: "Milch", russian: "молоко", japanese: "Gyunyu", spanish: "Leche" },
  { english: "Egg", french: "Œuf", german: "Ei", russian: "яйцо", japanese: "Tamago", spanish: "Huevo" },
  { english: "Fish", french: "Poisson", german: "Fisch", russian: "рыба", japanese: "Sakana", spanish: "Pescado" },
  { english: "Meat", french: "Viande", german: "Fleisch", russian: "мясо", japanese: "Niku", spanish: "Carne" },
  { english: "Fruit", french: "Fruit", german: "Obst", russian: "фрукт", japanese: "Kudamono", spanish: "Fruta" },
  { english: "Flower", french: "Fleur", german: "Blume", russian: "цветок", japanese: "Hana", spanish: "Flor" },
  { english: "Sky", french: "Ciel", german: "Himmel", russian: "небо", japanese: "Sora", spanish: "Cielo" },
  { english: "Star", french: "Étoile", german: "Stern", russian: "звезда", japanese: "Hoshi", spanish: "Estrella" },
  { english: "Rain", french: "Pluie", german: "Regen", russian: "дождь", japanese: "Ame", spanish: "Lluvia" },
  { english: "Snow", french: "Neige", german: "Schnee", russian: "снег", japanese: "Yuki", spanish: "Nieve" },
  { english: "Wind", french: "Vent", german: "Wind", russian: "ветер", japanese: "Kaze", spanish: "Viento" },
  { english: "Day", french: "Jour", german: "Tag", russian: "день", japanese: "Hi", spanish: "Día" },
  { english: "Night", french: "Nuit", german: "Nacht", russian: "ночь", japanese: "Yoru", spanish: "Noche" },
  { english: "Morning", french: "Matin", german: "Morgen", russian: "утро", japanese: "Asa", spanish: "Mañana" },
  { english: "Evening", french: "Soir", german: "Abend", russian: "вечер", japanese: "Yuu", spanish: "Tarde" },
  { english: "Road", french: "Route", german: "Straße", russian: "дорога", japanese: "Michi", spanish: "Camino" },
  { english: "Bridge", french: "Pont", german: "Brücke", russian: "мост", japanese: "Hashi", spanish: "Puente" },
  { english: "River", french: "Rivière", german: "Fluss", russian: "река", japanese: "Kawa", spanish: "Río" },
  { english: "Sea", french: "Mer", german: "Meer", russian: "море", japanese: "Umi", spanish: "Mar" },
  { english: "Mountain", french: "Montagne", german: "Berg", russian: "гора", japanese: "Yama", spanish: "Montaña" },
  { english: "Forest", french: "Forêt", german: "Wald", russian: "лес", japanese: "Mori", spanish: "Bosque" },
  { english: "Garden", french: "Jardin", german: "Garten", russian: "сад", japanese: "Niwa", spanish: "Jardín" },
  { english: "Bird", french: "Oiseau", german: "Vogel", russian: "птица", japanese: "Tori", spanish: "Pájaro" },
  { english: "Horse", french: "Cheval", german: "Pferd", russian: "лошадь", japanese: "Uma", spanish: "Caballo" },
  { english: "Cow", french: "Vache", german: "Kuh", russian: "корова", japanese: "Ushi", spanish: "Vaca" },
  { english: "Fire", french: "Feu", german: "Feuer", russian: "огонь", japanese: "Hi", spanish: "Fuego" },
  { english: "Light", french: "Lumière", german: "Licht", russian: "свет", japanese: "Hikari", spanish: "Luz" },
]

// Counter for generating unique question IDs
let questionCounter = 0

function generateQuestion(language: "french" | "german" | "russian" | "japanese" | "spanish"): Question {
  console.log(`=== GENERATING QUESTION FOR ${language.toUpperCase()} ===`)
  
  // Validate language
  if (!["french", "german", "russian", "japanese", "spanish"].includes(language)) {
    console.error(`Invalid language: ${language}`)
    throw new Error(`Invalid language: ${language}`)
  }

  // Select random word
  const randomWord = WORD_DATABASE[Math.floor(Math.random() * WORD_DATABASE.length)]
  console.log(`Selected word:`, randomWord)
  
  // Get correct answer
  const correctAnswer = randomWord[language]
  if (!correctAnswer) {
    console.error(`No translation found for ${language} in word:`, randomWord)
    throw new Error(`No translation found for ${language}`)
  }

  // Generate wrong answers
  const wrongAnswers: string[] = []
  let attempts = 0
  const maxAttempts = 50 // Prevent infinite loop
  
  while (wrongAnswers.length < 3 && attempts < maxAttempts) {
    attempts++
    const randomWrongWord = WORD_DATABASE[Math.floor(Math.random() * WORD_DATABASE.length)]
    const wrongAnswer = randomWrongWord[language]
    
    if (wrongAnswer && wrongAnswer !== correctAnswer && !wrongAnswers.includes(wrongAnswer)) {
      wrongAnswers.push(wrongAnswer)
    }
  }

  if (wrongAnswers.length < 3) {
    console.error(`Could not generate enough wrong answers for ${language}. Got ${wrongAnswers.length}/3`)
    throw new Error(`Could not generate enough wrong answers for ${language}`)
  }

  // Shuffle options
  const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5)

  // Create question object
  const question: Question = {
    questionId: `q-${language}-${questionCounter++}-${Date.now()}`,
    english: randomWord.english,
    correctAnswer,
    options,
  }

  console.log(`Generated question:`, {
    questionId: question.questionId,
    english: question.english,
    language: language,
    correctAnswer: question.correctAnswer,
    options: question.options,
    optionsCount: question.options.length
  })

  // Validate question structure
  if (!question.questionId || !question.english || !question.correctAnswer || !question.options || question.options.length !== 4) {
    console.error(`Invalid question structure:`, question)
    throw new Error(`Invalid question structure`)
  }

  console.log(`=== QUESTION GENERATION COMPLETE ===`)
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

      // CRITICAL FIX: Generate and assign ALL questions BEFORE changing room state
      socket.on("start-game", async ({ roomId, playerId }, callback) => {
        try {
          console.log(`\n🎮 === STARTING GAME ===`)
          console.log(`Room: ${roomId}, Host Player: ${playerId}`)
          
          const room = await getRoom(roomId)
          if (!room) {
            console.log(`❌ Room ${roomId} not found`)
            return callback({ error: "Room not found", status: 404 })
          }
          
          const player = room.players.find((p) => p.id === playerId)
          if (!player || !player.is_host) {
            console.log(`❌ Player ${playerId} is not host or not found`)
            return callback({ error: "Only the room creator can start the game", status: 403 })
          }
          
          const playersWithLanguage = room.players.filter((p) => p.language)
          console.log(`Players with language: ${playersWithLanguage.length}`)
          playersWithLanguage.forEach(p => {
            console.log(`  - ${p.name} (${p.id}): ${p.language}, ready: ${p.ready}`)
          })
          
          if (playersWithLanguage.length === 0) {
            console.log(`❌ No players have selected a language`)
            return callback({ error: "At least one player must select a language", status: 400 })
          }
          
          if (!playersWithLanguage.every((p) => p.ready)) {
            console.log(`❌ Not all players with languages are ready`)
            return callback({ error: "All players with languages must be ready", status: 400 })
          }

          console.log(`✅ Pre-flight checks passed, starting game...`)

          // 🔥 CRITICAL FIX: Generate ALL questions FIRST, BEFORE any database updates
          console.log(`\n🎯 STEP 1: GENERATING ALL QUESTIONS FIRST`)
          const questionAssignments = []
          
          for (const p of playersWithLanguage) {
            if (p.language) {
              try {
                console.log(`🔄 Generating question for ${p.name} (${p.language})`)
                const question = generateQuestion(p.language)
                console.log(`✅ Generated: ${question.questionId} - "${question.english}" -> "${question.correctAnswer}"`)
                
                questionAssignments.push({ playerId: p.id, question })
              } catch (error) {
                console.error(`❌ Failed to generate question for player ${p.id}:`, error)
                return callback({ error: `Failed to generate question for player ${p.name}`, status: 500 })
              }
            }
          }
          
          console.log(`✅ Generated ${questionAssignments.length} questions successfully`)
          
          // 🔥 STEP 2: Assign ALL questions to players ATOMICALLY
          console.log(`\n🎯 STEP 2: ASSIGNING ALL QUESTIONS TO PLAYERS`)
          for (const assignment of questionAssignments) {
            console.log(`📝 Assigning question ${assignment.question.questionId} to player ${assignment.playerId}`)
            const updateSuccess = await updatePlayer(assignment.playerId, { 
              current_question: assignment.question 
            })
            
            if (!updateSuccess) {
              console.error(`❌ CRITICAL: Failed to assign question to player ${assignment.playerId}`)
              return callback({ error: `Failed to assign question to player`, status: 500 })
            }
            console.log(`✅ Question assigned successfully`)
          }

          // 🔥 STEP 3: ONLY NOW change room state to "playing"
          console.log(`\n🎯 STEP 3: SETTING ROOM TO PLAYING STATE`)
          const roomUpdateSuccess = await updateRoom(roomId, { 
            game_state: "playing", 
            question_count: 0 
          })
          
          if (!roomUpdateSuccess) {
            console.error(`❌ CRITICAL: Failed to update room ${roomId} to playing state`)
            return callback({ error: "Failed to start game", status: 500 })
          }
          console.log(`✅ Room state updated to "playing"`)

          // 🔥 STEP 4: Get final room state and verify everything is correct
          console.log(`\n🎯 STEP 4: VERIFYING FINAL ROOM STATE`)
          const finalRoom = await getRoom(roomId)
          
          if (!finalRoom) {
            console.error(`❌ CRITICAL: Failed to retrieve final room state`)
            return callback({ error: "Failed to retrieve updated room", status: 500 })
          }
          
          // Verify all players have questions
          const playersWithQuestions = finalRoom.players.filter(p => p.current_question)
          const playersWithoutQuestions = finalRoom.players.filter(p => p.language && !p.current_question)
          
          console.log(`📊 FINAL VERIFICATION:`)
          console.log(`  - Room state: ${finalRoom.game_state}`)
          console.log(`  - Total players: ${finalRoom.players.length}`)
          console.log(`  - Players with languages: ${playersWithLanguage.length}`)
          console.log(`  - Players with questions: ${playersWithQuestions.length}`)
          console.log(`  - Players missing questions: ${playersWithoutQuestions.length}`)
          
          finalRoom.players.forEach(p => {
            console.log(`  📋 ${p.name}: language=${p.language}, hasQuestion=${!!p.current_question}, questionId=${p.current_question?.questionId}`)
          })
          
          if (playersWithoutQuestions.length > 0) {
            console.error(`❌ CRITICAL: Some players are missing questions!`)
            playersWithoutQuestions.forEach(p => {
              console.error(`  - ${p.name} (${p.id}) with language ${p.language} has no question`)
            })
            return callback({ error: "Failed to assign questions to all players", status: 500 })
          }
          
          // 🔥 STEP 5: Send response and emit room update
          console.log(`\n🎯 STEP 5: SENDING RESPONSE TO CLIENT`)
          callback({ room: finalRoom })
          
          console.log(`📡 Emitting room-update to all clients in room ${roomId}`)
          io.to(roomId).emit("room-update", { room: finalRoom })
          
          console.log(`🎉 === GAME START COMPLETE - ALL PLAYERS SHOULD HAVE QUESTIONS ===\n`)
        } catch (error) {
          console.error(`❌ CRITICAL ERROR starting game for room ${roomId}:`, error)
          callback({ error: "Failed to start game", status: 500 })
        }
      })

      // MODIFIED: Answer handler with individual timing and penalties
      socket.on("answer", async ({ roomId, playerId, data }, callback) => {
        try {
          console.log(`\n=== PROCESSING ANSWER ===`)
          console.log(`Player: ${playerId}, Room: ${roomId}`)
          console.log(`Answer data:`, data)
          
          const room = await getRoom(roomId)
          if (!room) {
            return callback({ error: "Room not found", status: 404 })
          }
          
          const player = room.players.find((p) => p.id === playerId)
          if (!player || !player.current_question) {
            console.log(`❌ Player ${playerId} or question not found. Player exists: ${!!player}, Has question: ${!!player?.current_question}`)
            return callback({ error: "Player or question not found", status: 404 })
          }

          const { answer, timeLeft, questionId } = data
          const currentQuestion = player.current_question
          
          // Verify question ID matches (prevent stale answers)
          if (questionId && questionId !== currentQuestion.questionId) {
            console.log(`❌ Question ID mismatch. Expected: ${currentQuestion.questionId}, Got: ${questionId}`)
            return callback({ error: "Question has changed", status: 400 })
          }
          
          const isCorrect = answer === currentQuestion.correctAnswer
          const isTimeout = timeLeft <= 0 || answer === ""
          
          console.log(`Answer evaluation:`)
          console.log(`  - Answer: "${answer}"`)
          console.log(`  - Correct: "${currentQuestion.correctAnswer}"`)
          console.log(`  - Is correct: ${isCorrect}`)
          console.log(`  - Is timeout/empty: ${isTimeout}`)
          console.log(`  - Time left: ${timeLeft}s`)
          
          let newScore = player.score
          let pointsChange = 0
          
          if (isCorrect) {
            // Correct answer: award points based on speed
            pointsChange = Math.max(1, Math.round(10 - (10 - timeLeft)))
            newScore = player.score + pointsChange
            console.log(`✅ Correct answer! Player ${playerId} earned ${pointsChange} points, new total: ${newScore}`)
          } else {
            // Wrong answer or timeout: apply -5 penalty
            pointsChange = -5
            newScore = Math.max(0, player.score + pointsChange) // Don't go below 0
            console.log(`❌ Wrong answer/timeout! Player ${playerId} loses 5 points, new total: ${newScore}`)
          }
          
          // Update player score
          await updatePlayer(playerId, { score: newScore })
          
          // Check if player won (only if they have positive score)
          if (newScore >= room.target_score && newScore > 0) {
            console.log(`🏆 Player ${playerId} reached target score ${room.target_score}, ending game`)
            await updateRoom(roomId, { game_state: "finished", winner_id: playerId })
            const finalRoom = await getRoom(roomId)
            callback({ room: finalRoom })
            io.to(roomId).emit("room-update", { room: finalRoom })
            console.log(`=== GAME FINISHED ===\n`)
            return
          }
          
          // Generate next question if game is still ongoing
          if (player.language && room.game_state !== "finished") {
            console.log(`Generating next question for player ${playerId} with language ${player.language}`)
            try {
              const nextQuestion = generateQuestion(player.language)
              await updatePlayer(playerId, { current_question: nextQuestion })
              console.log(`✅ Next question assigned to ${playerId}: ${nextQuestion.questionId}`)
            } catch (error) {
              console.error(`❌ Failed to generate next question for player ${playerId}:`, error)
              return callback({ error: "Failed to generate next question", status: 500 })
            }
          }

          const updatedRoom = await getRoom(roomId)
          callback({ room: updatedRoom })
          io.to(roomId).emit("room-update", { room: updatedRoom })
          
          console.log(`=== ANSWER PROCESSED ===\n`)
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

      // FIXED: Leave room handler with proper room update emission
      socket.on("leave-room", async ({ roomId, playerId }) => {
        try {
          console.log(`\n=== PLAYER LEAVING ROOM ===`)
          console.log(`Player ${playerId} leaving room ${roomId}`)
          
          // Remove player from database
          const removeSuccess = await removePlayerFromRoom(playerId)
          console.log(`Player removal from database: ${removeSuccess ? 'SUCCESS' : 'FAILED'}`)
          
          // Remove from socket room
          socket.leave(roomId)
          console.log(`Player removed from socket room ${roomId}`)
          
          // Get updated room state
          const room = await getRoom(roomId)
          
          if (!room || room.players.length === 0) {
            console.log(`Room ${roomId} is now empty or doesn't exist`)
            // Notify any remaining clients that room is closed
            io.to(roomId).emit("error", { message: "Room closed", status: 404 })
            console.log(`=== ROOM CLOSED ===\n`)
            return
          }
          
          console.log(`Room ${roomId} still has ${room.players.length} players:`)
          room.players.forEach(p => {
            console.log(`  - ${p.name} (${p.id}) - Host: ${p.is_host}`)
          })
          
          // CRITICAL: Emit room update to ALL remaining clients
          console.log(`Emitting room-update to remaining players in room ${roomId}`)
          io.to(roomId).emit("room-update", { room })
          
          console.log(`=== PLAYER LEAVE COMPLETE ===\n`)
        } catch (error) {
          console.error(`❌ Error handling leave-room for player ${playerId} in room ${roomId}:`, error)
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