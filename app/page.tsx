"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { SoundButton } from "@/components/ui/sound-button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AudioSettings } from "@/components/audio-settings"
import { Gamepad2, Users, Settings, Volume2 } from "lucide-react"
import { io, Socket } from "socket.io-client"

interface AvailableRoom {
  id: string
  playerCount: number
  maxPlayers: number
  status: "waiting"
  targetScore: number
}

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
      // CRITICAL: Correct namespace configuration
      path: "/api/socketio",
      addTrailingSlash: false,
      // Force polling for Render.com compatibility
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

    // CRITICAL: Enhanced connection success handling
    newSocket.on("connect", () => {
      console.log("✅ Connected to server successfully")
      console.log("  - Socket ID:", newSocket.id)
      console.log("  - Transport:", newSocket.io.engine.transport.name)
      console.log("  - Namespace:", newSocket.nsp.name)
      setConnectionStatus('connected')
      setConnectionError(null)
      
      // Request available rooms when connected
      newSocket.emit("get-available-rooms", {}, (response: { rooms: AvailableRoom[] }) => {
        if (response.rooms) {
          setAvailableRooms(response.rooms)
        }
      })
    })

    // CRITICAL: Handle connection success confirmation
    newSocket.on("connection-success", (data) => {
      console.log("🎉 Connection success confirmed:", data)
      setConnectionStatus('connected')
      setConnectionError(null)
    })

    // CRITICAL: Handle namespace errors specifically
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

    // Enhanced error handling
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

    // CRITICAL: Handle packet errors (including namespace issues)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Gamepad2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Language Quiz Game</h1>
          </div>
          <p className="text-lg text-gray-600">
            Test your language skills with friends in real-time multiplayer quizzes
          </p>
          
          {/* Enhanced Connection Status */}
          <div className="mt-4">
            {connectionStatus === 'connecting' && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                🔄 Connecting to server...
              </Badge>
            )}
            {connectionStatus === 'connected' && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                ✅ Connected
              </Badge>
            )}
            {connectionStatus === 'error' && (
              <div className="space-y-2">
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  ❌ Connection failed
                </Badge>
                {connectionError && (
                  <p className="text-sm text-red-600 max-w-md mx-auto">
                    {connectionError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Game Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Player Setup */}
            <Card>
              <CardHeader>
                <CardTitle>Join the Game</CardTitle>
                <CardDescription>
                  Enter your name to create or join a quiz room
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="playerName" className="block text-sm font-medium mb-2">
                    Your Name
                  </label>
                  <Input
                    id="playerName"
                    type="text"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <SoundButton
                    onClick={handleCreateRoom}
                    className="w-full"
                    size="lg"
                    disabled={!playerName.trim() || connectionStatus !== 'connected'}
                  >
                    <Gamepad2 className="h-5 w-5 mr-2" />
                    Create New Room
                  </SoundButton>

                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Enter room code"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      maxLength={6}
                    />
                    <SoundButton
                      onClick={() => handleJoinRoom()}
                      className="w-full"
                      variant="outline"
                      disabled={!playerName.trim() || !roomCode.trim() || isConnecting || connectionStatus !== 'connected'}
                    >
                      {isConnecting ? "Joining..." : "Join Room"}
                    </SoundButton>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available Rooms */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Available Rooms
                  <Badge variant="secondary">{availableRooms.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Join an existing game room or create your own
                </CardDescription>
              </CardHeader>
              <CardContent>
                {connectionStatus !== 'connected' ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-lg font-medium mb-2">
                      {connectionStatus === 'connecting' ? 'Connecting to server...' : 'Connection failed'}
                    </p>
                    <p className="text-sm">
                      {connectionStatus === 'connecting' 
                        ? 'Please wait while we establish connection' 
                        : connectionError || 'Please refresh the page to try again'
                      }
                    </p>
                  </div>
                ) : availableRooms.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No active rooms</p>
                    <p className="text-sm">Be the first to create a room!</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {availableRooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-mono text-lg font-bold text-blue-600">
                              {room.id}
                            </p>
                            <p className="text-sm text-gray-500">
                              Target: {room.targetScore} points
                            </p>
                          </div>
                          <Badge variant="outline">
                            {room.playerCount}/{room.maxPlayers} players
                          </Badge>
                        </div>
                        <SoundButton
                          onClick={() => handleJoinRoom(room.id)}
                          disabled={!playerName.trim() || isConnecting || connectionStatus !== 'connected'}
                          size="sm"
                        >
                          {isConnecting ? "Joining..." : "Join"}
                        </SoundButton>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Settings Panel */}
          <div className="space-y-6">
            {/* Audio Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Settings</h3>
                <SoundButton
                  onClick={() => setShowAudioSettings(!showAudioSettings)}
                  variant="outline"
                  size="sm"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Audio
                </SoundButton>
              </div>
              
              {showAudioSettings && <AudioSettings />}
            </div>

            {/* Game Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How to Play</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-2">
                  <p className="font-medium">🎯 Game Rules:</p>
                  <ul className="space-y-1 text-gray-600 ml-4">
                    <li>• Choose your target language</li>
                    <li>• Translate English words correctly</li>
                    <li>• Earn points for correct answers</li>
                    <li>• First to reach target score wins!</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="font-medium">🌍 Languages:</p>
                  <div className="flex flex-wrap gap-1">
                    {["French", "German", "Russian", "Japanese", "Spanish"].map((lang) => (
                      <Badge key={lang} variant="outline" className="text-xs">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Enhanced Connection Troubleshooting */}
                {connectionStatus === 'error' && (
                  <div className="space-y-2 mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="font-medium text-red-700">🔧 Connection Issues?</p>
                    <ul className="space-y-1 text-red-600 text-xs ml-4">
                      <li>• Try refreshing the page</li>
                      <li>• Check your internet connection</li>
                      <li>• Disable ad blockers if any</li>
                      <li>• Try a different browser</li>
                      <li>• Clear browser cache and cookies</li>
                    </ul>
                    {connectionError && (
                      <div className="mt-2 p-2 bg-red-100 rounded text-xs">
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