import { NextApiRequest, NextApiResponse } from "next"
import { CATEGORIES, getCategoryInfo } from "../../../lib/word-database"

// API endpoint for starting cooperation mode with category validation
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests'
    })
  }

  try {
    const { roomId, language, categories: selectedCategories } = req.body

    console.log(`🤝 [COOPERATION] Starting cooperation mode for room ${roomId}`)
    console.log(`🌐 [COOPERATION] Language: ${language}`)
    console.log(`📂 [COOPERATION] Selected categories:`, selectedCategories)

    // Validate required parameters
    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: 'Missing room ID',
        message: 'Room ID is required to start cooperation mode'
      })
    }

    if (!language) {
      return res.status(400).json({
        success: false,
        error: 'Missing language',
        message: 'Language selection is required for cooperation mode'
      })
    }

    if (!["french", "german", "russian", "japanese", "spanish"].includes(language)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid language',
        message: `Language "${language}" is not supported. Supported languages: french, german, russian, japanese, spanish`
      })
    }

    // Validate categories if provided
    let categoriesToUse = CATEGORIES.map(cat => cat.id) // Default to all categories
    
    if (selectedCategories && Array.isArray(selectedCategories)) {
      // Validate that all selected categories exist
      const invalidCategories = selectedCategories.filter(catId => 
        !CATEGORIES.find(cat => cat.id === catId)
      )
      
      if (invalidCategories.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid categories',
          message: `Invalid categories: ${invalidCategories.join(', ')}. Available categories: ${CATEGORIES.map(c => c.id).join(', ')}`,
          invalidCategories,
          availableCategories: CATEGORIES.map(cat => ({ id: cat.id, name: cat.name }))
        })
      }
      
      if (selectedCategories.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No categories selected',
          message: 'At least one category must be selected for cooperation mode'
        })
      }
      
      categoriesToUse = selectedCategories
    }

    // Get a random category from the validated list
    const randomCategory = CATEGORIES.find(cat => 
      categoriesToUse.includes(cat.id)
    ) || CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]

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

    const cooperationSession = {
      roomId,
      language,
      availableCategories: categoriesToUse,
      currentCategory: {
        categoryId: randomCategory.id,
        categoryName: translatedCategoryName,
        englishName: randomCategory.name,
        language: language
      },
      sessionId: `coop-${roomId}-${Date.now()}`,
      startTime: new Date().toISOString(),
      challengeId: `challenge-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }

    console.log(`✅ [COOPERATION] Session created successfully:`, cooperationSession)
    
    res.status(200).json({ 
      success: true, 
      session: cooperationSession,
      message: 'Cooperation mode started successfully'
    })
  } catch (error) {
    console.error('❌ [COOPERATION] Error starting cooperation mode:', error)
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: 'Failed to start cooperation mode',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}