"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SoundButton } from "@/components/ui/sound-button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AudioSettings } from "@/components/audio-settings"
import { 
  ArrowLeft, 
  Users, 
  Settings, 
  Volume2, 
  Crown, 
  Trophy, 
  Clock, 
  Target, 
  Zap, 
  BookOpen, 
  Heart as HandHeart,
  Globe,
  Gamepad2,
  CheckCircle,
  XCircle,
  Timer,
  RotateCcw
} from "lucide-react"
import { io, Socket } from "socket.io-client"
import { useAudio } from "@/lib/audio"

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

interface CooperationChallenge {
  categoryId: string
  categoryName: string
  englishName: string
  language: string
  challengeId: string
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
  cooperation_lives?: number
  cooperation_score?: number
  used_words?: string[]
  current_category?: string
  current_challenge_player?: string
  cooperation_waiting?: boolean
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
  const audio = useAudio()
  
  // URL parameters
  const roomId = searchParams.get("roomId") || ""
  const playerId = searchParams.get("playerId") || ""
  const playerName = searchParams.get("name") || ""
  const isHost = searchParams.get("isHost") === "true"

  // Socket and connection state
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Room and game state
  const [room, setRoom] = useState<Room | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Question and answer state
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswering, setIsAnswering] = useState(false)
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(false)
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null)
  const [questionTimer, setQuestionTimer] = useState(10)
  const [isQuestionTimerActive, setIsQuestionTimerActive] = useState(false)

  // Cooperation mode state
  const [cooperationChallenge, setCooperationChallenge] = useState<CooperationChallenge | null>(null)
  const [cooperationAnswer, setCooperationAnswer] = useState("")
  const [cooperationCountdown, setCooperationCountdown] = useState(5)
  const [cooperationTimerActive, setCooperationTimerActive] = useState(false)
  const [isCooperationWaiting, setIsCooperationWaiting] = useState(false)
  const [cooperationTyping, setCooperationTyping] = useState<{ playerId: string; text: string } | null>(null)

  // UI state
  const [showAudioSettings, setShowAudioSettings] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  // Refs for timers
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const cooperationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const activityPingRef = useRef<NodeJS.Timeout | null>(null)
  const questionLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize socket connection
  useEffect(() => {
    if (!roomId || !playerId) {
      setError("Missing room ID or player ID")
      setIsLoading(false)
      return
    }

    console.log("🔌 Initializing Socket.IO connection for room...")
    
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
      console.log("✅ Connected to server successfully")
      setIsConnected(true)
      setConnectionError(null)
      
      // Join the room
      setIsJoining(true)
      newSocket.emit("join-room", {
        roomId,
        playerId,
        data: { name: playerName, isHost }
      }, (response: any) => {
        setIsJoining(false)
        if (response.error) {
          console.error("❌ Failed to join room:", response.error)
          setError(response.error)
        } else {
          console.log("✅ Successfully joined room:", response.room)
          setRoom(response.room)
        }
        setIsLoading(false)
      })
    })

    newSocket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error)
      setIsConnected(false)
      setConnectionError(`Connection failed: ${error.message}`)
      setIsLoading(false)
    })

    newSocket.on("disconnect", (reason) => {
      console.log("🔌 Disconnected from server, reason:", reason)
      setIsConnected(false)
    })

    newSocket.on("room-update", ({ room: updatedRoom }: { room: Room }) => {
      console.log("📡 Room updated:", updatedRoom)
      setRoom(updatedRoom)
      
      // FIXED: Only load question if we don't have one and game is playing
      if (updatedRoom.game_state === "playing" && 
          (updatedRoom.game_mode === "practice" || updatedRoom.game_mode === "competition") &&
          !currentQuestion && !showAnswerFeedback && !isAnswering) {
        
        // Clear any existing timeout
        if (questionLoadTimeoutRef.current) {
          clearTimeout(questionLoadTimeoutRef.current)
        }
        
        // Add debounce to prevent duplicate loads
        questionLoadTimeoutRef.current = setTimeout(() => {
          loadQuestion(updatedRoom)
        }, 300)
      }
    })

    newSocket.on("cooperation-challenge", ({ challenge }: { challenge: CooperationChallenge }) => {
      console.log("🤝 Cooperation challenge received:", challenge)
      setCooperationChallenge(challenge)
      setIsCooperationWaiting(false)
      setCooperationAnswer("")
      setCooperationTyping(null)
      
      // FIXED: Start timer immediately when challenge is received
      if (challenge && room?.current_challenge_player === playerId) {
        console.log("🕐 Starting cooperation timer for current player")
        startCooperationTimer()
      }
    })

    newSocket.on("cooperation-waiting", ({ isWaiting }: { isWaiting: boolean }) => {
      console.log("⏳ Cooperation waiting state:", isWaiting)
      setIsCooperationWaiting(isWaiting)
      if (isWaiting) {
        setCooperationChallenge(null)
        setCooperationAnswer("")
        setCooperationTyping(null)
        stopCooperationTimer()
      }
    })

    newSocket.on("cooperation-typing", ({ playerId: typingPlayerId, text }: { playerId: string; text: string }) => {
      if (typingPlayerId !== playerId) {
        setCooperationTyping({ playerId: typingPlayerId, text })
        
        // Clear typing indicator after 2 seconds of no updates
        setTimeout(() => {
          setCooperationTyping(null)
        }, 2000)
      }
    })

    newSocket.on("host-left", () => {
      setError("The host has left the room")
      setTimeout(() => {
        router.push("/")
      }, 3000)
    })

    newSocket.on("room-closed", (data) => {
      console.log("🚪 Room closed:", data)
      setError(`Room closed: ${data.message}`)
      setTimeout(() => {
        router.push("/")
      }, 3000)
    })

    newSocket.on("error", (error) => {
      console.error("❌ Socket error:", error)
      setError(error.message || "An error occurred")
      if (error.status === 404) {
        setTimeout(() => {
          router.push("/")
        }, 3000)
      }
    })

    setSocket(newSocket)

    return () => {
      console.log("🔌 Cleaning up socket connection...")
      if (activityPingRef.current) clearInterval(activityPingRef.current)
      if (questionTimerRef.current) clearTimeout(questionTimerRef.current)
      if (cooperationTimerRef.current) clearInterval(cooperationTimerRef.current)
      if (questionLoadTimeoutRef.current) clearTimeout(questionLoadTimeoutRef.current)
      newSocket.close()
    }
  }, [roomId, playerId, playerName, isHost, router])

  // Activity ping to keep room alive
  useEffect(() => {
    if (socket && isConnected && room) {
      activityPingRef.current = setInterval(() => {
        socket.emit("room-activity-ping", { roomId, playerId })
      }, 30000) // Ping every 30 seconds

      return () => {
        if (activityPingRef.current) {
          clearInterval(activityPingRef.current)
        }
      }
    }
  }, [socket, isConnected, room, roomId, playerId])

  // Load question for practice/competition modes
  const loadQuestion = async (currentRoom: Room) => {
    if (!currentRoom || currentRoom.game_state !== "playing") return
    if (currentRoom.game_mode !== "practice" && currentRoom.game_mode !== "competition") return
    if (showAnswerFeedback || isAnswering) return // FIXED: Don't load if showing feedback

    const currentPlayer = currentRoom.players.find(p => p.id === playerId)
    if (!currentPlayer) return

    let targetLanguage: string
    if (currentRoom.game_mode === "practice") {
      if (!currentPlayer.language) {
        console.error("❌ No language available for question loading")
        return
      }
      targetLanguage = currentPlayer.language
    } else {
      if (!currentRoom.host_language) {
        console.error("❌ No host language available for question loading")
        return
      }
      targetLanguage = currentRoom.host_language
    }

    try {
      console.log(`🎯 Loading question for ${currentRoom.game_mode} mode in ${targetLanguage}`)
      
      const response = await fetch("/api/get-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: targetLanguage }),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch question: ${response.status}`)
      }

      const data = await response.json()
      if (data.success && data.question) {
        console.log("✅ Question loaded successfully:", data.question)
        setCurrentQuestion(data.question)
        setSelectedAnswer(null)
        setIsAnswering(false)
        startQuestionTimer()
      } else {
        throw new Error(data.error || "Failed to load question")
      }
    } catch (error) {
      console.error("❌ Error loading question:", error)
      setError("Failed to load question")
    }
  }

  // Start question timer
  const startQuestionTimer = () => {
    setQuestionTimer(10)
    setIsQuestionTimerActive(true)
    
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current)
    }
    
    questionTimerRef.current = setInterval(() => {
      setQuestionTimer(prev => {
        if (prev <= 1) {
          clearInterval(questionTimerRef.current!)
          setIsQuestionTimerActive(false)
          handleAnswer("", true) // Handle timeout
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Stop question timer
  const stopQuestionTimer = () => {
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current)
      questionTimerRef.current = null
    }
    setIsQuestionTimerActive(false)
  }

  // Handle answer submission
  const handleAnswer = async (answer: string, isTimeout: boolean = false) => {
    if (!currentQuestion || !room || isAnswering) return

    setIsAnswering(true)
    stopQuestionTimer()

    const isCorrect = answer === currentQuestion.correctAnswer
    const timeLeft = questionTimer
    const isPracticeMode = room.game_mode === "practice"

    // Show feedback immediately
    setLastAnswerCorrect(isCorrect)
    setShowAnswerFeedback(true)
    setSelectedAnswer(answer)

    // Play appropriate sound
    if (isCorrect) {
      audio.playSuccess()
    } else {
      audio.playFailure()
    }

    // Submit answer to server without triggering room update
    if (socket) {
      socket.emit("answer", {
        roomId,
        playerId,
        data: { answer, timeLeft, correctAnswer: currentQuestion.correctAnswer, isPracticeMode }
      }, (response: any) => {
        if (response.error) {
          console.error("❌ Failed to submit answer:", response.error)
          setError(response.error)
        } else {
          // FIXED: Only update room state, don't trigger question reload
          setRoom(response.room)
        }
      })
    }

    // FIXED: Show feedback for full 2000ms, then load next question
    setTimeout(() => {
      setShowAnswerFeedback(false)
      setIsAnswering(false)
      setCurrentQuestion(null)
      
      // Load next question after feedback is hidden
      if (room && (room.game_mode === "practice" || room.game_mode === "competition")) {
        setTimeout(() => {
          loadQuestion(room)
        }, 500)
      }
    }, 2000) // Full 2000ms feedback display
  }

  // Start cooperation timer
  const startCooperationTimer = () => {
    console.log("Timer started: 5")
    setCooperationCountdown(5)
    setCooperationTimerActive(true)
    
    // Clear any existing timer
    if (cooperationTimerRef.current) {
      clearInterval(cooperationTimerRef.current)
    }
    
    cooperationTimerRef.current = setInterval(() => {
      setCooperationCountdown(prev => {
        const newTime = prev - 1
        console.log(`Timer tick: ${newTime}`)
        
        if (newTime <= 0) {
          console.log("Timer expired")
          clearInterval(cooperationTimerRef.current!)
          setCooperationTimerActive(false)
          
          // FIXED: Immediately handle timeout after logging
          handleCooperationTimeout()
          
          return 0
        }
        return newTime
      })
    }, 1000)
  }

  // Stop cooperation timer
  const stopCooperationTimer = () => {
    if (cooperationTimerRef.current) {
      clearInterval(cooperationTimerRef.current)
      cooperationTimerRef.current = null
    }
    setCooperationTimerActive(false)
  }

  // Handle cooperation timeout
  const handleCooperationTimeout = () => {
    if (!socket || !room || !cooperationChallenge) return

    const currentLives = room.cooperation_lives || 3
    const newLives = Math.max(0, currentLives - 1)
    console.log(`Lives remaining: ${newLives}`)

    // Find the other player for turn switching
    const otherPlayer = room.players.find(p => p.id !== playerId)
    if (otherPlayer) {
      console.log(`Turn switched to player: ${otherPlayer.name}`)
    }

    socket.emit("cooperation-timeout", {
      roomId,
      playerId,
      data: {
        challengeId: cooperationChallenge.challengeId,
        lives: newLives
      }
    })

    // Reset local state
    setCooperationAnswer("")
    setCooperationChallenge(null)
    setIsCooperationWaiting(true)
  }

  // Handle cooperation answer submission
  const handleCooperationAnswer = async () => {
    if (!cooperationAnswer.trim() || !cooperationChallenge || !socket) return

    try {
      const response = await fetch("/api/validate-cooperation-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: cooperationChallenge.categoryId,
          answer: cooperationAnswer.trim(),
          language: cooperationChallenge.language,
          usedWords: room?.used_words || []
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        if (data.isCorrect && !data.isUsed) {
          // Correct and unused answer
          audio.playSuccess()
          socket.emit("cooperation-answer", {
            roomId,
            playerId,
            data: {
              challengeId: cooperationChallenge.challengeId,
              answer: cooperationAnswer.trim(),
              isCorrect: true,
              wordId: data.wordId
            }
          })
        } else if (data.isUsed) {
          // Already used word
          audio.playFailure()
          setError(`"${cooperationAnswer}" has already been used. Try a different word!`)
          setTimeout(() => setError(null), 3000)
        } else {
          // Incorrect answer
          audio.playFailure()
          setError(`"${cooperationAnswer}" is not a valid ${cooperationChallenge.englishName.toLowerCase()} word.`)
          setTimeout(() => setError(null), 3000)
        }
      }
    } catch (error) {
      console.error("❌ Error validating cooperation answer:", error)
      setError("Failed to validate answer")
      setTimeout(() => setError(null), 3000)
    }

    setCooperationAnswer("")
    stopCooperationTimer()
  }

  // Handle cooperation typing
  const handleCooperationTyping = (text: string) => {
    setCooperationAnswer(text)
    
    if (socket) {
      socket.emit("cooperation-typing", {
        roomId,
        playerId,
        text
      })
    }
  }

  // Socket event handlers
  const updateGameMode = (gameMode: "practice" | "competition" | "cooperation") => {
    if (!socket || !room) return

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

  const changeGameMode = () => {
    if (!socket || !room) return

    socket.emit("change-game-mode", {
      roomId,
      playerId
    }, (response: any) => {
      if (response.error) {
        setError(response.error)
      }
    })
  }

  const updateHostLanguage = (hostLanguage: "french" | "german" | "russian" | "japanese" | "spanish") => {
    if (!socket || !room) return

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

  const updateLanguage = (language: "french" | "german" | "russian" | "japanese" | "spanish") => {
    if (!socket || !room) return

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

  const toggleReady = () => {
    if (!socket || !room) return

    socket.emit("toggle-ready", {
      roomId,
      playerId
    }, (response: any) => {
      if (response.error) {
        setError(response.error)
      }
    })
  }

  const updateTargetScore = (targetScore: number) => {
    if (!socket || !room) return

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

  const startGame = () => {
    if (!socket || !room) return

    console.log(`🎮 Starting game in ${room.game_mode} mode`)
    socket.emit("start-game", {
      roomId,
      playerId
    }, (response: any) => {
      if (response.error) {
        setError(response.error)
      } else {
        console.log("✅ Game started successfully")
      }
    })
  }

  const restartGame = () => {
    if (!socket || !room) return

    socket.emit("restart", {
      roomId,
      playerId
    }, (response: any) => {
      if (response.error) {
        setError(response.error)
      }
    })
  }

  const leaveRoom = () => {
    if (socket) {
      socket.emit("leave-room", { roomId, playerId })
    }
    router.push("/")
  }

  // Get current player
  const currentPlayer = room?.players.find(p => p.id === playerId)
  const isCurrentPlayerHost = currentPlayer?.is_host || false

  // Check if all players are ready
  const allPlayersReady = room?.players.every(p => p.ready) || false
  const hasEnoughPlayers = room?.players.length || 0 > 0

  // Get game mode requirements
  const canStartGame = () => {
    if (!room || !hasEnoughPlayers) return false
    
    if (room.game_mode === "practice") {
      return room.players.every(p => p.language && p.ready)
    } else if (room.game_mode === "competition") {
      return room.host_language && allPlayersReady
    } else if (room.game_mode === "cooperation") {
      return room.players.length === 2 && room.players.every(p => p.language && p.ready)
    }
    
    return false
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium">
            {isJoining ? "Joining room..." : "Connecting..."}
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push("/")} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Home
          </Button>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading room...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 mobile-no-scroll">
      <div className="mobile-container mobile-padding">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <SoundButton
              onClick={leaveRoom}
              variant="outline"
              className="mobile-btn-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Leave</span>
            </SoundButton>
            
            <div>
              <h1 className="mobile-text-xl sm:text-2xl font-bold text-gray-900">
                Room {room.id}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="mobile-text-sm">
                  {room.game_state === "lobby" && "Waiting"}
                  {room.game_state === "playing" && "Playing"}
                  {room.game_state === "finished" && "Finished"}
                </Badge>
                {room.game_mode && (
                  <Badge variant="outline" className="mobile-text-sm">
                    {room.game_mode === "practice" && (
                      <>
                        <BookOpen className="h-3 w-3 mr-1" />
                        Practice
                      </>
                    )}
                    {room.game_mode === "competition" && (
                      <>
                        <Zap className="h-3 w-3 mr-1" />
                        Competition
                      </>
                    )}
                    {room.game_mode === "cooperation" && (
                      <>
                        <HandHeart className="h-3 w-3 mr-1" />
                        Cooperation
                      </>
                    )}
                  </Badge>
                )}
              </div>
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
            
            {!isConnected && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Disconnected
              </Badge>
            )}
          </div>
        </div>

        {/* Audio Settings */}
        {showAudioSettings && (
          <div className="mb-6">
            <AudioSettings />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Connection Error */}
        {connectionError && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-700 font-medium">{connectionError}</p>
            </div>
          </div>
        )}

        {/* Game Content */}
        <div className="mobile-grid-stack lg:grid-cols-3 lg:gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-2 mobile-spacing-md">
            {/* Lobby State */}
            {room.game_state === "lobby" && (
              <div className="mobile-spacing-md">
                {/* Game Mode Selection */}
                {!room.game_mode && isCurrentPlayerHost && (
                  <Card className="mobile-card">
                    <CardHeader className="mobile-padding">
                      <CardTitle className="mobile-text-xl">Choose Game Mode</CardTitle>
                      <CardDescription className="mobile-text-base">
                        Select how you want to play
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="mobile-spacing-md mobile-padding">
                      <div className="mobile-grid-stack sm:grid-cols-3 gap-4">
                        <SoundButton
                          onClick={() => updateGameMode("practice")}
                          variant="outline"
                          className="mobile-btn-lg h-auto p-4 flex-col"
                        >
                          <BookOpen className="h-6 w-6 mb-2 text-blue-600" />
                          <span className="font-semibold">Practice</span>
                          <span className="text-xs text-gray-600 mt-1">Individual languages, no penalties</span>
                        </SoundButton>
                        
                        <SoundButton
                          onClick={() => updateGameMode("competition")}
                          variant="outline"
                          className="mobile-btn-lg h-auto p-4 flex-col"
                        >
                          <Zap className="h-6 w-6 mb-2 text-orange-600" />
                          <span className="font-semibold">Competition</span>
                          <span className="text-xs text-gray-600 mt-1">Same language, point penalties</span>
                        </SoundButton>
                        
                        <SoundButton
                          onClick={() => updateGameMode("cooperation")}
                          variant="outline"
                          className="mobile-btn-lg h-auto p-4 flex-col"
                        >
                          <HandHeart className="h-6 w-6 mb-2 text-purple-600" />
                          <span className="font-semibold">Cooperation</span>
                          <span className="text-xs text-gray-600 mt-1">2 players, type words by category</span>
                        </SoundButton>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Game Mode Selected */}
                {room.game_mode && (
                  <Card className="mobile-card">
                    <CardHeader className="mobile-padding">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 mobile-text-xl">
                          {room.game_mode === "practice" && (
                            <>
                              <BookOpen className="h-5 w-5 text-blue-600" />
                              Practice Mode
                            </>
                          )}
                          {room.game_mode === "competition" && (
                            <>
                              <Zap className="h-5 w-5 text-orange-600" />
                              Competition Mode
                            </>
                          )}
                          {room.game_mode === "cooperation" && (
                            <>
                              <HandHeart className="h-5 w-5 text-purple-600" />
                              Cooperation Mode
                            </>
                          )}
                        </CardTitle>
                        {isCurrentPlayerHost && (
                          <SoundButton
                            onClick={changeGameMode}
                            variant="outline"
                            className="mobile-btn-sm"
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Change
                          </SoundButton>
                        )}
                      </div>
                      <CardDescription className="mobile-text-base">
                        {room.game_mode === "practice" && "Each player chooses their own language. No point penalties for wrong answers."}
                        {room.game_mode === "competition" && "All players use the same language. Wrong answers lose points."}
                        {room.game_mode === "cooperation" && "Work together! Type words from categories. Share 3 lives."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="mobile-spacing-md mobile-padding">
                      {/* Competition Mode Language Selection */}
                      {room.game_mode === "competition" && isCurrentPlayerHost && (
                        <div className="mb-4">
                          <label className="block mobile-text-base font-medium mb-2">
                            Competition Language
                          </label>
                          <Select
                            value={room.host_language || ""}
                            onValueChange={(value) => updateHostLanguage(value as any)}
                          >
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

                      {/* Competition Mode Language Display */}
                      {room.game_mode === "competition" && room.host_language && (
                        <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-orange-700">
                              Competition Language: {LANGUAGES.find(l => l.value === room.host_language)?.label}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Practice/Cooperation Mode Language Selection */}
                      {(room.game_mode === "practice" || room.game_mode === "cooperation") && (
                        <div className="mb-4">
                          <label className="block mobile-text-base font-medium mb-2">
                            Your Language
                          </label>
                          <Select
                            value={currentPlayer?.language || ""}
                            onValueChange={(value) => updateLanguage(value as any)}
                          >
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

                      {/* Target Score Selection */}
                      {isCurrentPlayerHost && room.game_mode !== "cooperation" && (
                        <div className="mb-4">
                          <label className="block mobile-text-base font-medium mb-2">
                            Target Score
                          </label>
                          <Select
                            value={room.target_score.toString()}
                            onValueChange={(value) => updateTargetScore(Number(value))}
                          >
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

                      {/* Ready Toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="mobile-text-base font-medium">Ready to play?</p>
                          <p className="mobile-text-sm text-gray-600">
                            {room.game_mode === "practice" && "Select your language first"}
                            {room.game_mode === "competition" && "Host must select competition language"}
                            {room.game_mode === "cooperation" && "Select your language and wait for 2 players"}
                          </p>
                        </div>
                        <SoundButton
                          onClick={toggleReady}
                          variant={currentPlayer?.ready ? "default" : "outline"}
                          className="mobile-btn-md"
                          disabled={
                            (room.game_mode === "practice" && !currentPlayer?.language) ||
                            (room.game_mode === "competition" && !room.host_language) ||
                            (room.game_mode === "cooperation" && !currentPlayer?.language)
                          }
                        >
                          {currentPlayer?.ready ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Ready
                            </>
                          ) : (
                            "Get Ready"
                          )}
                        </SoundButton>
                      </div>

                      {/* Start Game Button */}
                      {isCurrentPlayerHost && (
                        <div className="mt-4 pt-4 border-t">
                          <SoundButton
                            onClick={startGame}
                            disabled={!canStartGame()}
                            className="mobile-btn-lg w-full"
                          >
                            <Gamepad2 className="h-5 w-5 mr-2" />
                            Start Game
                          </SoundButton>
                          {!canStartGame() && (
                            <p className="mobile-text-sm text-gray-600 mt-2 text-center">
                              {room.game_mode === "cooperation" && room.players.length !== 2 && "Need exactly 2 players"}
                              {room.game_mode === "cooperation" && room.players.length === 2 && !allPlayersReady && "All players must be ready"}
                              {room.game_mode !== "cooperation" && !allPlayersReady && "All players must be ready"}
                              {room.game_mode === "practice" && room.players.some(p => !p.language) && "All players must select a language"}
                              {room.game_mode === "competition" && !room.host_language && "Host must select competition language"}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Playing State */}
            {room.game_state === "playing" && (
              <div className="mobile-spacing-md">
                {/* Practice/Competition Mode Question */}
                {(room.game_mode === "practice" || room.game_mode === "competition") && (
                  <Card className="mobile-card">
                    <CardHeader className="mobile-padding">
                      <div className="flex items-center justify-between">
                        <CardTitle className="mobile-text-xl">
                          Translate this word
                        </CardTitle>
                        {isQuestionTimerActive && (
                          <div className="flex items-center gap-2">
                            <Timer className="h-4 w-4 text-blue-600" />
                            <span className={`font-bold ${questionTimer <= 3 ? 'text-red-600' : 'text-blue-600'}`}>
                              {questionTimer}s
                            </span>
                          </div>
                        )}
                      </div>
                      {isQuestionTimerActive && (
                        <Progress 
                          value={(questionTimer / 10) * 100} 
                          className="h-2"
                        />
                      )}
                    </CardHeader>
                    <CardContent className="mobile-padding">
                      {currentQuestion ? (
                        <div className="mobile-spacing-md">
                          <div className="text-center mb-6">
                            <h2 className="mobile-text-3xl font-bold text-gray-900 mb-2">
                              {currentQuestion.english}
                            </h2>
                            <p className="mobile-text-base text-gray-600">
                              Choose the correct translation in{" "}
                              {room.game_mode === "practice" 
                                ? LANGUAGES.find(l => l.value === currentPlayer?.language)?.label
                                : LANGUAGES.find(l => l.value === room.host_language)?.label
                              }
                            </p>
                          </div>

                          {/* FIXED: Answer feedback display */}
                          {showAnswerFeedback ? (
                            <div className="text-center mobile-spacing-md">
                              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                                lastAnswerCorrect 
                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                  : 'bg-red-100 text-red-800 border border-red-200'
                              }`}>
                                {lastAnswerCorrect ? (
                                  <>
                                    <CheckCircle className="h-5 w-5" />
                                    Correct!
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-5 w-5" />
                                    Incorrect
                                  </>
                                )}
                              </div>
                              {!lastAnswerCorrect && (
                                <p className="mobile-text-base text-gray-600 mt-2">
                                  The correct answer was: <strong>{currentQuestion.correctAnswer}</strong>
                                </p>
                              )}
                              <p className="mobile-text-sm text-gray-500 mt-2">
                                Loading next question...
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {currentQuestion.options.map((option, index) => (
                                <SoundButton
                                  key={index}
                                  onClick={() => handleAnswer(option)}
                                  disabled={isAnswering || !isQuestionTimerActive}
                                  variant="outline"
                                  className="h-[60px] w-[85%] mx-auto text-black bg-white hover:bg-gray-50 border-gray-300 mobile-text-base font-medium"
                                >
                                  {option}
                                </SoundButton>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                          <p className="mobile-text-lg font-medium">Loading question...</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Cooperation Mode */}
                {room.game_mode === "cooperation" && (
                  <Card className="mobile-card">
                    <CardHeader className="mobile-padding">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 mobile-text-xl">
                          <HandHeart className="h-5 w-5 text-purple-600" />
                          Cooperation Mode
                        </CardTitle>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="mobile-text-sm text-gray-600">Lives</div>
                            <div className="flex gap-1">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <HandHeart
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < (room.cooperation_lives || 3)
                                      ? "text-red-500 fill-current"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="mobile-text-sm text-gray-600">Score</div>
                            <div className="mobile-text-lg font-bold text-purple-600">
                              {room.cooperation_score || 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="mobile-padding">
                      {isCooperationWaiting ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                          <p className="mobile-text-lg font-medium">Preparing next challenge...</p>
                        </div>
                      ) : cooperationChallenge ? (
                        <div className="mobile-spacing-md">
                          <div className="text-center mb-6">
                            <h2 className="mobile-text-2xl font-bold text-gray-900 mb-2">
                              {cooperationChallenge.categoryName}
                            </h2>
                            <p className="mobile-text-base text-gray-600">
                              Type a word from this category in{" "}
                              {LANGUAGES.find(l => l.value === cooperationChallenge.language)?.label}
                            </p>
                            <p className="mobile-text-sm text-gray-500 mt-1">
                              Current player: {room.players.find(p => p.id === room.current_challenge_player)?.name}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 mb-4">
                            <div className="flex-1">
                              <Input
                                value={cooperationAnswer}
                                onChange={(e) => handleCooperationTyping(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    handleCooperationAnswer()
                                  }
                                }}
                                placeholder={`Type a ${cooperationChallenge.englishName.toLowerCase()} word...`}
                                disabled={room.current_challenge_player !== playerId}
                                className="mobile-input"
                              />
                            </div>
                            {cooperationChallenge && (
                              <div className="text-center">
                                <div className={`cooperation-timer ${cooperationCountdown <= 2 ? 'warning' : 'normal'}`}>
                                  {cooperationCountdown}
                                </div>
                                <div className="mobile-text-sm text-gray-600">Timer</div>
                              </div>
                            )}
                            <SoundButton
                              onClick={handleCooperationAnswer}
                              disabled={!cooperationAnswer.trim() || room.current_challenge_player !== playerId}
                              className="mobile-btn-md"
                            >
                              Submit
                            </SoundButton>
                          </div>

                          {cooperationTyping && cooperationTyping.playerId !== playerId && (
                            <div className="text-center mobile-text-sm text-gray-600">
                              {room.players.find(p => p.id === cooperationTyping.playerId)?.name} is typing: "{cooperationTyping.text}"
                            </div>
                          )}

                          {room.current_challenge_player !== playerId && (
                            <div className="text-center mobile-text-sm text-gray-600 mt-4">
                              Waiting for {room.players.find(p => p.id === room.current_challenge_player)?.name} to answer...
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="mobile-text-lg font-medium">Waiting for challenge...</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Finished State */}
            {room.game_state === "finished" && (
              <Card className="mobile-card">
                <CardHeader className="mobile-padding text-center">
                  <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <CardTitle className="mobile-text-2xl">Game Over!</CardTitle>
                  <CardDescription className="mobile-text-lg">
                    {room.game_mode === "cooperation" ? (
                      (room.cooperation_lives || 0) > 0 ? (
                        <>🎉 Congratulations! You scored {room.cooperation_score} points together!</>
                      ) : (
                        <>💔 Game over! You scored {room.cooperation_score} points together.</>
                      )
                    ) : room.winner_id ? (
                      <>🎉 {room.players.find(p => p.id === room.winner_id)?.name} wins!</>
                    ) : (
                      <>Game finished</>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mobile-padding text-center">
                  {isCurrentPlayerHost && (
                    <SoundButton
                      onClick={restartGame}
                      className="mobile-btn-lg"
                    >
                      <RotateCcw className="h-5 w-5 mr-2" />
                      Play Again
                    </SoundButton>
                  )}
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
                  {room.game_mode === "cooperation" && (
                    <Badge variant="outline" className="mobile-text-sm">
                      Max 2
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="mobile-padding">
                <div className="mobile-spacing-sm">
                  {room.players.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        player.id === playerId ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {player.is_host && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="font-medium mobile-text-sm truncate">
                            {player.name}
                            {player.id === playerId && " (You)"}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {player.ready && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          
                          {player.language && (
                            <Badge variant="outline" className="mobile-text-sm">
                              {LANGUAGES.find(l => l.value === player.language)?.label?.split(' ')[0]}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold mobile-text-sm">
                          {player.score}
                        </div>
                        {room.game_mode !== "cooperation" && (
                          <div className="mobile-text-sm text-gray-600">
                            / {room.target_score}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Game Info */}
            <Card className="mobile-card">
              <CardHeader className="mobile-padding">
                <CardTitle className="mobile-text-lg">Game Info</CardTitle>
              </CardHeader>
              <CardContent className="mobile-spacing-sm mobile-text-sm mobile-padding">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Target Score:</span>
                  <span className="font-medium">
                    {room.game_mode === "cooperation" ? "Survival" : `${room.target_score} points`}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Game Mode:</span>
                  <span className="font-medium capitalize">{room.game_mode || "Not selected"}</span>
                </div>
                
                {room.host_language && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Language:</span>
                    <span className="font-medium">
                      {LANGUAGES.find(l => l.value === room.host_language)?.label}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant="outline" className="mobile-text-sm">
                    {room.game_state === "lobby" && "Waiting"}
                    {room.game_state === "playing" && "In Progress"}
                    {room.game_state === "finished" && "Finished"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Game Rules */}
            <Card className="mobile-card">
              <CardHeader className="mobile-padding">
                <CardTitle className="mobile-text-lg">How to Play</CardTitle>
              </CardHeader>
              <CardContent className="mobile-spacing-sm mobile-text-sm mobile-padding">
                {room.game_mode === "practice" && (
                  <div className="mobile-spacing-sm">
                    <p className="font-medium text-blue-600">Practice Mode:</p>
                    <ul className="mobile-spacing-sm text-gray-600 ml-4">
                      <li>• Each player chooses their own language</li>
                      <li>• No point penalties for wrong answers</li>
                      <li>• First to reach target score wins</li>
                      <li>• Perfect for learning and practice</li>
                    </ul>
                  </div>
                )}
                
                {room.game_mode === "competition" && (
                  <div className="mobile-spacing-sm">
                    <p className="font-medium text-orange-600">Competition Mode:</p>
                    <ul className="mobile-spacing-sm text-gray-600 ml-4">
                      <li>• All players use the same language</li>
                      <li>• Wrong answers lose 5 points</li>
                      <li>• First to reach target score wins</li>
                      <li>• Competitive and challenging</li>
                    </ul>
                  </div>
                )}
                
                {room.game_mode === "cooperation" && (
                  <div className="mobile-spacing-sm">
                    <p className="font-medium text-purple-600">Cooperation Mode:</p>
                    <ul className="mobile-spacing-sm text-gray-600 ml-4">
                      <li>• Exactly 2 players required</li>
                      <li>• Type words from given categories</li>
                      <li>• Share 3 lives between players</li>
                      <li>• Work together to survive</li>
                    </ul>
                  </div>
                )}
                
                {!room.game_mode && (
                  <p className="text-gray-600">
                    {isCurrentPlayerHost 
                      ? "Choose a game mode to get started!" 
                      : "Waiting for host to select game mode..."
                    }
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}