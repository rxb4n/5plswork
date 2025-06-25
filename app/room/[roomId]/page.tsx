"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SoundButton } from "@/components/ui/sound-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AudioSettings } from "@/components/audio-settings"
import { useAudio } from "@/lib/audio"
import { 
  Users, 
  Crown, 
  CheckCircle, 
  Clock, 
  Trophy, 
  Home, 
  Settings,
  Volume2,
  RotateCcw,
  BookOpen,
  Zap,
  Globe,
  RefreshCw
} from "lucide-react"
import { io, Socket } from "socket.io-client"

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
  game_mode: "practice" | "competition" | null
  host_language: "french" | "german" | "russian" | "japanese" | "spanish" | null
  winner_id?: string
  last_activity: Date
  created_at: Date
  question_count: number
  target_score: number
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

    newSocket.io.on("error", (error) => {
      console.error("❌ Socket.IO engine error:", error)
      setConnectionStatus('error')
      setConnectionError(`Engine error: ${error.message || error}`)
    })

    newSocket.on("error", (error) => {
      console.error("❌ Socket error:", error)
      if (error.message && error.message.includes("namespace")) {
        setConnectionError("Invalid namespace configuration")
        setError("Connection configuration error")
      } else {
        setConnectionError(`Socket error: ${error.message || error}`)
        setError(`Connection error: ${error.message || error}`)
      }
      setConnectionStatus('error')
    })

    setSocket(newSocket)

    return () => {
      if (newSocket) {
        newSocket.emit("leave-room", { roomId, playerId })
        newSocket.close()
      }
    }
  }, [roomId, playerId, playerName, isHost, router])

  // Add beforeunload event listener for cleanup
  useEffect(() => {
    if (!roomId || !playerId || !socket) return

    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      console.log("🚪 Page unload detected - cleaning up player from room")
      
      try {
        // Primary cleanup: API call with keepalive
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)

        fetch('/api/leave-room', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId,
            playerId,
            reason: 'page_unload'
          }),
          keepalive: true, // Ensures request survives page unload
          signal: controller.signal
        }).then(() => {
          clearTimeout(timeoutId)
          console.log("✅ Player removed via API call")
        }).catch((error) => {
          clearTimeout(timeoutId)
          console.warn("⚠️ API cleanup failed:", error.message)
        })

        // Secondary cleanup: Socket event (if still connected)
        if (socket && socket.connected) {
          socket.emit("leave-room", { roomId, playerId })
          console.log("✅ Leave room event sent via socket")
        }

      } catch (error) {
        console.error("❌ Error during beforeunload cleanup:", error)
      }

      // Don't prevent page unload
      return undefined
    }

    // Add beforeunload listener
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Add visibilitychange listener for additional cleanup
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && socket && socket.connected) {
        // Send activity ping when page becomes hidden
        socket.emit("room-activity-ping", { roomId, playerId })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [roomId, playerId, socket])

  // Update current player when room changes
  useEffect(() => {
    if (room && playerId) {
      const player = room.players.find(p => p.id === playerId)
      setCurrentPlayer(player || null)
    }
  }, [room, playerId])

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

  // 🔧 FIX #1: Auto-fetch question when game state changes to playing
  // Fixed to handle both practice and competition modes correctly
  useEffect(() => {
    if (room?.game_state === "playing" && !currentQuestion) {
      console.log("🎮 Game started, determining question language...")
      
      let questionLanguage: string | null = null
      
      if (room.game_mode === "practice") {
        // Practice mode: use player's individual language
        questionLanguage = currentPlayer?.language || null
        console.log("📚 Practice mode: using player language", questionLanguage)
      } else if (room.game_mode === "competition") {
        // Competition mode: use host's selected language
        questionLanguage = room.host_language || null
        console.log("🏆 Competition mode: using host language", questionLanguage)
      }
      
      if (questionLanguage) {
        console.log("✅ Fetching initial question for language:", questionLanguage)
        fetchNewQuestion(questionLanguage)
      } else {
        console.error("❌ No language available for question fetching")
      }
    }
  }, [room?.game_state, room?.game_mode, room?.host_language, currentPlayer?.language, currentQuestion, fetchNewQuestion])

  // Timer countdown
  useEffect(() => {
    if (room?.game_state === "playing" && currentQuestion && timeLeft > 0 && !isAnswering && !showFeedback) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && currentQuestion && !isAnswering && !showFeedback) {
      handleAnswer("")
    }
  }, [timeLeft, currentQuestion, isAnswering, room?.game_state, showFeedback])

  const handleGameModeSelect = (gameMode: "practice" | "competition") => {
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

  const handleHostLanguageChange = (language: string) => {
    if (!socket || !currentPlayer?.is_host) return

    socket.emit("update-host-language", {
      roomId,
      playerId,
      data: { hostLanguage: language }
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
    if (!socket) return

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
          
          // 🔧 FIX: Determine correct language for next question
          let nextQuestionLanguage: string | null = null
          
          if (room?.game_mode === "practice") {
            nextQuestionLanguage = currentPlayer?.language || null
          } else if (room?.game_mode === "competition") {
            nextQuestionLanguage = room?.host_language || null
          }
          
          if (nextQuestionLanguage && room?.game_state === "playing") {
            fetchNewQuestion(nextQuestionLanguage)
          }
        }, 2000)
      }
    })
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
      }
    })
  }

  const handleLeaveRoom = () => {
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center mobile-no-scroll">
        <div className="text-center mobile-padding">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="mobile-text-lg text-gray-600">
            {connectionStatus === 'connecting' ? 'Connecting to room...' : 'Loading room...'}
          </p>
          {connectionStatus === 'error' && (
            <div className="mt-4 mobile-spacing-sm">
              <p className="mobile-text-sm text-red-600">Connection failed. Please refresh the page.</p>
              {connectionError && (
                <p className="mobile-text-sm text-red-500 max-w-md mx-auto">
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
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center mobile-no-scroll">
        <Card className="w-full max-w-md mobile-container">
          <CardHeader className="mobile-padding">
            <CardTitle className="text-red-600 mobile-text-xl">Connection Error</CardTitle>
          </CardHeader>
          <CardContent className="mobile-spacing-md mobile-padding">
            <p className="text-gray-600 mobile-text-base">{error}</p>
            {connectionError && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="mobile-text-sm text-red-700 font-medium">Technical Details:</p>
                <p className="mobile-text-sm text-red-600 mt-1">{connectionError}</p>
              </div>
            )}
            <div className="mobile-spacing-sm">
              <SoundButton onClick={handleLeaveRoom} className="mobile-btn-md w-full">
                <Home className="h-4 w-4 mr-2" />
                Return Home
              </SoundButton>
              <SoundButton 
                onClick={() => window.location.reload()} 
                variant="outline" 
                className="mobile-btn-md w-full"
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
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center mobile-no-scroll">
        <Card className="w-full max-w-md mobile-container">
          <CardHeader className="mobile-padding">
            <CardTitle className="text-red-600 mobile-text-xl">Room Not Found</CardTitle>
          </CardHeader>
          <CardContent className="mobile-spacing-md mobile-padding">
            <p className="text-gray-600 mobile-text-base">The room you're looking for doesn't exist or has been closed.</p>
            <SoundButton onClick={handleLeaveRoom} className="mobile-btn-md w-full">
              <Home className="h-4 w-4 mr-2" />
              Return Home
            </SoundButton>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 mobile-no-scroll">
      <div className="mobile-container mobile-padding">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
          <div className="min-w-0">
            <h1 className="mobile-text-xl sm:text-2xl font-bold text-gray-900 break-all">
              <span className="hidden sm:inline">Room: </span>
              <span className="font-mono text-blue-600">{roomId}</span>
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <p className="text-gray-600 mobile-text-sm">
                {room.game_state === "lobby" && "Waiting for players..."}
                {room.game_state === "playing" && "Game in progress"}
                {room.game_state === "finished" && "Game finished!"}
              </p>
              {connectionStatus === 'connecting' && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 mobile-text-sm w-fit">
                  🔄 Reconnecting...
                </Badge>
              )}
              {connectionStatus === 'error' && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 mobile-text-sm w-fit">
                  ❌ Connection lost
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SoundButton
              onClick={() => setShowAudioSettings(!showAudioSettings)}
              variant="outline"
              className="mobile-btn-sm"
            >
              <Volume2 className="h-4 w-4" />
            </SoundButton>
            <SoundButton onClick={handleLeaveRoom} variant="outline" className="mobile-btn-sm">
              <Home className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Leave Room</span>
              <span className="sm:hidden">Leave</span>
            </SoundButton>
          </div>
        </div>

        <div className="mobile-grid-stack lg:grid-cols-3 lg:gap-6">
          {/* Main Game Area - Mobile Optimized */}
          <div className="lg:col-span-2 mobile-spacing-md">
            {/* Game Mode Selection */}
            {room.game_state === "lobby" && !room.game_mode && currentPlayer.is_host && (
              <Card className="mobile-card">
                <CardHeader className="mobile-padding">
                  <CardTitle className="mobile-text-xl">Choose Game Mode</CardTitle>
                  <CardDescription className="mobile-text-base">
                    Select how you want to play
                  </CardDescription>
                </CardHeader>
                <CardContent className="mobile-spacing-md mobile-padding">
                  <div className="mobile-grid-2col">
                    <SoundButton
                      onClick={() => handleGameModeSelect("practice")}
                      className="mobile-btn-lg h-auto py-6 flex-col gap-2"
                      variant="outline"
                    >
                      <BookOpen className="h-6 w-6 text-blue-600" />
                      <div className="text-center">
                        <div className="font-semibold mobile-text-base">Practice Mode</div>
                        <div className="mobile-text-sm text-gray-600">Individual languages</div>
                      </div>
                    </SoundButton>
                    
                    <SoundButton
                      onClick={() => handleGameModeSelect("competition")}
                      className="mobile-btn-lg h-auto py-6 flex-col gap-2"
                      variant="outline"
                    >
                      <Zap className="h-6 w-6 text-orange-600" />
                      <div className="text-center">
                        <div className="font-semibold mobile-text-base">Competition</div>
                        <div className="mobile-text-sm text-gray-600">Same language</div>
                      </div>
                    </SoundButton>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Competition Language Selection */}
            {room.game_state === "lobby" && room.game_mode === "competition" && currentPlayer.is_host && !room.host_language && (
              <Card className="mobile-card">
                <CardHeader className="mobile-padding">
                  <CardTitle className="mobile-text-xl">Select Competition Language</CardTitle>
                  <CardDescription className="mobile-text-base">
                    All players will compete in this language
                  </CardDescription>
                </CardHeader>
                <CardContent className="mobile-spacing-md mobile-padding">
                  <Select onValueChange={handleHostLanguageChange}>
                    <SelectTrigger className="mobile-input">
                      <SelectValue placeholder="Choose the competition language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value} className="mobile-text-base">
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {/* Game Setup */}
            {room.game_state === "lobby" && room.game_mode && (
              <Card className="mobile-card">
                <CardHeader className="mobile-padding">
                  <CardTitle className="flex items-center gap-2 mobile-text-xl">
                    {room.game_mode === "practice" ? (
                      <>
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        Practice Mode
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5 text-orange-600" />
                        Competition Mode
                      </>
                    )}
                    {currentPlayer.is_host && (
                      <SoundButton
                        onClick={handleChangeGameMode}
                        variant="outline"
                        className="mobile-btn-sm ml-auto"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Change Mode</span>
                        <span className="sm:hidden">Change</span>
                      </SoundButton>
                    )}
                  </CardTitle>
                  <CardDescription className="mobile-text-base">
                    Configure your settings and wait for all players to be ready
                  </CardDescription>
                </CardHeader>
                <CardContent className="mobile-spacing-md mobile-padding">
                  {/* Competition Language Display */}
                  {room.game_mode === "competition" && room.host_language && (
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 mb-4">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-orange-600" />
                        <span className="font-medium mobile-text-base">Competition Language:</span>
                        <Badge variant="outline" className="bg-orange-100 text-orange-700 mobile-text-sm">
                          {LANGUAGES.find(l => l.value === room.host_language)?.label}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Language Selection (Practice Mode Only) */}
                  {room.game_mode === "practice" && (
                    <div className="mobile-spacing-sm">
                      <label className="mobile-text-base font-medium">Choose Your Language</label>
                      <Select
                        value={currentPlayer.language || ""}
                        onValueChange={handleLanguageChange}
                      >
                        <SelectTrigger className="mobile-input">
                          <SelectValue placeholder="Select a language to learn" />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value} className="mobile-text-base">
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Target Score (Host Only) */}
                  {currentPlayer.is_host && (
                    <div className="mobile-spacing-sm">
                      <label className="mobile-text-base font-medium">Target Score</label>
                      <Select
                        value={room.target_score.toString()}
                        onValueChange={handleTargetScoreChange}
                      >
                        <SelectTrigger className="mobile-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TARGET_SCORES.map((score) => (
                            <SelectItem key={score} value={score.toString()} className="mobile-text-base">
                              {score} points
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Ready Button */}
                  <div className="mobile-flex-stack sm:flex-row sm:items-center gap-4">
                    <SoundButton
                      onClick={handleToggleReady}
                      disabled={
                        (room.game_mode === "practice" && !currentPlayer.language) ||
                        (room.game_mode === "competition" && !room.host_language) ||
                        connectionStatus !== 'connected'
                      }
                      variant={currentPlayer.ready ? "default" : "outline"}
                      className="mobile-btn-lg flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {currentPlayer.ready ? "Ready!" : "Mark as Ready"}
                    </SoundButton>
                    
                    {currentPlayer.is_host && (
                      <SoundButton
                        onClick={handleStartGame}
                        disabled={
                          !room.players.every(p => p.ready) ||
                          (room.game_mode === "practice" && !room.players.every(p => p.language)) ||
                          (room.game_mode === "competition" && !room.host_language) ||
                          connectionStatus !== 'connected'
                        }
                        className="mobile-btn-lg flex-1"
                      >
                        Start Game
                      </SoundButton>
                    )}
                  </div>

                  {/* Requirements Check */}
                  <div className="mobile-text-sm text-gray-600 mobile-spacing-sm">
                    <p className="font-medium mobile-text-base">Requirements to start:</p>
                    <ul className="mobile-spacing-sm ml-4">
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
                      <li className={room.players.every(p => p.ready) ? "text-green-600" : "text-red-600"}>
                        • All players must be ready
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Game State: Playing */}
            {room.game_state === "playing" && currentQuestion && (
              <Card className="mobile-card">
                <CardHeader className="mobile-padding">
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="mobile-text-xl">Translate this word:</span>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className={`font-mono mobile-text-lg ${timeLeft <= 3 ? "text-red-600" : ""}`}>
                        {timeLeft}s
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="mobile-spacing-md mobile-padding">
                  {/* Question */}
                  <div className="text-center">
                    <p className="mobile-text-3xl sm:text-3xl font-bold text-blue-600 mb-2 break-words">
                      {currentQuestion.english}
                    </p>
                    <p className="text-gray-600 mobile-text-base">
                      Translate to{" "}
                      {room.game_mode === "competition" && room.host_language
                        ? LANGUAGES.find(l => l.value === room.host_language)?.label
                        : LANGUAGES.find(l => l.value === currentPlayer.language)?.label}
                    </p>
                  </div>

                  {/* Timer Progress */}
                  <Progress value={(timeLeft / 10) * 100} className="h-2" />

                  {/* Answer Options - Mobile Optimized */}
                  <div className="mobile-grid-2col">
                    {currentQuestion.options.map((option, index) => (
                      <Button
                        key={index}
                        onClick={() => handleAnswer(option)}
                        disabled={isAnswering || timeLeft === 0 || connectionStatus !== 'connected' || showFeedback}
                        variant={getAnswerButtonStyle(option)}
                        className={`mobile-btn-lg mobile-text-lg transition-all duration-300 ${getAnswerButtonClasses(option)}`}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>

                  {/* 🔧 FIX #2: Fixed typo in variable name */}
                  {/* Feedback Display */}
                  {showFeedback && (
                    <div className="text-center">
                      {isCorrectAnswer ? (
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <CheckCircle className="h-6 w-6" />
                          <span className="mobile-text-xl font-bold">Correct! 🎉</span>
                        </div>
                      ) : (
                        <div className="mobile-spacing-sm">
                          <div className="flex items-center justify-center gap-2 text-red-600">
                            <span className="mobile-text-xl font-bold">❌ Incorrect</span>
                          </div>
                          <p className="text-gray-600 mobile-text-base">
                            Correct answer: <span className="font-bold text-green-600">{currentQuestion.correctAnswer}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {isAnswering && !showFeedback && (
                    <div className="text-center text-gray-600">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <span className="mobile-text-base">Processing answer...</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Game State: Finished */}
            {room.game_state === "finished" && (
              <Card className="mobile-card">
                <CardHeader className="mobile-padding">
                  <CardTitle className="flex items-center gap-2 mobile-text-xl">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    Game Finished!
                  </CardTitle>
                </CardHeader>
                <CardContent className="mobile-spacing-md mobile-padding">
                  {room.winner_id && (
                    <div className="text-center">
                      <p className="mobile-text-xl font-bold text-green-600 mb-2">
                        🎉 {room.players.find(p => p.id === room.winner_id)?.name} Wins!
                      </p>
                      <p className="text-gray-600 mobile-text-base">
                        Reached {room.target_score} points first
                      </p>
                    </div>
                  )}

                  {currentPlayer.is_host && (
                    <SoundButton 
                      onClick={handleRestart} 
                      className="mobile-btn-lg w-full"
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

          {/* Sidebar - Mobile Optimized */}
          <div className="mobile-spacing-md">
            {/* Audio Settings */}
            {showAudioSettings && <AudioSettings />}

            {/* Players List */}
            <Card className="mobile-card">
              <CardHeader className="mobile-padding">
                <CardTitle className="flex items-center gap-2 mobile-text-lg">
                  <Users className="h-5 w-5" />
                  Players ({room.players.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="mobile-spacing-sm mobile-padding">
                {room.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 border rounded-lg mobile-spacing-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {player.is_host && <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
                        <span className="font-medium mobile-text-base truncate">{player.name}</span>
                        {player.id === playerId && (
                          <Badge variant="secondary" className="mobile-text-sm flex-shrink-0">You</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {room.game_state === "lobby" && (
                        <>
                          {player.language && room.game_mode === "practice" && (
                            <Badge variant="outline" className="mobile-text-sm">
                              {LANGUAGES.find(l => l.value === player.language)?.label}
                            </Badge>
                          )}
                          {player.ready && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </>
                      )}
                      {(room.game_state === "playing" || room.game_state === "finished") && (
                        <Badge variant="secondary" className="mobile-text-sm">
                          {player.score} pts
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Game Info */}
            <Card className="mobile-card">
              <CardHeader className="mobile-padding">
                <CardTitle className="mobile-text-lg">Game Info</CardTitle>
              </CardHeader>
              <CardContent className="mobile-spacing-sm mobile-text-sm mobile-padding">
                <div className="flex justify-between">
                  <span>Target Score:</span>
                  <span className="font-medium">{room.target_score} points</span>
                </div>
                <div className="flex justify-between">
                  <span>Game Mode:</span>
                  <Badge variant="outline" className="mobile-text-sm">
                    {room.game_mode || "Selecting..."}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Game State:</span>
                  <Badge variant="outline" className="mobile-text-sm">
                    {room.game_state}
                  </Badge>
                </div>
                {room.game_state === "playing" && currentPlayer.score !== undefined && (
                  <div className="flex justify-between">
                    <span>Your Score:</span>
                    <span className="font-bold text-blue-600">{currentPlayer.score}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <Badge 
                    variant="outline" 
                    className={`mobile-text-sm ${
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
                  <div className="mt-2 p-2 bg-red-50 rounded mobile-text-sm">
                    <strong>Error:</strong> {connectionError}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}