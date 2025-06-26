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

  // CLOTHING (50 words)
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
  {
    id: "clothing_021",
    english: "T-shirt",
    french: "T-shirt",
    spanish: "Camiseta",
    german: "T-Shirt",
    japanese: "Tīshatsu",
    russian: "футболка",
    category: "clothing",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "clothing_022",
    english: "Blouse",
    french: "Blouse",
    spanish: "Blusa",
    german: "Bluse",
    japanese: "Burausu",
    russian: "блузка",
    category: "clothing",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "clothing_023",
    english: "Vest",
    french: "Gilet",
    spanish: "Chaleco",
    german: "Weste",
    japanese: "Besuto",
    russian: "жилет",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "clothing_024",
    english: "Sneakers",
    french: "Baskets",
    spanish: "Zapatillas",
    german: "Turnschuhe",
    japanese: "Sunīkā",
    russian: "кроссовки",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "clothing_025",
    english: "Cap",
    french: "Casquette",
    spanish: "Gorra",
    german: "Kappe",
    japanese: "Kyappu",
    russian: "кепка",
    category: "clothing",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "clothing_026",
    english: "Shorts",
    french: "Short",
    spanish: "Pantalones cortos",
    german: "Shorts",
    japanese: "Shottsu",
    russian: "шорты",
    category: "clothing",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "clothing_027",
    english: "Hoodie",
    french: "Sweat à capuche",
    spanish: "Sudadera con capucha",
    german: "Kapuzenpullover",
    japanese: "Fūdi",
    russian: "толстовка",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "clothing_028",
    english: "Raincoat",
    french: "Imperméable",
    spanish: "Impermeable",
    german: "Regenmantel",
    japanese: "Reinkōto",
    russian: "дождевик",
    category: "clothing",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "clothing_029",
    english: "Sandals",
    french: "Sandales",
    spanish: "Sandalias",
    german: "Sandalen",
    japanese: "Sandaru",
    russian: "сандалии",
    category: "clothing",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "clothing_030",
    english: "Suit",
    french: "Costume",
    spanish: "Traje",
    german: "Anzug",
    japanese: "Sūtsu",
    russian: "костюм",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "clothing_031",
    english: "Blazer",
    french: "Blazer",
    spanish: "Blazer",
    german: "Blazer",
    japanese: "Burēzā",
    russian: "блейзер",
    category: "clothing",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "clothing_032",
    english: "Apron",
    french: "Tablier",
    spanish: "Delantal",
    german: "Schürze",
    japanese: "Epuron",
    russian: "фартук",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "clothing_033",
    english: "Mittens",
    french: "Moufles",
    spanish: "Manoplas",
    german: "Fäustlinge",
    japanese: "Mitten",
    russian: "варежки",
    category: "clothing",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "clothing_034",
    english: "Sweatshirt",
    french: "Sweatshirt",
    spanish: "Sudadera",
    german: "Sweatshirt",
    japanese: "Suwetto",
    russian: "свитшот",
    category: "clothing",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "clothing_035",
    english: "Leggings",
    french: "Leggings",
    spanish: "Leggings",
    german: "Leggings",
    japanese: "Reginsu",
    russian: "леггинсы",
    category: "clothing",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "clothing_036",
    english: "Cardigan",
    french: "Cardigan",
    spanish: "Cárdigan",
    german: "Cardigan",
    japanese: "Kādeigan",
    russian: "кардиган",
    category: "clothing",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "clothing_037",
    english: "Overalls",
    french: "Salopette",
    spanish: "Peto",
    german: "Latzhose",
    japanese: "Ōbāōru",
    russian: "комбинезон",
    category: "clothing",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "clothing_038",
    english: "Poncho",
    french: "Poncho",
    spanish: "Poncho",
    german: "Poncho",
    japanese: "Poncho",
    russian: "пончо",
    category: "clothing",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "clothing_039",
    english: "Slippers",
    french: "Pantoufles",
    spanish: "Zapatillas",
    german: "Hausschuhe",
    japanese: "Surippā",
    russian: "тапочки",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "clothing_040",
    english: "Beret",
    french: "Béret",
    spanish: "Boina",
    german: "Barett",
    japanese: "Berē",
    russian: "берет",
    category: "clothing",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "clothing_041",
    english: "Tights",
    french: "Collants",
    spanish: "Medias",
    german: "Strumpfhose",
    japanese: "Taitsu",
    russian: "колготки",
    category: "clothing",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "clothing_042",
    english: "Bowtie",
    french: "Noeud papillon",
    spanish: "Pajarita",
    german: "Fliege",
    japanese: "Bōtai",
    russian: "галстук-бабочка",
    category: "clothing",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "clothing_043",
    english: "Robe",
    french: "Peignoir",
    spanish: "Bata",
    german: "Morgenmantel",
    japanese: "Rōbu",
    russian: "халат",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "clothing_044",
    english: "Suspenders",
    french: "Bretelles",
    spanish: "Tirantes",
    german: "Hosenträger",
    japanese: "Sasupendā",
    russian: "подтяжки",
    category: "clothing",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "clothing_045",
    english: "Parka",
    french: "Parka",
    spanish: "Parka",
    german: "Parka",
    japanese: "Pāka",
    russian: "парка",
    category: "clothing",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "clothing_046",
    english: "Tank top",
    french: "Débardeur",
    spanish: "Camiseta sin mangas",
    german: "Tanktop",
    japanese: "Tanku toppu",
    russian: "майка",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "clothing_047",
    english: "Bandana",
    french: "Bandana",
    spanish: "Bandana",
    german: "Bandana",
    japanese: "Bandana",
    russian: "бандана",
    category: "clothing",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "clothing_048",
    english: "Tracksuit",
    french: "Survêtement",
    spanish: "Chándal",
    german: "Trainingsanzug",
    japanese: "Torakkusūto",
    russian: "спортивный костюм",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "clothing_049",
    english: "Glasses",
    french: "Lunettes",
    spanish: "Gafas",
    german: "Brille",
    japanese: "Megane",
    russian: "очки",
    category: "clothing",
    isCognate: false,
    difficulty: "easy"
  },
  {
    id: "clothing_050",
    english: "Necklace",
    french: "Collier",
    spanish: "Collar",
    german: "Halskette",
    japanese: "Nekkuresu",
    russian: "ожерелье",
    category: "clothing",
    isCognate: false,
    difficulty: "medium"
  },

  // SPORTS (50 words)
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
  {
    id: "sport_021",
    english: "Soccer",
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
    id: "sport_022",
    english: "Rugby",
    french: "Rugby",
    spanish: "Rugby",
    german: "Rugby",
    japanese: "Ragubī",
    russian: "регби",
    category: "sports",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "sport_023",
    english: "Badminton",
    french: "Badminton",
    spanish: "Bádminton",
    german: "Badminton",
    japanese: "Badominton",
    russian: "бадминтон",
    category: "sports",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "sport_024",
    english: "Table tennis",
    french: "Tennis de table",
    spanish: "Tenis de mesa",
    german: "Tischtennis",
    japanese: "Takkyū",
    russian: "настольный теннис",
    category: "sports",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "sport_025",
    english: "Archery",
    french: "Tir à l'arc",
    spanish: "Tiro con arco",
    german: "Bogenschießen",
    japanese: "Kyūjutsu",
    russian: "стрельба из лука",
    category: "sports",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "sport_026",
    english: "Fencing",
    french: "Escrime",
    spanish: "Esgrima",
    german: "Fechten",
    japanese: "Fenshingu",
    russian: "фехтование",
    category: "sports",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "sport_027",
    english: "Karate",
    french: "Karaté",
    spanish: "Karate",
    german: "Karate",
    japanese: "Karate",
    russian: "карате",
    category: "sports",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "sport_028",
    english: "Judo",
    french: "Judo",
    spanish: "Judo",
    german: "Judo",
    japanese: "Jūdō",
    russian: "дзюдо",
    category: "sports",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "sport_029",
    english: "Taekwondo",
    french: "Taekwondo",
    spanish: "Taekwondo",
    german: "Taekwondo",
    japanese: "Tekondō",
    russian: "тхэквондо",
    category: "sports",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "sport_030",
    english: "Cricket",
    french: "Cricket",
    spanish: "Críquet",
    german: "Cricket",
    japanese: "KuriKetto",
    russian: "крикет",
    category: "sports",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "sport_031",
    english: "Skating",
    french: "Patinage",
    spanish: "Patinaje",
    german: "Schlittschuhlaufen",
    japanese: "Sukēto",
    russian: "катание на коньках",
    category: "sports",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "sport_032",
    english: "Snowboarding",
    french: "Snowboard",
    spanish: "Snowboard",
    german: "Snowboarden",
    japanese: "Sunōbōdo",
    russian: "сноуборд",
    category: "sports",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "sport_033",
    english: "Diving",
    french: "Plongée",
    spanish: "Buceo",
    german: "Tauchen",
    japanese: "Daibingu",
    russian: "дайвинг",
    category: "sports",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "sport_034",
    english: "Rowing",
    french: "Aviron",
    spanish: "Remo",
    german: "Rudern",
    japanese: "Rōingu",
    russian: "гребля",
    category: "sports",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "sport_035",
    english: "Sailing",
    french: "Voile",
    spanish: "Vela",
    german: "Segeln",
    japanese: "Sēringu",
    russian: "парусный спорт",
    category: "sports",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "sport_036",
    english: "Horseback riding",
    french: "Équitation",
    spanish: "Equitación",
    german: "Reiten",
    japanese: "Jōba",
    russian: "верховая езда",
    category: "sports",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "sport_037",
    english: "Weightlifting",
    french: "Haltérophilie",
    spanish: "Halterofilia",
    german: "Gewichtheben",
    japanese: "Ueitōrifutingu",
    russian: "тяжёлая атлетика",
    category: "sports",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "sport_038",
    english: "Athletics",
    french: "Athlétisme",
    spanish: "Atletismo",
    german: "Leichtathletik",
    japanese: "Rikujō",
    russian: "лёгкая атлетика",
    category: "sports",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "sport_039",
    english: "Triathlon",
    french: "Triathlon",
    spanish: "Triatlón",
    german: "Triathlon",
    japanese: "Toraiazuron",
    russian: "триатлон",
    category: "sports",
    isCognate: true,
    difficulty: "hard"
  },
  {
    id: "sport_040",
    english: "Polo",
    french: "Polo",
    spanish: "Polo",
    german: "Polo",
    japanese: "Pōro",
    russian: "поло",
    category: "sports",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "sport_041",
    english: "Squash",
    french: "Squash",
    spanish: "Squash",
    german: "Squash",
    japanese: "Sukuwasshu",
    russian: "сквош",
    category: "sports",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "sport_042",
    english: "Kayaking",
    french: "Kayak",
    spanish: "Kayak",
    german: "Kajakfahren",
    japanese: "Kayakkingu",
    russian: "гребля на байдарках",
    category: "sports",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "sport_043",
    english: "Canoeing",
    french: "Canoë",
    spanish: "Canotaje",
    german: "Kanufahren",
    japanese: "Kanūingu",
    russian: "гребля на каноэ",
    category: "sports",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "sport_044",
    english: "Bowling",
    french: "Bowling",
    spanish: "Bolos",
    german: "Bowling",
    japanese: "Bōringu",
    russian: "боулинг",
    category: "sports",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "sport_045",
    english: "Ice hockey",
    french: "Hockey sur glace",
    spanish: "Hockey sobre hielo",
    german: "Eishockey",
    japanese: "Aisu hokkē",
    russian: "хоккей с шайбой",
    category: "sports",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "sport_046",
    english: "Figure skating",
    french: "Patinage artistique",
    spanish: "Patinaje artístico",
    german: "Eiskunstlauf",
    japanese: "Figyua sukētingu",
    russian: "фигурное катание",
    category: "sports",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "sport_047",
    english: "Lacrosse",
    french: "Crosse",
    spanish: "Lacrosse",
    german: "Lacrosse",
    japanese: "Rakurosu",
    russian: "лакросс",
    category: "sports",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "sport_048",
    english: "Softball",
    french: "Softball",
    spanish: "Sóftbol",
    german: "Softball",
    japanese: "Sofutobōru",
    russian: "софтбол",
    category: "sports",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "sport_049",
    english: "Netball",
    french: "Netball",
    spanish: "Netball",
    german: "Netball",
    japanese: "Nettobōru",
    russian: "нетбол",
    category: "sports",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "sport_050",
    english: "Handball",
    french: "Handball",
    spanish: "Balonmano",
    german: "Handball",
    japanese: "Handobōru",
    russian: "гандбол",
    category: "sports",
    isCognate: true,
    difficulty: "medium"
  },

  // HOUSEHOLD ITEMS (50 words)
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
  },
  {
    id: "household_021",
    english: "Desk",
    french: "Bureau",
    spanish: "Escritorio",
    german: "Schreibtisch",
    japanese: "Desuku",
    russian: "письменный стол",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_022",
    english: "Bookshelf",
    french: "Bibliothèque",
    spanish: "Estantería",
    german: "Bücherregal",
    japanese: "Hondana",
    russian: "книжный шкаф",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_023",
    english: "Wardrobe",
    french: "Armoire",
    spanish: "Armario",
    german: "Kleiderschrank",
    japanese: "Tansu",
    russian: "гардероб",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_024",
    english: "Curtains",
    french: "Rideaux",
    spanish: "Cortinas",
    german: "Vorhänge",
    japanese: "Kāten",
    russian: "шторы",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_025",
    english: "Rug",
    french: "Tapis",
    spanish: "Alfombra",
    german: "Teppich",
    japanese: "Ragu",
    russian: "ковёр",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_026",
    english: "Fan",
    french: "Ventilateur",
    spanish: "Ventilador",
    german: "Ventilator",
    japanese: "Fan",
    russian: "вентилятор",
    category: "household",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "household_027",
    english: "Heater",
    french: "Chauffage",
    spanish: "Calefactor",
    german: "Heizung",
    japanese: "Hītā",
    russian: "обогреватель",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_028",
    english: "Washing machine",
    french: "Machine à laver",
    spanish: "Lavadora",
    german: "Waschmaschine",
    japanese: "Sentakuki",
    russian: "стиральная машина",
    category: "household",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "household_029",
    english: "Dryer",
    french: "Sèche-linge",
    spanish: "Secadora",
    german: "Trockner",
    japanese: "Kansōki",
    russian: "сушилка",
    category: "household",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "household_030",
    english: "Dishwasher",
    french: "Lave-vaisselle",
    spanish: "Lavavajillas",
    german: "Geschirrspüler",
    japanese: "Shokkiarai ki",
    russian: "посудомоечная машина",
    category: "household",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "household_031",
    english: "Toaster",
    french: "Grille-pain",
    spanish: "Tostadora",
    german: "Toaster",
    japanese: "Tōsutā",
    russian: "тостер",
    category: "household",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "household_032",
    english: "Blender",
    french: "Mixeur",
    spanish: "Licuadora",
    german: "Mixer",
    japanese: "Burendā",
    russian: "блендер",
    category: "household",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "household_033",
    english: "Kettle",
    french: "Bouilloire",
    spanish: "Hervidor",
    german: "Wasserkocher",
    japanese: "Kettoru",
    russian: "чайник",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_034",
    english: "Oven",
    french: "Four",
    spanish: "Horno",
    german: "Ofen",
    japanese: "Ōbun",
    russian: "духовка",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_035",
    english: "Mattress",
    french: "Matelas",
    spanish: "Colchón",
    german: "Matratze",
    japanese: "Mattoresu",
    russian: "матрас",
    category: "household",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "household_036",
    english: "Couch",
    french: "Canapé",
    spanish: "Sofá",
    german: "Couch",
    japanese: "Kauchi",
    russian: "диван",
    category: "household",
    isCognate: true,
    difficulty: "easy"
  },
  {
    id: "household_037",
    english: "Cabinet",
    french: "Armoire",
    spanish: "Gabinete",
    german: "Schrank",
    japanese: "Kyabinetto",
    russian: "шкаф",
    category: "household",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "household_038",
    english: "Sink",
    french: "Évier",
    spanish: "Fregadero",
    german: "Spüle",
    japanese: "Shinku",
    russian: "раковина",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_039",
    english: "Faucet",
    french: "Robinet",
    spanish: "Grifo",
    german: "Wasserhahn",
    japanese: "Jagūchi",
    russian: "кран",
    category: "household",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "household_040",
    english: "Carpet",
    french: "Moquette",
    spanish: "Alfombra",
    german: "Teppich",
    japanese: "Kāpetto",
    russian: "ковёр",
    category: "household",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "household_041",
    english: "Broom",
    french: "Balai",
    spanish: "Escoba",
    german: "Besen",
    japanese: "Hōki",
    russian: "метла",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_042",
    english: "Mop",
    french: "Serpillière",
    spanish: "Fregona",
    german: "Wischmopp",
    japanese: "Moppu",
    russian: "швабра",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_043",
    english: "Trash can",
    french: "Poubelle",
    spanish: "Basurero",
    german: "Mülleimer",
    japanese: "Gomibako",
    russian: "мусорное ведро",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_044",
    english: "Light bulb",
    french: "Ampoule",
    spanish: "Bombilla",
    german: "Glühbirne",
    japanese: "Denkyū",
    russian: "лампочка",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_045",
    english: "Iron",
    french: "Fer à repasser",
    spanish: "Plancha",
    german: "Bügeleisen",
    japanese: "Airon",
    russian: "утюг",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_046",
    english: "Ironing board",
    french: "Table à repasser",
    spanish: "Tabla de planchar",
    german: "Bügelbrett",
    japanese: "Airon dai",
    russian: "гладильная доска",
    category: "household",
    isCognate: false,
    difficulty: "hard"
  },
  {
    id: "household_047",
    english: "Vase",
    french: "Vase",
    spanish: "Jarrón",
    german: "Vase",
    japanese: "Kabin",
    russian: "ваза",
    category: "household",
    isCognate: true,
    difficulty: "medium"
  },
  {
    id: "household_048",
    english: "Cushion",
    french: "Coussin",
    spanish: "Cojín",
    german: "Kissen",
    japanese: "Kusshon",
    russian: "подушка",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_049",
    english: "Candle",
    french: "Bougie",
    spanish: "Vela",
    german: "Kerze",
    japanese: "Rōsoku",
    russian: "свеча",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  },
  {
    id: "household_050",
    english: "Remote control",
    french: "Télécommande",
    spanish: "Control remoto",
    german: "Fernbedienung",
    japanese: "Rimokon",
    russian: "пульт дистанционного управления",
    category: "household",
    isCognate: false,
    difficulty: "medium"
  }
];

// Category information
export const CATEGORIES: CategoryInfo[] = [
  {
    id: "colors",
    name: "Colors",
    description: "Basic and advanced color names",
    wordCount: 50
  },
  {
    id: "animals",
    name: "Animals",
    description: "Common animals and creatures",
    wordCount: 50
  },
  {
    id: "food",
    name: "Food",
    description: "Food items, drinks, and ingredients",
    wordCount: 50
  },
  {
    id: "vehicles",
    name: "Vehicles",
    description: "Transportation and vehicles",
    wordCount: 50
  },
  {
    id: "clothing",
    name: "Clothing",
    description: "Clothes and accessories",
    wordCount: 50
  },
  {
    id: "sports",
    name: "Sports",
    description: "Sports and physical activities",
    wordCount: 50
  },
  {
    id: "household",
    name: "Household Items",
    description: "Common household objects and furniture",
    wordCount: 50
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