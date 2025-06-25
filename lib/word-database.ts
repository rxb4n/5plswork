export interface WordEntry {
  id: string;
  english: string;
  french: string;
  spanish: string;
  german: string;
  japanese: string;
  russian: string;
  category: string;
  isCognate: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  wordCount: number;
}

// Comprehensive categorized word database
export const WORD_DATABASE: WordEntry[] = [
  // COLORS (20 words)
  {
    id: "color_001",
    english: "Red",
    french: "Rouge",
    spanish: "Rojo",
    german: "Rot",
    japanese: "Aka",
    russian: "красный",
    category: "colors",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "color_002",
    english: "Blue",
    french: "Bleu",
    spanish: "Azul",
    german: "Blau",
    japanese: "Ao",
    russian: "синий",
    category: "colors",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "color_003",
    english: "Green",
    french: "Vert",
    spanish: "Verde",
    german: "Grün",
    japanese: "Midori",
    russian: "зелёный",
    category: "colors",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "color_004",
    english: "Yellow",
    french: "Jaune",
    spanish: "Amarillo",
    german: "Gelb",
    japanese: "Kiiro",
    russian: "жёлтый",
    category: "colors",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "color_005",
    english: "Black",
    french: "Noir",
    spanish: "Negro",
    german: "Schwarz",
    japanese: "Kuro",
    russian: "чёрный",
    category: "colors",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "color_006",
    english: "White",
    french: "Blanc",
    spanish: "Blanco",
    german: "Weiß",
    japanese: "Shiro",
    russian: "белый",
    category: "colors",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "color_007",
    english: "Orange",
    french: "Orange",
    spanish: "Naranja",
    german: "Orange",
    japanese: "Orenji",
    russian: "оранжевый",
    category: "colors",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "color_008",
    english: "Purple",
    french: "Violet",
    spanish: "Morado",
    german: "Lila",
    japanese: "Murasaki",
    russian: "фиолетовый",
    category: "colors",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "color_009",
    english: "Pink",
    french: "Rose",
    spanish: "Rosa",
    german: "Rosa",
    japanese: "Pinku",
    russian: "розовый",
    category: "colors",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "color_010",
    english: "Brown",
    french: "Marron",
    spanish: "Marrón",
    german: "Braun",
    japanese: "Chairo",
    russian: "коричневый",
    category: "colors",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "color_011",
    english: "Gray",
    french: "Gris",
    spanish: "Gris",
    german: "Grau",
    japanese: "Haiiro",
    russian: "серый",
    category: "colors",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "color_012",
    english: "Silver",
    french: "Argent",
    spanish: "Plata",
    german: "Silber",
    japanese: "Gin",
    russian: "серебряный",
    category: "colors",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "color_013",
    english: "Gold",
    french: "Or",
    spanish: "Oro",
    german: "Gold",
    japanese: "Kin",
    russian: "золотой",
    category: "colors",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "color_014",
    english: "Beige",
    french: "Beige",
    spanish: "Beige",
    german: "Beige",
    japanese: "Bēju",
    russian: "бежевый",
    category: "colors",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "color_015",
    english: "Turquoise",
    french: "Turquoise",
    spanish: "Turquesa",
    german: "Türkis",
    japanese: "Tākōizu",
    russian: "бирюзовый",
    category: "colors",
    isCognate: true,
    difficulty: "hard"
  },
  {
    id: "color_016",
    english: "Maroon",
    french: "Bordeaux",
    spanish: "Granate",
    german: "Kastanienbraun",
    japanese: "Marūn",
    russian: "бордовый",
    category: "colors",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "color_017",
    english: "Navy",
    french: "Bleu marine",
    spanish: "Azul marino",
    german: "Marineblau",
    japanese: "Nēbī",
    russian: "тёмно-синий",
    category: "colors",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "color_018",
    english: "Lime",
    french: "Vert citron",
    spanish: "Lima",
    german: "Limette",
    japanese: "Raimu",
    russian: "лаймовый",
    category: "colors",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "color_019",
    english: "Coral",
    french: "Corail",
    spanish: "Coral",
    german: "Koralle",
    japanese: "Koraru",
    russian: "коралловый",
    category: "colors",
    isCognate: true,
    difficulty: "hard"
  },
  {
    id: "color_020",
    english: "Ivory",
    french: "Ivoire",
    spanish: "Marfil",
    german: "Elfenbein",
    japanese: "Aibōrī",
    russian: "слоновая кость",
    category: "colors",
    isCognate: false,
    difficulty: "hard"
  },

  // ANIMALS (25 words)
  {
    id: "animal_001",
    english: "Cat",
    french: "Chat",
    spanish: "Gato",
    german: "Katze",
    japanese: "Neko",
    russian: "кот",
    category: "animals",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "animal_002",
    english: "Dog",
    french: "Chien",
    spanish: "Perro",
    german: "Hund",
    japanese: "Inu",
    russian: "собака",
    category: "animals",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "animal_003",
    english: "Bird",
    french: "Oiseau",
    spanish: "Pájaro",
    german: "Vogel",
    japanese: "Tori",
    russian: "птица",
    category: "animals",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "animal_004",
    english: "Fish",
    french: "Poisson",
    spanish: "Pez",
    german: "Fisch",
    japanese: "Sakana",
    russian: "рыба",
    category: "animals",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "animal_005",
    english: "Horse",
    french: "Cheval",
    spanish: "Caballo",
    german: "Pferd",
    japanese: "Uma",
    russian: "лошадь",
    category: "animals",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "animal_006",
    english: "Cow",
    french: "Vache",
    spanish: "Vaca",
    german: "Kuh",
    japanese: "Ushi",
    russian: "корова",
    category: "animals",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "animal_007",
    english: "Pig",
    french: "Cochon",
    spanish: "Cerdo",
    german: "Schwein",
    japanese: "Buta",
    russian: "свинья",
    category: "animals",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "animal_008",
    english: "Sheep",
    french: "Mouton",
    spanish: "Oveja",
    german: "Schaf",
    japanese: "Hitsuji",
    russian: "овца",
    category: "animals",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "animal_009",
    english: "Lion",
    french: "Lion",
    spanish: "León",
    german: "Löwe",
    japanese: "Raion",
    russian: "лев",
    category: "animals",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "animal_010",
    english: "Tiger",
    french: "Tigre",
    spanish: "Tigre",
    german: "Tiger",
    japanese: "Tora",
    russian: "тигр",
    category: "animals",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "animal_011",
    english: "Elephant",
    french: "Éléphant",
    spanish: "Elefante",
    german: "Elefant",
    japanese: "Zō",
    russian: "слон",
    category: "animals",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "animal_012",
    english: "Monkey",
    french: "Singe",
    spanish: "Mono",
    german: "Affe",
    japanese: "Saru",
    russian: "обезьяна",
    category: "animals",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "animal_013",
    english: "Bear",
    french: "Ours",
    spanish: "Oso",
    german: "Bär",
    japanese: "Kuma",
    russian: "медведь",
    category: "animals",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "animal_014",
    english: "Wolf",
    french: "Loup",
    spanish: "Lobo",
    german: "Wolf",
    japanese: "Ōkami",
    russian: "волк",
    category: "animals",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "animal_015",
    english: "Fox",
    french: "Renard",
    spanish: "Zorro",
    german: "Fuchs",
    japanese: "Kitsune",
    russian: "лиса",
    category: "animals",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "animal_016",
    english: "Rabbit",
    french: "Lapin",
    spanish: "Conejo",
    german: "Kaninchen",
    japanese: "Usagi",
    russian: "кролик",
    category: "animals",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "animal_017",
    english: "Mouse",
    french: "Souris",
    spanish: "Ratón",
    german: "Maus",
    japanese: "Nezumi",
    russian: "мышь",
    category: "animals",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "animal_018",
    english: "Snake",
    french: "Serpent",
    spanish: "Serpiente",
    german: "Schlange",
    japanese: "Hebi",
    russian: "змея",
    category: "animals",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "animal_019",
    english: "Turtle",
    french: "Tortue",
    spanish: "Tortuga",
    german: "Schildkröte",
    japanese: "Kame",
    russian: "черепаха",
    category: "animals",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "animal_020",
    english: "Frog",
    french: "Grenouille",
    spanish: "Rana",
    german: "Frosch",
    japanese: "Kaeru",
    russian: "лягушка",
    category: "animals",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "animal_021",
    english: "Butterfly",
    french: "Papillon",
    spanish: "Mariposa",
    german: "Schmetterling",
    japanese: "Chō",
    russian: "бабочка",
    category: "animals",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "animal_022",
    english: "Bee",
    french: "Abeille",
    spanish: "Abeja",
    german: "Biene",
    japanese: "Hachi",
    russian: "пчела",
    category: "animals",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "animal_023",
    english: "Spider",
    french: "Araignée",
    spanish: "Araña",
    german: "Spinne",
    japanese: "Kumo",
    russian: "паук",
    category: "animals",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "animal_024",
    english: "Dolphin",
    french: "Dauphin",
    spanish: "Delfín",
    german: "Delfin",
    japanese: "Iruka",
    russian: "дельфин",
    category: "animals",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "animal_025",
    english: "Penguin",
    french: "Pingouin",
    spanish: "Pingüino",
    german: "Pinguin",
    japanese: "Pengin",
    russian: "пингвин",
    category: "animals",
    isCognate: true,
    difficulty: "medium"
  },

  // FOOD (25 words)
  {
    id: "food_001",
    english: "Apple",
    french: "Pomme",
    spanish: "Manzana",
    german: "Apfel",
    japanese: "Ringo",
    russian: "яблоко",
    category: "food",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "food_002",
    english: "Banana",
    french: "Banane",
    spanish: "Plátano",
    german: "Banane",
    japanese: "Banana",
    russian: "банан",
    category: "food",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "food_003",
    english: "Orange",
    french: "Orange",
    spanish: "Naranja",
    german: "Orange",
    japanese: "Orenji",
    russian: "апельсин",
    category: "food",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "food_004",
    english: "Bread",
    french: "Pain",
    spanish: "Pan",
    german: "Brot",
    japanese: "Pan",
    russian: "хлеб",
    category: "food",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "food_005",
    english: "Milk",
    french: "Lait",
    spanish: "Leche",
    german: "Milch",
    japanese: "Gyūnyū",
    russian: "молоко",
    category: "food",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "food_006",
    english: "Cheese",
    french: "Fromage",
    spanish: "Queso",
    german: "Käse",
    japanese: "Chīzu",
    russian: "сыр",
    category: "food",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "food_007",
    english: "Egg",
    french: "Œuf",
    spanish: "Huevo",
    german: "Ei",
    japanese: "Tamago",
    russian: "яйцо",
    category: "food",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "food_008",
    english: "Meat",
    french: "Viande",
    spanish: "Carne",
    german: "Fleisch",
    japanese: "Niku",
    russian: "мясо",
    category: "food",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "food_009",
    english: "Fish",
    french: "Poisson",
    spanish: "Pescado",
    german: "Fisch",
    japanese: "Sakana",
    russian: "рыба",
    category: "food",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "food_010",
    english: "Rice",
    french: "Riz",
    spanish: "Arroz",
    german: "Reis",
    japanese: "Gohan",
    russian: "рис",
    category: "food",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "food_011",
    english: "Pasta",
    french: "Pâtes",
    spanish: "Pasta",
    german: "Nudeln",
    japanese: "Pasuta",
    russian: "паста",
    category: "food",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "food_012",
    english: "Pizza",
    french: "Pizza",
    spanish: "Pizza",
    german: "Pizza",
    japanese: "Piza",
    russian: "пицца",
    category: "food",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "food_013",
    english: "Salad",
    french: "Salade",
    spanish: "Ensalada",
    german: "Salat",
    japanese: "Sarada",
    russian: "салат",
    category: "food",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "food_014",
    english: "Soup",
    french: "Soupe",
    spanish: "Sopa",
    german: "Suppe",
    japanese: "Sūpu",
    russian: "суп",
    category: "food",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "food_015",
    english: "Sandwich",
    french: "Sandwich",
    spanish: "Sándwich",
    german: "Sandwich",
    japanese: "Sandoitchi",
    russian: "сэндвич",
    category: "food",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "food_016",
    english: "Chocolate",
    french: "Chocolat",
    spanish: "Chocolate",
    german: "Schokolade",
    japanese: "Chokorēto",
    russian: "шоколад",
    category: "food",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "food_017",
    english: "Coffee",
    french: "Café",
    spanish: "Café",
    german: "Kaffee",
    japanese: "Kōhī",
    russian: "кофе",
    category: "food",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "food_018",
    english: "Tea",
    french: "Thé",
    spanish: "Té",
    german: "Tee",
    japanese: "Cha",
    russian: "чай",
    category: "food",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "food_019",
    english: "Water",
    french: "Eau",
    spanish: "Agua",
    german: "Wasser",
    japanese: "Mizu",
    russian: "вода",
    category: "food",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "food_020",
    english: "Juice",
    french: "Jus",
    spanish: "Jugo",
    german: "Saft",
    japanese: "Jūsu",
    russian: "сок",
    category: "food",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "food_021",
    english: "Potato",
    french: "Pomme de terre",
    spanish: "Patata",
    german: "Kartoffel",
    japanese: "Jagaimo",
    russian: "картофель",
    category: "food",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "food_022",
    english: "Tomato",
    french: "Tomate",
    spanish: "Tomate",
    german: "Tomate",
    japanese: "Tomato",
    russian: "помидор",
    category: "food",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "food_023",
    english: "Carrot",
    french: "Carotte",
    spanish: "Zanahoria",
    german: "Karotte",
    japanese: "Ninjin",
    russian: "морковь",
    category: "food",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "food_024",
    english: "Onion",
    french: "Oignon",
    spanish: "Cebolla",
    german: "Zwiebel",
    japanese: "Tamanegi",
    russian: "лук",
    category: "food",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "food_025",
    english: "Garlic",
    french: "Ail",
    spanish: "Ajo",
    german: "Knoblauch",
    japanese: "Ninniku",
    russian: "чеснок",
    category: "food",
    isCognate: false,
    difficulty: "medium"
  },

  // VEHICLES (20 words)
  {
    id: "vehicle_001",
    english: "Car",
    french: "Voiture",
    spanish: "Coche",
    german: "Auto",
    japanese: "Kuruma",
    russian: "машина",
    category: "vehicles",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "vehicle_002",
    english: "Bus",
    french: "Bus",
    spanish: "Autobús",
    german: "Bus",
    japanese: "Basu",
    russian: "автобус",
    category: "vehicles",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "vehicle_003",
    english: "Train",
    french: "Train",
    spanish: "Tren",
    german: "Zug",
    japanese: "Densha",
    russian: "поезд",
    category: "vehicles",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "vehicle_004",
    english: "Plane",
    french: "Avion",
    spanish: "Avión",
    german: "Flugzeug",
    japanese: "Hikōki",
    russian: "самолёт",
    category: "vehicles",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "vehicle_005",
    english: "Boat",
    french: "Bateau",
    spanish: "Barco",
    german: "Boot",
    japanese: "Fune",
    russian: "лодка",
    category: "vehicles",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "vehicle_006",
    english: "Bicycle",
    french: "Vélo",
    spanish: "Bicicleta",
    german: "Fahrrad",
    japanese: "Jitensha",
    russian: "велосипед",
    category: "vehicles",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "vehicle_007",
    english: "Motorcycle",
    french: "Moto",
    spanish: "Motocicleta",
    german: "Motorrad",
    japanese: "Ōtobai",
    russian: "мотоцикл",
    category: "vehicles",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "vehicle_008",
    english: "Truck",
    french: "Camion",
    spanish: "Camión",
    german: "Lastwagen",
    japanese: "Torakku",
    russian: "грузовик",
    category: "vehicles",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "vehicle_009",
    english: "Taxi",
    french: "Taxi",
    spanish: "Taxi",
    german: "Taxi",
    japanese: "Takushī",
    russian: "такси",
    category: "vehicles",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "vehicle_010",
    english: "Helicopter",
    french: "Hélicoptère",
    spanish: "Helicóptero",
    german: "Hubschrauber",
    japanese: "Herikoputā",
    russian: "вертолёт",
    category: "vehicles",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "vehicle_011",
    english: "Ship",
    french: "Navire",
    spanish: "Barco",
    german: "Schiff",
    japanese: "Fune",
    russian: "корабль",
    category: "vehicles",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "vehicle_012",
    english: "Subway",
    french: "Métro",
    spanish: "Metro",
    german: "U-Bahn",
    japanese: "Chikatetsu",
    russian: "метро",
    category: "vehicles",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "vehicle_013",
    english: "Scooter",
    french: "Scooter",
    spanish: "Patinete",
    german: "Roller",
    japanese: "Sukūtā",
    russian: "скутер",
    category: "vehicles",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "vehicle_014",
    english: "Ambulance",
    french: "Ambulance",
    spanish: "Ambulancia",
    german: "Krankenwagen",
    japanese: "Kyūkyūsha",
    russian: "скорая помощь",
    category: "vehicles",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "vehicle_015",
    english: "Police",
    french: "Police",
    spanish: "Policía",
    german: "Polizei",
    japanese: "Keisatsu",
    russian: "полиция",
    category: "vehicles",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "vehicle_016",
    english: "Fire truck",
    french: "Camion de pompiers",
    spanish: "Camión de bomberos",
    german: "Feuerwehr",
    japanese: "Shōbōsha",
    russian: "пожарная машина",
    category: "vehicles",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "vehicle_017",
    english: "Tram",
    french: "Tramway",
    spanish: "Tranvía",
    german: "Straßenbahn",
    japanese: "Toramu",
    russian: "трамвай",
    category: "vehicles",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "vehicle_018",
    english: "Van",
    french: "Fourgonnette",
    spanish: "Furgoneta",
    german: "Lieferwagen",
    japanese: "Ban",
    russian: "фургон",
    category: "vehicles",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "vehicle_019",
    english: "Rocket",
    french: "Fusée",
    spanish: "Cohete",
    german: "Rakete",
    japanese: "Roketto",
    russian: "ракета",
    category: "vehicles",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "vehicle_020",
    english: "Skateboard",
    french: "Planche à roulettes",
    spanish: "Monopatín",
    german: "Skateboard",
    japanese: "Sukētobōdo",
    russian: "скейтборд",
    category: "vehicles",
    isCognate: true,
    difficulty: "medium"
  },

  // CLOTHING (20 words)
  {
    id: "clothing_001",
    english: "Shirt",
    french: "Chemise",
    spanish: "Camisa",
    german: "Hemd",
    japanese: "Shatsu",
    russian: "рубашка",
    category: "clothing",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "clothing_002",
    english: "Pants",
    french: "Pantalon",
    spanish: "Pantalones",
    german: "Hose",
    japanese: "Zubon",
    russian: "брюки",
    category: "clothing",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "clothing_003",
    english: "Dress",
    french: "Robe",
    spanish: "Vestido",
    german: "Kleid",
    japanese: "Doresu",
    russian: "платье",
    category: "clothing",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "clothing_004",
    english: "Shoes",
    french: "Chaussures",
    spanish: "Zapatos",
    german: "Schuhe",
    japanese: "Kutsu",
    russian: "обувь",
    category: "clothing",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "clothing_005",
    english: "Hat",
    french: "Chapeau",
    spanish: "Sombrero",
    german: "Hut",
    japanese: "Bōshi",
    russian: "шляпа",
    category: "clothing",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "clothing_006",
    english: "Jacket",
    french: "Veste",
    spanish: "Chaqueta",
    german: "Jacke",
    japanese: "Jaketto",
    russian: "куртка",
    category: "clothing",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "clothing_007",
    english: "Socks",
    french: "Chaussettes",
    spanish: "Calcetines",
    german: "Socken",
    japanese: "Kutsushita",
    russian: "носки",
    category: "clothing",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "clothing_008",
    english: "Gloves",
    french: "Gants",
    spanish: "Guantes",
    german: "Handschuhe",
    japanese: "Tebukuro",
    russian: "перчатки",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "clothing_009",
    english: "Scarf",
    french: "Écharpe",
    spanish: "Bufanda",
    german: "Schal",
    japanese: "Sukāfu",
    russian: "шарф",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "clothing_010",
    english: "Sweater",
    french: "Pull",
    spanish: "Suéter",
    german: "Pullover",
    japanese: "Sētā",
    russian: "свитер",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "clothing_011",
    english: "Jeans",
    french: "Jean",
    spanish: "Vaqueros",
    german: "Jeans",
    japanese: "Jīnzu",
    russian: "джинсы",
    category: "clothing",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "clothing_012",
    english: "Skirt",
    french: "Jupe",
    spanish: "Falda",
    german: "Rock",
    japanese: "Sukāto",
    russian: "юбка",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "clothing_013",
    english: "Coat",
    french: "Manteau",
    spanish: "Abrigo",
    german: "Mantel",
    japanese: "Kōto",
    russian: "пальто",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "clothing_014",
    english: "Tie",
    french: "Cravate",
    spanish: "Corbata",
    german: "Krawatte",
    japanese: "Nekutai",
    russian: "галстук",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "clothing_015",
    english: "Belt",
    french: "Ceinture",
    spanish: "Cinturón",
    german: "Gürtel",
    japanese: "Beruto",
    russian: "ремень",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "clothing_016",
    english: "Underwear",
    french: "Sous-vêtements",
    spanish: "Ropa interior",
    german: "Unterwäsche",
    japanese: "Shitagi",
    russian: "нижнее бельё",
    category: "clothing",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "clothing_017",
    english: "Pajamas",
    french: "Pyjama",
    spanish: "Pijama",
    german: "Schlafanzug",
    japanese: "Pajama",
    russian: "пижама",
    category: "clothing",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "clothing_018",
    english: "Swimsuit",
    french: "Maillot de bain",
    spanish: "Traje de baño",
    german: "Badeanzug",
    japanese: "Mizugi",
    russian: "купальник",
    category: "clothing",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "clothing_019",
    english: "Uniform",
    french: "Uniforme",
    spanish: "Uniforme",
    german: "Uniform",
    japanese: "Yunifōmu",
    russian: "форма",
    category: "clothing",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "clothing_020",
    english: "Boots",
    french: "Bottes",
    spanish: "Botas",
    german: "Stiefel",
    japanese: "Būtsu",
    russian: "сапоги",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },

  // SPORTS (20 words)
  {
    id: "sport_001",
    english: "Football",
    french: "Football",
    spanish: "Fútbol",
    german: "Fußball",
    japanese: "Sakkā",
    russian: "футбол",
    category: "sports",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "sport_002",
    english: "Basketball",
    french: "Basketball",
    spanish: "Baloncesto",
    german: "Basketball",
    japanese: "Basukettobōru",
    russian: "баскетбол",
    category: "sports",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "sport_003",
    english: "Tennis",
    french: "Tennis",
    spanish: "Tenis",
    german: "Tennis",
    japanese: "Tenisu",
    russian: "теннис",
    category: "sports",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "sport_004",
    english: "Swimming",
    french: "Natation",
    spanish: "Natación",
    german: "Schwimmen",
    japanese: "Suiei",
    russian: "плавание",
    category: "sports",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "sport_005",
    english: "Running",
    french: "Course",
    spanish: "Correr",
    german: "Laufen",
    japanese: "Raningu",
    russian: "бег",
    category: "sports",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "sport_006",
    english: "Baseball",
    french: "Baseball",
    spanish: "Béisbol",
    german: "Baseball",
    japanese: "Yakyū",
    russian: "бейсбол",
    category: "sports",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "sport_007",
    english: "Volleyball",
    french: "Volleyball",
    spanish: "Voleibol",
    german: "Volleyball",
    japanese: "Barēbōru",
    russian: "волейбол",
    category: "sports",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "sport_008",
    english: "Golf",
    french: "Golf",
    spanish: "Golf",
    german: "Golf",
    japanese: "Gorufu",
    russian: "гольф",
    category: "sports",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "sport_009",
    english: "Boxing",
    french: "Boxe",
    spanish: "Boxeo",
    german: "Boxen",
    japanese: "Bokushingu",
    russian: "бокс",
    category: "sports",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "sport_010",
    english: "Cycling",
    french: "Cyclisme",
    spanish: "Ciclismo",
    german: "Radfahren",
    japanese: "Saikuringu",
    russian: "велоспорт",
    category: "sports",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "sport_011",
    english: "Skiing",
    french: "Ski",
    spanish: "Esquí",
    german: "Skifahren",
    japanese: "Sukī",
    russian: "лыжи",
    category: "sports",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "sport_012",
    english: "Hockey",
    french: "Hockey",
    spanish: "Hockey",
    german: "Hockey",
    japanese: "Hokkē",
    russian: "хоккей",
    category: "sports",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "sport_013",
    english: "Wrestling",
    french: "Lutte",
    spanish: "Lucha",
    german: "Ringen",
    japanese: "Resuringu",
    russian: "борьба",
    category: "sports",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "sport_014",
    english: "Gymnastics",
    french: "Gymnastique",
    spanish: "Gimnasia",
    german: "Gymnastik",
    japanese: "Taisō",
    russian: "гимнастика",
    category: "sports",
    isCognate: true,
    difficulty: "hard"
  },
  {
    id: "sport_015",
    english: "Martial arts",
    french: "Arts martiaux",
    spanish: "Artes marciales",
    german: "Kampfsport",
    japanese: "Budō",
    russian: "боевые искусства",
    category: "sports",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "sport_016",
    english: "Surfing",
    french: "Surf",
    spanish: "Surf",
    german: "Surfen",
    japanese: "Sāfin",
    russian: "сёрфинг",
    category: "sports",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "sport_017",
    english: "Climbing",
    french: "Escalade",
    spanish: "Escalada",
    german: "Klettern",
    japanese: "Kuraimingu",
    russian: "скалолазание",
    category: "sports",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "sport_018",
    english: "Fishing",
    french: "Pêche",
    spanish: "Pesca",
    german: "Angeln",
    japanese: "Tsuri",
    russian: "рыбалка",
    category: "sports",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "sport_019",
    english: "Dancing",
    french: "Danse",
    spanish: "Baile",
    german: "Tanzen",
    japanese: "Dansu",
    russian: "танцы",
    category: "sports",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "sport_020",
    english: "Yoga",
    french: "Yoga",
    spanish: "Yoga",
    german: "Yoga",
    japanese: "Yoga",
    russian: "йога",
    category: "sports",
    isCognate: true,
    difficulty: "easy"
  },

  // HOUSEHOLD ITEMS (20 words)
  {
    id: "household_001",
    english: "Table",
    french: "Table",
    spanish: "Mesa",
    german: "Tisch",
    japanese: "Tēburu",
    russian: "стол",
    category: "household",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "household_002",
    english: "Chair",
    french: "Chaise",
    spanish: "Silla",
    german: "Stuhl",
    japanese: "Isu",
    russian: "стул",
    category: "household",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "household_003",
    english: "Bed",
    french: "Lit",
    spanish: "Cama",
    german: "Bett",
    japanese: "Beddo",
    russian: "кровать",
    category: "household",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "household_004",
    english: "Sofa",
    french: "Canapé",
    spanish: "Sofá",
    german: "Sofa",
    japanese: "Sofā",
    russian: "диван",
    category: "household",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "household_005",
    english: "Television",
    french: "Télévision",
    spanish: "Televisión",
    german: "Fernseher",
    japanese: "Terebi",
    russian: "телевизор",
    category: "household",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "household_006",
    english: "Refrigerator",
    french: "Réfrigérateur",
    spanish: "Refrigerador",
    german: "Kühlschrank",
    japanese: "Reizōko",
    russian: "холодильник",
    category: "household",
    isCognate: true,
    difficulty: "hard"
  },
  {
    id: "household_007",
    english: "Stove",
    french: "Cuisinière",
    spanish: "Estufa",
    german: "Herd",
    japanese: "Konro",
    russian: "плита",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_008",
    english: "Microwave",
    french: "Micro-ondes",
    spanish: "Microondas",
    german: "Mikrowelle",
    japanese: "Denshirenji",
    russian: "микроволновка",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_009",
    english: "Lamp",
    french: "Lampe",
    spanish: "Lámpara",
    german: "Lampe",
    japanese: "Ranpu",
    russian: "лампа",
    category: "household",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "household_010",
    english: "Mirror",
    french: "Miroir",
    spanish: "Espejo",
    german: "Spiegel",
    japanese: "Kagami",
    russian: "зеркало",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_011",
    english: "Window",
    french: "Fenêtre",
    spanish: "Ventana",
    german: "Fenster",
    japanese: "Mado",
    russian: "окно",
    category: "household",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "household_012",
    english: "Door",
    french: "Porte",
    spanish: "Puerta",
    german: "Tür",
    japanese: "Doa",
    russian: "дверь",
    category: "household",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "household_013",
    english: "Clock",
    french: "Horloge",
    spanish: "Reloj",
    german: "Uhr",
    japanese: "Tokei",
    russian: "часы",
    category: "household",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "household_014",
    english: "Computer",
    french: "Ordinateur",
    spanish: "Computadora",
    german: "Computer",
    japanese: "Konpyūtā",
    russian: "компьютер",
    category: "household",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "household_015",
    english: "Phone",
    french: "Téléphone",
    spanish: "Teléfono",
    german: "Telefon",
    japanese: "Denwa",
    russian: "телефон",
    category: "household",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "household_016",
    english: "Book",
    french: "Livre",
    spanish: "Libro",
    german: "Buch",
    japanese: "Hon",
    russian: "книга",
    category: "household",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "household_017",
    english: "Pillow",
    french: "Oreiller",
    spanish: "Almohada",
    german: "Kissen",
    japanese: "Makura",
    russian: "подушка",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_018",
    english: "Blanket",
    french: "Couverture",
    spanish: "Manta",
    german: "Decke",
    japanese: "Mōfu",
    russian: "одеяло",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_019",
    english: "Towel",
    french: "Serviette",
    spanish: "Toalla",
    german: "Handtuch",
    japanese: "Taoru",
    russian: "полотенце",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_020",
    english: "Vacuum",
    french: "Aspirateur",
    spanish: "Aspiradora",
    german: "Staubsauger",
    japanese: "Sōjiki",
    russian: "пылесос",
    category: "household",
    isCognate: false,
    difficulty: "hard"
  }
];

