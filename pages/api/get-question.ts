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
  { english: "Pen", french: "Stylo", german: "Stift", russian: "ручка", japanese: "Pen", spanish: "Bolígrafo" },
  { english: "Paper", french: "Papier", german: "Papier", russian: "бумага", japanese: "Kami", spanish: "Papel" },
  { english: "Bag", french: "Sac", german: "Tasche", russian: "сумка", japanese: "Kaban", spanish: "Bolsa" },
  { english: "Shoe", french: "Chaussure", german: "Schuh", russian: "туфля", japanese: "Kutsu", spanish: "Zapato" },
  { english: "Shirt", french: "Chemise", german: "Hemd", russian: "рубашка", japanese: "Shatsu", spanish: "Camisa" },
  { english: "Phone", french: "Téléphone", german: "Telefon", russian: "телефон", japanese: "Denwa", spanish: "Teléfono" },
  { english: "Clock", french: "Horloge", german: "Uhr", russian: "часы", japanese: "Tokei", spanish: "Reloj" },
  { english: "Key", french: "Clé", german: "Schlüssel", russian: "ключ", japanese: "Kagi", spanish: "Llave" },
  { english: "Hat", french: "Chapeau", german: "Hut", russian: "шляпа", japanese: "Boushi", spanish: "Sombrero" },
  { english: "Cup", french: "Tasse", german: "Tasse", russian: "чашка", japanese: "Kappu", spanish: "Taza" },

  // Additional simple verbs
  { english: "Sit", french: "S'asseoir", german: "Sitzen", russian: "сидеть", japanese: "Suwaru", spanish: "Sentarse" },
  { english: "Stand", french: "Se lever", german: "Stehen", russian: "стоять", japanese: "Tatsu", spanish: "Estar de pie" },
  { english: "Laugh", french: "Rire", german: "Lachen", russian: "смеяться", japanese: "Warau", spanish: "Reír" },
  { english: "Cry", french: "Pleurer", german: "Weinen", russian: "плакать", japanese: "Naku", spanish: "Llorar" },
  { english: "Wait", french: "Attendre", german: "Warten", russian: "ждать", japanese: "Matsu", spanish: "Esperar" },
  { english: "Jump", french: "Sauter", german: "Springen", russian: "прыгать", japanese: "Tobu", spanish: "Saltar" },
  { english: "Swim", french: "Nager", german: "Schwimmen", russian: "плавать", japanese: "Oyogu", spanish: "Nadar" },
  { english: "Draw", french: "Dessiner", german: "Zeichnen", russian: "рисовать", japanese: "Kaku", spanish: "Dibujar" },
  { english: "Watch", french: "Regarder", german: "Schauen", russian: "смотреть", japanese: "Miru", spanish: "Mirar" },
  { english: "Help", french: "Aider", german: "Helfen", russian: "помогать", japanese: "Tetsudau", spanish: "Ayudar" },

  // Common expressions/questions
  { english: "What time is it?", french: "Quelle heure est-il ?", german: "Wie spät ist es?", russian: "Который час?", japanese: "Ima nanji desu ka?", spanish: "What time is it?" },
  { english: "Where are you from?", french: "D'où viens-tu ?", german: "Woher kommst du?", russian: "Откуда ты?", japanese: "Doko kara kimasu ka?", spanish: "¿De dónde eres?" },
  { english: "How are you?", french: "Comment vas-tu ?", german: "Wie geht's dir?", russian: "Как дела?", japanese: "Genki desu ka?", spanish: "¿Cómo estás?" },
  { english: "What's your name?", french: "Comment vous appelez-vous ?", german: "Wie heißt du?", russian: "Как тебя зовут?", japanese: "Onamae wa nan desu ka?", spanish: "¿Cómo te llamas?" },
  { english: "Nice to meet you", french: "Enchanté", german: "Freut mich", russian: "Приятно познакомиться", japanese: "Hajimemashite", spanish: "Encantado de conocerte" },
  { english: "Thank you", french: "Merci", german: "Danke", russian: "Спасибо", japanese: "Arigatou", spanish: "Gracias" },
  { english: "You're welcome", french: "De rien", german: "Bitte", russian: "Пожалуйста", japanese: "Douitashimashite", spanish: "De nada" },
  { english: "I'm sorry", french: "Je suis désolé", german: "Es tut mir leid", russian: "Извини", japanese: "Gomen nasai", spanish: "Lo siento" },
  { english: "Excuse me", french: "Excusez-moi", german: "Entschuldigung", russian: "Извините", japanese: "Sumimasen", spanish: "Perdón" },
  { english: "Good morning", french: "Bonjour", german: "Guten Morgen", russian: "Доброе утро", japanese: "Ohayou", spanish: "Buenos días" },

  // Numbers 1-50 (written in letters)
  { english: "One", french: "Un", german: "Eins", russian: "один", japanese: "Ichi", spanish: "Uno" },
  { english: "Two", french: "Deux", german: "Zwei", russian: "два", japanese: "Ni", spanish: "Dos" },
  { english: "Three", french: "Trois", german: "Drei", russian: "три", japanese: "San", spanish: "Tres" },
  { english: "Four", french: "Quatre", german: "Vier", russian: "четыре", japanese: "Yon", spanish: "Cuatro" },
  { english: "Five", french: "Cinq", german: "Fünf", russian: "пять", japanese: "Go", spanish: "Cinco" },
  { english: "Six", french: "Six", german: "Sechs", russian: "шесть", japanese: "Roku", spanish: "Seis" },
  { english: "Seven", french: "Sept", german: "Sieben", russian: "семь", japanese: "Nana", spanish: "Siete" },
  { english: "Eight", french: "Huit", german: "Acht", russian: "восемь", japanese: "Hachi", spanish: "Ocho" },
  { english: "Nine", french: "Neuf", german: "Neun", russian: "девять", japanese: "Kyuu", spanish: "Nueve" },
  { english: "Ten", french: "Dix", german: "Zehn", russian: "десять", japanese: "Juu", spanish: "Diez" },
  { english: "Eleven", french: "Onze", german: "Elf", russian: "одиннадцать", japanese: "Juuichi", spanish: "Once" },
  { english: "Twelve", french: "Douze", german: "Zwölf", russian: "двенадцать", japanese: "Juuni", spanish: "Doce" },
  { english: "Thirteen", french: "Treize", german: "Dreizehn", russian: "тринадцать", japanese: "Juusan", spanish: "Trece" },
  { english: "Fourteen", french: "Quatorze", german: "Vierzehn", russian: "четырнадцать", japanese: "Juuyon", spanish: "Catorce" },
  { english: "Fifteen", french: "Quinze", german: "Fünfzehn", russian: "пятнадцать", japanese: "Juugo", spanish: "Quince" },
  { english: "Sixteen", french: "Seize", german: "Sechzehn", russian: "шестнадцать", japanese: "Juuroku", spanish: "Dieciséis" },
  { english: "Seventeen", french: "Dix-sept", german: "Siebzehn", russian: "семнадцать", japanese: "Juushichi", spanish: "Diecisiete" },
  { english: "Eighteen", french: "Dix-huit", german: "Achtzehn", russian: "восемнадцать", japanese: "Juuhachi", spanish: "Dieciocho" },
  { english: "Nineteen", french: "Dix-neuf", german: "Neunzehn", russian: "девятнадцать", japanese: "Juukyuu", spanish: "Diecinueve" },
  { english: "Twenty", french: "Vingt", german: "Zwanzig", russian: "двадцать", japanese: "Nijuu", spanish: "Veinte" },
  { english: "Twenty-one", french: "Vingt-et-un", german: "Einundzwanzig", russian: "двадцать один", japanese: "Nijuuichi", spanish: "Veintiuno" },
  { english: "Twenty-two", french: "Vingt-deux", german: "Zweiundzwanzig", russian: "двадцать два", japanese: "Nijuuni", spanish: "Veintidós" },
  { english: "Twenty-three", french: "Vingt-trois", german: "Dreiundzwanzig", russian: "двадцать три", japanese: "Nijuusan", spanish: "Veintitrés" },
  { english: "Twenty-four", french: "Vingt-quatre", german: "Vierundzwanzig", russian: "двадцать четыре", japanese: "Nijuuyon", spanish: "Veinticuatro" },
  { english: "Twenty-five", french: "Vingt-cinq", german: "Fünfundzwanzig", russian: "двадцать пять", japanese: "Nijuugo", spanish: "Veinticinco" },
  { english: "Twenty-six", french: "Vingt-six", german: "Sechsundzwanzig", russian: "двадцать шесть", japanese: "Nijuuroku", spanish: "Veintiséis" },
  { english: "Twenty-seven", french: "Vingt-sept", german: "Siebenundzwanzig", russian: "двадцать семь", japanese: "Nijuushichi", spanish: "Veintisiete" },
  { english: "Twenty-eight", french: "Vingt-huit", german: "Achtundzwanzig", russian: "двадцать восемь", japanese: "Nijuuhachi", spanish: "Veintiocho" },
  { english: "Twenty-nine", french: "Vingt-neuf", german: "Neunundzwanzig", russian: "двадцать девять", japanese: "Nijuukyuu", spanish: "Veintinueve" },
  { english: "Thirty", french: "Trente", german: "Dreißig", russian: "тридцать", japanese: "Sanjuu", spanish: "Treinta" },
  { english: "Thirty-one", french: "Trente-et-un", german: "Einunddreißig", russian: "тридцать один", japanese: "Sanjuuichi", spanish: "Treinta y uno" },
  { english: "Thirty-two", french: "Trente-deux", german: "Zweiunddreißig", russian: "тридцать два", japanese: "Sanjuuni", spanish: "Treinta y dos" },
  { english: "Thirty-three", french: "Trente-trois", german: "Dreiunddreißig", russian: "тридцать три", japanese: "Sanjuusan", spanish: "Treinta y tres" },
  { english: "Thirty-four", french: "Trente-quatre", german: "Vierunddreißig", russian: "тридцать четыре", japanese: "Sanjuuyon", spanish: "Treinta y cuatro" },
  { english: "Thirty-five", french: "Trente-cinq", german: "Fünfunddreißig", russian: "тридцать пять", japanese: "Sanjuugo", spanish: "Treinta y cinco" },
  { english: "Thirty-six", french: "Trente-six", german: "Sechsunddreißig", russian: "тридцать шесть", japanese: "Sanjuuroku", spanish: "Treinta y seis" },
  { english: "Thirty-seven", french: "Trente-sept", german: "Siebenunddreißig", russian: "тридцать семь", japanese: "Sanjuushichi", spanish: "Treinta y siete" },
  { english: "Thirty-eight", french: "Trente-huit", german: "Achtunddreißig", russian: "тридцать восемь", japanese: "Sanjuuhachi", spanish: "Treinta y ocho" },
  { english: "Thirty-nine", french: "Trente-neuf", german: "Neununddreißig", russian: "тридцать девять", japanese: "Sanjuukyuu", spanish: "Treinta y nueve" },
  { english: "Forty", french: "Quarante", german: "Vierzig", russian: "сорок", japanese: "Yonjuu", spanish: "Cuarenta" },
  { english: "Forty-one", french: "Quarante-et-un", german: "Einundvierzig", russian: "сорок один", japanese: "Yonjuuichi", spanish: "Cuarenta y uno" },
  { english: "Forty-two", french: "Quarante-deux", german: "Zweiundvierzig", russian: "сорок два", japanese: "Yonjuuni", spanish: "Cuarenta y dos" },
  { english: "Forty-three", french: "Quarante-trois", german: "Dreiundvierzig", russian: "сорок три", japanese: "Yonjuusan", spanish: "Cuarenta y tres" },
  { english: "Forty-four", french: "Quarante-quatre", german: "Vierundvierzig", russian: "сорок четыре", japanese: "Yonjuuyon", spanish: "Cuarenta y cuatro" },
  { english: "Forty-five", french: "Quarante-cinq", german: "Fünfundvierzig", russian: "сорок пять", japanese: "Yonjuugo", spanish: "Cuarenta y cinco" },
  { english: "Forty-six", french: "Quarante-six", german: "Sechsundvierzig", russian: "сорок шесть", japanese: "Yonjuuroku", spanish: "Cuarenta y seis" },
  { english: "Forty-seven", french: "也是Quarante-sept", german: "Siebenundvierzig", russian: "сорок семь", japanese: "Yonjuushichi", spanish: "Cuarenta y siete" },
  { english: "Forty-eight", french: "Quarante-huit", german: "Achtundvierzig", russian: "сорок восемь", japanese: "Yonjuuhachi", spanish: "Cuarenta y ocho" },
  { english: "Forty-nine", french: "Quarante-neuf", german: "Neunundvierzig", russian: "сорок девять", japanese: "Yonjuukyuu", spanish: "Cuarenta y nueve" },
  { english: "Fifty", french: "Cinquante", german: "Fünfzig", russian: "пятьдесят", japanese: "Gojuu", spanish: "Cincuenta" },
]

