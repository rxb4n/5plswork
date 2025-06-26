import { NextApiRequest, NextApiResponse } from "next"
import { WORD_DATABASE, getWordsByCategory } from "../../lib/word-database"

// API endpoint for validating cooperation mode answers with language-specific word tracking
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { categoryId, answer, language, usedWords = [] } = req.body

    if (!categoryId || !answer || !language) {
      return res.status(400).json({ error: 'Category ID, answer, and language are required' })
    }

    if (!["french", "german", "russian", "japanese", "spanish", "english"].includes(language)) {
      return res.status(400).json({ error: 'Invalid language' })
    }

    // Get all words in the category
    const categoryWords = getWordsByCategory(categoryId)
    
    if (categoryWords.length === 0) {
      return res.status(400).json({ error: 'Invalid category' })
    }

    // Normalize the answer for comparison (lowercase, trim)
    const normalizedAnswer = answer.toLowerCase().trim()
    
    // Check if the answer matches any word in the category for the given language
    const matchingWord = categoryWords.find(word => {
      const wordTranslation = word[language as keyof typeof word] as string
      return wordTranslation.toLowerCase().trim() === normalizedAnswer
    })

    if (!matchingWord) {
      return res.status(200).json({
        success: true,
        isCorrect: false,
        isUsed: false,
        message: `"${answer}" is not a valid ${categoryId.replace('_', ' ')} word in ${language}`,
        correctAnswer: null
      })
    }

    // Create language-specific word ID for tracking
    const languageSpecificWordId = `${matchingWord.id}_${language}`
    
    // Check if this specific language translation has already been used
    const isAlreadyUsed = usedWords.includes(languageSpecificWordId)

    if (isAlreadyUsed) {
      return res.status(200).json({
        success: true,
        isCorrect: true,
        isUsed: true,
        message: `"${answer}" has already been used in ${language}. Try a different word!`,
        correctAnswer: matchingWord,
        wordId: languageSpecificWordId
      })
    }

    return res.status(200).json({
      success: true,
      isCorrect: true,
      isUsed: false,
      message: `Correct! "${answer}" is a valid ${categoryId.replace('_', ' ')} word.`,
      correctAnswer: matchingWord,
      wordId: languageSpecificWordId
    })

  } catch (error) {
    console.error('Error validating cooperation answer:', error)
    res.status(500).json({ 
      error: 'Failed to validate answer',
      message: error.message 
    })
  }
}