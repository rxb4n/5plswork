"use client"

import React, { useState, useEffect } from 'react'
import { Badge } from './badge'
import { Crown, Trophy, Users } from 'lucide-react'

interface Player {
  id: string
  name: string
  score: number
  is_host: boolean
}

interface LeaderboardProps {
  players: Player[]
  currentPlayerId: string
  gameState: 'lobby' | 'playing' | 'finished'
  targetScore: number
}

interface ScoreChange {
  playerId: string
  oldScore: number
  newScore: number
  timestamp: number
}

export function Leaderboard({ players, currentPlayerId, gameState, targetScore }: LeaderboardProps) {
  const [scoreChanges, setScoreChanges] = useState<Map<string, ScoreChange>>(new Map())
  const [previousScores, setPreviousScores] = useState<Map<string, number>>(new Map())

  // Track score changes for animations
  useEffect(() => {
    const newScoreChanges = new Map<string, ScoreChange>()
    
    players.forEach(player => {
      const previousScore = previousScores.get(player.id) ?? player.score
      
      if (previousScore !== player.score) {
        newScoreChanges.set(player.id, {
          playerId: player.id,
          oldScore: previousScore,
          newScore: player.score,
          timestamp: Date.now()
        })
      }
    })

    if (newScoreChanges.size > 0) {
      setScoreChanges(newScoreChanges)
      
      // Clear animations after duration
      setTimeout(() => {
        setScoreChanges(new Map())
      }, 1000)
    }

    // Update previous scores
    const newPreviousScores = new Map<string, number>()
    players.forEach(player => {
      newPreviousScores.set(player.id, player.score)
    })
    setPreviousScores(newPreviousScores)
  }, [players, previousScores])

  // Sort players by score (descending) and then by name
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    return a.name.localeCompare(b.name)
  })

  // Don't show leaderboard in lobby state or if no players
  if (gameState === 'lobby' || players.length === 0) {
    return null
  }

  const getScoreChangeClass = (playerId: string): string => {
    const change = scoreChanges.get(playerId)
    if (!change) return ''
    
    if (change.newScore > change.oldScore) {
      return 'score-increase'
    } else if (change.newScore < change.oldScore) {
      return 'score-decrease'
    }
    return ''
  }

  const getPlayerRank = (index: number): string => {
    switch (index) {
      case 0: return '🥇'
      case 1: return '🥈'
      case 2: return '🥉'
      default: return `${index + 1}.`
    }
  }

  return (
    <div className="leaderboard-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          <h3 className="font-semibold text-sm">Leaderboard</h3>
        </div>
        {gameState === 'finished' && (
          <Trophy className="h-4 w-4 text-yellow-600" />
        )}
      </div>

      {/* Target Score Indicator */}
      <div className="mb-3 text-center">
        <Badge variant="outline" className="text-xs">
          Target: {targetScore} points
        </Badge>
      </div>

      {/* Players List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedPlayers.map((player, index) => {
          const isCurrentPlayer = player.id === currentPlayerId
          const scoreChangeClass = getScoreChangeClass(player.id)
          const isWinner = gameState === 'finished' && index === 0 && player.score >= targetScore
          
          return (
            <div
              key={player.id}
              className={`leaderboard-player ${isCurrentPlayer ? 'current-player' : ''}`}
            >
              {/* Rank and Name */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-medium text-gray-500 w-6 text-center">
                  {getPlayerRank(index)}
                </span>
                
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  {player.is_host && (
                    <Crown className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                  )}
                  {isWinner && (
                    <Trophy className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                  )}
                  
                  <span className={`player-name ${isCurrentPlayer ? 'font-semibold' : ''}`}>
                    {player.name}
                    {isCurrentPlayer && (
                      <span className="text-blue-600 ml-1">(You)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Score */}
              <div className={`player-score ${scoreChangeClass}`}>
                {player.score}
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress Indicator */}
      {gameState === 'playing' && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            First to {targetScore} wins!
          </div>
        </div>
      )}

      {/* Game Finished Indicator */}
      {gameState === 'finished' && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-center">
            <div className="font-semibold text-green-600">Game Finished!</div>
            {sortedPlayers[0] && sortedPlayers[0].score >= targetScore && (
              <div className="text-gray-600 mt-1">
                🎉 {sortedPlayers[0].name} wins!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}