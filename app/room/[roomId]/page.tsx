"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SoundButton } from "@/components/ui/sound-button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { useAudio } from "@/lib/audio"
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

  // Game state with debouncing
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string>("")
  const [timeLeft, setTimeLeft] = useState(10)
  const [isAnswering, setIsAnswering] = useState(false)
  const [questionStartTime, setQuestionStartTime] = useState<number>(0)
  const [questionLoadingError, setQuestionLoadingError] = useState<string | null>(null)
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false)

  // Cooperation mode state
  const [cooperationChallenge, setCooperationChallenge] = useState<CooperationChallenge | null>(null)
  const [cooperationAnswer, setCooperationAnswer] = useState("")
  const [cooperationTyping, setCooperationTyping] = useState<{ playerId: string; text: string } | null>(null)
  const [isCooperationWaiting, setIsCooperationWaiting] = useState(false)

  // Refs for cleanup and debouncing
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const activityPingRef = useRef<NodeJS.Timeout | null>(null)
  const questionLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastQuestionLoadRef = useRef<number>(0)

  // Debounced question loading function
  const loadQuestion = useCallback(async (language: string, forceReload = false) => {
    const now = Date.now()
    
    // Prevent duplicate calls within 1 second unless forced
    if (!forceReload && now - lastQuestionLoadRef.current < 1000) {
      console.log('🚫 [QUESTION] Skipping duplicate question load request')
      return
    }
    
    lastQuestionLoadRef.current = now
    
    if (isLoadingQuestion) {
      console.log('🚫 [QUESTION] Already loading question, skipping')
      return
    }

    console.log(`🔍 [QUESTION] Loading question for ${language}`)
    setIsLoadingQuestion(true)
    setQuestionLoadingError(null)
    
    // Clear any existing timeout
    if (questionLoadTimeoutRef.current) {
      clearTimeout(questionLoadTimeoutRef.current)
    }

    try {
      // Add timeout for the request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch('/api/get-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      console.log(`📡 [QUESTION] API response status: ${response.status}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`✅ [QUESTION] Question loaded successfully:`, data)
      
      if (data.success && data.question) {
        console.log(`📝 [QUESTION] Question details:`)
        console.log(`  - ID: ${data.question.questionId}`)
        console.log(`  - English: ${data.question.english}`)
        console.log(`  - Correct Answer: ${data.question.correctAnswer}`)
        console.log(`  - Options: ${data.question.options.join(', ')}`)
        
        setCurrentQuestion(data.question)
        setSelectedAnswer("")
        setTimeLeft(10)
        setQuestionStartTime(Date.now())
        
        // Start timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
        
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              // Time's up - auto submit
              handleAnswerSubmit("", data.question.correctAnswer, true)
              return 0
            }
            return prev - 1
          })
        }, 1000)
        
        return data.question
      } else {
        throw new Error('Invalid question data received')
      }
    } catch (error) {
      console.error(`❌ [QUESTION] Question loading failed:`, error)
      
      let errorMessage = 'Failed to load question'
      if (error.name === 'AbortError') {
        errorMessage = 'Question loading timed out'
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Cannot connect to question service'
      } else {
        errorMessage = `Failed to load question: ${error.message}`
      }
      
      setQuestionLoadingError(errorMessage)
      return null
    } finally {
      setIsLoadingQuestion(false)
    }
  }, [isLoadingQuestion])

  // Enhanced answer submission with proper audio feedback
  const handleAnswerSubmit = useCallback(async (answer: string, correctAnswer: string, isTimeout = false) => {
    if (isAnswering) {
      console.log('🚫 [ANSWER] Already processing answer, skipping')
      return
    }

    console.log(`📝 [ANSWER] Submitting answer: "${answer}", correct: "${correctAnswer}", timeout: ${isTimeout}`)
    setIsAnswering(true)
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const isCorrect = answer === correctAnswer && !isTimeout
    const responseTime = Date.now() - questionStartTime
    
    console.log(`🎯 [ANSWER] Answer is ${isCorrect ? 'correct' : 'incorrect'}, response time: ${responseTime}ms`)

    // Play appropriate sound effect
    try {
      if (isCorrect) {
        console.log('🔊 [ANSWER] Playing success sound')
        await audio.playSuccess()
      } else {
        console.log('🔊 [ANSWER] Playing failure sound')
        await audio.playFailure()
      }
    } catch (error) {
      console.warn('⚠️ [ANSWER] Failed to play sound:', error)
    }

    // Submit answer to server
    if (socket && room) {
      const answerData = {
        answer,
        timeLeft: isTimeout ? 0 : timeLeft,
        correctAnswer,
        isPracticeMode: room.game_mode === "practice"
      }

      socket.emit("answer", { roomId, playerId, data: answerData }, (response: any) => {
        if (response.error) {
          console.error("❌ [ANSWER] Failed to submit answer:", response.error)
          setError(response.error)
        } else {
          console.log("✅ [ANSWER] Answer submitted successfully")
          setRoom(response.room)
          
          // Load next question after a delay
          setTimeout(() => {
            const currentPlayer = response.room?.players.find((p: Player) => p.id === playerId)
            if (currentPlayer?.language && response.room?.game_state === "playing") {
              const language = room.game_mode === "competition" ? room.host_language : currentPlayer.language
              if (language) {
                loadQuestion(language, true) // Force reload for next question
              }
            }
          }, 2000)
        }
        setIsAnswering(false)
      })
    } else {
      setIsAnswering(false)
    }
  }, [isAnswering, socket, room, roomId, playerId, timeLeft, questionStartTime, audio, loadQuestion])

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
      
      // Join or create room with proper error handling
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
            
            // Now add the host player to the room
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
      console.log("📡 Room updated:", updatedRoom)
      setRoom(prevRoom => {
        // Prevent unnecessary re-renders if room data is the same
        if (JSON.stringify(prevRoom) === JSON.stringify(updatedRoom)) {
          console.log("🔄 Room data unchanged, skipping update")
          return prevRoom
        }
        
        // Check if game just started
        if (prevRoom?.game_state === "lobby" && updatedRoom.game_state === "playing") {
          console.log("🎮 Game started, loading initial question")
          const currentPlayer = updatedRoom.players.find(p => p.id === playerId)
          if (currentPlayer?.language) {
            const language = updatedRoom.game_mode === "competition" ? updatedRoom.host_language : currentPlayer.language
            if (language) {
              setTimeout(() => loadQuestion(language, true), 1000) // Delay to ensure state is updated
            }
          }
        }
        
        return updatedRoom
      })
    })

    // Enhanced cooperation mode handlers with better error handling
    newSocket.on("cooperation-challenge", ({ challenge }: { challenge: CooperationChallenge }) => {
      console.log("🤝 Cooperation challenge received:", challenge)
      setCooperationChallenge(challenge)
      setIsCooperationWaiting(false)
      setCooperationAnswer("")
      setCooperationTyping(null)
    })

    newSocket.on("cooperation-waiting", ({ isWaiting }: { isWaiting: boolean }) => {
      console.log("⏳ Cooperation waiting state:", isWaiting)
      setIsCooperationWaiting(isWaiting)
      if (isWaiting) {
        setCooperationChallenge(null)
        setCooperationAnswer("")
        setCooperationTyping(null)
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
    })

    setSocket(newSocket)

    // Set up activity ping
    activityPingRef.current = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit("room-activity-ping", { roomId, playerId })
      }
    }, 30000) // Ping every 30 seconds

    return () => {
      console.log("🔌 Cleaning up socket connection...")
      if (activityPingRef.current) {
        clearInterval(activityPingRef.current)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (questionLoadTimeoutRef.current) {
        clearTimeout(questionLoadTimeoutRef.current)
      }
      newSocket.close()
    }
  }, [roomId, playerId, playerName, isHost, router, loadQuestion])

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

  // Get current player
  const currentPlayer = room?.players.find(p => p.id === playerId)
  const isCurrentPlayerHost = currentPlayer?.is_host || false

  // Handle language selection
  const handleLanguageChange = (language: string) => {
    if (!socket || !currentPlayer) return

    console.log(`🌐 Player ${playerId} selecting language: ${language}`)
    
    socket.emit("update-language", {
      roomId,
      playerId,
      data: { language }
    }, (response: any) => {
      if (response.error) {
        console.error("❌ Failed to update language:", response.error)
        setError(response.error)
      } else {
        console.log(`✅ Language updated successfully to ${language}`)
      }
    })
  }

  // Handle ready toggle
  const handleReadyToggle = () => {
    if (!socket) return

    console.log(`⚡ Player ${playerId} toggling ready status`)
    
    socket.emit("toggle-ready", { roomId, playerId }, (response: any) => {
      if (response.error) {
        console.error("❌ Failed to toggle ready:", response.error)
        setError(response.error)
      } else {
        console.log(`✅ Ready status toggled successfully`)
      }
    })
  }

  // Handle game mode selection
  const handleGameModeChange = (gameMode: string) => {
    if (!socket || !isCurrentPlayerHost) return

    console.log(`🎮 Host selecting game mode: ${gameMode}`)
    
    socket.emit("update-game-mode", {
      roomId,
      playerId,
      data: { gameMode }
    }, (response: any) => {
      if (response.error) {
        console.error("❌ Failed to update game mode:", response.error)
        setError(response.error)
      } else {
        console.log(`✅ Game mode updated to ${gameMode}`)
      }
    })
  }

  // Handle host language selection (for competition mode)
  const handleHostLanguageChange = (hostLanguage: string) => {
    if (!socket || !isCurrentPlayerHost) return

    console.log(`🌐 Host selecting competition language: ${hostLanguage}`)
    
    socket.emit("update-host-language", {
      roomId,
      playerId,
      data: { hostLanguage }
    }, (response: any) => {
      if (response.error) {
        console.error("❌ Failed to update host language:", response.error)
        setError(response.error)
      } else {
        console.log(`✅ Host language updated to ${hostLanguage}`)
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

    console.log(`🎮 Starting game in ${room?.game_mode} mode`)
    
    socket.emit("start-game", { roomId, playerId }, (response: any) => {
      if (response.error) {
        console.error("❌ Failed to start game:", response.error)
        setError(response.error)
      } else {
        console.log(`✅ Game started successfully`)
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
    if (socket) {
      socket.emit("leave-room", { roomId, playerId })
    }
    router.push('/')
  }

  // Enhanced cooperation answer submission with better error handling
  const handleCooperationSubmit = async () => {
    if (!cooperationChallenge || !cooperationAnswer.trim()) return

    console.log(`🤝 [COOPERATION] Submitting answer: "${cooperationAnswer.trim()}"`)

    try {
      // Enhanced fetch with timeout and better error handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

      const response = await fetch('/api/validate-cooperation-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: cooperationChallenge.categoryId,
          answer: cooperationAnswer.trim(),
          language: cooperationChallenge.language,
          usedWords: room?.used_words || []
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log(`📡 [COOPERATION] Validation result:`, result)

      if (result.isCorrect && !result.isUsed) {
        // Correct answer
        console.log(`✅ [COOPERATION] Correct answer!`)
        await audio.playSuccess()
        
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
        // Wrong answer or already used
        console.log(`❌ [COOPERATION] ${result.message}`)
        await audio.playFailure()
        setError(result.message)
        setTimeout(() => setError(null), 3000)
      }
    } catch (error) {
      console.error("❌ [COOPERATION] Error validating answer:", error)
      
      let errorMessage = "Failed to validate answer"
      if (error.name === 'AbortError') {
        errorMessage = "Request timed out - please try again"
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = "Cannot connect to validation service"
      } else {
        errorMessage = `Validation failed: ${error.message}`
      }
      
      setError(errorMessage)
      setTimeout(() => setError(null), 5000)
      await audio.playFailure()
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
              <div className="mt-2 text-center">
                <Button 
                  onClick={() => {
                    const currentPlayer = room?.players.find(p => p.id === playerId)
                    if (currentPlayer?.language) {
                      const language = room.game_mode === "competition" ? room.host_language : currentPlayer.language
                      if (language) {
                        loadQuestion(language, true)
                      }
                    }
                  }}
                  size="sm"
                  variant="outline"
                >
                  Retry Loading Question
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Information */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-blue-700 mb-2">Debug Info</h3>
              <div className="text-sm text-blue-600 space-y-1">
                <p>Room State: {room.game_state}</p>
                <p>Players: {room.players.length}</p>
                <p>Current Player: {currentPlayer?.name || 'Not found'}</p>
                <p>Is Host: {isCurrentPlayerHost ? 'Yes' : 'No'}</p>
                <p>Game Mode: {room.game_mode || 'Not set'}</p>
                <p>Question Loading: {questionLoadingError ? 'Error' : isLoadingQuestion ? 'Loading' : currentQuestion ? 'Loaded' : 'None'}</p>
                <p>Audio Loaded: {audio.getLoadedSounds().join(', ') || 'None'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Game Content */}
        {room.game_state === "lobby" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Lobby Content */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* 1. Players List (Top Priority) */}
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

              {/* 2. Game Settings */}
              {/* Game Mode Selection */}
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

              {/* Game Settings */}
              {room.game_mode && (
                <Card className="mobile-card">
                  <CardHeader className="mobile-padding">
                    <CardTitle className="flex items-center gap-2 mobile-text-lg">
                      <Settings className="h-5 w-5" />
                      Game Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="mobile-spacing-md mobile-padding">
                    {/* Current Game Mode */}
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

                    {/* Target Score */}
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

                    {/* Host Language (Competition Mode) */}
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

              {/* Language Selection (Practice/Cooperation Mode) */}
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

              {/* 3. Ready/Start Button */}
              {room.game_mode && (
                <div className="space-y-4">
                  {/* Ready Button */}
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

                  {/* Start Game Button (Host Only) */}
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

            {/* 4. Rules Section (Side Panel) */}
            <div className="lg:col-span-1">
              <Card className="mobile-card">
                <CardHeader className="mobile-padding">
                  <CardTitle className="mobile-text-lg">Game Rules</CardTitle>
                </CardHeader>
                <CardContent className="mobile-spacing-sm mobile-text-sm mobile-padding">
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

        {/* Practice/Competition Mode Gameplay */}
        {room.game_state === "playing" && (room.game_mode === "practice" || room.game_mode === "competition") && (
          <div className="mobile-spacing-md">
            {/* Game Stats */}
            <Card className="mobile-card">
              <CardContent className="mobile-padding">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="mobile-text-2xl font-bold text-blue-600">
                        {currentPlayer?.score || 0}
                      </div>
                      <div className="mobile-text-sm text-gray-600">Your Score</div>
                    </div>
                    <div className="text-center">
                      <div className="mobile-text-lg font-bold text-gray-600">
                        {room.target_score}
                      </div>
                      <div className="mobile-text-sm text-gray-600">Target</div>
                    </div>
                  </div>
                  <Badge variant="outline" className={
                    room.game_mode === "practice" 
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-orange-50 text-orange-700 border-orange-200"
                  }>
                    {room.game_mode === "practice" ? (
                      <>
                        <BookOpen className="h-3 w-3 mr-1" />
                        Practice
                      </>
                    ) : (
                      <>
                        <Zap className="h-3 w-3 mr-1" />
                        Competition
                      </>
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Question Display */}
            {isLoadingQuestion ? (
              <Card className="mobile-card">
                <CardContent className="flex flex-col items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                  <h3 className="mobile-text-lg font-semibold mb-2">Loading Question...</h3>
                  <p className="text-gray-600 text-center">Please wait while we prepare your next question.</p>
                </CardContent>
              </Card>
            ) : currentQuestion ? (
              <Card className="mobile-card">
                <CardHeader className="mobile-padding">
                  <div className="flex items-center justify-between">
                    <CardTitle className="mobile-text-lg">
                      Translate: <span className="text-blue-600">{currentQuestion.english}</span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-gray-500" />
                      <span className={`font-bold ${timeLeft <= 3 ? 'text-red-600' : 'text-gray-700'}`}>
                        {timeLeft}s
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={(timeLeft / 10) * 100} 
                    className={`h-2 ${timeLeft <= 3 ? 'bg-red-100' : 'bg-blue-100'}`}
                  />
                </CardHeader>
                <CardContent className="mobile-spacing-md mobile-padding">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentQuestion.options.map((option, index) => (
                      <SoundButton
                        key={index}
                        onClick={() => handleAnswerSubmit(option, currentQuestion.correctAnswer)}
                        disabled={isAnswering || timeLeft <= 0}
                        variant={selectedAnswer === option ? "default" : "outline"}
                        className="mobile-btn-lg text-left justify-start p-4 h-auto"
                        soundType={option === currentQuestion.correctAnswer ? "success" : "failure"}
                      >
                        <span className="font-medium text-base">{option}</span>
                      </SoundButton>
                    ))}
                  </div>
                  
                  {isAnswering && (
                    <div className="mt-4 text-center">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600 mx-auto" />
                      <p className="text-sm text-gray-600 mt-2">Processing answer...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="mobile-card">
                <CardContent className="flex flex-col items-center justify-center p-8">
                  <Timer className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="mobile-text-lg font-semibold mb-2">Waiting for Question</h3>
                  <p className="text-gray-600 text-center">Your next question will appear here.</p>
                  {questionLoadingError && (
                    <Button 
                      onClick={() => {
                        const language = room.game_mode === "competition" ? room.host_language : currentPlayer?.language
                        if (language) {
                          loadQuestion(language, true)
                        }
                      }}
                      className="mt-4"
                      size="sm"
                    >
                      Load Question
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Leaderboard */}
            <Card className="mobile-card">
              <CardHeader className="mobile-padding">
                <CardTitle className="mobile-text-lg">Leaderboard</CardTitle>
              </CardHeader>
              <CardContent className="mobile-spacing-sm mobile-padding">
                {room.players
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {index === 0 && (
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
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cooperation Mode Gameplay */}
        {room.game_state === "playing" && room.game_mode === "cooperation" && (
          <div className="mobile-spacing-md">
            {/* Cooperation Stats */}
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
                  </div>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    <HandHeart className="h-3 w-3 mr-1" />
                    Cooperation
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Cooperation Challenge */}
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

        {/* Game Finished */}
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
                {/* Final Scores */}
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

                {/* Restart Button (Host Only) */}
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