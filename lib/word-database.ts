// Enhanced word database with categorized words for cooperation mode
// Each word has a unique ID and belongs to specific categories

export interface Word {
  id: string;
  english: string;
  french: string;
  german: string;
  russian: string;
  japanese: string;
  spanish: string;
  categories: string[];
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export const CATEGORIES: Category[] = [
  { id: "colors", name: "Colors", description: "Different colors and shades" },
  { id: "animals", name: "Animals", description: "Various animals and creatures" },
  { id: "food", name: "Food", description: "Food items and ingredients" },
  { id: "vehicles", name: "Vehicles", description: "Transportation and vehicles" },
  { id: "clothing", name: "Clothing", description: "Clothes and accessories" },
  { id: "sports", name: "Sports", description: "Sports and physical activities" },
  { id: "household", name: "Household", description: "Household items and furniture" }
];

export const WORD_DATABASE: Word[] = [
  // Colors
  { id: "word_001", english: "Red", french: "Rouge", german: "Rot", russian: "красный", japanese: "Aka", spanish: "Rojo", categories: ["colors"] },
  { id: "word_002", english: "Blue", french: "Bleu", german: "Blau", russian: "синий", japanese: "Ao", spanish: "Azul", categories: ["colors"] },
  { id: "word_003", english: "Green", french: "Vert", german: "Grün", russian: "зелёный", japanese: "Midori", spanish: "Verde", categories: ["colors"] },
  { id: "word_004", english: "Yellow", french: "Jaune", german: "Gelb", russian: "жёлтый", japanese: "Kiiro", spanish: "Amarillo", categories: ["colors"] },
  { id: "word_005", english: "Black", french: "Noir", german: "Schwarz", russian: "чёрный", japanese: "Kuro", spanish: "Negro", categories: ["colors"] },
  { id: "word_006", english: "White", french: "Blanc", german: "Weiß", russian: "белый", japanese: "Shiro", spanish: "Blanco", categories: ["colors"] },
  { id: "word_007", english: "Purple", french: "Violet", german: "Lila", russian: "фиолетовый", japanese: "Murasaki", spanish: "Morado", categories: ["colors"] },
  { id: "word_008", english: "Orange", french: "Orange", german: "Orange", russian: "оранжевый", japanese: "Orenji", spanish: "Naranja", categories: ["colors"] },
  { id: "word_009", english: "Pink", french: "Rose", german: "Rosa", russian: "розовый", japanese: "Pinku", spanish: "Rosa", categories: ["colors"] },
  { id: "word_010", english: "Brown", french: "Marron", german: "Braun", russian: "коричневый", japanese: "Chairo", spanish: "Marrón", categories: ["colors"] },

  // Animals
  { id: "word_011", english: "Cat", french: "Chat", german: "Katze", russian: "кот", japanese: "Neko", spanish: "Gato", categories: ["animals"] },
  { id: "word_012", english: "Dog", french: "Chien", german: "Hund", russian: "собака", japanese: "Inu", spanish: "Perro", categories: ["animals"] },
  { id: "word_013", english: "Bird", french: "Oiseau", german: "Vogel", russian: "птица", japanese: "Tori", spanish: "Pájaro", categories: ["animals"] },
  { id: "word_014", english: "Fish", french: "Poisson", german: "Fisch", russian: "рыба", japanese: "Sakana", spanish: "Pescado", categories: ["animals"] },
  { id: "word_015", english: "Horse", french: "Cheval", german: "Pferd", russian: "лошадь", japanese: "Uma", spanish: "Caballo", categories: ["animals"] },
  { id: "word_016", english: "Cow", french: "Vache", german: "Kuh", russian: "корова", japanese: "Ushi", spanish: "Vaca", categories: ["animals"] },
  { id: "word_017", english: "Elephant", french: "Éléphant", german: "Elefant", russian: "слон", japanese: "Zou", spanish: "Elefante", categories: ["animals"] },
  { id: "word_018", english: "Lion", french: "Lion", german: "Löwe", russian: "лев", japanese: "Raion", spanish: "León", categories: ["animals"] },
  { id: "word_019", english: "Tiger", french: "Tigre", german: "Tiger", russian: "тигр", japanese: "Tora", spanish: "Tigre", categories: ["animals"] },
  { id: "word_020", english: "Bear", french: "Ours", german: "Bär", russian: "медведь", japanese: "Kuma", spanish: "Oso", categories: ["animals"] },

  // Food
  { id: "word_021", english: "Apple", french: "Pomme", german: "Apfel", russian: "яблоко", japanese: "Ringo", spanish: "Manzana", categories: ["food"] },
  { id: "word_022", english: "Bread", french: "Pain", german: "Brot", russian: "хлеб", japanese: "Pan", spanish: "Pan", categories: ["food"] },
  { id: "word_023", english: "Milk", french: "Lait", german: "Milch", russian: "молоко", japanese: "Gyunyu", spanish: "Leche", categories: ["food"] },
  { id: "word_024", english: "Egg", french: "Œuf", german: "Ei", russian: "яйцо", japanese: "Tamago", spanish: "Huevo", categories: ["food"] },
  { id: "word_025", english: "Meat", french: "Viande", german: "Fleisch", russian: "мясо", japanese: "Niku", spanish: "Carne", categories: ["food"] },
  { id: "word_026", english: "Cheese", french: "Fromage", german: "Käse", russian: "сыр", japanese: "Chiizu", spanish: "Queso", categories: ["food"] },
  { id: "word_027", english: "Rice", french: "Riz", german: "Reis", russian: "рис", japanese: "Gohan", spanish: "Arroz", categories: ["food"] },
  { id: "word_028", english: "Pasta", french: "Pâtes", german: "Nudeln", russian: "макароны", japanese: "Pasuta", spanish: "Pasta", categories: ["food"] },
  { id: "word_029", english: "Soup", french: "Soupe", german: "Suppe", russian: "суп", japanese: "Suupu", spanish: "Sopa", categories: ["food"] },
  { id: "word_030", english: "Salad", french: "Salade", german: "Salat", russian: "салат", japanese: "Sarada", spanish: "Ensalada", categories: ["food"] },

  // Vehicles
  { id: "word_031", english: "Car", french: "Voiture", german: "Auto", russian: "машина", japanese: "Kuruma", spanish: "Coche", categories: ["vehicles"] },
  { id: "word_032", english: "Bus", french: "Bus", german: "Bus", russian: "автобус", japanese: "Basu", spanish: "Autobús", categories: ["vehicles"] },
  { id: "word_033", english: "Train", french: "Train", german: "Zug", russian: "поезд", japanese: "Densha", spanish: "Tren", categories: ["vehicles"] },
  { id: "word_034", english: "Plane", french: "Avion", german: "Flugzeug", russian: "самолёт", japanese: "Hikouki", spanish: "Avión", categories: ["vehicles"] },
  { id: "word_035", english: "Boat", french: "Bateau", german: "Boot", russian: "лодка", japanese: "Booto", spanish: "Barco", categories: ["vehicles"] },
  { id: "word_036", english: "Bicycle", french: "Vélo", german: "Fahrrad", russian: "велосипед", japanese: "Jitensha", spanish: "Bicicleta", categories: ["vehicles"] },
  { id: "word_037", english: "Motorcycle", french: "Moto", german: "Motorrad", russian: "мотоцикл", japanese: "Baiku", spanish: "Motocicleta", categories: ["vehicles"] },
  { id: "word_038", english: "Truck", french: "Camion", german: "Lastwagen", russian: "грузовик", japanese: "Torakku", spanish: "Camión", categories: ["vehicles"] },
  { id: "word_039", english: "Taxi", french: "Taxi", german: "Taxi", russian: "такси", japanese: "Takushii", spanish: "Taxi", categories: ["vehicles"] },
  { id: "word_040", english: "Ship", french: "Navire", german: "Schiff", russian: "корабль", japanese: "Fune", spanish: "Barco", categories: ["vehicles"] },

  // Clothing
  { id: "word_041", english: "Shirt", french: "Chemise", german: "Hemd", russian: "рубашка", japanese: "Shatsu", spanish: "Camisa", categories: ["clothing"] },
  { id: "word_042", english: "Pants", french: "Pantalon", german: "Hose", russian: "брюки", japanese: "Zubon", spanish: "Pantalones", categories: ["clothing"] },
  { id: "word_043", english: "Dress", french: "Robe", german: "Kleid", russian: "платье", japanese: "Doresu", spanish: "Vestido", categories: ["clothing"] },
  { id: "word_044", english: "Shoes", french: "Chaussures", german: "Schuhe", russian: "туфли", japanese: "Kutsu", spanish: "Zapatos", categories: ["clothing"] },
  { id: "word_045", english: "Hat", french: "Chapeau", german: "Hut", russian: "шляпа", japanese: "Boushi", spanish: "Sombrero", categories: ["clothing"] },
  { id: "word_046", english: "Jacket", french: "Veste", german: "Jacke", russian: "куртка", japanese: "Jaketto", spanish: "Chaqueta", categories: ["clothing"] },
  { id: "word_047", english: "Socks", french: "Chaussettes", german: "Socken", russian: "носки", japanese: "Kutsushita", spanish: "Calcetines", categories: ["clothing"] },
  { id: "word_048", english: "Gloves", french: "Gants", german: "Handschuhe", russian: "перчатки", japanese: "Tebukuro", spanish: "Guantes", categories: ["clothing"] },
  { id: "word_049", english: "Scarf", french: "Écharpe", german: "Schal", russian: "шарф", japanese: "Mafuraa", spanish: "Bufanda", categories: ["clothing"] },
  { id: "word_050", english: "Belt", french: "Ceinture", german: "Gürtel", russian: "ремень", japanese: "Beruto", spanish: "Cinturón", categories: ["clothing"] },

  // Sports
  { id: "word_051", english: "Football", french: "Football", german: "Fußball", russian: "футбол", japanese: "Sakkaa", spanish: "Fútbol", categories: ["sports"] },
  { id: "word_052", english: "Basketball", french: "Basketball", german: "Basketball", russian: "баскетбол", japanese: "Basuketto", spanish: "Baloncesto", categories: ["sports"] },
  { id: "word_053", english: "Tennis", french: "Tennis", german: "Tennis", russian: "теннис", japanese: "Tenisu", spanish: "Tenis", categories: ["sports"] },
  { id: "word_054", english: "Swimming", french: "Natation", german: "Schwimmen", russian: "плавание", japanese: "Suiei", spanish: "Natación", categories: ["sports"] },
  { id: "word_055", english: "Running", french: "Course", german: "Laufen", russian: "бег", japanese: "Raningu", spanish: "Correr", categories: ["sports"] },
  { id: "word_056", english: "Golf", french: "Golf", german: "Golf", russian: "гольф", japanese: "Gorufu", spanish: "Golf", categories: ["sports"] },
  { id: "word_057", english: "Baseball", french: "Baseball", german: "Baseball", russian: "бейсбол", japanese: "Yakyuu", spanish: "Béisbol", categories: ["sports"] },
  { id: "word_058", english: "Volleyball", french: "Volleyball", german: "Volleyball", russian: "волейбол", japanese: "Bariibooru", spanish: "Voleibol", categories: ["sports"] },
  { id: "word_059", english: "Boxing", french: "Boxe", german: "Boxen", russian: "бокс", japanese: "Bokushingu", spanish: "Boxeo", categories: ["sports"] },
  { id: "word_060", english: "Cycling", french: "Cyclisme", german: "Radfahren", russian: "велоспорт", japanese: "Saikuringu", spanish: "Ciclismo", categories: ["sports"] },

  // Household
  { id: "word_061", english: "Table", french: "Table", german: "Tisch", russian: "стол", japanese: "Teeburu", spanish: "Mesa", categories: ["household"] },
  { id: "word_062", english: "Chair", french: "Chaise", german: "Stuhl", russian: "стул", japanese: "Isu", spanish: "Silla", categories: ["household"] },
  { id: "word_063", english: "Bed", french: "Lit", german: "Bett", russian: "кровать", japanese: "Beddo", spanish: "Cama", categories: ["household"] },
  { id: "word_064", english: "Sofa", french: "Canapé", german: "Sofa", russian: "диван", japanese: "Sofaa", spanish: "Sofá", categories: ["household"] },
  { id: "word_065", english: "Television", french: "Télévision", german: "Fernseher", russian: "телевизор", japanese: "Terebi", spanish: "Televisión", categories: ["household"] },
  { id: "word_066", english: "Refrigerator", french: "Réfrigérateur", german: "Kühlschrank", russian: "холодильник", japanese: "Reizouko", spanish: "Refrigerador", categories: ["household"] },
  { id: "word_067", english: "Microwave", french: "Micro-ondes", german: "Mikrowelle", russian: "микроволновка", japanese: "Denshi renji", spanish: "Microondas", categories: ["household"] },
  { id: "word_068", english: "Lamp", french: "Lampe", german: "Lampe", russian: "лампа", japanese: "Ranpu", spanish: "Lámpara", categories: ["household"] },
  { id: "word_069", english: "Mirror", french: "Miroir", german: "Spiegel", russian: "зеркало", japanese: "Kagami", spanish: "Espejo", categories: ["household"] },
  { id: "word_070", english: "Clock", french: "Horloge", german: "Uhr", russian: "часы", japanese: "Tokei", spanish: "Reloj", categories: ["household"] },
];

// Helper functions for cooperation mode
export function getWordsByCategory(categoryId: string): Word[] {
  return WORD_DATABASE.filter(word => word.categories.includes(categoryId));
}

export function getCategoryInfo(categoryId: string): Category | undefined {
  return CATEGORIES.find(cat => cat.id === categoryId);
}

export function getRandomWordFromCategory(categoryId: string, excludeIds: string[] = []): Word | null {
  const categoryWords = getWordsByCategory(categoryId).filter(word => !excludeIds.includes(word.id));
  if (categoryWords.length === 0) return null;
  return categoryWords[Math.floor(Math.random() * categoryWords.length)];
}

// Validate if a word belongs to a category in a specific language
export function validateWordInCategory(
  categoryId: string, 
  answer: string, 
  language: "english" | "french" | "german" | "russian" | "japanese" | "spanish"
): { isValid: boolean; word?: Word } {
  const categoryWords = getWordsByCategory(categoryId);
  const normalizedAnswer = answer.toLowerCase().trim();
  
  const matchingWord = categoryWords.find(word => {
    const wordTranslation = word[language] as string;
    return wordTranslation.toLowerCase().trim() === normalizedAnswer;
  });

  return {
    isValid: !!matchingWord,
    word: matchingWord
  };
}