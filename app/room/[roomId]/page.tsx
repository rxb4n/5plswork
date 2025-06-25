"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SoundButton } from "@/components/ui/sound-button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AudioSettings } from "@/components/audio-settings"
import { useAudio } from "@/lib/audio"
import { Users, Crown, CheckCircle, Clock, Trophy, Home, Settings, Volume2, RotateCcw, BookOpen, Zap, Heart as HandHeart, Heart, Send, Timer } from "lucide-react"
import { io, Socket } from "socket.io-client"

interface Question {
  questionId: string
  english: string
  correctAnswer: string
  options: string[]
}

interface CooperationChallenge {
  categoryId: string
  categoryName: string
  englishName: string
  language: string
  challengeId: string
}

interface Player {
  id: string
  name: string
  language: "french" | "german" | "russian" | "japanese" | "spanish" | null
  ready: boolean
  score: number
  is_host: boolean
  current_question: Question | null
  last_seen: Date
}

interface Room {
  id: string
  players: Player[]
  game_state: "lobby" | "playing" | "finished"
  game_mode: "practice" | "competition" | "cooperation" | null
  host_language: "french" | "german" | "russian" | "japanese" | "spanish" | null
  winner_id?: string
  last_activity: Date
  created_at: Date
  question_count: number
  target_score: number
  // Cooperation mode fields
  cooperation_lives?: number
  cooperation_score?: number
  used_words?: string[]
  current_category?: string
  current_challenge_player?: string
}

const LANGUAGES = [
  { value: "french", label: "🇫🇷 French" },
  { value: "german", label: "🇩🇪 German" },
  { value: "russian", label: "🇷🇺 Russian" },
  { value: "japanese", label: "🇯🇵 Japanese" },
  { value: "spanish", label: "🇪🇸 Spanish" },
] as const

const TARGET_SCORES = [100, 250, 500]