// Counter for generating unique question IDs
let questionCounter = 0

interface Question {
  questionId: string;
  english: string;
  correctAnswer: string;
  options: string[];
}

function generateQuestion(language: "french" | "german" | "russian" | "japanese" | "spanish" | "english"): Question {
  console.log(`🎯 API: Generating question for ${language}`)
  
  // Validate language
  if (!["french", "german", "russian", "japanese", "spanish", "english"].includes(language)) {
    console.error(`❌ API: Invalid language: ${language}`)
    throw new Error(`Invalid language: ${language}`)
  }

  // For English, we need to reverse the logic - show foreign word, answer in English
  let questionWord: any
  let correctAnswer: string
  let englishWord: string

  if (language === "english") {
    // For English mode: show a foreign word, answer in English
    const foreignLanguages = ["french", "german", "russian", "japanese", "spanish"]
    const randomForeignLanguage = foreignLanguages[Math.floor(Math.random() * foreignLanguages.length)]
    
    questionWord = WORD_DATABASE[Math.floor(Math.random() * WORD_DATABASE.length)]
    correctAnswer = questionWord.english
    englishWord = questionWord[randomForeignLanguage] // Show foreign word as the question
    
    console.log(`📝 API: Selected word for English mode:`, {
      questionLanguage: randomForeignLanguage,
      questionText: englishWord,
      correctAnswer: correctAnswer
    })
  } else {
    // For other languages: show English word, answer in target language
    questionWord = WORD_DATABASE[Math.floor(Math.random() * WORD_DATABASE.length)]
    correctAnswer = questionWord[language]
    englishWord = questionWord.english
    
    console.log(`📝 API: Selected word for ${language}:`, questionWord)
  }
  
  if (!correctAnswer) {
    console.error(`❌ API: No translation found for ${language} in word:`, questionWord)
    throw new Error(`No translation found for ${language}`)
  }

  // Generate wrong answers
  const wrongAnswers: string[] = []
  let attempts = 0
  const maxAttempts = 50
  
  while (wrongAnswers.length < 3 && attempts < maxAttempts) {
    attempts++
    const randomWrongWord = WORD_DATABASE[Math.floor(Math.random() * WORD_DATABASE.length)]
    
    let wrongAnswer: string
    if (language === "english") {
      wrongAnswer = randomWrongWord.english
    } else {
      wrongAnswer = randomWrongWord[language]
    }
    
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
    english: englishWord, // This will be the foreign word for English mode
    correctAnswer,
    options,
  }

  console.log(`✅ API: Generated question:`, {
    questionId: question.questionId,
    questionText: question.english,
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

    if (!["french", "german", "russian", "japanese", "spanish", "english"].includes(language)) {
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