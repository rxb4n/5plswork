"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SoundButton } from "@/components/ui/sound-button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { 
  Users, 
  Crown, 
  Settings, 
  Play, 
  RotateCcw, 
  LogOut, 
  Clock, 
  Trophy, 
  Target,
  BookOpen,
  Zap,
  Heart as HandHeart,
  Globe,
  Timer,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react"
import { io, Socket } from "socket.io-client"
import { playSuccessSound, playFailureSound } from "@/lib/audio"

interface Question {
  questionId: string
  english: string
  correctAnswer: string
  options: string[]
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
  // Cooperation mode specific fields
  cooperation_lives?: number
  cooperation_score?: number
  used_words?: string[]
  current_category?: string
  current_challenge_player?: string
}

interface CooperationChallenge {
  categoryId: string
  categoryName: string
  englishName: string
  language: string
  challengeId: string
}

const LANGUAGES = [
  { value: "french", label: "🇫🇷 French" },
  { value: "german", label: "🇩🇪 German" },
  { value: "russian", label: "🇷🇺 Russian" },
  { value: "japanese", label: "🇯🇵 Japanese" },
  { value: "spanish", label: "🇪🇸 Spanish" },
] as const

export default function RoomPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get("roomId") || ""
  const playerId = searchParams.get("playerId") || ""
  const playerName = searchParams.get("name") || ""
  const isHost = searchParams.get("isHost") === "true"

  const [socket, setSocket] = useState<Socket | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Game state
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string>("")
  const [timeLeft, setTimeLeft] = useState(10)
  const [isAnswering, setIsAnswering] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null)

  // Cooperation mode state
  const [cooperationChallenge, setCooperationChallenge] = useState<CooperationChallenge | null>(null)
  const [cooperationAnswer, setCooperationAnswer] = useState("")
  const [cooperationFeedback, setCooperationFeedback] = useState<string | null>(null)
  const [cooperationTimeout, setCooperationTimeout] = useState<NodeJS.Timeout | null>(null)
  const [cooperationTimeLeft, setCooperationTimeLeft] = useState(30)
  const [isCooperationWaiting, setIsCooperationWaiting] = useState(false)
  const [cooperationWaitingTimeout, setCooperationWaitingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [partnerTyping, setPartnerTyping] = useState("")
  const [showPartnerInput, setShowPartnerInput] = useState(true)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const activityPingRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize socket connection
  useEffect(() => {
    if (!roomId || !playerId || !playerName) {
      setError("Missing required parameters")
      setIsLoading(false)
      return
    }

    console.log("🔌 Initializing room connection...")
    
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
      autoConnect: true,
      rememberUpgrade: false,
    })

    newSocket.on("connect", () => {
      console.log("✅ Connected to server")
      setIsConnected(true)
      
      // Join the room
      newSocket.emit("join-room", {
        roomId,
        playerId,
        data: { name: playerName, isHost }
      }, (response: any) => {
        if (response.error) {
          console.error("❌ Failed to join room:", response.error)
          setError(response.error)
        } else {
          console.log("✅ Successfully joined room")
          setRoom(response.room)
        }
        setIsLoading(false)
      })
    })

    newSocket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error)
      setError("Failed to connect to server")
      setIsConnected(false)
      setIsLoading(false)
    })

    newSocket.on("room-update", ({ room: updatedRoom }: { room: Room }) => {
      console.log("📡 Room updated:", updatedRoom)
      setRoom(updatedRoom)
    })

    newSocket.on("cooperation-challenge", ({ challenge }: { challenge: CooperationChallenge }) => {
      console.log("🎯 Cooperation challenge received:", challenge)
      setCooperationChallenge(challenge)
      setCooperationAnswer("")
      setCooperationFeedback(null)
      setIsCooperationWaiting(false)
      setCooperationTimeLeft(30)
      
      // Clear any existing waiting timeout
      if (cooperationWaitingTimeout) {
        clearTimeout(cooperationWaitingTimeout)
        setCooperationWaitingTimeout(null)
      }

      // Start 30-second timer
      const timer = setInterval(() => {
        setCooperationTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            handleCooperationTimeout()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
      setCooperationTimeout(timer)
    })

    newSocket.on("cooperation-waiting", ({ isWaiting }: { isWaiting: boolean }) => {
      console.log("⏳ Cooperation waiting state:", isWaiting)
      setIsCooperationWaiting(isWaiting)
      
      if (isWaiting) {
        // Set 30-second timeout to return to lobby
        const timeout = setTimeout(() => {
          setError("Matching timed out. Returning to lobby...")
          setTimeout(() => {
            router.push("/")
          }, 2000)
        }, 30000)
        setCooperationWaitingTimeout(timeout)
      }
    })

    newSocket.on("cooperation-typing", ({ playerId: typingPlayerId, text }: { playerId: string, text: string }) => {
      if (typingPlayerId !== playerId) {
        setPartnerTyping(text)
      }
    })

    newSocket.on("host-left", () => {
      setError("Host has left the room")
      setTimeout(() => {
        router.push("/")
      }, 3000)
    })

    newSocket.on("error", ({ message }: { message: string }) => {
      console.error("❌ Socket error:", message)
      setError(message)
    })

    newSocket.on("disconnect", (reason) => {
      console.log("🔌 Disconnected:", reason)
      setIsConnected(false)
    })

    setSocket(newSocket)

    return () => {
      console.log("🔌 Cleaning up socket connection...")
      if (timerRef.current) clearInterval(timerRef.current)
      if (activityPingRef.current) clearInterval(activityPingRef.current)
      if (cooperationTimeout) clearTimeout(cooperationTimeout)
      if (cooperationWaitingTimeout) clearTimeout(cooperationWaitingTimeout)
      newSocket.close()
    }
  }, [roomId, playerId, playerName, isHost, router])

  // Set up activity ping
  useEffect(() => {
    if (socket && isConnected && roomId && playerId) {
      const pingInterval = setInterval(() => {
        socket.emit("room-activity-ping", { roomId, playerId })
      }, 30000) // Ping every 30 seconds

      activityPingRef.current = pingInterval

      return () => {
        if (pingInterval) clearInterval(pingInterval)
      }
    }
  }, [socket, isConnected, roomId, playerId])

  // Update current player when room changes
  useEffect(() => {
    if (room && playerId) {
      const player = room.players.find(p => p.id === playerId)
      setCurrentPlayer(player || null)
    }
  }, [room, playerId])

  // Handle cooperation answer typing
  const handleCooperationTyping = (text: string) => {
    setCooperationAnswer(text)
    
    // Emit typing event to other players
    if (socket && room?.game_mode === "cooperation") {
      socket.emit("cooperation-typing", {
        roomId,
        playerId,
        text
      })
    }
  }

  // Handle cooperation answer submission
  const handleCooperationSubmit = async () => {
    if (!cooperationAnswer.trim() || !cooperationChallenge || !currentPlayer) return

    try {
      const response = await fetch('/api/validate-cooperation-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: cooperationChallenge.categoryId,
          answer: cooperationAnswer.trim(),
          language: cooperationChallenge.language,
          usedWords: room?.used_words || []
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setCooperationFeedback(result.message)
        
        if (result.isCorrect && !result.isUsed) {
          playSuccessSound()
          
          // Clear timer
          if (cooperationTimeout) {
            clearTimeout(cooperationTimeout)
            setCooperationTimeout(null)
          }

          // Emit success to server
          socket?.emit("cooperation-answer", {
            roomId,
            playerId,
            data: {
              challengeId: cooperationChallenge.challengeId,
              answer: cooperationAnswer,
              isCorrect: true,
              wordId: result.wordId
            }
          })
        } else {
          playFailureSound()
        }
      }
    } catch (error) {
      console.error("Error validating cooperation answer:", error)
      setCooperationFeedback("Error validating answer")
    }
  }

  // Handle cooperation timeout
  const handleCooperationTimeout = () => {
    if (cooperationTimeout) {
      clearTimeout(cooperationTimeout)
      setCooperationTimeout(null)
    }

    setCooperationFeedback("Time's up! You lost a life.")
    playFailureSound()

    socket?.emit("cooperation-timeout", {
      roomId,
      playerId,
      data: { challengeId: cooperationChallenge?.challengeId }
    })
  }

  // Game mode handlers
  const handleUpdateGameMode = (gameMode: "practice" | "competition" | "cooperation") => {
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

    socket.emit("change-game-mode", {
      roomId,
      playerId
    }, (response: any) => {
      if (response.error) {
        setError(response.error)
      }
    })
  }

  const handleUpdateHostLanguage = (hostLanguage: string) => {
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

  const handleUpdateLanguage = (language: string) => {
    if (!socket) return

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
    if (!socket) return

    socket.emit("toggle-ready", {
      roomId,
      playerId
    }, (response: any) => {
      if (response.error) {
        setError(response.error)
      }
    })
  }

  const handleUpdateTargetScore = (targetScore: number) => {
    if (!socket || !currentPlayer?.is_host) return

    socket.emit("update-target-score", {
      roomId,
      playerId,
      data: { targetScore }
    }, (response: any) => {
      if (response.error) {
        setError(response.error)
      }
    })
  }

  const handleStartGame = () => {
    if (!socket || !currentPlayer?.is_host) return

    socket.emit("start-game", {
      roomId,
      playerId
    }, (response: any) => {
      if (response.error) {
        setError(response.error)
      }
    })
  }

  const handleRestart = () => {
    if (!socket || !currentPlayer?.is_host) return

    socket.emit("restart", {
      roomId,
      playerId
    }, (response: any) => {
      if (response.error) {
        setError(response.error)
      }
    })
  }

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit("leave-room", { roomId, playerId })
    }
    router.push("/")
  }

  // Generate question for practice/competition modes
  const generateQuestion = async (language: string) => {
    try {
      const response = await fetch('/api/get-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language })
      })

      if (response.ok) {
        const data = await response.json()
        return data.question
      }
    } catch (error) {
      console.error("Error generating question:", error)
    }
    return null
  }

  // Start question timer for practice/competition modes
  const startQuestionTimer = () => {
    setTimeLeft(10)
    setIsAnswering(true)
    setShowResult(false)
    setSelectedAnswer("")

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          handleAnswerSubmit("")
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Handle answer submission for practice/competition modes
  const handleAnswerSubmit = async (answer: string) => {
    if (!currentQuestion || !currentPlayer) return

    setIsAnswering(false)
    if (timerRef.current) clearInterval(timerRef.current)

    const isCorrect = answer === currentQuestion.correctAnswer
    setLastAnswerCorrect(isCorrect)
    setShowResult(true)

    if (isCorrect) {
      playSuccessSound()
    } else {
      playFailureSound()
    }

    // Submit answer to server
    socket?.emit("answer", {
      roomId,
      playerId,
      data: {
        answer,
        timeLeft,
        correctAnswer: currentQuestion.correctAnswer,
        isPracticeMode: room?.game_mode === "practice"
      }
    }, (response: any) => {
      if (response.error) {
        setError(response.error)
      }
    })

    // Generate next question after delay
    setTimeout(async () => {
      if (room?.game_state === "playing" && room?.game_mode !== "cooperation") {
        const language = room.game_mode === "competition" ? room.host_language : currentPlayer.language
        if (language) {
          const nextQuestion = await generateQuestion(language)
          if (nextQuestion) {
            setCurrentQuestion(nextQuestion)
            startQuestionTimer()
          }
        }
      }
    }, 3000)
  }

  // Start game logic
  useEffect(() => {
    if (room?.game_state === "playing" && !currentQuestion && room.game_mode !== "cooperation") {
      const initializeGame = async () => {
        if (!currentPlayer) return

        const language = room.game_mode === "competition" ? room.host_language : currentPlayer.language
        if (language) {
          const question = await generateQuestion(language)
          if (question) {
            setCurrentQuestion(question)
            startQuestionTimer()
          }
        }
      }

      initializeGame()
    }
  }, [room?.game_state, room?.game_mode, currentPlayer])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium">Connecting to room...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={() => router.push("/")} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!room || !currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium">Room not found</p>
          <Button onClick={() => router.push("/")} className="mt-4">
            Return to Home
          </Button>
        </div>
      </div>
    )
  }

  const isGameModeSelected = room.game_mode !== null
  const canStartGame = room.players.every(p => p.ready) && room.players.length > 0

  // Cooperation mode specific logic
  const isMyTurn = room.game_mode === "cooperation" && 
    cooperationChallenge && 
    currentPlayer.language === cooperationChallenge.language

  const partnerPlayer = room.game_mode === "cooperation" ? 
    room.players.find(p => p.id !== playerId) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 mobile-no-scroll">
      <div className="mobile-container mobile-padding">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h1 className="mobile-text-xl font-bold">Room {roomId}</h1>
            </div>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          <SoundButton
            onClick={handleLeaveRoom}
            variant="outline"
            className="mobile-btn-sm"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Leave
          </SoundButton>
        </div>

        {/* Game Rules Section - Always Visible in Lobby */}
        {room.game_state === "lobby" && (
          <Card className="mobile-card mb-6">
            <CardHeader className="mobile-padding">
              <CardTitle className="mobile-text-lg">Game Rules</CardTitle>
              <CardDescription className="mobile-text-base">
                Understand the rules before starting
              </CardDescription>
            </CardHeader>
            <CardContent className="mobile-spacing-sm mobile-text-sm mobile-padding">
              <div className="mobile-spacing-sm">
                <p className="font-medium mobile-text-base">🎯 Game Modes:</p>
                <div className="mobile-spacing-sm ml-4">
                  <div className="flex items-start gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-blue-600 mobile-text-sm">Practice Mode</p>
                      <p className="text-gray-600 mobile-text-sm">• Each player selects their own language</p>
                      <p className="text-gray-600 mobile-text-sm">• No point penalties for wrong answers</p>
                      <p className="text-gray-600 mobile-text-sm">• Perfect for learning and improvement</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-orange-600 mobile-text-sm">Competition Mode</p>
                      <p className="text-gray-600 mobile-text-sm">• Host selects one language for everyone</p>
                      <p className="text-gray-600 mobile-text-sm">• Wrong answers lose 5 points</p>
                      <p className="text-gray-600 mobile-text-sm">• First to reach target score wins</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <HandHeart className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-purple-600 mobile-text-sm">Cooperation Mode</p>
                      <p className="text-gray-600 mobile-text-sm">• Exactly 2 players required</p>
                      <p className="text-gray-600 mobile-text-sm">• Each player selects their language</p>
                      <p className="text-gray-600 mobile-text-sm">• Type words matching random categories</p>
                      <p className="text-gray-600 mobile-text-sm">• Share 3 lives, lose one on timeout</p>
                      <p className="text-gray-600 mobile-text-sm">• Only the player matching the category language can answer</p>
                      <p className="text-gray-600 mobile-text-sm">• See your partner's typing in real-time</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mobile-spacing-sm">
                <p className="font-medium mobile-text-base">⏱️ Timing:</p>
                <ul className="mobile-spacing-sm text-gray-600 ml-4">
                  <li className="mobile-text-sm">• Practice/Competition: 10 seconds per question</li>
                  <li className="mobile-text-sm">• Cooperation: 30 seconds per category challenge</li>
                  <li className="mobile-text-sm">• Points awarded based on remaining time</li>
                </ul>
              </div>

              <div className="mobile-spacing-sm">
                <p className="font-medium mobile-text-base">🌍 Languages Available:</p>
                <div className="mobile-flex-wrap">
                  {LANGUAGES.map((lang) => (
                    <Badge key={lang.value} variant="outline" className="mobile-text-sm">
                      {lang.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mobile-grid-stack lg:grid-cols-3 lg:gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-2 mobile-spacing-md">
            {/* Game State Display */}
            {room.game_state === "lobby" && (
              <Card className="mobile-card">
                <CardHeader className="mobile-padding">
                  <CardTitle className="mobile-text-xl">Game Setup</CardTitle>
                  <CardDescription className="mobile-text-base">
                    Configure your game settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="mobile-spacing-md mobile-padding">
                  {/* Game Mode Selection */}
                  {!isGameModeSelected && currentPlayer.is_host && (
                    <div className="mobile-spacing-sm">
                      <h3 className="font-medium mobile-text-base mb-3">Select Game Mode</h3>
                      <div className="mobile-grid-stack sm:grid-cols-3 gap-3">
                        <SoundButton
                          onClick={() => handleUpdateGameMode("practice")}
                          variant="outline"
                          className="mobile-btn-md h-auto p-4 flex-col"
                        >
                          <BookOpen className="h-6 w-6 mb-2 text-blue-600" />
                          <span className="font-medium">Practice</span>
                          <span className="text-xs text-gray-500">Individual languages</span>
                        </SoundButton>
                        <SoundButton
                          onClick={() => handleUpdateGameMode("competition")}
                          variant="outline"
                          className="mobile-btn-md h-auto p-4 flex-col"
                        >
                          <Zap className="h-6 w-6 mb-2 text-orange-600" />
                          <span className="font-medium">Competition</span>
                          <span className="text-xs text-gray-500">Same language</span>
                        </SoundButton>
                        <SoundButton
                          onClick={() => handleUpdateGameMode("cooperation")}
                          variant="outline"
                          className="mobile-btn-md h-auto p-4 flex-col"
                          disabled={room.players.length !== 2}
                        >
                          <HandHeart className="h-6 w-6 mb-2 text-purple-600" />
                          <span className="font-medium">Cooperation</span>
                          <span className="text-xs text-gray-500">2 players only</span>
                        </SoundButton>
                      </div>
                      {room.players.length !== 2 && (
                        <p className="text-sm text-gray-500 mt-2">
                          Cooperation mode requires exactly 2 players
                        </p>
                      )}
                    </div>
                  )}

                  {/* Game Mode Selected */}
                  {isGameModeSelected && (
                    <div className="mobile-spacing-md">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          {room.game_mode === "practice" && <BookOpen className="h-5 w-5 text-blue-600" />}
                          {room.game_mode === "competition" && <Zap className="h-5 w-5 text-orange-600" />}
                          {room.game_mode === "cooperation" && <HandHeart className="h-5 w-5 text-purple-600" />}
                          <span className="font-medium mobile-text-lg capitalize">{room.game_mode} Mode</span>
                        </div>
                        {currentPlayer.is_host && (
                          <SoundButton
                            onClick={handleChangeGameMode}
                            variant="outline"
                            className="mobile-btn-sm"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Change
                          </SoundButton>
                        )}
                      </div>

                      {/* Competition Mode Language Selection */}
                      {room.game_mode === "competition" && currentPlayer.is_host && (
                        <div className="mobile-spacing-sm">
                          <label className="block mobile-text-base font-medium mb-2">
                            Competition Language
                          </label>
                          <Select value={room.host_language || ""} onValueChange={handleUpdateHostLanguage}>
                            <SelectTrigger className="mobile-input">
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

                      {/* Target Score Selection */}
                      {room.game_mode !== "cooperation" && currentPlayer.is_host && (
                        <div className="mobile-spacing-sm">
                          <label className="block mobile-text-base font-medium mb-2">
                            Target Score
                          </label>
                          <Select value={room.target_score.toString()} onValueChange={(value) => handleUpdateTargetScore(Number(value))}>
                            <SelectTrigger className="mobile-input">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="100">100 points</SelectItem>
                              <SelectItem value="250">250 points</SelectItem>
                              <SelectItem value="500">500 points</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Individual Language Selection */}
                      {(room.game_mode === "practice" || room.game_mode === "cooperation") && (
                        <div className="mobile-spacing-sm">
                          <label className="block mobile-text-base font-medium mb-2">
                            Your Language
                          </label>
                          <Select value={currentPlayer.language || ""} onValueChange={handleUpdateLanguage}>
                            <SelectTrigger className="mobile-input">
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

                      {/* Ready Button */}
                      <div className="mobile-spacing-sm">
                        <SoundButton
                          onClick={handleToggleReady}
                          className={`mobile-btn-lg w-full ${currentPlayer.ready ? 'bg-green-600 hover:bg-green-700' : ''}`}
                          disabled={
                            (room.game_mode === "practice" || room.game_mode === "cooperation") && !currentPlayer.language ||
                            room.game_mode === "competition" && !room.host_language
                          }
                        >
                          {currentPlayer.ready ? (
                            <>
                              <CheckCircle className="h-5 w-5 mr-2" />
                              Ready!
                            </>
                          ) : (
                            <>
                              <Clock className="h-5 w-5 mr-2" />
                              Mark as Ready
                            </>
                          )}
                        </SoundButton>
                      </div>

                      {/* Start Game Button */}
                      {currentPlayer.is_host && (
                        <SoundButton
                          onClick={handleStartGame}
                          className="mobile-btn-lg w-full"
                          disabled={!canStartGame}
                        >
                          <Play className="h-5 w-5 mr-2" />
                          Start Game
                        </SoundButton>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Playing State */}
            {room.game_state === "playing" && (
              <Card className="mobile-card">
                <CardHeader className="mobile-padding">
                  <CardTitle className="flex items-center gap-2 mobile-text-xl">
                    {room.game_mode === "practice" && <BookOpen className="h-5 w-5 text-blue-600" />}
                    {room.game_mode === "competition" && <Zap className="h-5 w-5 text-orange-600" />}
                    {room.game_mode === "cooperation" && <HandHeart className="h-5 w-5 text-purple-600" />}
                    {room.game_mode === "cooperation" ? "Cooperation Challenge" : "Quiz Question"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="mobile-spacing-md mobile-padding">
                  {/* Cooperation Mode */}
                  {room.game_mode === "cooperation" && (
                    <>
                      {/* Cooperation Waiting State */}
                      {isCooperationWaiting && (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                          <p className="mobile-text-lg font-medium mb-2">Matching players...</p>
                          <p className="mobile-text-sm text-gray-600">Finding the perfect challenge for your team</p>
                          <div className="mt-4">
                            <Progress value={((30000 - (cooperationWaitingTimeout ? 30000 : 0)) / 30000) * 100} className="w-full" />
                            <p className="mobile-text-sm text-gray-500 mt-2">Timeout in 30 seconds</p>
                          </div>
                        </div>
                      )}

                      {/* Cooperation Challenge */}
                      {cooperationChallenge && !isCooperationWaiting && (
                        <div className="mobile-spacing-md">
                          {/* Lives and Score */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <HandHeart className="h-5 w-5 text-red-500" />
                              <span className="mobile-text-base font-medium">
                                Lives: {room.cooperation_lives || 3}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Trophy className="h-5 w-5 text-yellow-500" />
                              <span className="mobile-text-base font-medium">
                                Score: {room.cooperation_score || 0}
                              </span>
                            </div>
                          </div>

                          {/* Timer */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="mobile-text-base font-medium">Time Remaining</span>
                              <span className="mobile-text-lg font-bold text-red-600">
                                {cooperationTimeLeft}s
                              </span>
                            </div>
                            <Progress value={(cooperationTimeLeft / 30) * 100} className="w-full" />
                          </div>

                          {/* Challenge Display */}
                          <div className="text-center mb-6">
                            <div className="mb-4">
                              <Badge variant="outline" className="mobile-text-sm mb-2">
                                <Globe className="h-3 w-3 mr-1" />
                                {LANGUAGES.find(l => l.value === cooperationChallenge.language)?.label}
                              </Badge>
                            </div>
                            <h3 className="mobile-text-2xl font-bold mb-2">
                              {cooperationChallenge.categoryName}
                            </h3>
                            <p className="mobile-text-base text-gray-600">
                              Type a word that belongs to this category
                            </p>
                          </div>

                          {/* Turn Indicator */}
                          <div className="mb-4 p-3 rounded-lg border">
                            {isMyTurn ? (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-5 w-5" />
                                <span className="font-medium">Your turn! Type your answer below.</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-blue-600">
                                <Clock className="h-5 w-5" />
                                <span className="font-medium">
                                  Waiting for {partnerPlayer?.name} to answer...
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Answer Input */}
                          <div className="mobile-spacing-sm">
                            <div className="flex gap-2">
                              <Input
                                value={cooperationAnswer}
                                onChange={(e) => handleCooperationTyping(e.target.value)}
                                placeholder={isMyTurn ? "Type your answer..." : "Watch your partner type..."}
                                disabled={!isMyTurn}
                                className="mobile-input flex-1"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && isMyTurn) {
                                    handleCooperationSubmit()
                                  }
                                }}
                              />
                              <SoundButton
                                onClick={handleCooperationSubmit}
                                disabled={!isMyTurn || !cooperationAnswer.trim()}
                                className="mobile-btn-md"
                              >
                                Submit
                              </SoundButton>
                            </div>

                            {/* Partner Typing Indicator */}
                            {!isMyTurn && partnerTyping && showPartnerInput && (
                              <div className="mt-2 p-2 bg-blue-50 rounded border">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Eye className="h-4 w-4 text-blue-600" />
                                    <span className="mobile-text-sm text-blue-600 font-medium">
                                      {partnerPlayer?.name} is typing:
                                    </span>
                                  </div>
                                  <SoundButton
                                    onClick={() => setShowPartnerInput(false)}
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                  >
                                    <EyeOff className="h-3 w-3" />
                                  </SoundButton>
                                </div>
                                <p className="mobile-text-base font-mono mt-1">"{partnerTyping}"</p>
                              </div>
                            )}

                            {!showPartnerInput && !isMyTurn && (
                              <SoundButton
                                onClick={() => setShowPartnerInput(true)}
                                variant="outline"
                                className="mt-2 mobile-btn-sm"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Show partner's typing
                              </SoundButton>
                            )}
                          </div>

                          {/* Feedback */}
                          {cooperationFeedback && (
                            <div className="mt-4 p-3 rounded-lg border bg-gray-50">
                              <p className="mobile-text-base">{cooperationFeedback}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Practice/Competition Mode */}
                  {room.game_mode !== "cooperation" && currentQuestion && (
                    <div className="mobile-spacing-md">
                      {/* Timer */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="mobile-text-base font-medium">Time Remaining</span>
                          <span className="mobile-text-lg font-bold text-red-600">{timeLeft}s</span>
                        </div>
                        <Progress value={(timeLeft / 10) * 100} className="w-full" />
                      </div>

                      {/* Question */}
                      <div className="text-center mb-6">
                        <h3 className="mobile-text-2xl font-bold mb-4">
                          Translate: "{currentQuestion.english}"
                        </h3>
                        <Badge variant="outline" className="mobile-text-sm">
                          <Globe className="h-3 w-3 mr-1" />
                          {room.game_mode === "competition" 
                            ? LANGUAGES.find(l => l.value === room.host_language)?.label
                            : LANGUAGES.find(l => l.value === currentPlayer.language)?.label
                          }
                        </Badge>
                      </div>

                      {/* Answer Options */}
                      {!showResult && isAnswering && (
                        <div className="mobile-grid-stack sm:grid-cols-2 gap-3">
                          {currentQuestion.options.map((option, index) => (
                            <SoundButton
                              key={index}
                              onClick={() => {
                                setSelectedAnswer(option)
                                handleAnswerSubmit(option)
                              }}
                              variant="outline"
                              className="mobile-btn-lg p-4 h-auto"
                              disabled={!isAnswering}
                            >
                              {option}
                            </SoundButton>
                          ))}
                        </div>
                      )}

                      {/* Result */}
                      {showResult && (
                        <div className="text-center">
                          {lastAnswerCorrect ? (
                            <div className="text-green-600">
                              <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                              <p className="mobile-text-lg font-bold">Correct!</p>
                              <p className="mobile-text-base">+{Math.max(1, Math.round(10 - (10 - timeLeft)))} points</p>
                            </div>
                          ) : (
                            <div className="text-red-600">
                              <XCircle className="h-12 w-12 mx-auto mb-2" />
                              <p className="mobile-text-lg font-bold">Incorrect</p>
                              <p className="mobile-text-base">
                                Correct answer: {currentQuestion.correctAnswer}
                              </p>
                              {room.game_mode === "competition" && (
                                <p className="mobile-text-sm">-5 points</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Finished State */}
            {room.game_state === "finished" && (
              <Card className="mobile-card">
                <CardHeader className="mobile-padding">
                  <CardTitle className="mobile-text-xl">Game Finished!</CardTitle>
                </CardHeader>
                <CardContent className="mobile-spacing-md mobile-padding">
                  <div className="text-center">
                    <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
                    
                    {room.game_mode === "cooperation" ? (
                      <div>
                        <h3 className="mobile-text-2xl font-bold mb-2">
                          Final Score: {room.cooperation_score || 0}
                        </h3>
                        <p className="mobile-text-base text-gray-600 mb-4">
                          {(room.cooperation_lives || 0) > 0 
                            ? "Great teamwork! You survived the challenge."
                            : "Game over! Better luck next time."
                          }
                        </p>
                      </div>
                    ) : room.winner_id ? (
                      <div>
                        <h3 className="mobile-text-2xl font-bold mb-2">
                          {room.players.find(p => p.id === room.winner_id)?.name} Wins!
                        </h3>
                        <p className="mobile-text-base text-gray-600 mb-4">
                          Reached {room.target_score} points
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h3 className="mobile-text-2xl font-bold mb-2">Game Complete</h3>
                        <p className="mobile-text-base text-gray-600 mb-4">
                          Thanks for playing!
                        </p>
                      </div>
                    )}

                    {currentPlayer.is_host && (
                      <SoundButton
                        onClick={handleRestart}
                        className="mobile-btn-lg"
                      >
                        <RotateCcw className="h-5 w-5 mr-2" />
                        Play Again
                      </SoundButton>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="mobile-spacing-md">
            {/* Players List */}
            <Card className="mobile-card">
              <CardHeader className="mobile-padding">
                <CardTitle className="flex items-center gap-2 mobile-text-lg">
                  <Users className="h-5 w-5" />
                  Players ({room.players.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="mobile-padding">
                <div className="mobile-spacing-sm">
                  {room.players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {player.is_host && <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium mobile-text-base truncate">
                            {player.name}
                            {player.id === playerId && " (You)"}
                          </p>
                          {player.language && (
                            <p className="mobile-text-sm text-gray-500">
                              {LANGUAGES.find(l => l.value === player.language)?.label}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {room.game_state !== "lobby" && (
                          <Badge variant="outline" className="mobile-text-sm">
                            {player.score}
                          </Badge>
                        )}
                        {room.game_state === "lobby" && (
                          <Badge variant={player.ready ? "default" : "outline"} className="mobile-text-sm">
                            {player.ready ? "Ready" : "Not Ready"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Game Info */}
            {room.game_state !== "lobby" && (
              <Card className="mobile-card">
                <CardHeader className="mobile-padding">
                  <CardTitle className="mobile-text-lg">Game Info</CardTitle>
                </CardHeader>
                <CardContent className="mobile-spacing-sm mobile-padding">
                  <div className="mobile-spacing-sm">
                    <div className="flex items-center justify-between">
                      <span className="mobile-text-base">Mode:</span>
                      <Badge variant="outline" className="mobile-text-sm capitalize">
                        {room.game_mode}
                      </Badge>
                    </div>
                    
                    {room.game_mode !== "cooperation" && (
                      <div className="flex items-center justify-between">
                        <span className="mobile-text-base">Target:</span>
                        <span className="mobile-text-base font-medium">{room.target_score}</span>
                      </div>
                    )}

                    {room.game_mode === "cooperation" && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="mobile-text-base">Lives:</span>
                          <span className="mobile-text-base font-medium">{room.cooperation_lives || 3}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="mobile-text-base">Score:</span>
                          <span className="mobile-text-base font-medium">{room.cooperation_score || 0}</span>
                        </div>
                      </>
                    )}

                    {room.host_language && (
                      <div className="flex items-center justify-between">
                        <span className="mobile-text-base">Language:</span>
                        <span className="mobile-text-base font-medium">
                          {LANGUAGES.find(l => l.value === room.host_language)?.label}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}