// Category information
export const CATEGORIES: CategoryInfo[] = [
  {
    id: "colors",
    name: "Colors",
    description: "Basic and advanced color names",
    wordCount: 20
  },
  {
    id: "animals",
    name: "Animals",
    description: "Common animals and creatures",
    wordCount: 25
  },
  {
    id: "food",
    name: "Food",
    description: "Food items, drinks, and ingredients",
    wordCount: 25
  },
  {
    id: "vehicles",
    name: "Vehicles",
    description: "Transportation and vehicles",
    wordCount: 20
  },
  {
    id: "clothing",
    name: "Clothing",
    description: "Clothes and accessories",
    wordCount: 20
  },
  {
    id: "sports",
    name: "Sports",
    description: "Sports and physical activities",
    wordCount: 20
  },
  {
    id: "household",
    name: "Household Items",
    description: "Common household objects and furniture",
    wordCount: 20
  }
];

// Utility functions for the word database
export function getWordsByCategory(category: string): WordEntry[] {
  return WORD_DATABASE.filter(word => word.category === category);
}

export function getRandomWordFromCategory(category: string): WordEntry | null {
  const words = getWordsByCategory(category);
  if (words.length === 0) return null;
  return words[Math.floor(Math.random() * words.length)];
}

export function getCategoryNames(): string[] {
  return CATEGORIES.map(cat => cat.id);
}

