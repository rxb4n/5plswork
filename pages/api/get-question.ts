import { NextApiRequest, NextApiResponse } from "next"

// Word database - same as in socketio.ts
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

interface Question {
  questionId: string;
  english: string;
  correctAnswer: string;
  options: string[];
}

function generateQuestion(language: "french" | "german" | "russian" | "japanese" | "spanish"): Question {
  console.log(`🎯 API: Generating question for ${language}`)
  
  // Validate language
  if (!["french", "german", "russian", "japanese", "spanish"].includes(language)) {
    console.error(`❌ API: Invalid language: ${language}`)
    throw new Error(`Invalid language: ${language}`)
  }

  // Select random word
  const randomWord = WORD_DATABASE[Math.floor(Math.random() * WORD_DATABASE.length)]
  console.log(`📝 API: Selected word:`, randomWord)
  
  // Get correct answer
  const correctAnswer = randomWord[language]
  if (!correctAnswer) {
    console.error(`❌ API: No translation found for ${language} in word:`, randomWord)
    throw new Error(`No translation found for ${language}`)
  }

  // Generate wrong answers
  const wrongAnswers: string[] = []
  let attempts = 0
  const maxAttempts = 50
  
  while (wrongAnswers.length < 3 && attempts < maxAttempts) {
    attempts++
    const randomWrongWord = WORD_DATABASE[Math.floor(Math.random() * WORD_DATABASE.length)]
    const wrongAnswer = randomWrongWord[language]
    
    if (wrongAnswer && wrongAnswer !== correctAnswer && !wrongAnswers.includes(wrongAnswer)) {
      wrongAnswers.push(wrongAnswer)
    }
  }

  if (wrongAnswers.length < 3) {
    console.error(`❌ API: Could not generate enough wrong answers for ${language}. Got ${wrongAnswers.length}/3`)
    throw new Error(`Could not generate enough wrong answers for ${language}`)
  }

  // Shuffle options
  const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5)

  // Create question object
  const question: Question = {
    questionId: `q-api-${language}-${questionCounter++}-${Date.now()}`,
    english: randomWord.english,
    correctAnswer,
    options,
  }

  console.log(`✅ API: Generated question:`, {
    questionId: question.questionId,
    english: question.english,
    language: language,
    correctAnswer: question.correctAnswer,
    options: question.options,
    optionsCount: question.options.length
  })

  return question
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { language } = req.body

    if (!language) {
      return res.status(400).json({ error: 'Language is required' })
    }

    if (!["french", "german", "russian", "japanese", "spanish"].includes(language)) {
      return res.status(400).json({ error: 'Invalid language' })
    }

    const question = generateQuestion(language)
    
    res.status(200).json({ 
      success: true, 
      question 
    })
  } catch (error) {
    console.error('Error generating question:', error)
    res.status(500).json({ 
      error: 'Failed to generate question',
      message: error.message 
    })
  }
}