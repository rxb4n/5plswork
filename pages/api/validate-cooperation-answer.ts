import { NextApiRequest, NextApiResponse } from "next"
import { WORD_DATABASE, getWordsByCategory } from "../../lib/word-database"

// API endpoint for validating cooperation mode answers with enhanced error handling
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { categoryId, answer, language, usedWords = [] } = req.body

    console.log(`🔍 [COOPERATION-API] Validating answer: "${answer}" in ${language} for category ${categoryId}`)

    if (!categoryId || !answer || !language) {
      console.error('❌ [COOPERATION-API] Missing required parameters')
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'Category ID, answer, and language are required' 
      })
    }

    if (!["french", "german", "russian", "japanese", "spanish"].includes(language)) {
      console.error(`❌ [COOPERATION-API] Invalid language: ${language}`)
      return res.status(400).json({ 
        error: 'Invalid language',
        message: `Language must be one of: french, german, russian, japanese, spanish` 
      })
    }

    // Get all words in the category
    const categoryWords = getWordsByCategory(categoryId)
    
    if (categoryWords.length === 0) {
      console.error(`❌ [COOPERATION-API] Invalid category: ${categoryId}`)
      return res.status(400).json({ 
        error: 'Invalid category',
        message: `Category "${categoryId}" not found` 
      })
    }

    console.log(`📊 [COOPERATION-API] Found ${categoryWords.length} words in category ${categoryId}`)

    // Normalize the answer for comparison (lowercase, trim)
    const normalizedAnswer = answer.toLowerCase().trim()
    
    // Check if the answer matches any word in the category for the given language
    const matchingWord = categoryWords.find(word => {
      const wordTranslation = word[language as keyof typeof word] as string
      return wordTranslation.toLowerCase().trim() === normalizedAnswer
    })

    if (!matchingWord) {
      console.log(`❌ [COOPERATION-API] Answer "${answer}" not found in category ${categoryId} for language ${language}`)
      return res.status(200).json({
        success: true,
        isCorrect: false,
        isUsed: false,
        message: `"${answer}" is not a valid ${categoryId.replace('_', ' ')} word in ${language}`,
        correctAnswer: null
      })
    }

    // Check if the word has already been used
    const wordId = matchingWord.id
    const isAlreadyUsed = usedWords.includes(wordId)

    if (isAlreadyUsed) {
      console.log(`⚠️ [COOPERATION-API] Word "${answer}" (${wordId}) has already been used`)
      return res.status(200).json({
        success: true,
        isCorrect: true,
        isUsed: true,
        message: `"${answer}" has already been used. Try a different word!`,
        correctAnswer: matchingWord,
        wordId: wordId
      })
    }

    console.log(`✅ [COOPERATION-API] Correct answer: "${answer}" matches word ${wordId}`)

    return res.status(200).json({
      success: true,
      isCorrect: true,
      isUsed: false,
      message: `Correct! "${answer}" is a valid ${categoryId.replace('_', ' ')} word.`,
      correctAnswer: matchingWord,
      wordId: wordId
    })

  } catch (error) {
    console.error('❌ [COOPERATION-API] Error validating answer:', error)
    
    // Enhanced error response with more details
    const errorResponse = {
      success: false,
      error: 'Failed to validate answer',
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