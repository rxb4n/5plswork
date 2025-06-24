import { Server as SocketIOServer } from "socket.io";
import { NextApiRequest, NextApiResponse } from "next";
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
} from "../../../lib/database";

// Initialize database on startup
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
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
];

// Counter for generating unique question IDs
let questionCounter = 0;

function generateQuestion(language: "french" | "german" | "russian" | "japanese" | "spanish"): Question {
  const randomWord = WORD_DATABASE[Math.floor(Math.random() * WORD_DATABASE.length)];
  const correctAnswer = randomWord[language];

  const wrongAnswers: string[] = [];
  while (wrongAnswers.length < 3) {
    const randomWrongWord = WORD_DATABASE[Math.floor(Math.random() * WORD_DATABASE.length)];
    const wrongAnswer = randomWrongWord[language];
    if (wrongAnswer !== correctAnswer && !wrongAnswers.includes(wrongAnswer)) {
      wrongAnswers.push(wrongAnswer);
    }
  }

  const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);

  return {
    questionId: `q-${questionCounter++}`,
    english: randomWord.english,
    correctAnswer,
    options,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket.server.io) {
    await ensureDbInitialized();

    const io = new SocketIOServer(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
    });

    // Schedule periodic room cleanup (every 10 minutes)
    setInterval(async () => {
      try {
        await cleanupOldRooms(io);
      } catch (error) {
        console.error("Failed to cleanup old rooms:", error);
      }
    }, 10 * 60 * 1000);

    io.on("connection", (socket) => {
      console.log("New Socket.IO connection:", socket.id);

      socket.on("create-room", async ({ roomId, playerId, data }, callback) => {
        try {
          const targetScore = [100, 250, 500].includes(Number(data?.targetScore)) ? Number(data.targetScore) : 100;
          const room = await createRoom(roomId, { creator_id: playerId, target_score: targetScore });
          if (!room) {
            return callback({ error: "Failed to create room", status: 500 });
          }
          socket.join(roomId);
          const serverInfo = {
            processingTime: Date.now() - socket.handshake.time,
            roomCount: (await io.allSockets()).size,
            timestamp: Date.now(),
          };
          callback({ room });
          io.to(roomId).emit("room-update", { room, serverInfo });
        } catch (error) {
          console.error(`Error creating room ${roomId}:`, error);
          callback({ error: "Failed to create room", status: 500 });
        }
      });

      socket.on("join-room", async ({ roomId, playerId, data }, callback) => {
        try {
          const room = await getRoom(roomId);
          if (!room) {
            return callback({ error: "Room not found", status: 404 });
          }
          const player: Omit<Player, "last_seen"> = {
            id: playerId,
            name: data.name,
            language: null,
            ready: false,
            score: 0,
            is_host: data.isHost || playerId === room.creator_id,
            current_question: null,
          };
          const success = await addPlayerToRoom(roomId, player);
          if (!success) {
            return callback({ error: "Failed to join room", status: 500 });
          }
          socket.join(roomId);
          const updatedRoom = await getRoom(roomId);
          const serverInfo = {
            processingTime: Date.now() - socket.handshake.time,
            roomCount: (await io.allSockets()).size,
            timestamp: Date.now(),
          };
          callback({ room: updatedRoom });
          io.to(roomId).emit("room-update", { room: updatedRoom, serverInfo });
        } catch (error) {
          console.error(`Error joining room ${roomId}:`, error);
          callback({ error: "Failed to join room", status: 500 });
        }
      });

      socket.on("update-language", async ({ roomId, playerId, data }, callback) => {
        try {
          const room = await getRoom(roomId);
          if (!room) {
            return callback({ error: "Room not found", status: 404 });
          }
          const player = room.players.find((p) => p.id === playerId);
          if (!player) {
            return callback({ error: "Player not found", status: 404 });
          }
          const shouldResetReady = !player.language;
          const success = await updatePlayer(playerId, {
            language: data.language,
            ready: shouldResetReady ? false : player.ready,
          });
          if (!success) {
            return callback({ error: "Failed to update language", status: 500 });
          }
          const updatedRoom = await getRoom(roomId);
          const serverInfo = {
            processingTime: Date.now() - socket.handshake.time,
            roomCount: (await io.allSockets()).size,
            timestamp: Date.now(),
          };
          callback({ room: updatedRoom });
          io.to(roomId).emit("room-update", { room: updatedRoom, serverInfo });
        } catch (error) {
          console.error(`Error updating language for player ${playerId}:`, error);
          callback({ error: "Failed to update language", status: 500 });
        }
      });

      socket.on("toggle-ready", async ({ roomId, playerId }, callback) => {
        try {
          const room = await getRoom(roomId);
          if (!room) {
            return callback({ error: "Room not found", status: 404 });
          }
          const player = room.players.find((p) => p.id === playerId);
          if (!player) {
            return callback({ error: "Player not found", status: 404 });
          }
          if (!player.language) {
            return callback({ error: "Select a language first", status: 400 });
          }
          const success = await updatePlayer(playerId, { ready: !player.ready });
          if (!success) {
            return callback({ error: "Failed to toggle ready status", status: 500 });
          }
          const updatedRoom = await getRoom(roomId);
          const serverInfo = {
            processingTime: Date.now() - socket.handshake.time,
            roomCount: (await io.allSockets()).size,
            timestamp: Date.now(),
          };
          callback({ room: updatedRoom });
          io.to(roomId).emit("room-update", { room: updatedRoom, serverInfo });
        } catch (error) {
          console.error(`Error toggling ready for player ${playerId}:`, error);
          callback({ error: "Failed to toggle ready status", status: 500 });
        }
      });

      socket.on("update-target-score", async ({ roomId, playerId, data }, callback) => {
        try {
          const room = await getRoom(roomId);
          if (!room) {
            return callback({ error: "Room not found", status: 404 });
          }
          const player = room.players.find((p) => p.id === playerId);
          if (!player || !player.is_host || player.id !== room.creator_id) {
            return callback({ error: "Only the room creator can update the target score", status: 403 });
          }
          const targetScore = Number(data.targetScore);
          if (![100, 250, 500].includes(targetScore)) {
            return callback({ error: "Invalid target score", status: 400 });
          }
          const success = await updateRoom(roomId, { target_score: targetScore });
          if (!success) {
            return callback({ error: "Failed to update target score", status: 500 });
          }
          const updatedRoom = await getRoom(roomId);
          const serverInfo = {
            processingTime: Date.now() - socket.handshake.time,
            roomCount: (await io.allSockets()).size,
            timestamp: Date.now(),
          };
          callback({ room: updatedRoom });
          io.to(roomId).emit("room-update", { room: updatedRoom, serverInfo });
          console.log(`Room ${roomId} target_score updated to ${targetScore}`);
        } catch (error) {
          console.error(`Error updating target score for room ${roomId}:`, error);
          callback({ error: "Failed to update target score", status: 500 });
        }
      });

      socket.on("start-game", async ({ roomId, playerId }, callback) => {
        try {
          const room = await getRoom(roomId);
          if (!room) {
            return callback({ error: "Room not found", status: 404 });
          }
          const player = room.players.find((p) => p.id === playerId);
          if (!player || !player.is_host || player.id !== room.creator_id) {
            return callback({ error: "Only the room creator can start the game", status: 403 });
          }
          const playersWithLanguage = room.players.filter((p) => p.language);
          if (playersWithLanguage.length === 0) {
            return callback({ error: "At least one player must select a language", status: 400 });
          }
          if (!playersWithLanguage.every((p) => p.ready)) {
            return callback({ error: "All players with languages must be ready", status: 400 });
          }
          const client = await pool.connect();
          try {
            await client.query("BEGIN");
            await updateRoom(roomId, { game_state: "playing", question_count: 0 });
            for (const p of playersWithLanguage) {
              if (p.language) {
                const question = generateQuestion(p.language);
                await updatePlayer(p.id, { current_question: question });
              }
            }
            await client.query("COMMIT");
          } catch (error) {
            await client.query("ROLLBACK");
            throw error;
          } finally {
            client.release();
          }
          const updatedRoom = await getRoom(roomId);
          const serverInfo = {
            processingTime: Date.now() - socket.handshake.time,
            roomCount: (await io.allSockets()).size,
            timestamp: Date.now(),
          };
          callback({ room: updatedRoom });
          io.to(roomId).emit("room-update", { room: updatedRoom, serverInfo });
        } catch (error) {
          console.error(`Error starting game for room ${roomId}:`, error);
          callback({ error: "Failed to start game", status: 500 });
        }
      });

      socket.on("answer", async ({ roomId, playerId, data }, callback) => {
        try {
          const room = await getRoom(roomId);
          if (!room) {
            return callback({ error: "Room not found", status: 404 });
          }
          const player = room.players.find((p) => p.id === playerId);
          if (!player || !player.current_question) {
            return callback({ error: "Player or question not found", status: 404 });
          }
          const client = await pool.connect();
          try {
            await client.query("BEGIN");
            const { answer, timeLeft } = data;
            const isCorrect = answer === player.current_question.correctAnswer;
            let newScore = player.score;
            if (isCorrect) {
              const points = Math.max(1, Math.round(10 - (10 - timeLeft)));
              newScore = player.score + points;
              await updatePlayer(playerId, { score: newScore });
              if (newScore >= room.target_score) {
                await updateRoom(roomId, { game_state: "finished", winner_id: playerId });
              }
            }
            if (player.language && room.game_state !== "finished") {
              const nextQuestion = generateQuestion(player.language);
              await updatePlayer(playerId, { current_question: nextQuestion });
            }
            await client.query("COMMIT");
          } catch (error) {
            await client.query("ROLLBACK");
            throw error;
          } finally {
            client.release();
          }
          const updatedRoom = await getRoom(roomId);
          const serverInfo = {
            processingTime: Date.now() - socket.handshake.time,
            roomCount: (await io.allSockets()).size,
            timestamp: Date.now(),
          };
          callback({ room: updatedRoom });
          io.to(roomId).emit("room-update", { room: updatedRoom, serverInfo });
        } catch (error) {
          console.error(`Error processing answer for player ${playerId}:`, error);
          callback({ error: "Failed to process answer", status: 500 });
        }
      });

      socket.on("restart", async ({ roomId, playerId }, callback) => {
        try {
          const room = await getRoom(roomId);
          if (!room) {
            return callback({ error: "Room not found", status: 404 });
          }
          const player = room.players.find((p) => p.id === playerId);
          if (!player || !player.is_host || player.id !== room.creator_id) {
            return callback({ error: "Only the room creator can restart the game", status: 403 });
          }
          const client = await pool.connect();
          try {
            await client.query("BEGIN");
            await updateRoom(roomId, {
              game_state: "lobby",
              winner_id: null,
              question_count: 0,
              target_score: 100,
            });
            for (const p of room.players) {
              await updatePlayer(p.id, { score: 0, ready: false, current_question: null });
            }
            await client.query("COMMIT");
          } catch (error) {
            await client.query("ROLLBACK");
            throw error;
          } finally {
            client.release();
          }
          const updatedRoom = await getRoom(roomId);
          const serverInfo = {
            processingTime: Date.now() - socket.handshake.time,
            roomCount: (await io.allSockets()).size,
            timestamp: Date.now(),
          };
          callback({ room: updatedRoom });
          io.to(roomId).emit("room-update", { room: updatedRoom, serverInfo });
        } catch (error) {
          console.error(`Error restarting game for room ${roomId}:`, error);
          callback({ error: "Failed to restart game", status: 500 });
        }
      });

      socket.on("leave-room", async ({ roomId, playerId }) => {
        try {
          await removePlayerFromRoom(playerId);
          socket.leave(roomId);
          const room = await getRoom(roomId);
          if (!room || room.players.length === 0) {
            await updateRoom(roomId, { creator_id: null });
            io.to(roomId).emit("error", { message: "Room closed", status: 404 });
            return;
          }
          const serverInfo = {
            processingTime: Date.now() - socket.handshake.time,
            roomCount: (await io.allSockets()).size,
            timestamp: Date.now(),
          };
          io.to(roomId).emit("room-update", { room, serverInfo });
        } catch (error) {
          console.error(`Error leaving room ${roomId} for player ${playerId}:`, error);
          io.to(roomId).emit("error", { message: "Failed to leave room", status: 500 });
        }
      });

      socket.on("disconnect", async () => {
        console.log("Socket.IO client disconnected:", socket.id);
        // Optional: Clean up players who disconnect without explicitly leaving
      });
    });

    res.socket.server.io = io;
  }

  res.status(200).end();
}