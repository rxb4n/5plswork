import type { NextRequest } from "next/server"

const connections = new Map<string, ReadableStreamDefaultController>()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get("roomId")
  const playerId = searchParams.get("playerId")

  if (!roomId || !playerId) {
    return new Response("Missing roomId or playerId", { status: 400 })
  }

  const stream = new ReadableStream({
    start(controller) {
      connections.set(`${roomId}-${playerId}`, controller)

      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({ type: "connected" })}\n\n`)

      // Keep connection alive
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({ type: "ping" })}\n\n`)
        } catch (error) {
          clearInterval(keepAlive)
          connections.delete(`${roomId}-${playerId}`)
        }
      }, 30000)

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive)
        connections.delete(`${roomId}-${playerId}`)
        try {
          controller.close()
        } catch (error) {
          // Connection already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

// Function to broadcast to all connections in a room
export function broadcastToRoom(roomId: string, message: any) {
  for (const [key, controller] of connections.entries()) {
    if (key.startsWith(`${roomId}-`)) {
      try {
        controller.enqueue(`data: ${JSON.stringify(message)}\n\n`)
      } catch (error) {
        connections.delete(key)
      }
    }
  }
}