export default function RoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const audio = useAudio()

  const roomId = params.roomId as string
  const playerId = searchParams.get("playerId")
  const playerName = searchParams.get("name")
  const isHost = searchParams.get("isHost") === "true"

  const [socket, setSocket] = useState<Socket | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [timeLeft, setTimeLeft] = useState(10)
  const [isAnswering, setIsAnswering] = useState(false)
  const [showAudioSettings, setShowAudioSettings] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  // Answer feedback state
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(false)

  // Cooperation mode state
  const [cooperationChallenge, setCooperationChallenge] = useState<CooperationChallenge | null>(null)
  const [cooperationAnswer, setCooperationAnswer] = useState("")
  const [cooperationTimeLeft, setCooperationTimeLeft] = useState(5)
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [cooperationFeedback, setCooperationFeedback] = useState<{
    message: string
    isCorrect: boolean
    isUsed: boolean
  } | null>(null)

  // Initialize socket and join room
  useEffect(() => {
    if (!playerId || !playerName) {
      setError("Missing player information")
      setIsLoading(false)
      return
    }

    console.log("🔌 Initializing room Socket.IO connection...")

    const newSocket = io({
      path: "/api/socketio",
      addTrailingSlash: false,
      transports: ["polling"],
      upgrade: false,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    })

    newSocket.on("connect", () => {
      console.log("✅ Connected to server successfully")
      setConnectionStatus('connected')
      setConnectionError(null)
      
      if (isHost) {
        newSocket.emit("create-room", {
          roomId,
          playerId,
          data: { targetScore: 100 }
        }, (response: any) => {
          if (response.error) {
            setError(response.error)
            setIsLoading(false)
          } else {
            joinRoom(newSocket)
          }
        })
      } else {
        joinRoom(newSocket)
      }
    })

    const joinRoom = (socketInstance: Socket) => {
      socketInstance.emit("join-room", {
        roomId,
        playerId,
        data: { name: playerName, isHost }
      }, (response: any) => {
        if (response.error) {
          setError(response.error)
          setIsLoading(false)
        } else {
          setRoom(response.room)
          setIsLoading(false)
        }
      })
    }

    newSocket.on("connection-success", (data) => {
      console.log("🎉 Connection success confirmed:", data)
      setConnectionStatus('connected')
      setConnectionError(null)
    })

    newSocket.on("namespace-error", (error) => {
      console.error("🚨 Namespace error:", error)
      setConnectionStatus('error')
      setConnectionError(`Namespace error: ${error.message}`)
      setError(`Connection error: ${error.message}`)
      setIsLoading(false)
    })

    newSocket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error)
      setConnectionStatus('error')
      setConnectionError(`Connection failed: ${error.message}`)
      setError("Failed to connect to server. Please try refreshing the page.")
    })

    newSocket.on("disconnect", (reason) => {
      console.log("🔌 Disconnected from server, reason:", reason)
      setConnectionStatus('connecting')
      setConnectionError(null)
    })

    newSocket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Reconnected after", attemptNumber, "attempts")
      setConnectionStatus('connected')
      setConnectionError(null)
    })

    newSocket.on("room-update", ({ room: updatedRoom }: { room: Room }) => {
      console.log("Room updated:", updatedRoom)
      setRoom(updatedRoom)
    })

    newSocket.on("host-left", () => {
      console.log("Host left the room, redirecting to home...")
      router.push("/")
    })

    newSocket.on("error", ({ message }: { message: string }) => {
      console.error("Socket error:", message)
      setError(message)
      
      if (message.includes("Room") || message.includes("closed")) {
        setTimeout(() => {
          router.push("/")
        }, 2000)
      }
    })

    // Cooperation mode event handlers
    newSocket.on("cooperation-challenge", ({ challenge }: { challenge: CooperationChallenge }) => {
      console.log("🤝 Received cooperation challenge:", challenge)
      setCooperationChallenge(challenge)
      setCooperationAnswer("")
      setCooperationTimeLeft(5)
      setCooperationFeedback(null)
    })

    newSocket.on("cooperation-feedback", ({ feedback }: { feedback: any }) => {
      console.log("🤝 Received cooperation feedback:", feedback)
      setCooperationFeedback(feedback)
      setIsSubmittingAnswer(false)
    })

    newSocket.on("cooperation-timeout", () => {
      console.log("⏰ Cooperation challenge timed out")
      setCooperationChallenge(null)
      setCooperationAnswer("")
      setCooperationFeedback(null)
    })

    setSocket(newSocket)

    return () => {
      if (newSocket) {
        newSocket.emit("leave-room", { roomId, playerId })
        newSocket.close()
      }
    }
  }, [roomId, playerId, playerName, isHost, router])

  // Update current player when room changes
  useEffect(() => {
    if (room && playerId) {
      const player = room.players.find(p => p.id === playerId)
      setCurrentPlayer(player || null)
    }
  }, [room, playerId])

  // Cooperation mode timer
  useEffect(() => {
    if (cooperationChallenge && cooperationTimeLeft > 0 && !isSubmittingAnswer && !cooperationFeedback) {
      const timer = setTimeout(() => {
        setCooperationTimeLeft(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (cooperationTimeLeft === 0 && cooperationChallenge && !isSubmittingAnswer && !cooperationFeedback) {
      // Time's up - handle timeout
      handleCooperationTimeout()
    }
  }, [cooperationTimeLeft, cooperationChallenge, isSubmittingAnswer, cooperationFeedback])

  // Fetch new question when game starts or after answering
  const fetchNewQuestion = useCallback(async (language: string) => {
    if (!language) return

    try {
      console.log("Fetching new question for language:", language)
      const response = await fetch("/api/get-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Question fetched:", data.question)
        setCurrentQuestion(data.question)
        setTimeLeft(10)
        setIsAnswering(false)
        setSelectedAnswer(null)
        setShowFeedback(false)
        setIsCorrectAnswer(false)
      } else {
        console.error("Failed to fetch question:", response.statusText)
      }
    } catch (error) {
      console.error("Error fetching question:", error)
    }
  }, [])

  // Auto-fetch question when game state changes to playing
  useEffect(() => {
    if (room?.game_state === "playing" && room?.game_mode !== "cooperation" && currentPlayer?.language && !currentQuestion) {
      console.log("Game started, fetching initial question...")
      fetchNewQuestion(currentPlayer.language)
    }
  }, [room?.game_state, room?.game_mode, currentPlayer?.language, currentQuestion, fetchNewQuestion])

  // Timer countdown for regular questions
  useEffect(() => {
    if (room?.game_state === "playing" && room?.game_mode !== "cooperation" && currentQuestion && timeLeft > 0 && !isAnswering && !showFeedback) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && currentQuestion && !isAnswering && !showFeedback && room?.game_mode !== "cooperation") {
      handleAnswer("")
    }
  }, [timeLeft, currentQuestion, isAnswering, room?.game_state, room?.game_mode, showFeedback])

  const handleGameModeChange = (gameMode: string) => {
    if (!socket || !currentPlayer?.is_host) return

    socket.emit("update-game-mode", {
      roomId,
      playerId,
      data: { gameMode }
    }, (response: any) => {
      if (response.error) {
        setError(response.error)
      }
    })
  }

  const handleChangeGameMode = () => {
    if (!socket || !currentPlayer?.is_host) return

    socket.emit("change-game-mode", { roomId, playerId }, (response: any) => {
      if (response.error) {
        setError(response.error)
      }
    })
  }

  const handleHostLanguageChange = (hostLanguage: string) => {
    if (!socket || !currentPlayer?.is_host) return

    socket.emit("update-host-language", {
      roomId,
      playerId,
      data: { hostLanguage }
    }, (response: any) => {
      if (response.error) {
        setError(response.error)
      }
    })
  }

  const handleLanguageChange = (language: string) => {
    if (!socket || !currentPlayer) return

    socket.emit("update-language", {
      roomId,
      playerId,
      data: { language }
    }, (response: any) => {
      if (response.error) {
        setError(response.error)
      }
    })
  }

  const handleToggleReady = () => {
    if (!socket || !currentPlayer) return

    socket.emit("toggle-ready", { roomId, playerId }, (response: any) => {
      if (response.error) {
        setError(response.error)
      }
    })
  }

  const handleTargetScoreChange = (targetScore: string) => {
    if (!socket || !currentPlayer?.is_host) return

    socket.emit("update-target-score", {
      roomId,
      playerId,
      data: { targetScore: parseInt(targetScore) }
    }, (response: any) => {
      if (response.error) {
        setError(response.error)
      }
    })
  }

  const handleStartGame = () => {
    if (!socket || !currentPlayer?.is_host) return

    socket.emit("start-game", { roomId, playerId }, (response: any) => {
      if (response.error) {
        setError(response.error)
      }
    })
  }

  const handleAnswer = (answer: string) => {
    if (!socket || !currentQuestion || isAnswering || showFeedback) return

    setIsAnswering(true)
    setSelectedAnswer(answer)
    
    const isCorrect = answer === currentQuestion.correctAnswer
    setIsCorrectAnswer(isCorrect)
    
    if (answer !== "") {
      if (isCorrect) {
        audio.playSuccess()
      } else {
        audio.playFailure()
      }
    }

    setShowFeedback(true)

    const isPracticeMode = room?.game_mode === "practice"

    socket.emit("answer", {
      roomId,
      playerId,
      data: {
        answer,
        timeLeft,
        correctAnswer: currentQuestion.correctAnswer,
        isPracticeMode
      }
    }, (response: any) => {
      if (response.error) {
        setError(response.error)
        setIsAnswering(false)
        setShowFeedback(false)
      } else {
        setTimeout(() => {
          setShowFeedback(false)
          setIsAnswering(false)
          setSelectedAnswer(null)
          
          if (currentPlayer?.language && room?.game_state === "playing") {
            fetchNewQuestion(currentPlayer.language)
          }
        }, 2000)
      }
    })
  }

  const handleCooperationAnswer = async () => {
    if (!cooperationAnswer.trim() || !cooperationChallenge || isSubmittingAnswer) return

    setIsSubmittingAnswer(true)

    try {
      const response = await fetch("/api/validate-cooperation-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: cooperationChallenge.categoryId,
          answer: cooperationAnswer.trim(),
          language: cooperationChallenge.language,
          usedWords: room?.used_words || []
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCooperationFeedback(data)

        if (data.isCorrect && !data.isUsed) {
          audio.playSuccess()
          // Emit success to server
          socket?.emit("cooperation-answer", {
            roomId,
            playerId,
            data: {
              challengeId: cooperationChallenge.challengeId,
              answer: cooperationAnswer.trim(),
              isCorrect: true,
              wordId: data.wordId
            }
          })
        } else {
          audio.playFailure()
        }

        // Clear challenge after feedback
        setTimeout(() => {
          setCooperationChallenge(null)
          setCooperationAnswer("")
          setCooperationFeedback(null)
        }, 3000)
      }
    } catch (error) {
      console.error("Error validating cooperation answer:", error)
      setCooperationFeedback({
        message: "Error validating answer. Please try again.",
        isCorrect: false,
        isUsed: false
      })
    }

    setIsSubmittingAnswer(false)
  }

  const handleCooperationTimeout = () => {
    if (!socket) return

    socket.emit("cooperation-timeout", {
      roomId,
      playerId,
      data: {
        challengeId: cooperationChallenge?.challengeId
      }
    })

    setCooperationChallenge(null)
    setCooperationAnswer("")
    setCooperationFeedback(null)
  }

  const getAnswerButtonStyle = (option: string) => {
    if (!showFeedback) {
      return "outline"
    }
    
    if (option === currentQuestion?.correctAnswer) {
      return "default"
    } else if (option === selectedAnswer && !isCorrectAnswer) {
      return "destructive"
    } else {
      return "outline"
    }
  }

  const getAnswerButtonClasses = (option: string) => {
    if (!showFeedback) return ""
    
    if (option === currentQuestion?.correctAnswer) {
      return "bg-green-500 hover:bg-green-600 text-white border-green-500"
    } else if (option === selectedAnswer && !isCorrectAnswer) {
      return "bg-red-500 hover:bg-red-600 text-white border-red-500"
    }
    return ""
  }

  const handleRestart = () => {
    if (!socket || !currentPlayer?.is_host) return

    socket.emit("restart", { roomId, playerId }, (response: any) => {
      if (response.error) {
        setError(response.error)
      } else {
        setCurrentQuestion(null)
        setTimeLeft(10)
        setIsAnswering(false)
        setSelectedAnswer(null)
        setShowFeedback(false)
        setIsCorrectAnswer(false)
        setCooperationChallenge(null)
        setCooperationAnswer("")
        setCooperationFeedback(null)
      }
    })
  }

  const handleLeaveRoom = () => {
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">
            {connectionStatus === 'connecting' ? 'Connecting to room...' : 'Loading room...'}
          </p>
          {connectionStatus === 'error' && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-red-600">Connection failed. Please refresh the page.</p>
              {connectionError && (
                <p className="text-xs text-red-500 max-w-md mx-auto">
                  {connectionError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Connection Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{error}</p>
            {connectionError && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-700 font-medium">Technical Details:</p>
                <p className="text-xs text-red-600 mt-1">{connectionError}</p>
              </div>
            )}
            <div className="space-y-2">
              <SoundButton onClick={handleLeaveRoom} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Return Home
              </SoundButton>
              <SoundButton 
                onClick={() => window.location.reload()} 
                variant="outline" 
                className="w-full"
              >
                🔄 Refresh Page
              </SoundButton>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!room || !currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Room Not Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">The room you're looking for doesn't exist or has been closed.</p>
            <SoundButton onClick={handleLeaveRoom} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Return Home
            </SoundButton>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Room: <span className="font-mono text-blue-600">{roomId}</span>
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-gray-600">
                {room.game_state === "lobby" && "Waiting for players..."}
                {room.game_state === "playing" && "Game in progress"}
                {room.game_state === "finished" && "Game finished!"}
              </p>
              {connectionStatus === 'connecting' && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  🔄 Reconnecting...
                </Badge>
              )}
              {connectionStatus === 'error' && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  ❌ Connection lost
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SoundButton
              onClick={() => setShowAudioSettings(!showAudioSettings)}
              variant="outline"
              size="sm"
            >
              <Volume2 className="h-4 w-4" />
            </SoundButton>
            <SoundButton onClick={handleLeaveRoom} variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Leave Room
            </SoundButton>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game State: Lobby */}
            {room.game_state === "lobby" && (
              <Card>
                <CardHeader>
                  <CardTitle>Game Setup</CardTitle>
                  <CardDescription>
                    Configure your settings and wait for all players to be ready
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Game Mode Selection (Host Only) */}
                  {currentPlayer.is_host && !room.game_mode && (
                    <div className="space-y-4">
                      <label className="text-sm font-medium">Choose Game Mode</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SoundButton
                          onClick={() => handleGameModeChange("practice")}
                          variant="outline"
                          className="h-auto p-4 flex flex-col items-center gap-2"
                        >
                          <BookOpen className="h-6 w-6 text-blue-600" />
                          <div className="text-center">
                            <p className="font-medium">Practice Mode</p>
                            <p className="text-xs text-gray-500">Individual languages, no penalties</p>
                          </div>
                        </SoundButton>
                        
                        <SoundButton
                          onClick={() => handleGameModeChange("competition")}
                          variant="outline"
                          className="h-auto p-4 flex flex-col items-center gap-2"
                        >
                          <Zap className="h-6 w-6 text-orange-600" />
                          <div className="text-center">
                            <p className="font-medium">Competition Mode</p>
                            <p className="text-xs text-gray-500">Same language, penalties apply</p>
                          </div>
                        </SoundButton>

                        <SoundButton
                          onClick={() => handleGameModeChange("cooperation")}
                          variant="outline"
                          className="h-auto p-4 flex flex-col items-center gap-2"
                        >
                          <HandHeart className="h-6 w-6 text-purple-600" />
                          <div className="text-center">
                            <p className="font-medium">Cooperation Mode</p>
                            <p className="text-xs text-gray-500">2 players, type words, share lives</p>
                          </div>
                        </SoundButton>
                      </div>
                    </div>
                  )}

                  {/* Game Mode Display */}
                  {room.game_mode && (
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {room.game_mode === "practice" && <BookOpen className="h-5 w-5 text-blue-600" />}
                        {room.game_mode === "competition" && <Zap className="h-5 w-5 text-orange-600" />}
                        {room.game_mode === "cooperation" && <HandHeart className="h-5 w-5 text-purple-600" />}
                        <div>
                          <p className="font-medium capitalize">{room.game_mode} Mode</p>
                          <p className="text-sm text-gray-600">
                            {room.game_mode === "practice" && "Individual language selection, no penalties"}
                            {room.game_mode === "competition" && "Same language for all players, penalties apply"}
                            {room.game_mode === "cooperation" && "2 players work together, type words by category"}
                          </p>
                        </div>
                      </div>
                      {currentPlayer.is_host && (
                        <SoundButton
                          onClick={handleChangeGameMode}
                          variant="outline"
                          size="sm"
                        >
                          Change
                        </SoundButton>
                      )}
                    </div>
                  )}

                  {/* Competition Mode Language Selection (Host Only) */}
                  {room.game_mode === "competition" && currentPlayer.is_host && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Competition Language</label>
                      <Select
                        value={room.host_language || ""}
                        onValueChange={handleHostLanguageChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select language for all players" />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Individual Language Selection (Practice & Cooperation) */}
                  {(room.game_mode === "practice" || room.game_mode === "cooperation") && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Your Language</label>
                      <Select
                        value={currentPlayer.language || ""}
                        onValueChange={handleLanguageChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your language" />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Target Score (Host Only, not for Cooperation) */}
                  {currentPlayer.is_host && room.game_mode && room.game_mode !== "cooperation" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Target Score</label>
                      <Select
                        value={room.target_score.toString()}
                        onValueChange={handleTargetScoreChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TARGET_SCORES.map((score) => (
                            <SelectItem key={score} value={score.toString()}>
                              {score} points
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Ready Button */}
                  <div className="flex items-center gap-4">
                    <SoundButton
                      onClick={handleToggleReady}
                      disabled={
                        !room.game_mode ||
                        (room.game_mode === "practice" && !currentPlayer.language) ||
                        (room.game_mode === "cooperation" && !currentPlayer.language) ||
                        (room.game_mode === "competition" && !room.host_language) ||
                        connectionStatus !== 'connected'
                      }
                      variant={currentPlayer.ready ? "default" : "outline"}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {currentPlayer.ready ? "Ready!" : "Mark as Ready"}
                    </SoundButton>
                    
                    {currentPlayer.is_host && (
                      <SoundButton
                        onClick={handleStartGame}
                        disabled={
                          !room.game_mode ||
                          !room.players.every(p => p.ready) ||
                          (room.game_mode === "cooperation" && room.players.length !== 2) ||
                          connectionStatus !== 'connected'
                        }
                        size="lg"
                        className="flex-1"
                      >
                        Start Game
                      </SoundButton>
                    )}
                  </div>

                  {/* Requirements Check */}
                  <div className="text-sm text-gray-600 space-y-1">
                    <p className="font-medium">Requirements to start:</p>
                    <ul className="space-y-1 ml-4">
                      <li className={room.game_mode ? "text-green-600" : "text-red-600"}>
                        • Game mode must be selected
                      </li>
                      {room.game_mode === "practice" && (
                        <li className={room.players.every(p => p.language) ? "text-green-600" : "text-red-600"}>
                          • All players must select a language
                        </li>
                      )}
                      {room.game_mode === "competition" && (
                        <li className={room.host_language ? "text-green-600" : "text-red-600"}>
                          • Host must select competition language
                        </li>
                      )}
                      {room.game_mode === "cooperation" && (
                        <>
                          <li className={room.players.length === 2 ? "text-green-600" : "text-red-600"}>
                            • Exactly 2 players required
                          </li>
                          <li className={room.players.every(p => p.language) ? "text-green-600" : "text-red-600"}>
                            • All players must select a language
                          </li>
                        </>
                      )}
                      <li className={room.players.every(p => p.ready) ? "text-green-600" : "text-red-600"}>
                        • All players must be ready
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Game State: Playing - Regular Modes */}
            {room.game_state === "playing" && room.game_mode !== "cooperation" && currentQuestion && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Translate this word:</span>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className={`font-mono ${timeLeft <= 3 ? "text-red-600" : ""}`}>
                        {timeLeft}s
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600 mb-2">
                      {currentQuestion.english}
                    </p>
                    <p className="text-gray-600">
                      Translate to {
                        room.game_mode === "competition" 
                          ? LANGUAGES.find(l => l.value === room.host_language)?.label
                          : LANGUAGES.find(l => l.value === currentPlayer.language)?.label
                      }
                    </p>
                  </div>

                  <Progress value={(timeLeft / 10) * 100} className="h-2" />

                  <div className="grid grid-cols-2 gap-3">
                    {currentQuestion.options.map((option, index) => (
                      <Button
                        key={index}
                        onClick={() => handleAnswer(option)}
                        disabled={isAnswering || timeLeft === 0 || connectionStatus !== 'connected' || showFeedback}
                        variant={getAnswerButtonStyle(option)}
                        className={`h-16 text-lg transition-all duration-300 ${getAnswerButtonClasses(option)}`}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>

                  {showFeedback && (
                    <div className="text-center">
                      {isCorrectAnswer ? (
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <CheckCircle className="h-6 w-6" />
                          <span className="text-xl font-bold">Correct! 🎉</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2 text-red-600">
                            <span className="text-xl font-bold">❌ Incorrect</span>
                          </div>
                          <p className="text-gray-600">
                            Correct answer: <span className="font-bold text-green-600">{currentQuestion.correctAnswer}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {isAnswering && !showFeedback && (
                    <div className="text-center text-gray-600">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      Processing answer...
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Game State: Playing - Cooperation Mode */}
            {room.game_state === "playing" && room.game_mode === "cooperation" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <HandHeart className="h-5 w-5 text-purple-600" />
                      Cooperation Challenge
                    </span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: room.cooperation_lives || 3 }).map((_, i) => (
                          <Heart key={i} className="h-4 w-4 text-red-500 fill-current" />
                        ))}
                      </div>
                      <Badge variant="secondary">Score: {room.cooperation_score || 0}</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {cooperationChallenge ? (
                    <>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600 mb-2">
                          {cooperationChallenge.categoryName}
                        </p>
                        <p className="text-gray-600">
                          Type a word in this category ({cooperationChallenge.language})
                        </p>
                      </div>

                      <div className="flex items-center justify-center">
                        <div className="flex items-center gap-2 text-lg font-mono">
                          <Timer className="h-5 w-5" />
                          <span className={cooperationTimeLeft <= 2 ? "text-red-600" : "text-gray-700"}>
                            {cooperationTimeLeft}s
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={cooperationAnswer}
                          onChange={(e) => setCooperationAnswer(e.target.value)}
                          placeholder="Type your answer..."
                          disabled={isSubmittingAnswer || cooperationFeedback !== null}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleCooperationAnswer()
                            }
                          }}
                          className="text-lg"
                        />
                        <SoundButton
                          onClick={handleCooperationAnswer}
                          disabled={!cooperationAnswer.trim() || isSubmittingAnswer || cooperationFeedback !== null}
                          className="px-6"
                        >
                          <Send className="h-4 w-4" />
                        </SoundButton>
                      </div>

                      {cooperationFeedback && (
                        <div className="text-center">
                          <div className={`flex items-center justify-center gap-2 ${
                            cooperationFeedback.isCorrect && !cooperationFeedback.isUsed 
                              ? "text-green-600" 
                              : "text-red-600"
                          }`}>
                            <span className="text-lg font-bold">
                              {cooperationFeedback.isCorrect && !cooperationFeedback.isUsed ? "✅" : "❌"}
                              {cooperationFeedback.message}
                            </span>
                          </div>
                        </div>
                      )}

                      {isSubmittingAnswer && (
                        <div className="text-center text-gray-600">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
                          Checking answer...
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="animate-pulse">
                        <HandHeart className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-700">Waiting for next challenge...</p>
                        <p className="text-sm text-gray-500">Get ready to type words!</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Game State: Finished */}
            {room.game_state === "finished" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    Game Finished!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {room.game_mode !== "cooperation" && room.winner_id && (
                    <div className="text-center">
                      <p className="text-xl font-bold text-green-600 mb-2">
                        🎉 {room.players.find(p => p.id === room.winner_id)?.name} Wins!
                      </p>
                      <p className="text-gray-600">
                        Reached {room.target_score} points first
                      </p>
                    </div>
                  )}

                  {room.game_mode === "cooperation" && (
                    <div className="text-center">
                      <p className="text-xl font-bold text-purple-600 mb-2">
                        🤝 Cooperation Challenge Complete!
                      </p>
                      <p className="text-lg text-gray-700 mb-4">
                        Final Score: <span className="font-bold">{room.cooperation_score || 0}</span> points
                      </p>
                      <div className="flex justify-center gap-2 mb-4">
                        {Array.from({ length: room.cooperation_lives || 0 }).map((_, i) => (
                          <Heart key={i} className="h-6 w-6 text-red-500 fill-current" />
                        ))}
                        {Array.from({ length: 3 - (room.cooperation_lives || 0) }).map((_, i) => (
                          <Heart key={i} className="h-6 w-6 text-gray-300" />
                        ))}
                      </div>
                      <p className="text-gray-600">
                        {(room.cooperation_lives || 0) > 0 
                          ? "Great teamwork! You completed the challenge with lives remaining." 
                          : "You ran out of lives. Try again to beat your score!"}
                      </p>
                    </div>
                  )}

                  {currentPlayer.is_host && (
                    <SoundButton 
                      onClick={handleRestart} 
                      className="w-full" 
                      size="lg"
                      disabled={connectionStatus !== 'connected'}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Start New Game
                    </SoundButton>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Audio Settings */}
            {showAudioSettings && <AudioSettings />}

            {/* Players List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Players ({room.players.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {room.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {player.is_host && <Crown className="h-4 w-4 text-yellow-500" />}
                        <span className="font-medium">{player.name}</span>
                        {player.id === playerId && (
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {room.game_state === "lobby" && (
                        <>
                          {player.language && (
                            <Badge variant="outline" className="text-xs">
                              {LANGUAGES.find(l => l.value === player.language)?.label}
                            </Badge>
                          )}
                          {player.ready && player.language && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </>
                      )}
                      {(room.game_state === "playing" || room.game_state === "finished") && room.game_mode !== "cooperation" && (
                        <Badge variant="secondary">
                          {player.score} pts
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Game Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Game Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Game Mode:</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {room.game_mode || "Not selected"}
                  </Badge>
                </div>
                {room.game_mode !== "cooperation" && (
                  <div className="flex justify-between">
                    <span>Target Score:</span>
                    <span className="font-medium">{room.target_score} points</span>
                  </div>
                )}
                {room.game_mode === "cooperation" && (
                  <>
                    <div className="flex justify-between">
                      <span>Team Lives:</span>
                      <div className="flex">
                        {Array.from({ length: room.cooperation_lives || 0 }).map((_, i) => (
                          <Heart key={i} className="h-4 w-4 text-red-500 fill-current" />
                        ))}
                        {Array.from({ length: 3 - (room.cooperation_lives || 0) }).map((_, i) => (
                          <Heart key={i} className="h-4 w-4 text-gray-300" />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span>Team Score:</span>
                      <span className="font-bold text-purple-600">{room.cooperation_score || 0}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span>Game State:</span>
                  <Badge variant="outline" className="text-xs">
                    {room.game_state}
                  </Badge>
                </div>
                {room.game_state === "playing" && currentPlayer.score !== undefined && room.game_mode !== "cooperation" && (
                  <div className="flex justify-between">
                    <span>Your Score:</span>
                    <span className="font-bold text-blue-600">{currentPlayer.score}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      connectionStatus === 'connected' ? 'bg-green-50 text-green-700 border-green-200' :
                      connectionStatus === 'connecting' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {connectionStatus === 'connected' ? '✅ Connected' :
                     connectionStatus === 'connecting' ? '🔄 Connecting' :
                     '❌ Disconnected'}
                  </Badge>
                </div>
                {connectionError && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-xs">
                    <strong>Error:</strong> {connectionError}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cooperation Mode Instructions */}
            {room.game_mode === "cooperation" && room.game_state === "playing" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HandHeart className="h-5 w-5 text-purple-600" />
                    How to Play
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>• You'll be shown random categories</p>
                  <p>• Type a word that belongs to the category in your language</p>
                  <p>• You have 5 seconds to answer each challenge</p>
                  <p>• If time runs out, you lose a life</p>
                  <p>• Your team shares 3 lives total</p>
                  <p>• Each correct answer earns 1 point</p>
                  <p>• You can't use the same word twice</p>
                  <p>• Work together to get the highest score!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}