import { NextApiRequest, NextApiResponse } from "next"
import { CATEGORIES, getCategoryInfo } from "../../lib/word-database"

// API endpoint for getting a random category for cooperation mode
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

    // Get a random category
    const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
    
    // Language-specific category names
    const categoryTranslations = {
      colors: {
        english: "Colors",
        french: "Couleurs",
        spanish: "Colores", 
        german: "Farben",
        japanese: "色",
        russian: "Цвета"
      },
      animals: {
        english: "Animals",
        french: "Animaux",
        spanish: "Animales",
        german: "Tiere", 
        japanese: "動物",
        russian: "Животные"
      },
      food: {
        english: "Food",
        french: "Nourriture",
        spanish: "Comida",
        german: "Essen",
        japanese: "食べ物", 
        russian: "Еда"
      },
      vehicles: {
        english: "Vehicles",
        french: "Véhicules",
        spanish: "Vehículos",
        german: "Fahrzeuge",
        japanese: "乗り物",
        russian: "Транспорт"
      },
      clothing: {
        english: "Clothing",
        french: "Vêtements", 
        spanish: "Ropa",
        german: "Kleidung",
        japanese: "服",
        russian: "Одежда"
      },
      sports: {
        english: "Sports",
        french: "Sports",
        spanish: "Deportes", 
        german: "Sport",
        japanese: "スポーツ",
        russian: "Спорт"
      },
      household: {
        english: "Household Items",
        french: "Objets ménagers",
        spanish: "Artículos del hogar",
        german: "Haushaltsgegenstände", 
        japanese: "家庭用品",
        russian: "Предметы быта"
      }
    }

    const translatedCategoryName = categoryTranslations[randomCategory.id]?.[language] || randomCategory.name

    const categoryChallenge = {
      categoryId: randomCategory.id,
      categoryName: translatedCategoryName,
      englishName: randomCategory.name,
      language: language,
      challengeId: `coop-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }

    console.log(`✅ Generated cooperation category challenge:`, categoryChallenge)
    
    res.status(200).json({ 
      success: true, 
      category: categoryChallenge 
    })
  } catch (error) {
    console.error('Error generating cooperation category:', error)
    res.status(500).json({ 
      error: 'Failed to generate category challenge',
      message: error.message 
    })
  }
}