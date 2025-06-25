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
  Gamepad2,
  Target,
  BookOpen,
  Zap,
  AlertTriangle,
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

  // Inactivity warning state
  const [inactivityWarning, setInactivityWarning] = useState<{
    show: boolean
    message: string
    countdown: number
  }>({ show: false, message: "", countdown: 0 })

  // NEW: Game mode transition state
  const [gameModeTransition, setGameModeTransition] = useState<{
    show: boolean
    message: string
    newMode: string
  }>({ show: false, message: "", newMode: "" })

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

    // Handle inactivity warnings
    newSocket.on("room-warning", (warning) => {
      console.log("⚠️ Received room warning:", warning)
      if (warning.type === "inactivity_warning") {
        setInactivityWarning({
          show: true,
          message: warning.message,
          countdown: warning.countdown
        })
        
        setTimeout(() => {
          setInactivityWarning(prev => ({ ...prev, show: false }))
        }, warning.countdown * 1000)
      }
    })

    // Handle room closure
    newSocket.on("room-closed", (data) => {
      console.log("🚨 Room closed:", data)
      setError(`Room closed: ${data.message}`)
      setTimeout(() => {
        router.push("/")
      }, 3000)
    })

    // Handle forced disconnection
    newSocket.on("force-disconnect", (data) => {
      console.log("🚨 Forced disconnect:", data)
      setError(data.reason)
      setTimeout(() => {
        router.push(data.redirectTo || "/")
      }, 2000)
    })

    // NEW: Handle game mode change notifications
    newSocket.on("game-mode-changed", (data) => {
      console.log("🎮 Game mode changed:", data)
      setGameModeTransition({
        show: true,
        message: `Game mode changed to ${data.newMode}`,
        newMode: data.newMode
      })
      
      // Auto-hide notification after 3 seconds
      setTimeout(() => {
        setGameModeTransition(prev => ({ ...prev, show: false }))
      }, 3000)
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

  // Send activity pings to keep room alive
  useEffect(() => {
    if (!socket || !roomId || !playerId || !room) return

    const activityInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("room-activity-ping", { roomId, playerId })
      }
    }, 30000)

    return () => clearInterval(activityInterval)
  }, [socket, roomId, playerId, room])

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

  // Auto-fetch question when game state changes to playing
  useEffect(() => {
    if (room?.game_state === "playing" && !currentQuestion) {
      const languageToUse = room.game_mode === "competition" 
        ? room.host_language 
        : currentPlayer?.language
      
      if (languageToUse) {
        console.log("Game started, fetching initial question...")
        fetchNewQuestion(languageToUse)
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

  // Countdown for inactivity warning
  useEffect(() => {
    if (inactivityWarning.show && inactivityWarning.countdown > 0) {
      const timer = setTimeout(() => {
        setInactivityWarning(prev => ({
          ...prev,
          countdown: prev.countdown - 1
        }))
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [inactivityWarning.show, inactivityWarning.countdown])

  const handleGameModeSelect = (mode: "practice" | "competition") => {
    if (!socket || !currentPlayer?.is_host) return

    socket.emit("update-game-mode", {
      roomId,
      playerId,
      data: { gameMode: mode }
    }, (response: any) => {
      if (response.error) {
        setError(response.error)
      }
    })
  }

  // NEW: Handle game mode change (reset and switch)
  const handleChangeGameMode = () => {
    if (!socket || !currentPlayer?.is_host) return

    // Reset the room to allow mode selection
    socket.emit("change-game-mode", {
      roomId,
      playerId
    }, (response: any) => {
      if (response.error) {
        setError(response.error)
      } else {
        // Show transition notification
        setGameModeTransition({
          show: true,
          message: "Game mode reset - please select a new mode",
          newMode: "selection"
        })
        
        setTimeout(() => {
          setGameModeTransition(prev => ({ ...prev, show: false }))
        }, 3000)
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
    if (!socket || !room) return

    // Check readiness requirements based on game mode
    if (room.game_mode === "competition") {
      if (!room.host_language) {
        setError("Host must select a language first")
        return
      }
    } else if (room.game_mode === "practice") {
      if (!currentPlayer?.language) {
        setError("Select a language first")
        return
      }
    } else {
      setError("Game mode must be selected first")
      return
    }

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

    // Calculate points based on game mode
    const isPracticeMode = room?.game_mode === "practice"
    const pointsData = {
      answer,
      timeLeft,
      correctAnswer: currentQuestion.correctAnswer,
      isPracticeMode
    }

    socket.emit("answer", {
      roomId,
      playerId,
      data: pointsData
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
          
          const languageToUse = room?.game_mode === "competition" 
            ? room.host_language 
            : currentPlayer?.language
          
          if (languageToUse && room?.game_state === "playing") {
            fetchNewQuestion(languageToUse)
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
      {/* Inactivity Warning Banner */}
      {inactivityWarning.show && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">{inactivityWarning.message}</span>
            <span className="font-bold">({inactivityWarning.countdown}s)</span>
          </div>
        </div>
      )}

      {/* NEW: Game Mode Transition Banner */}
      {gameModeTransition.show && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="font-medium">{gameModeTransition.message}</span>
          </div>
        </div>
      )}

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
              {room.game_mode && (
                <Badge variant="outline" className="text-xs">
                  {room.game_mode === "practice" ? (
                    <>
                      <BookOpen className="h-3 w-3 mr-1" />
                      Practice Mode
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3 mr-1" />
                      Competition Mode
                    </>
                  )}
                </Badge>
              )}
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
            {/* NEW: Change Game Mode Button (Host Only, Lobby State) */}
            {room.game_state === "lobby" && currentPlayer.is_host && room.game_mode && (
              <SoundButton
                onClick={handleChangeGameMode}
                variant="outline"
                size="sm"
                className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Change Mode
              </SoundButton>
            )}
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
            {/* Game Mode Selection (Host Only, Lobby State) */}
            {room.game_state === "lobby" && currentPlayer.is_host && !room.game_mode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5" />
                    Game Mode Selection
                  </CardTitle>
                  <CardDescription>
                    Choose how players will compete in this quiz room
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <SoundButton
                      onClick={() => handleGameModeSelect("practice")}
                      variant="outline"
                      className="w-full p-6 h-auto flex-col items-start text-left"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        <span className="text-lg font-semibold">Practice Mode</span>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Players individually select their preferred language</li>
                        <li>• No point penalties for incorrect answers or timeouts</li>
                        <li>• Focus on learning and improvement</li>
                        <li>• Relaxed, educational gameplay</li>
                      </ul>
                    </SoundButton>

                    <SoundButton
                      onClick={() => handleGameModeSelect("competition")}
                      variant="outline"
                      className="w-full p-6 h-auto flex-col items-start text-left"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Zap className="h-5 w-5 text-orange-600" />
                        <span className="text-lg font-semibold">Competition Mode</span>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• All players use the host's selected language</li>
                        <li>• Point penalties apply for incorrect answers (-5 points)</li>
                        <li>• Competitive scoring system</li>
                        <li>• Race to reach the target score first</li>
                      </ul>
                    </SoundButton>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Competition Mode Language Selection (Host Only) */}
            {room.game_state === "lobby" && currentPlayer.is_host && room.game_mode === "competition" && !room.host_language && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Competition Language Selection
                  </CardTitle>
                  <CardDescription>
                    Choose the language all players will compete in
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Competition Language</label>
                    <Select onValueChange={handleHostLanguageChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the competition language" />
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
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-700">
                      <strong>Competition Mode:</strong> All players will answer questions in {room.host_language ? LANGUAGES.find(l => l.value === room.host_language)?.label : "the selected language"}. Wrong answers will result in -5 point penalties.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Game Setup (After Mode Selection) */}
            {room.game_state === "lobby" && room.game_mode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Game Setup</span>
                    {/* NEW: Change Mode Button in Header */}
                    {currentPlayer.is_host && (
                      <SoundButton
                        onClick={handleChangeGameMode}
                        variant="outline"
                        size="sm"
                        className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Change Mode
                      </SoundButton>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Configure your settings and wait for all players to be ready
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Practice Mode: Individual Language Selection */}
                  {room.game_mode === "practice" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Choose Your Language</label>
                      <Select
                        value={currentPlayer.language || ""}
                        onValueChange={handleLanguageChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a language to learn" />
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

                  {/* Competition Mode: Show Selected Language */}
                  {room.game_mode === "competition" && room.host_language && (
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-orange-800">Competition Language</span>
                      </div>
                      <p className="text-orange-700">
                        All players will compete in: <strong>{LANGUAGES.find(l => l.value === room.host_language)?.label}</strong>
                      </p>
                      <p className="text-sm text-orange-600 mt-1">
                        Wrong answers will result in -5 point penalties
                      </p>
                    </div>
                  )}

                  {/* Target Score (Host Only) */}
                  {currentPlayer.is_host && (
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
                        connectionStatus !== 'connected' ||
                        (room.game_mode === "practice" && !currentPlayer.language) ||
                        (room.game_mode === "competition" && !room.host_language)
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
                          connectionStatus !== 'connected' ||
                          !room.players.every(p => p.ready) ||
                          (room.game_mode === "practice" && !room.players.every(p => p.language)) ||
                          (room.game_mode === "competition" && !room.host_language)
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
                  {/* Question */}
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
                    {room.game_mode === "practice" && (
                      <p className="text-sm text-green-600 mt-1">
                        Practice Mode: No penalties for wrong answers
                      </p>
                    )}
                  </div>

                  {/* Timer Progress */}
                  <Progress value={(timeLeft / 10) * 100} className="h-2" />

                  {/* Answer Options with Enhanced Visual Feedback */}
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

                  {/* Feedback Display */}
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
                  {room.winner_id && (
                    <div className="text-center">
                      <p className="text-xl font-bold text-green-600 mb-2">
                        🎉 {room.players.find(p => p.id === room.winner_id)?.name} Wins!
                      </p>
                      <p className="text-gray-600">
                        Reached {room.target_score} points first
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
                          {room.game_mode === "practice" && player.language && (
                            <Badge variant="outline" className="text-xs">
                              {LANGUAGES.find(l => l.value === player.language)?.label}
                            </Badge>
                          )}
                          {room.game_mode === "competition" && room.host_language && (
                            <Badge variant="outline" className="text-xs">
                              {LANGUAGES.find(l => l.value === room.host_language)?.label}
                            </Badge>
                          )}
                          {((room.game_mode === "practice" && player.language) || 
                            (room.game_mode === "competition" && room.host_language)) && 
                           player.ready && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </>
                      )}
                      {(room.game_state === "playing" || room.game_state === "finished") && (
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
                  <Badge variant="outline" className="text-xs">
                    {room.game_mode ? (
                      room.game_mode === "practice" ? (
                        <>
                          <BookOpen className="h-3 w-3 mr-1" />
                          Practice
                        </>
                      ) : (
                        <>
                          <Zap className="h-3 w-3 mr-1" />
                          Competition
                        </>
                      )
                    ) : "Not Selected"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Target Score:</span>
                  <span className="font-medium">{room.target_score} points</span>
                </div>
                <div className="flex justify-between">
                  <span>Game State:</span>
                  <Badge variant="outline" className="text-xs">
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
          </div>
        </div>
      </div>
    </div>
  )
}