export function getCategoryInfo(categoryId: string): CategoryInfo | null {
  return CATEGORIES.find(cat => cat.id === categoryId) || null;
}

export function getWordTranslation(word: WordEntry, language: keyof Omit<WordEntry, 'id' | 'category' | 'isCognate' | 'difficulty'>): string {
  return word[language] as string;
}

export function getAllCognates(): WordEntry[] {
  return WORD_DATABASE.filter(word => word.isCognate);
}

export function getWordsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): WordEntry[] {
  return WORD_DATABASE.filter(word => word.difficulty === difficulty);
}

// Validation function to ensure database integrity
export function validateDatabase(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const languages = ['english', 'french', 'spanish', 'german', 'japanese', 'russian'] as const;
  
  WORD_DATABASE.forEach((word, index) => {
    // Check if all required fields are present
    if (!word.id) errors.push(`Word at index ${index} missing ID`);
    if (!word.category) errors.push(`Word ${word.id} missing category`);
    
    // Check if all language translations are present
    languages.forEach(lang => {
      if (!word[lang] || word[lang].trim() === '') {
        errors.push(`Word ${word.id} missing ${lang} translation`);
      }
    });
    
    // Check if category exists
    if (!CATEGORIES.find(cat => cat.id === word.category)) {
      errors.push(`Word ${word.id} has invalid category: ${word.category}`);
    }
  });
  
  // Check category word counts
  CATEGORIES.forEach(category => {
    const actualCount = getWordsByCategory(category.id).length;
    if (actualCount !== category.wordCount) {
      errors.push(`Category ${category.id} claims ${category.wordCount} words but has ${actualCount}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Export database statistics
export function getDatabaseStats() {
  const totalWords = WORD_DATABASE.length;
  const cognateCount = getAllCognates().length;
  const difficultyStats = {
    easy: getWordsByDifficulty('easy').length,
    medium: getWordsByDifficulty('medium').length,
    hard: getWordsByDifficulty('hard').length
  };
  
  return {
    totalWords,
    totalCategories: CATEGORIES.length,
    cognateCount,
    cognatePercentage: Math.round((cognateCount / totalWords) * 100),
    difficultyStats,
    categoriesWithCounts: CATEGORIES.map(cat => ({
      ...cat,
      actualWordCount: getWordsByCategory(cat.id).length
    }))
  };
}