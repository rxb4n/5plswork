import { type NextRequest, NextResponse } from "next/server";
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

function generateQuestion(language: "french" | "german" | "russian") {
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

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const body = await request.json();
    const { action, roomId, playerId, data } = body;

    console.log(`API Call: ${action} for room ${roomId} by player ${playerId}`);

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }
    if (!roomId && action !== "ping") {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
    }
    if (!playerId && action !== "ping") {
      return NextResponse.json({ error: "Player ID is required" }, { status: 400 });
    }

    if (Math.random() < 0.1) {
      try {
        await cleanupOldRooms();
      } catch (error) {
        console.warn("Failed to cleanup old rooms:", error);
      }
    }

    switch (action) {
      case "create":
        try {
          const targetScore = [100, 250, 500].includes(Number(data?.targetScore))
            ? Number(data.targetScore)
            : 100;
          const newRoom = await createRoom(roomId, { target_score: targetScore });
          if (!newRoom) {
            return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
          }
          console.log("Room created:", newRoom);
          return NextResponse.json({ success: true, room: newRoom });
        } catch (error) {
          console.error("Error creating room:", error);
          return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
        }


      case "join":
        try {
          const room = await getRoom(roomId);
          if (!room) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
          }
          const shouldBeHost = room.players.length === 0;
          const player: Omit<Player, "last_seen"> = {
            id: playerId,
            name: data.name,
            language: null,
            ready: false,
            score: 0,
            is_host: shouldBeHost,
            current_question: null,
          };
          console.log(`Player ${playerId} joining room ${roomId}. Should be host: ${shouldBeHost}`);
          const success = await addPlayerToRoom(roomId, player);
          if (!success) {
            return NextResponse.json({ error: "Failed to join room" }, { status: 500 });
          }
          await ensureRoomHasHost(roomId);
          const updatedRoom = await getRoom(roomId);
          console.log("Room after join:", updatedRoom);
          return NextResponse.json({ room: updatedRoom });
        } catch (error) {
          console.error("Error joining room:", error);
          return NextResponse.json({ error: "Failed to join room" }, { status: 500 });
        }

      case "leave":
        try {
          await removePlayerFromRoom(playerId);
          const roomAfterLeave = await getRoom(roomId);
          if (!roomAfterLeave || roomAfterLeave.players.length === 0) {
            await deleteRoom(roomId);
            console.log(`Room ${roomId} deleted after leave`);
            return NextResponse.json({ success: true });
          }
          await ensureRoomHasHost(roomId);
          const updatedRoom = await getRoom(roomId);
          console.log("Room after leave:", updatedRoom);
          return NextResponse.json({ room: updatedRoom });
        } catch (error) {
          console.error("Error leaving room:", error);
          return NextResponse.json({ error: "Failed to leave room" }, { status: 500 });
        }

      case "update-language":
        try {
          const currentRoom = await getRoom(roomId);
          if (!currentRoom) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
          }
          const currentPlayer = currentRoom.players.find((p) => p.id === playerId);
          const shouldResetReady = !currentPlayer?.language;
          await updatePlayer(playerId, {
            language: data.language,
            ready: shouldResetReady ? false : currentPlayer?.ready,
          });
          const updatedRoom = await getRoom(roomId);
          console.log("Room after language update:", updatedRoom);
          return NextResponse.json({ room: updatedRoom });
        } catch (error) {
          console.error("Error updating language:", error);
          return NextResponse.json({ error: "Failed to update language" }, { status: 500 });
        }

      case "toggle-ready":
        try {
          const currentRoom = await getRoom(roomId);
          if (!currentRoom) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
          }
          const currentPlayer = currentRoom.players.find((p) => p.id === playerId);
          if (currentPlayer && currentPlayer.language) {
            await updatePlayer(playerId, { ready: !currentPlayer.ready });
          }
          const updatedRoom = await getRoom(roomId);
          console.log("Room after toggle ready:", updatedRoom);
          return NextResponse.json({ room: updatedRoom });
        } catch (error) {
          console.error("Error toggling ready:", error);
          return NextResponse.json({ error: "Failed to toggle ready" }, { status: 500 });
        }

      case "start-game":
        try {
          const gameRoom = await getRoom(roomId);
          if (!gameRoom) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
          }
          const host = gameRoom.players.find((p) => p.id === playerId);
          if (!host?.is_host) {
            return NextResponse.json({ error: "Only the host can start the game" }, { status: 403 });
          }
          const playersWithLanguage = gameRoom.players.filter((p) => p.language);
          if (playersWithLanguage.length === 0) {
            return NextResponse.json({ error: "At least one player must select a language" }, { status: 400 });
          }
          if (!playersWithLanguage.every((p) => p.ready)) {
            return NextResponse.json({ error: "All players with languages must be ready" }, { status: 400 });
          }
          await updateRoom(roomId, {
            game_state: "playing",
            question_count: 0,
          });
          for (const player of playersWithLanguage) {
            if (player.language) {
              const question = generateQuestion(player.language);
              await updatePlayer(player.id, { current_question: question });
            }
          }
          const updatedRoom = await getRoom(roomId);
          console.log("Room after start game:", updatedRoom);
          return NextResponse.json({ room: updatedRoom });
        } catch (error) {
          console.error("Error starting game:", error);
          return NextResponse.json({ error: "Failed to start game" }, { status: 500 });
        }

      case "answer":
        try {
          const answerRoom = await getRoom(roomId);
          if (!answerRoom) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
          }
          const answeringPlayer = answerRoom.players.find((p) => p.id === playerId);
          if (answeringPlayer && answeringPlayer.current_question) {
            const { answer, timeLeft } = data;
            const isCorrect = answer === answeringPlayer.current_question.correctAnswer;
            if (isCorrect) {
              const points = Math.max(1, 10 - (10 - timeLeft));
              const newScore = answeringPlayer.score + points;
              await updatePlayer(playerId, { score: newScore });
              if (newScore >= answerRoom.target_score) {
                await updateRoom(roomId, {
                  game_state: "finished",
                  winner_id: playerId,
                });
                const finalRoom = await getRoom(roomId);
                console.log("Room after game finished:", finalRoom);
                return NextResponse.json({ room: finalRoom });
              }
            }
            if (answeringPlayer.language) {
              const nextQuestion = generateQuestion(answeringPlayer.language);
              await updatePlayer(playerId, { current_question: nextQuestion });
            }
          }
          const updatedRoom = await getRoom(roomId);
          console.log("Room after answer:", updatedRoom);
          return NextResponse.json({ room: updatedRoom });
        } catch (error) {
          console.error("Error processing answer:", error);
          return NextResponse.json({ error: "Failed to process answer" }, { status: 500 });
        }

      case "restart":
        try {
          const restartRoom = await getRoom(roomId);
          if (!restartRoom) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
          }
          const restartHost = restartRoom.players.find((p) => p.id === playerId);
          if (!restartHost?.is_host) {
            return NextResponse.json({ error: "Only the host can restart the game" }, { status: 403 });
          }
          await updateRoom(roomId, {
            game_state: "lobby",
            winner_id: null,
            question_count: 0,
            target_score: 100,
          });
          for (const player of restartRoom.players) {
            await updatePlayer(player.id, {
              score: 0,
              ready: false,
              current_question: null,
            });
          }
          const updatedRoom = await getRoom(roomId);
          console.log("Room after restart:", updatedRoom);
          return NextResponse.json({ room: updatedRoom });
        } catch (error) {
          console.error("Error restarting game:", error);
          return NextResponse.json({ error: "Failed to restart game" }, { status: 500 });
        }

      case "update-target-score":
        try {
          const room = await getRoom(roomId);
          if (!room) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
          }
          const player = room.players.find((p) => p.id === playerId);
          if (!player?.is_host) {
            return NextResponse.json({ error: "Only the host can update the target score" }, { status: 403 });
          }
          const { targetScore } = data;
          if (![100, 250, 500].includes(Number(targetScore))) {
            return NextResponse.json({ error: "Invalid target score" }, { status: 400 });
          }
          await updateRoom(roomId, { target_score: Number(targetScore) });
          const updatedRoom = await getRoom(roomId);
          console.log(`Room ${roomId} target_score updated to ${targetScore}`);
          return NextResponse.json({ room: updatedRoom });
        } catch (error) {
          console.error("Error updating target score:", error);
          return NextResponse.json({ error: "Failed to update target score" }, { status: 500 });
        }

      case "ping":
        try {
          if (playerId) {
            await updatePlayer(playerId, {});
          }
          return NextResponse.json({ success: true });
        } catch (error) {
          console.error("Error processing ping:", error);
          return NextResponse.json({ error: "Failed to process ping" }, { status: 500 });
        }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    if (!roomId) {
      return NextResponse.json({ error: "Room ID required" }, { status: 400 });
    }
    const room = await getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    await ensureRoomHasHost(roomId);
    const updatedRoom = await getRoom(roomId);
    console.log("GET /api/rooms response:", updatedRoom);
    return NextResponse.json({ room: updatedRoom });
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}