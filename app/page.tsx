"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { SoundButton } from "@/components/ui/sound-button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AudioSettings } from "@/components/audio-settings"
import { Gamepad2, Users, Settings, Volume2, BookOpen, Zap, Globe, Heart as HandHeart } from "lucide-react"
import { io, Socket } from "socket.io-client"

interface AvailableRoom {
  id: string
  playerCount: number
  maxPlayers: number
  status: "waiting"
  targetScore: number
  gameMode?: "practice" | "competition" | "cooperation" | null
  hostLanguage?: "french" | "german" | "russian" | "japanese" | "spanish" | "english" | null
}

const LANGUAGES = [
  { value: "english", label: "🇬🇧 English" },
  { value: "french", label: "🇫🇷 French" },
  { value: "german", label: "🇩🇪 German" },
  { value: "russian", label: "🇷🇺 Russian" },
  { value: "japanese", label: "🇯🇵 Japanese" },
  { value: "spanish", label: "🇪🇸 Spanish" },
] as const;

export default function HomePage() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [roomCode, setRoomCode] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([])
  const [showAudioSettings, setShowAudioSettings] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    console.log("🔌 Initializing Socket.IO connection...")
    
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
      console.log("  - Transport:", newSocket.io.engine.transport.name)
      console.log("  - Namespace:", newSocket.nsp.name)
      setConnectionStatus('connected')
      setConnectionError(null)
      
      newSocket.emit("get-available-rooms", {}, (response: { rooms: AvailableRoom[] }) => {
        if (response.rooms) {
          setAvailableRooms(response.rooms)
        }
      })
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
    })

    newSocket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error)
      setConnectionStatus('error')
      setConnectionError(`Connection failed: ${error.message}`)
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

    newSocket.on("reconnect_error", (error) => {
      console.error("❌ Reconnection error:", error)
      setConnectionError(`Reconnection failed: ${error.message}`)
    })

    newSocket.on("available-rooms-update", ({ rooms }: { rooms: AvailableRoom[] }) => {
      console.log("📡 Available rooms updated:", rooms)
      setAvailableRooms(rooms)
    })

    newSocket.io.on("error", (error) => {
      console.error("❌ Socket.IO engine error:", error)
      setConnectionStatus('error')
      setConnectionError(`Engine error: ${error.message || error}`)
    })

    newSocket.io.on("reconnect_failed", () => {
      console.error("❌ Failed to reconnect to server")
      setConnectionStatus('error')
      setConnectionError("Failed to reconnect after multiple attempts")
    })

    newSocket.on("error", (error) => {
      console.error("❌ Socket error:", error)
      if (error.message && error.message.includes("namespace")) {
        setConnectionError("Invalid namespace configuration")
      } else {
        setConnectionError(`Socket error: ${error.message || error}`)
      }
      setConnectionStatus('error')
    })

    setSocket(newSocket)

    return () => {
      console.log("🔌 Cleaning up socket connection...")
      newSocket.close()
    }
  }, [])

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert("Please enter your name")
      return
    }

    if (connectionStatus !== 'connected') {
      alert("Please wait for connection to establish")
      return
    }

    const newRoomCode = generateRoomCode()
    const playerId = `player-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    
    window.location.href = `/room/${newRoomCode}?playerId=${playerId}&name=${encodeURIComponent(playerName.trim())}&isHost=true`
  }

  const handleJoinRoom = (targetRoomCode?: string) => {
    const codeToJoin = targetRoomCode || roomCode.trim().toUpperCase()
    
    if (!codeToJoin) {
      alert("Please enter a room code")
      return
    }

    if (!playerName.trim()) {
      alert("Please enter your name")
      return
    }

    if (connectionStatus !== 'connected') {
      alert("Please wait for connection to establish")
      return
    }

    setIsConnecting(true)
    const playerId = `player-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    
    window.location.href = `/room/${codeToJoin}?playerId=${playerId}&name=${encodeURIComponent(playerName.trim())}&isHost=false`
  }

  const getGameModeDisplay = (room: AvailableRoom) => {
    if (!room.gameMode) {
      return (
        <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 mobile-touch-target">
          <Settings className="h-3 w-3 mr-1" />
          <span className="hidden sm:inline">Setting up...</span>
          <span className="sm:hidden">Setup</span>
        </Badge>
      )
    }

    if (room.gameMode === "practice") {
      return (
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 mobile-touch-target">
          <BookOpen className="h-3 w-3 mr-1" />
          Practice
        </Badge>
      )
    }

    if (room.gameMode === "cooperation") {
      return (
        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 mobile-touch-target">
          <HandHeart className="h-3 w-3 mr-1" />
          <span className="hidden sm:inline">Cooperation</span>
          <span className="sm:hidden">Coop</span>
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200 mobile-touch-target">
        <Zap className="h-3 w-3 mr-1" />
        <span className="hidden sm:inline">Competition</span>
        <span className="sm:hidden">Comp</span>
      </Badge>
    )
  }

  const getLanguageDisplay = (room: AvailableRoom) => {
    if (room.gameMode === "competition" && room.hostLanguage) {
      const language = LANGUAGES.find(l => l.value === room.hostLanguage)
      return (
        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 mobile-touch-target">
          <Globe className="h-3 w-3 mr-1" />
          <span className="hidden sm:inline">{language?.label || room.hostLanguage}</span>
          <span className="sm:hidden">{language?.label?.split(' ')[0] || room.hostLanguage}</span>
        </Badge>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 mobile-no-scroll">
      <div className="mobile-container mobile-padding">
        {/* Header - Mobile Optimized */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Gamepad2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            <h1 className="mobile-text-2xl sm:text-4xl font-bold text-gray-900">
              <span className="hidden sm:inline">Language Quiz Game</span>
              <span className="sm:hidden">Quiz Game</span>
            </h1>
          </div>
          <p className="mobile-text-base sm:text-lg text-gray-600 px-2">
            <span className="hidden sm:inline">Test your language skills with friends in real-time multiplayer quizzes</span>
            <span className="sm:hidden">Multiplayer language quizzes with friends</span>
          </p>
          
          {/* Connection Status - Mobile Optimizeds */}
          <div className="mt-4">
            {connectionStatus === 'connecting' && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 mobile-text-sm">
                🔄 Connecting...
              </Badge>
            )}
            {connectionStatus === 'connected' && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mobile-text-sm">
                ✅ Connected
              </Badge>
            )}
            {connectionStatus === 'error' && (
              <div className="mobile-spacing-sm">
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 mobile-text-sm">
                  ❌ Connection failed
                </Badge>
                {connectionError && (
                  <p className="mobile-text-sm text-red-600 max-w-md mx-auto mt-2 px-4">
                    {connectionError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mobile-grid-stack lg:grid-cols-3 lg:gap-6">
          {/* Main Game Controls - Mobile Optimized */}
          <div className="lg:col-span-2 mobile-spacing-md">
            {/* Player Setup - Mobile Optimized */}
            <Card className="mobile-card">
              <CardHeader className="mobile-padding">
                <CardTitle className="mobile-text-xl">Join the Game</CardTitle>
                <CardDescription className="mobile-text-base">
                  Enter your name to create or join a quiz room
                </CardDescription>
              </CardHeader>
              <CardContent className="mobile-spacing-md mobile-padding">
                <div>
                  <label htmlFor="playerName" className="block mobile-text-base font-medium mb-2">
                    Your Name
                  </label>
                  <Input
                    id="playerName"
                    type="text"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    className="mobile-input"
                  />
                </div>

                <div className="mobile-grid-2col">
                  <SoundButton
                    onClick={handleCreateRoom}
                    className="mobile-btn-lg w-full"
                    disabled={!playerName.trim() || connectionStatus !== 'connected'}
                  >
                    <Gamepad2 className="h-5 w-5 mr-2" />
                    <span className="hidden sm:inline">Create New Room</span>
                    <span className="sm:hidden">Create Room</span>
                  </SoundButton>

                  <div className="mobile-spacing-sm">
                    <Input
                      type="text"
                      placeholder="Room code"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="mobile-input"
                    />
                    <SoundButton
                      onClick={() => handleJoinRoom()}
                      className="mobile-btn-md w-full"
                      variant="outline"
                      disabled={!playerName.trim() || !roomCode.trim() || isConnecting || connectionStatus !== 'connected'}
                    >
                      {isConnecting ? "Joining..." : "Join Room"}
                    </SoundButton>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available Rooms - Mobile Optimized */}
            <Card className="mobile-card">
              <CardHeader className="mobile-padding">
                <CardTitle className="flex items-center gap-2 mobile-text-xl">
                  <Users className="h-5 w-5" />
                  <span className="hidden sm:inline">Available Rooms</span>
                  <span className="sm:hidden">Rooms</span>
                  <Badge variant="secondary" className="mobile-text-sm">{availableRooms.length}</Badge>
                </CardTitle>
                <CardDescription className="mobile-text-base">
                  <span className="hidden sm:inline">Join an existing game room or create your own</span>
                  <span className="sm:hidden">Join existing rooms</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="mobile-padding">
                {connectionStatus !== 'connected' ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="mobile-text-lg font-medium mb-2">
                      {connectionStatus === 'connecting' ? 'Connecting...' : 'Connection failed'}
                    </p>
                    <p className="mobile-text-sm px-4">
                      {connectionStatus === 'connecting' 
                        ? 'Please wait while we establish connection' 
                        : connectionError || 'Please refresh the page to try again'
                      }
                    </p>
                  </div>
                ) : availableRooms.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mobile-text-lg font-medium mb-2">No active rooms</p>
                    <p className="mobile-text-sm">Be the first to create a room!</p>
                  </div>
                ) : (
                  <div className="mobile-spacing-sm">
                    {availableRooms.map((room) => (
                      <div
                        key={room.id}
                        className="mobile-flex-stack sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-4"
                      >
                        {/* Room Info - Mobile Stacked */}
                        <div className="mobile-flex-stack sm:flex-row sm:items-center sm:gap-6 flex-1 min-w-0">
                          {/* Room ID */}
                          <div className="min-w-0">
                            <p className="font-mono mobile-text-lg sm:text-lg font-bold text-blue-600 break-all">
                              {room.id}
                            </p>
                          </div>

                          {/* Player Count */}
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <Badge variant="outline" className="mobile-text-sm">
                              {room.playerCount}/{room.maxPlayers}
                            </Badge>
                          </div>

                          {/* Game Mode & Language - Mobile Wrapped */}
                          <div className="mobile-flex-wrap">
                            {getGameModeDisplay(room)}
                            {getLanguageDisplay(room)}
                          </div>
                        </div>

                        {/* Join Button - Mobile Full Width */}
                        <div className="w-full sm:w-auto sm:ml-4">
                          <SoundButton
                            onClick={() => handleJoinRoom(room.id)}
                            disabled={!playerName.trim() || isConnecting || connectionStatus !== 'connected'}
                            className="mobile-btn-md w-full sm:w-auto sm:min-w-[80px]"
                          >
                            {isConnecting ? "Joining..." : "Join"}
                          </SoundButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Settings Panel - Mobile Optimized */}
          <div className="mobile-spacing-md">
            {/* Audio Settings */}
            <div className="mobile-spacing-md">
              <div className="flex items-center justify-between">
                <h3 className="mobile-text-lg font-semibold">Settings</h3>
                <SoundButton
                  onClick={() => setShowAudioSettings(!showAudioSettings)}
                  variant="outline"
                  className="mobile-btn-sm"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Audio
                </SoundButton>
              </div>
              
              {showAudioSettings && <AudioSettings />}
            </div>

            {/* Game Info - Mobile Optimized */}
            <Card className="mobile-card">
              <CardHeader className="mobile-padding">
                <CardTitle className="mobile-text-lg">How to Play</CardTitle>
              </CardHeader>
              <CardContent className="mobile-spacing-sm mobile-text-sm mobile-padding">
                <div className="mobile-spacing-sm">
                  <p className="font-medium mobile-text-base">🎯 Game Modes:</p>
                  <div className="mobile-spacing-sm ml-4">
                    <div className="flex items-start gap-2">
                      <BookOpen className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-blue-600 mobile-text-sm">Practice Mode</p>
                        <p className="text-gray-600 mobile-text-sm">Individual language selection, no penalties</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Zap className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-orange-600 mobile-text-sm">Competition Mode</p>
                        <p className="text-gray-600 mobile-text-sm">Same language for all, point penalties apply</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <HandHeart className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-purple-600 mobile-text-sm">Cooperation Mode</p>
                        <p className="text-gray-600 mobile-text-sm">2 players, type words by category, share 3 lives</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mobile-spacing-sm">
                  <p className="font-medium mobile-text-base">🎮 Game Rules:</p>
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
                    {connectionError && (
                      <div className="mt-2 p-2 bg-red-100 rounded mobile-text-sm">
                        <strong>Error details:</strong> {connectionError}
                      </div>
                    )}
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