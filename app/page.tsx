"use client"
import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Home } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [roomId, setRoomId] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setError("Please enter your name")
      return
    }
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    router.push(`/room/${newRoomId}?playerId=${Math.random().toString(36).substring(2, 10)}&name=${encodeURIComponent(playerName)}&isHost=true`)
  }

  const handleJoinRoom = () => {
    if (!roomId.trim() || !playerName.trim()) {
      setError("Please enter both room ID and your name")
      return
    }
    router.push(`/room/${roomId}?playerId=${Math.random().toString(36).substring(2, 10)}&name=${encodeURIComponent(playerName)}&isHost=false`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-6 w-6 text-blue-600" />
            Language Learning Game
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-red-600 text-center">{error}</p>
          )}
          <div className="space-y-2">
            <Input
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <Button onClick={handleCreateRoom} className="w-full">
              Create New Room
            </Button>
          </div>
          <div className="space-y-2">
            <Input
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            />
            <Button onClick={handleJoinRoom} className="w-full">
              Join Existing Room
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}