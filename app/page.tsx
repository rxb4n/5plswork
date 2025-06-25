import React, { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SoundButton } from "@/components/ui/sound-button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { 
  Users, 
  Settings, 
  Crown, 
  Play, 
  RotateCcw, 
  LogOut, 
  Clock, 
  Trophy,
  BookOpen,
  Zap,
  Globe,
  Heart as HandHeart,
  Timer,
  Target,
  Loader2,
  Check,
  X
} from "lucide-react"
import { io, Socket } from "socket.io-client"
import { useAudio } from "@/lib/audio"

interface Question {
  questionId: string;
  english: string;
  correctAnswer: string;
  options: string[];
}

interface Player {
  id: string;
  name: string;
  language: "french" | "german" | "russian" | "japanese" | "spanish" | null;
  ready: boolean;
  score: number;
  is_host: boolean;
  current_question: Question | null;
  last_seen: Date;
}

interface Room {
  id: string;
  players: Player[];
  game_state: "lobby" | "playing" | "finished";
  game_mode: "practice" | "competition" | "cooperation" | null;
  host_language: "french" | "german" | "russian" | "japanese" | "spanish" | null;
  winner_id?: string;
  last_activity: Date;
  created_at: Date;
  question_count: number;
  target_score: number;
  cooperation_lives?: number;
  cooperation_score?: number;
  used_words?: string[];
  current_category?: string;
  current_challenge_player?: string;
  cooperation_waiting?: boolean;
}

interface CooperationChallenge {
  categoryId: string;
  categoryName: string;
  englishName: string;
  language: string;
  challengeId: string;
}

const LANGUAGES = [
  { value: "french", label: "🇫🇷 French" },
  { value: "german", label: "🇩🇪 German" },
  { value: "russian", label: "🇷🇺 Russian" },
  { value: "japanese", label: "🇯🇵 Japanese" },
  { value: "spanish", label: "🇪🇸 Spanish" },
] as const

const TARGET_SCORES = [100, 250, 500] as const

