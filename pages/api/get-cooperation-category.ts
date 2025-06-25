import { NextApiRequest, NextApiResponse } from "next"
import { CATEGORIES, getCategoryInfo } from "../../lib/word-database"

// API endpoint for getting a random category for cooperation mode with enhanced error handling
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { language } = req.body

    console.log(`🎯 [COOPERATION-CATEGORY-API] Generating category for language: ${language}`)

    if (!language) {
      console.error('❌ [COOPERATION-CATEGORY-API] Missing language parameter')
      return res.status(400).json({ 
        error: 'Missing required parameter',
        message: 'Language is required' 
      })
    }

    if (!["french", "german", "russian", "japanese", "spanish"].includes(language)) {
      console.error(`❌ [COOPERATION-CATEGORY-API] Invalid language: ${language}`)
      return res.status(400).json({ 
        error: 'Invalid language',
        message: 'Language must be one of: french, german, russian, japanese, spanish' 
      })
    }

    // Get a random category
    const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
    console.log(`🎲 [COOPERATION-CATEGORY-API] Selected category: ${randomCategory.id}`)
    
    // Language-specific category names
    const categoryTranslations = {
      colors: {
        french: "Couleurs",
        spanish: "Colores", 
        german: "Farben",
        japanese: "色",
        russian: "Цвета"
      },
      animals: {
        french: "Animaux",
        spanish: "Animales",
        german: "Tiere", 
        japanese: "動物",
        russian: "Животные"
      },
      food: {
        french: "Nourriture",
        spanish: "Comida",
        german: "Essen",
        japanese: "食べ物", 
        russian: "Еда"
      },
      vehicles: {
        french: "Véhicules",
        spanish: "Vehículos",
        german: "Fahrzeuge",
        japanese: "乗り物",
        russian: "Транспорт"
      },
      clothing: {
        french: "Vêtements", 
        spanish: "Ropa",
        german: "Kleidung",
        japanese: "服",
        russian: "Одежда"
      },
      sports: {
        french: "Sports",
        spanish: "Deportes", 
        german: "Sport",
        japanese: "スポーツ",
        russian: "Спорт"
      },
      household: {
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

    console.log(`✅ [COOPERATION-CATEGORY-API] Generated category challenge:`, categoryChallenge)
    
    res.status(200).json({ 
      success: true, 
      category: categoryChallenge 
    })
  } catch (error) {
    console.error('❌ [COOPERATION-CATEGORY-API] Error generating category:', error)
    
    // Enhanced error response
    const errorResponse = {
      success: false,
      error: 'Failed to generate category challenge',
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack
    }

    res.status(500).json(errorResponse)
  }
}

// Export config for better error handling
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}