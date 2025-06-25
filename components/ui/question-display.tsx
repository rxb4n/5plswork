"use client"

import React, { useState, useEffect } from 'react'
import { Button } from './button'
import { SoundButton } from './sound-button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Progress } from './progress'
import { Clock, CheckCircle, XCircle } from 'lucide-react'

interface Question {
  questionId: string
  english: string
  correctAnswer: string
  options: string[]
}

interface QuestionDisplayProps {
  question: Question
  timeLeft: number
  onAnswer: (answer: string, timeLeft: number, correctAnswer: string) => void
  disabled?: boolean
  gameMode?: 'practice' | 'competition' | 'cooperation'
}

interface AnswerFeedback {
  selectedAnswer: string
  correctAnswer: string
  isCorrect: boolean
  showFeedback: boolean
}

export function QuestionDisplay({ 
  question, 
  timeLeft, 
  onAnswer, 
  disabled = false,
  gameMode = 'practice'
}: QuestionDisplayProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("")
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(null)
  const [isAnswering, setIsAnswering] = useState(false)

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer("")
    setAnswerFeedback(null)
    setIsAnswering(false)
  }, [question.questionId])

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft <= 0 && !answerFeedback && !isAnswering) {
      handleAnswer("")
    }
  }, [timeLeft, answerFeedback, isAnswering])

  const handleAnswer = async (answer: string) => {
    if (isAnswering || answerFeedback) return

    setIsAnswering(true)
    setSelectedAnswer(answer)

    const isCorrect = answer === question.correctAnswer
    const isTimeout = timeLeft <= 0 || answer === ""

    // Show immediate feedback
    setAnswerFeedback({
      selectedAnswer: answer,
      correctAnswer: question.correctAnswer,
      isCorrect: isCorrect,
      showFeedback: true
    })

    console.log(`📝 [ANSWER] Submitting answer: "${answer}" (correct: ${isCorrect}, timeout: ${isTimeout})`)

    // Wait for feedback animation, then submit
    setTimeout(() => {
      onAnswer(answer, timeLeft, question.correctAnswer)
      setIsAnswering(false)
    }, 1500)
  }

  const getAnswerButtonClass = (option: string): string => {
    let baseClass = "answer-option"
    
    if (answerFeedback?.showFeedback) {
      if (option === answerFeedback.selectedAnswer) {
        baseClass += answerFeedback.isCorrect ? " correct" : " incorrect"
      } else if (option === answerFeedback.correctAnswer && !answerFeedback.isCorrect) {
        baseClass += " correct"
      }
    }
    
    return baseClass
  }

  const progressPercentage = (timeLeft / 10) * 100

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-xl font-bold">
            Translate to {gameMode === 'competition' ? 'the target language' : 'your selected language'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className={`font-mono text-lg font-bold ${timeLeft <= 3 ? 'text-red-600' : 'text-gray-700'}`}>
              {timeLeft}s
            </span>
          </div>
        </div>
        
        {/* Timer Progress Bar */}
        <Progress 
          value={progressPercentage} 
          className={`h-2 ${timeLeft <= 3 ? 'bg-red-100' : 'bg-gray-100'}`}
        />
        {timeLeft <= 3 && (
          <div className="text-red-600 text-sm font-medium text-center mt-1">
            Time running out!
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* English Word */}
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {question.english}
          </div>
          <div className="text-gray-600">
            Choose the correct translation:
          </div>
        </div>

        {/* Answer Options */}
        <div className="grid grid-cols-1 gap-3">
          {question.options.map((option, index) => (
            <SoundButton
              key={`${question.questionId}-${index}`}
              onClick={() => handleAnswer(option)}
              disabled={disabled || isAnswering || !!answerFeedback}
              className={getAnswerButtonClass(option)}
              variant="outline"
            >
              <span className="text-lg font-medium">{option}</span>
            </SoundButton>
          ))}
        </div>

        {/* Answer Feedback */}
        {answerFeedback?.showFeedback && (
          <div className="space-y-3">
            {answerFeedback.isCorrect ? (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Correct!</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span className="font-semibold">
                    {answerFeedback.selectedAnswer ? 'Incorrect' : 'Time\'s up!'}
                  </span>
                </div>
                
                {/* Show correct answer */}
                <div className="correct-answer-display">
                  <div className="text-sm font-medium mb-1">Correct answer:</div>
                  <div className="text-lg font-bold">{answerFeedback.correctAnswer}</div>
                </div>
              </div>
            )}

            {/* Loading next question indicator */}
            <div className="text-center text-gray-500 text-sm">
              <div className="loading-spinner mr-2"></div>
              Loading next question...
            </div>
          </div>
        )}

        {/* Game Mode Info */}
        <div className="text-xs text-gray-500 text-center pt-2 border-t">
          {gameMode === 'practice' && "Practice Mode: No penalties for wrong answers"}
          {gameMode === 'competition' && "Competition Mode: -5 points for wrong answers"}
          {gameMode === 'cooperation' && "Cooperation Mode: Work together to reach the target!"}
        </div>
      </CardContent>
    </Card>
  )
}