export default function RoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const audio = useAudio()
  
  // Extract parameters from URL
  const roomId = params.roomId as string
  const playerId = searchParams.get('playerId')
  const playerName = searchParams.get('name')
  const isHost = searchParams.get('isHost') === 'true'

  // Validate required parameters
  useEffect(() => {
    if (!roomId || !playerId || !playerName) {
      console.error('❌ Missing required parameters:', { roomId, playerId, playerName })
      alert('Missing required parameters. Redirecting to home page.')
      router.push('/')
      return
    }
  }, [roomId, playerId, playerName, router])

  const [socket, setSocket] = useState<Socket | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Game state
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string>("")
  const [timeLeft, setTimeLeft] = useState(10)
  const [isAnswering, setIsAnswering] = useState(false)
  const [questionStartTime, setQuestionStartTime] = useState<number>(0)
  const [questionLoadingError, setQuestionLoadingError] = useState<string | null>(null)
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false)
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(false)
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null)
  const [isWaitingForNextQuestion, setIsWaitingForNextQuestion] = useState(false)

  // Cooperation mode state
  const [cooperationChallenge, setCooperationChallenge] = useState<CooperationChallenge | null>(null)
  const [pendingChallenge, setPendingChallenge] = useState<CooperationChallenge | null>(null)
  const [cooperationAnswer, setCooperationAnswer] = useState("")
  const [cooperationTyping, setCooperationTyping] = useState<{ playerId: string; text: string } | null>(null)
  const [isCooperationWaiting, setIsCooperationWaiting] = useState(false)
  const [cooperationCountdown, setCooperationCountdown] = useState(5)
  const [cooperationTimerActive, setCooperationTimerActive] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const activityPingRef = useRef<NodeJS.Timeout | null>(null)
  const questionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cooperationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const loadQuestionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingChallengeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce function for loadQuestion
  const debounceLoadQuestion = useCallback((gameRoom: Room) => {
    if (loadQuestionTimeoutRef.current) {
      clearTimeout(loadQuestionTimeoutRef.current)
    }
    loadQuestionTimeoutRef.current = setTimeout(() => {
      loadQuestion(gameRoom)
    }, 100)
  }, [])

  // Initialize socket connection
  useEffect(() => {
    if (!roomId || !playerId || !playerName) return

    console.log("🔌 Initializing Socket.IO connection for room...")
    console.log("📋 Room parameters:", { roomId, playerId, playerName, isHost })
    
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
      console.log("  - Socket ID:", newSocket.id)
      setConnectionStatus('connected')
      setError(null)
      
      if (isHost) {
        console.log(`🏠 Creating room ${roomId} as host`)
        newSocket.emit("create-room", { 
          roomId, 
          playerId, 
          data: { targetScore: 100 } 
        }, (response: any) => {
          console.log("📡 Create room response:", response)
          if (response.error) {
            console.error("❌ Failed to create room:", response.error)
            setError(response.error)
            setIsLoading(false)
          } else {
            console.log("✅ Room created successfully:", response.room)
            setRoom(response.room)
            newSocket.emit("join-room", { 
              roomId, 
              playerId, 
              data: { name: decodeURIComponent(playerName), isHost: true } 
            }, (joinResponse: any) => {
              console.log("📡 Join room response:", joinResponse)
              if (joinResponse.error) {
                console.error("❌ Failed to join created room:", joinResponse.error)
                setError(joinResponse.error)
              } else {
                console.log("✅ Host joined room successfully:", joinResponse.room)
                setRoom(joinResponse.room)
              }
              setIsLoading(false)
            })
          }
        })
      } else {
        console.log(`👤 Joining room ${roomId}`)
        newSocket.emit("join-room", { 
          roomId, 
          playerId, 
          data: { name: decodeURIComponent(playerName), isHost: false } 
        }, (response: any) => {
          console.log("📡 Join room response:", response)
          if (response.error) {
            console.error("❌ Failed to join room:", response.error)
            setError(response.error)
            setIsLoading(false)
          } else {
            console.log("✅ Joined room successfully:", response.room)
            setRoom(response.room)
            setIsLoading(false)
          }
        })
      }
    })

    newSocket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error)
      setConnectionStatus('error')
      setError(`Connection failed: ${error.message}`)
      setIsLoading(false)
    })

    newSocket.on("room-update", ({ room: updatedRoom }: { room: Room }) => {
      console.log(`[DEBUG] room-update at ${new Date().toISOString()}`, updatedRoom)
      console.log(`[DEBUG] current_challenge_player: ${updatedRoom.current_challenge_player}`)
      setRoom(updatedRoom)
      if (pendingChallenge && updatedRoom.game_state === "playing" && updatedRoom.game_mode === "cooperation") {
        console.log("[DEBUG] Processing pending challenge with updated room")
        processCooperationChallenge(pendingChallenge, updatedRoom)
        setPendingChallenge(null)
        if (pendingChallengeTimeoutRef.current) {
          clearTimeout(pendingChallengeTimeoutRef.current)
        }
      }
    })

    newSocket.on("cooperation-challenge", ({ challenge }: { challenge: CooperationChallenge }) => {
      console.log("[DEBUG] Cooperation challenge received:", challenge)
      if (!room || room.game_state !== "playing" || room.game_mode !== "cooperation") {
        console.log("[DEBUG] Room state not ready, buffering challenge")
        setPendingChallenge(challenge)
        // Set timeout to clear pending challenge if not processed
        pendingChallengeTimeoutRef.current = setTimeout(() => {
          if (pendingChallenge) {
            console.error("[DEBUG] Pending challenge timeout, clearing")
            setPendingChallenge(null)
            setError("Failed to start cooperation challenge. Please try restarting the game.")
            setTimeout(() => setError(null), 3000)
          }
        }, 5000)
        return
      }
      processCooperationChallenge(challenge, room)
    })

    newSocket.on("cooperation-waiting", ({ isWaiting }: { isWaiting: boolean }) => {
      console.log("[DEBUG] Cooperation waiting state:", isWaiting)
      if (isWaiting && !cooperationChallenge && !pendingChallenge) {
        setIsCooperationWaiting(isWaiting)
        setCooperationAnswer("")
        setCooperationTyping(null)
        stopCooperationTimer()
      }
    })

    newSocket.on("cooperation-typing", ({ playerId: typingPlayerId, text }: { playerId: string; text: string }) => {
      if (typingPlayerId !== playerId) {
        setCooperationTyping({ playerId: typingPlayerId, text })
      }
    })

    newSocket.on("host-left", () => {
      console.log("🚨 Host left the room")
      setError("Host left the room. Redirecting to home page...")
      setTimeout(() => {
        router.push('/')
      }, 2000)
    })

    newSocket.on("error", (errorData: any) => {
      console.error("❌ Socket error:", errorData)
      setError(errorData.message || "An error occurred")
      if (errorData.status === 404) {
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    })

    newSocket.on("disconnect", (reason) => {
      console.log("🔌 Disconnected from server, reason:", reason)
      setConnectionStatus('connecting')
    })

    newSocket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Reconnected after", attemptNumber, "attempts")
      setConnectionStatus('connected')
      setError(null)
      newSocket.emit("join-room", { 
        roomId, 
        playerId, 
        data: { name: decodeURIComponent(playerName), isHost } 
      })
    })

    setSocket(newSocket)

    activityPingRef.current = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit("room-activity-ping", { roomId, playerId })
      }
    }, 30000)

    return () => {
      console.log("🔌 Cleaning up socket connection...")
      if (activityPingRef.current) clearInterval(activityPingRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      if (questionUpdateTimeoutRef.current) clearTimeout(questionUpdateTimeoutRef.current)
      if (cooperationTimerRef.current) clearInterval(cooperationTimerRef.current)
      if (loadQuestionTimeoutRef.current) clearTimeout(loadQuestionTimeoutRef.current)
      if (pendingChallengeTimeoutRef.current) clearTimeout(pendingChallengeTimeoutRef.current)
      newSocket.close()
    }
  }, [roomId, playerId, playerName, isHost, router])

  // Process cooperation challenge
  const processCooperationChallenge = (challenge: CooperationChallenge, gameRoom: Room) => {
    if (!challenge || !challenge.challengeId || !challenge.language) {
      console.error("[DEBUG] Invalid cooperation challenge received:", challenge)
      setError("Invalid challenge received")
      return
    }
    console.log("🤝 Processing cooperation challenge:", challenge)
    setCooperationChallenge(challenge)
    setIsCooperationWaiting(false)
    setCooperationAnswer("")
    setCooperationTyping(null)
    
    if (gameRoom.current_challenge_player === playerId && gameRoom.game_state === "playing") {
      console.log("[DEBUG] Starting cooperation timer for current player", playerId)
      startCooperationTimer()
    }
  }

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socket && playerId) {
        socket.emit("leave-room", { roomId, playerId })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [socket, roomId, playerId])

  // Load initial question when game starts
  useEffect(() => {
    if (
      room?.game_state === "playing" &&
      (room.game_mode === "practice" || room.game_mode === "competition") &&
      !currentQuestion &&
      !isLoadingQuestion &&
      !isAnswering &&
      !showAnswerFeedback
    ) {
      console.log("[DEBUG] Loading initial question on game start")
      setIsWaitingForNextQuestion(true)
      debounceLoadQuestion(room)
    }
  }, [room?.game_state, room?.game_mode, currentQuestion, isLoadingQuestion, isAnswering, showAnswerFeedback, debounceLoadQuestion])

  // Load question function
  const loadQuestion = async (gameRoom: Room) => {
    console.log(`[DEBUG] loadQuestion called at ${new Date().toISOString()} for mode ${gameRoom.game_mode}, isAnswering=${isAnswering}, showAnswerFeedback=${showAnswerFeedback}`)
    if (isLoadingQuestion || isAnswering || showAnswerFeedback) {
      console.log("[DEBUG] loadQuestion blocked")
      return
    }
    
    setIsLoadingQuestion(true)
    setQuestionLoadingError(null)
    
    try {
      let language: string
      
      if (gameRoom.game_mode === "practice") {
        const currentPlayer = gameRoom.players.find(p => p.id === playerId)
        if (!currentPlayer?.language) {
          throw new Error("No language selected for practice mode")
        }
        language = currentPlayer.language
      } else if (gameRoom.game_mode === "competition") {
        if (!gameRoom.host_language) {
          throw new Error("No host language set for competition mode")
        }
        language = gameRoom.host_language
      } else {
        throw new Error("Invalid game mode for question loading")
      }

      console.log(`🎯 Loading question for ${gameRoom.game_mode} mode in ${language}`)

      const response = await fetch('/api/get-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success && data.question) {
        console.log(`✅ Question loaded successfully:`, data.question)
        setCurrentQuestion(data.question)
        setSelectedAnswer("")
        setTimeLeft(10)
        setQuestionStartTime(Date.now())
        setShowAnswerFeedback(false)
        setLastAnswerCorrect(null)
        setIsWaitingForNextQuestion(false)
        
        if (timerRef.current) clearInterval(timerRef.current)
        
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current!)
              handleAnswer("", true)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        throw new Error('Invalid question data received')
      }
    } catch (error) {
      console.error(`❌ Question loading failed:`, error)
      setQuestionLoadingError(`Failed to load question: ${error.message}`)
      setIsWaitingForNextQuestion(false)
    } finally {
      setIsLoadingQuestion(false)
    }
  }

  // Cooperation timer functions
  const startCooperationTimer = () => {
    console.log(`[DEBUG] Starting timer at ${new Date().toISOString()}: 5`)
    setCooperationCountdown(5)
    setCooperationTimerActive(true)
    
    if (cooperationTimerRef.current) {
      console.log("[DEBUG] Clearing existing timer")
      clearInterval(cooperationTimerRef.current)
    }
    
    cooperationTimerRef.current = setInterval(() => {
      setCooperationCountdown(prev => {
        const newTime = prev - 1
        console.log(`[DEBUG] Timer tick at ${new Date().toISOString()}: ${newTime}`)
        
        if (newTime <= 0) {
          console.log("[DEBUG] Timer expired")
          clearInterval(cooperationTimerRef.current!)
          setCooperationTimerActive(false)
          handleCooperationTimeout()
          return 0
        }
        return newTime
      })
    }, 1000)
  }

  const stopCooperationTimer = () => {
    if (cooperationTimerRef.current) {
      console.log("[DEBUG] Stopping timer")
      clearInterval(cooperationTimerRef.current)
      cooperationTimerRef.current = null
    }
    setCooperationTimerActive(false)
    setCooperationCountdown(5)
  }

  const handleCooperationTimeout = () => {
    if (!socket || !room) return
    
    stopCooperationTimer()
    audio.playFailure()
    
    const newLives = Math.max(0, (room.cooperation_lives || 3) - 1)
    console.log(`[DEBUG] Lives remaining: ${newLives}`)
    
    const otherPlayer = room.players.find(p => p.id !== playerId)
    if (otherPlayer) {
      console.log(`[DEBUG] Turn switched to player: ${otherPlayer.name}`)
    }
    
    socket.emit("cooperation-timeout", {
      roomId,
      playerId,
      data: { challengeId: cooperationChallenge?.challengeId }
    })
  }

  // Get current player
  const currentPlayer = room?.players.find(p => p.id === playerId)
  const isCurrentPlayerHost = currentPlayer?.is_host || false

  // Handle answer submission
  const handleAnswer = async (answer: string, isTimeout: boolean = false) => {
    if (!currentQuestion || isAnswering || isLoadingQuestion) return
    
    setIsAnswering(true)
    
    if (timerRef.current) clearInterval(timerRef.current)

    const isCorrect = answer === currentQuestion.correctAnswer
    const isPracticeMode = room?.game_mode === "practice"
    
    setLastAnswerCorrect(isCorrect)
    setShowAnswerFeedback(true)
    setSelectedAnswer(answer)
    
    if (isCorrect) {
      audio.playSuccess()
    } else {
      audio.playFailure()
    }

    try {
      if (socket) {
        socket.emit("answer", {
          roomId,
          playerId,
          data: {
            answer,
            timeLeft: isTimeout ? 0 : timeLeft,
            correctAnswer: currentQuestion.correctAnswer,
            isPracticeMode
          }
        }, (response: any) => {
          if (response.error) {
            console.error("❌ Failed to submit answer:", response.error)
            setError(response.error)
          } else {
            setRoom(response.room)
          }
        })
      }

      setTimeout(() => {
        setShowAnswerFeedback(false)
        setIsAnswering(false)
        setCurrentQuestion(null)
        setSelectedAnswer("")
        setLastAnswerCorrect(null)
        
        if (room && (room.game_mode === "practice" || room.game_mode === "competition")) {
          setIsWaitingForNextQuestion(true)
          setTimeout(() => {
            debounceLoadQuestion(room)
          }, 500)
        }
      }, 3000)

    } catch (error) {
      console.error("❌ Error submitting answer:", error)
      setError("Failed to submit answer")
      setIsAnswering(false)
      setShowAnswerFeedback(false)
      setCurrentQuestion(null)
      setIsWaitingForNextQuestion(false)
    }
  }

  // Handle language selection
  const handleLanguageChange = (language: string) => {
    if (!socket || !currentPlayer) return

    console.log(`🌐 [DEBUG] Player ${playerId} selecting language: ${language}`)
    
    socket.emit("update-language", {
      roomId,
      playerId,
      data: { language }
    }, (response: any) => {
      if (response.error) {
        console.error("❌ Failed to update language:", response.error)
        setError(response.error)
      } else {
        console.log(`✅ [DEBUG] Language updated successfully to ${language}`)
      }
    })
  }

  // Handle ready toggle
  const handleReadyToggle = () => {
    if (!socket) return

    console.log(`⚡ [DEBUG] Player ${playerId} toggling ready status`)
    
    socket.emit("toggle-ready", { roomId, playerId }, (response: any) => {
      if (response.error) {
        console.error("❌ Failed to toggle ready:", response.error)
        setError(response.error)
      } else {
        console.log(`✅ [DEBUG] Ready status toggled successfully`)
      }
    })
  }

  // Handle game mode selection
  const handleGameModeChange = (gameMode: string) => {
    if (!socket || !isCurrentPlayerHost) return

    console.log(`🎮 [DEBUG] Host selecting game mode: ${gameMode}`)
    
    socket.emit("update-game-mode", {
      roomId,
      playerId,
      data: { gameMode }
    }, (response: any) => {
      if (response.error) {
        console.error("❌ Failed to update game mode:", response.error)
        setError(response.error)
      } else {
        console.log(`✅ [DEBUG] Game mode updated to ${gameMode}`)
      }
    })
  }

  // Handle host language selection
  const handleHostLanguageChange = (hostLanguage: string) => {
    if (!socket || !isCurrentPlayerHost) return

    console.log(`🌐 [DEBUG] Host selecting competition language: ${hostLanguage}`)
    
    socket.emit("update-host-language", {
      roomId,
      playerId,
      data: { hostLanguage }
    }, (response: any) => {
      if (response.error) {
        console.error("❌ Failed to update host language:", response.error)
        setError(response.error)
      } else {
        console.log(`✅ [DEBUG] Host language updated to ${hostLanguage}`)
      }
    })
  }

  // Handle target score change
  const handleTargetScoreChange = (targetScore: string) => {
    if (!socket || !isCurrentPlayerHost) return

    socket.emit("update-target-score", {
      roomId,
      playerId,
      data: { targetScore: parseInt(targetScore) }
    }, (response: any) => {
      if (response.error) {
        console.error("❌ Failed to update target score:", response.error)
        setError(response.error)
      }
    })
  }

  // Handle game start
  const handleStartGame = () => {
    if (!socket || !isCurrentPlayerHost) return

    console.log(`🎮 [DEBUG] Starting game in ${room?.game_mode} mode`)
    
    socket.emit("start-game", { roomId, playerId }, (response: any) => {
      if (response.error) {
        console.error("❌ Failed to start game:", response.error)
        setError(response.error)
      } else {
        console.log(`✅ [DEBUG] Game started successfully`)
      }
    })
  }

  // Handle restart
  const handleRestart = () => {
    if (!socket || !isCurrentPlayerHost) return

    socket.emit("restart", { roomId, playerId }, (response: any) => {
      if (response.error) {
        console.error("❌ Failed to restart game:", response.error)
        setError(response.error)
      }
    })
  }

  // Handle leave room
  const handleLeaveRoom = () => {
    console.log("🚪 Leaving room...")
    
    if (socket) {
      socket.emit("leave-room", { roomId, playerId })
    }
    
    window.location.href = "https://oneplswork.onrender.com/"
  }

  // Handle cooperation answer submission
  const handleCooperationSubmit = async () => {
    if (!cooperationChallenge || !cooperationAnswer.trim()) return

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

      if (result.isCorrect && !result.isUsed) {
        stopCooperationTimer()
        audio.playSuccess()
        
        socket?.emit("cooperation-answer", {
          roomId,
          playerId,
          data: {
            challengeId: cooperationChallenge.challengeId,
            answer: cooperationAnswer.trim(),
            isCorrect: true,
            wordId: result.wordId
          }
        })
      } else {
        console.log("❌ Cooperation answer result:", result.message)
        setError(result.message)
        setTimeout(() => setError(null), 3000)
      }
    } catch (error) {
      console.error("❌ Error validating cooperation answer:", error)
      setError("Failed to validate answer")
      setTimeout(() => setError(null), 3000)
    }
  }

  // Handle cooperation typing
  const handleCooperationTyping = (text: string) => {
    setCooperationAnswer(text)
    if (socket) {
      socket.emit("cooperation-typing", { roomId, playerId, text })
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {isHost ? 'Creating Room...' : 'Joining Room...'}
            </h2>
            <p className="text-gray-600 text-center">
              {connectionStatus === 'connecting' ? 'Connecting to server...' : 'Setting up room...'}
            </p>
            <div className="mt-4 text-sm text-gray-500">
              <p>Room ID: {roomId}</p>
              <p>Player: {decodeURIComponent(playerName || '')}</p>
              <p>Role: {isHost ? 'Host' : 'Player'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error && !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="text-red-500 text-6xl mb-4">❌</div>
            <h2 className="text-xl font-semibold mb-2 text-red-700">Error</h2>
            <p className="text-gray-600 text-center mb-4">{error}</p>
            <Button onClick={() => router.push('/')} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Loading Room...</h2>
            <p className="text-gray-600 text-center">Please wait while we load the room data.</p>
            <div className="mt-4 text-sm text-gray-500">
              <p>Connection: {connectionStatus}</p>
              <p>Room ID: {roomId}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 mobile-no-scroll">
      <div className="mobile-container mobile-padding">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              <h1 className="mobile-text-xl font-bold">Room {roomId}</h1>
            </div>
            {isCurrentPlayerHost && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                <Crown className="h-3 w-3 mr-1" />
                Host
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={
              connectionStatus === 'connected' 
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"
            }>
              {connectionStatus === 'connected' ? '✅ Connected' : '❌ Disconnected'}
            </Badge>
            <SoundButton
              onClick={handleLeaveRoom}
              variant="outline"
              className="mobile-btn-sm"
            >
              <LogOut className="h-4 w-4" />
            </SoundButton>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-700 text-center">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Question Loading Error */}
        {questionLoadingError && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <p className="text-orange-700 text-center">⚠️ {questionLoadingError}</p>
            </CardContent>
          </Card>
        )}

        {/* Game Content */}
        {room.game_state === "lobby" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Lobby Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="mobile-card">
                <CardHeader className="mobile-padding">
                  <CardTitle className="flex items-center gap-2 mobile-text-lg">
                    <Users className="h-5 w-5" />
                    Players ({room.players.length}/{room.game_mode === "cooperation" ? 2 : 8})
                  </CardTitle>
                </CardHeader>
                <CardContent className="mobile-spacing-sm mobile-padding">
                  {room.players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {player.is_host && <Crown className="h-4 w-4 text-yellow-600" />}
                          <span className="font-medium mobile-text-base">{player.name}</span>
                          {player.id === playerId && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {player.language && (
                          <Badge variant="outline" className="text-xs">
                            {LANGUAGES.find(l => l.value === player.language)?.label}
                          </Badge>
                        )}
                        <div className="flex items-center gap-1">
                          {player.ready ? (
                            <Badge variant="default" className="text-xs bg-green-600 text-white">
                              <Check className="h-3 w-3 mr-1" />
                              Ready
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <X className="h-3 w-3 mr-1" />
                              Not Ready
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {isCurrentPlayerHost && !room.game_mode && (
                <Card className="mobile-card">
                  <CardHeader className="mobile-padding">
                    <CardTitle className="mobile-text-lg">Select Game Mode</CardTitle>
                    <CardDescription className="mobile-text-base">
                      Choose how you want to play
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mobile-spacing-md mobile-padding">
                    <div className="mobile-spacing-sm">
                      <SoundButton
                        onClick={() => handleGameModeChange("practice")}
                        variant="outline"
                        className="w-full mobile-btn-lg justify-start"
                      >
                        <BookOpen className="h-5 w-5 mr-3 text-blue-600" />
                        <div className="text-left">
                          <div className="font-medium">Practice Mode</div>
                          <div className="text-sm text-gray-600">Individual language selection, no penalties</div>
                        </div>
                      </SoundButton>
                      <SoundButton
                        onClick={() => handleGameModeChange("competition")}
                        variant="outline"
                        className="w-full mobile-btn-lg justify-start"
                      >
                        <Zap className="h-5 w-5 mr-3 text-orange-600" />
                        <div className="text-left">
                          <div className="font-medium">Competition Mode</div>
                          <div className="text-sm text-gray-600">Same language for all, point penalties apply</div>
                        </div>
                      </SoundButton>
                      <SoundButton
                        onClick={() => handleGameModeChange("cooperation")}
                        variant="outline"
                        className="w-full mobile-btn-lg justify-start"
                      >
                        <HandHeart className="h-5 w-5 mr-3 text-purple-600" />
                        <div className="text-left">
                          <div className="font-medium">Cooperation Mode</div>
                          <div className="text-sm text-gray-600">2 players, type words by category, share 3 lives</div>
                        </div>
                      </SoundButton>
                    </div>
                  </CardContent>
                </Card>
              )}

              {room.game_mode && (
                <Card className="mobile-card">
                  <CardHeader className="mobile-padding">
                    <CardTitle className="flex items-center gap-2 mobile-text-lg">
                      <Settings className="h-5 w-5" />
                      Game Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="mobile-spacing-md mobile-padding">
                    <div className="flex items-center justify-between">
                      <span className="mobile-text-base font-medium">Game Mode:</span>
                      <div className="flex items-center gap-2">
                        {room.game_mode === "practice" && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <BookOpen className="h-3 w-3 mr-1" />
                            Practice
                          </Badge>
                        )}
                        {room.game_mode === "competition" && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            <Zap className="h-3 w-3 mr-1" />
                            Competition
                          </Badge>
                        )}
                        {room.game_mode === "cooperation" && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            <HandHeart className="h-3 w-3 mr-1" />
                            Cooperation
                          </Badge>
                        )}
                        {isCurrentPlayerHost && (
                          <SoundButton
                            onClick={() => handleGameModeChange(null)}
                            variant="outline"
                            size="sm"
                          >
                            Change
                          </SoundButton>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="mobile-text-base font-medium">Target Score:</span>
                      {isCurrentPlayerHost ? (
                        <Select value={room.target_score.toString()} onValueChange={handleTargetScoreChange}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TARGET_SCORES.map(score => (
                              <SelectItem key={score} value={score.toString()}>
                                {score}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">
                          <Target className="h-3 w-3 mr-1" />
                          {room.target_score}
                        </Badge>
                      )}
                    </div>
                    {room.game_mode === "competition" && (
                      <div className="flex items-center justify-between">
                        <span className="mobile-text-base font-medium">Language:</span>
                        {isCurrentPlayerHost ? (
                          <Select value={room.host_language || ""} onValueChange={handleHostLanguageChange}>
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {LANGUAGES.map(lang => (
                                <SelectItem key={lang.value} value={lang.value}>
                                  {lang.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">
                            <Globe className="h-3 w-3 mr-1" />
                            {room.host_language ? LANGUAGES.find(l => l.value === room.host_language)?.label : "Not set"}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {(room.game_mode === "practice" || room.game_mode === "cooperation") && (
                <Card className="mobile-card">
                  <CardHeader className="mobile-padding">
                    <CardTitle className="mobile-text-lg">Select Your Language</CardTitle>
                    <CardDescription className="mobile-text-base">
                      Choose the language you want to practice
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mobile-padding">
                    <Select value={currentPlayer?.language || ""} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a language..." />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(lang => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              )}

              {room.game_mode && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <SoundButton
                      onClick={handleReadyToggle}
                      className={`mobile-btn-lg px-8 ${
                        currentPlayer?.ready 
                          ? "bg-green-600 hover:bg-green-700 text-white" 
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                      disabled={
                        (room.game_mode === "practice" || room.game_mode === "cooperation") && !currentPlayer?.language ||
                        room.game_mode === "competition" && !room.host_language
                      }
                    >
                      {currentPlayer?.ready ? (
                        <>
                          <Check className="h-5 w-5 mr-2" />
                          Ready!
                        </>
                      ) : (
                        "Ready to Play"
                      )}
                    </SoundButton>
                  </div>
                  {isCurrentPlayerHost && room.players.every(p => p.ready) && (
                    <div className="flex justify-center">
                      <SoundButton
                        onClick={handleStartGame}
                        className="mobile-btn-lg px-8 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Play className="h-5 w-5 mr-2" />
                        Start Game
                      </SoundButton>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <Card className="mobile-card">
                <CardHeader className="mobile-padding">
                  <CardTitle className="mobile-text-lg">Game Rules</CardTitle>
                </CardHeader>
                <CardContent className="mobile-spacing-sm mobile-padding">
                  <div className="mobile-spacing-sm">
                    <p className="font-medium mobile-text-base">🎯 Game Modes:</p>
                    <div className="mobile-spacing-sm ml-4">
                      <div className="flex items-start gap-2">
                        <BookOpen className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-blue-600 mobile-text-sm">Practice Mode</p>
                          <p className="text-gray-600 mobile-text-sm">Individual language selection, no penalties for wrong answers</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Zap className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-orange-600 mobile-text-sm">Competition Mode</p>
                          <p className="text-gray-600 mobile-text-sm">Same language for all players, point penalties for wrong answers</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <HandHeart className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-purple-600 mobile-text-sm">Cooperation Mode</p>
                          <p className="text-gray-600 mobile-text-sm">2 players work together, type words by category, share 3 lives</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mobile-spacing-sm">
                    <p className="font-medium mobile-text-base">🎮 How to Play:</p>
                    <ul className="mobile-spacing-sm text-gray-600 ml-4">
                      <li className="mobile-text-sm">• Choose your game mode and language</li>
                      <li className="mobile-text-sm">• Translate English words correctly</li>
                      <li className="mobile-text-sm">• Earn points for correct answers</li>
                      <li className="mobile-text-sm">• First to reach target score wins!</li>
                    </ul>
                  </div>
                  <div className="mobile-spacing-sm">
                    <p className="font-medium mobile-text-base">🌍 Languages:</p>
                    <div className="mobile-flex-wrap">
                      {["French", "German", "Russian", "Japanese", "Spanish"].map((lang) => (
                        <Badge key={lang} variant="outline" className="mobile-text-sm">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {connectionStatus === 'error' && (
                    <div className="mobile-spacing-sm mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="font-medium text-red-700 mobile-text-sm">🔧 Connection Issues?</p>
                      <ul className="mobile-spacing-sm text-red-600 mobile-text-sm ml-4">
                        <li>• Try refreshing the page</li>
                        <li>• Check your internet connection</li>
                        <li>• Disable ad blockers if any</li>
                        <li>• Try a different browser</li>
                        <li>• Clear browser cache and cookies</li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {room.game_state === "playing" && (room.game_mode === "practice" || room.game_mode === "competition") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {isLoadingQuestion || isWaitingForNextQuestion ? (
                <Card className="mobile-card">
                  <CardContent className="flex flex-col items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                    <h3 className="mobile-text-lg font-semibold mb-2">Loading Question...</h3>
                    <p className="text-gray-600 text-center">Please wait while we prepare your next question.</p>
                  </CardContent>
                </Card>
              ) : showAnswerFeedback && currentQuestion ? (
                <Card className="mobile-card">
                  <CardHeader className="mobile-padding">
                    <div className="flex items-center justify-between">
                      <CardTitle className="mobile-text-xl">Translate this word:</CardTitle>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className={`font-bold ${timeLeft <= 3 ? 'text-red-600' : 'text-gray-700'}`}>
                          {timeLeft}s
                        </span>
                      </div>
                    </div>
                    <CardDescription className="mobile-text-lg font-semibold text-blue-600">
                      {currentQuestion.english}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mobile-spacing-md mobile-padding">
                    <div className="grid grid-cols-1 gap-3">
                      {currentQuestion.options.map((option, index) => (
                        <SoundButton
                          key={index}
                          onClick={() => handleAnswer(option)}
                          disabled={true}
                          className={`answer-option ${
                            option === currentQuestion.correctAnswer
                              ? 'correct'
                              : option === selectedAnswer && option !== currentQuestion.correctAnswer
                              ? 'incorrect'
                              : ''
                          }`}
                          style={{ 
                            height: '60px',
                            width: '85%',
                            margin: '0 auto',
                            color: option === currentQuestion.correctAnswer || 
                                  (option === selectedAnswer && option !== currentQuestion.correctAnswer)
                                  ? 'white' : 'black'
                          }}
                        >
                          {option}
                        </SoundButton>
                      ))}
                    </div>
                    <div className="correct-answer-display">
                      {lastAnswerCorrect ? (
                        <span>✅ Correct! Well done!</span>
                      ) : (
                        <span>❌ Incorrect. The correct answer was: <strong>{currentQuestion.correctAnswer}</strong></span>
                      )}
                    </div>
                    <Progress value={(10 - timeLeft) * 10} className="w-full mt-4" />
                  </CardContent>
                </Card>
              ) : currentQuestion ? (
                <Card className="mobile-card">
                  <CardHeader className="mobile-padding">
                    <div className="flex items-center justify-between">
                      <CardTitle className="mobile-text-xl">Translate this word:</CardTitle>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className={`font-bold ${timeLeft <= 3 ? 'text-red-600' : 'text-gray-700'}`}>
                          {timeLeft}s
                        </span>
                      </div>
                    </div>
                    <CardDescription className="mobile-text-lg font-semibold text-blue-600">
                      {currentQuestion.english}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mobile-spacing-md mobile-padding">
                    <div className="grid grid-cols-1 gap-3">
                      {currentQuestion.options.map((option, index) => (
                        <SoundButton
                          key={index}
                          onClick={() => handleAnswer(option)}
                          disabled={isAnswering || showAnswerFeedback}
                          className={`answer-option ${
                            showAnswerFeedback
                              ? option === currentQuestion.correctAnswer
                                ? 'correct'
                                : option === selectedAnswer && option !== currentQuestion.correctAnswer
                                ? 'incorrect'
                                : ''
                              : ''
                          }`}
                          style={{ 
                            height: '60px',
                            width: '85%',
                            margin: '0 auto',
                            color: showAnswerFeedback && (
                              option === currentQuestion.correctAnswer || 
                              (option === selectedAnswer && option !== currentQuestion.correctAnswer)
                            ) ? 'white' : 'black'
                          }}
                        >
                          {option}
                        </SoundButton>
                      ))}
                    </div>

                    {showAnswerFeedback && (
                      <div className="correct-answer-display">
                        {lastAnswerCorrect ? (
                          <span>✅ Correct! Well done!</span>
                        ) : (
                          <span>❌ Incorrect. The correct answer was: <strong>{currentQuestion.correctAnswer}</strong></span>
                        )}
                      </div>
                    )}

                    <Progress value={(10 - timeLeft) * 10} className="w-full mt-4" />
                  </CardContent>
                </Card>
              ) : (
                <Card className="mobile-card">
                  <CardContent className="flex flex-col items-center justify-center p-8">
                    <Timer className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="mobile-text-lg font-semibold mb-2">Waiting for Question</h3>
                    <p className="text-gray-600 text-center">Your next question will appear here.</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="leaderboard-container">
                <CardHeader className="mobile-padding">
                  <CardTitle className="flex items-center gap-2 mobile-text-lg">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                    Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="mobile-spacing-sm mobile-padding">
                  {room.players
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => (
                      <div
                        key={player.id}
                        className={`leaderboard-player ${player.id === playerId ? 'current-player' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-500">#{index + 1}</span>
                          {index === 0 && <Trophy className="h-4 w-4 text-yellow-600" />}
                          <span className="player-name">{player.name}</span>
                          {player.id === playerId && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <span className="player-score">{player.score}</span>
                      </div>
                    ))}
                </CardContent>
              </div>
            </div>
          </div>
        )}

        {room.game_state === "playing" && room.game_mode === "cooperation" && (
          <div className="mobile-spacing-md">
            <Card className="mobile-card">
              <CardContent className="mobile-padding">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="mobile-text-2xl font-bold text-purple-600">
                        {room.cooperation_score || 0}
                      </div>
                      <div className="mobile-text-sm text-gray-600">Score</div>
                    </div>
                    <div className="text-center">
                      <div className="mobile-text-2xl font-bold text-red-600">
                        {"❤️".repeat(room.cooperation_lives || 0)}
                      </div>
                      <div className="mobile-text-sm text-gray-600">Lives</div>
                    </div>
                    {cooperationChallenge && cooperationTimerActive && (
                      <div className="text-center">
                        <div className={`cooperation-timer ${cooperationCountdown <= 2 ? 'warning' : 'normal'}`}>
                          {cooperationCountdown}
                        </div>
                        <div className="mobile-text-sm text-gray-600">Timer</div>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    <HandHeart className="h-3 w-3 mr-1" />
                    Cooperation
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="mobile-card">
              <CardContent className="mobile-padding">
                <div className="grid grid-cols-2 gap-4">
                  {room.players.map((player) => (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg border ${
                        room.current_challenge_player === player.id
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium mobile-text-base">{player.name}</span>
                        {room.current_challenge_player === player.id && (
                          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                            Current Turn
                          </Badge>
                        )}
                      </div>
                      {player.language && (
                        <div className="mt-1">
                          <Badge variant="outline" className="text-xs">
                            {LANGUAGES.find(l => l.value === player.language)?.label}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {isCooperationWaiting ? (
              <Card className="mobile-card">
                <CardContent className="flex flex-col items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
                  <h3 className="mobile-text-lg font-semibold mb-2">Preparing Next Challenge...</h3>
                  <p className="text-gray-600 text-center">Please wait while we set up your next word challenge.</p>
                </CardContent>
              </Card>
            ) : cooperationChallenge ? (
              <Card className="mobile-card">
                <CardHeader className="mobile-padding">
                  <CardTitle className="mobile-text-lg">
                    Category: {cooperationChallenge.categoryName}
                  </CardTitle>
                  <CardDescription className="mobile-text-base">
                    Type a word in <strong>{LANGUAGES.find(l => l.value === cooperationChallenge.language)?.label}</strong> that belongs to this category
                  </CardDescription>
                </CardHeader>
                <CardContent className="mobile-spacing-md mobile-padding">
                  {room.current_challenge_player === playerId ? (
                    <div className="mobile-spacing-sm">
                      <div className="flex gap-2">
                        <Input
                          value={cooperationAnswer}
                          onChange={(e) => handleCooperationTyping(e.target.value)}
                          placeholder={`Type a ${cooperationChallenge.englishName.toLowerCase()} word...`}
                          className="flex-1"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleCooperationSubmit()
                            }
                          }}
                        />
                        <SoundButton
                          onClick={handleCooperationSubmit}
                          disabled={!cooperationAnswer.trim()}
                          className="mobile-btn-md"
                        >
                          Submit
                        </SoundButton>
                      </div>
                      <p className="mobile-text-sm text-gray-600">
                        Your turn! Type your answer and press Enter or click Submit.
                      </p>
                    </div>
                  ) : (
                    <div className="mobile-spacing-sm">
                      <div className="p-4 bg-gray-50 rounded-lg border">
                        <p className="mobile-text-base text-gray-600 text-center">
                          Waiting for {room.players.find(p => p.id === room.current_challenge_player)?.name} to answer...
                        </p>
                        {cooperationTyping && (
                          <p className="mobile-text-sm text-blue-600 text-center mt-2">
                            Typing: "{cooperationTyping.text}"
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="mobile-card">
                <CardContent className="flex flex-col items-center justify-center p-8">
                  <Timer className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="mobile-text-lg font-semibold mb-2">Waiting for Challenge</h3>
                  <p className="text-gray-600 text-center">The next cooperation challenge will appear here.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {room.game_state === "finished" && (
          <div className="mobile-spacing-md">
            <Card className="mobile-card">
              <CardHeader className="mobile-padding text-center">
                <CardTitle className="mobile-text-2xl">
                  {room.game_mode === "cooperation" ? "Game Over!" : "Game Finished!"}
                </CardTitle>
                <CardDescription className="mobile-text-lg">
                  {room.game_mode === "cooperation" 
                    ? `Final Score: ${room.cooperation_score || 0} words`
                    : room.winner_id 
                      ? `${room.players.find(p => p.id === room.winner_id)?.name} wins!`
                      : "Game completed"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="mobile-spacing-md mobile-padding">
                <div className="mobile-spacing-sm">
                  <h3 className="mobile-text-lg font-semibold mb-3">Final Scores</h3>
                  {room.players
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {index === 0 && room.game_mode !== "cooperation" && (
                            <Trophy className="h-5 w-5 text-yellow-600" />
                          )}
                          <span className="font-medium mobile-text-base">{player.name}</span>
                          {player.id === playerId && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="mobile-text-sm">
                          {player.score} points
                        </Badge>
                      </div>
                    ))}
                </div>
                {isCurrentPlayerHost && (
                  <div className="flex justify-center">
                    <SoundButton
                      onClick={handleRestart}
                      className="mobile-btn-lg px-8"
                    >
                      <RotateCcw className="h-5 w-5 mr-2" />
                      Play Again
                    </SoundButton>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}