import { Server as SocketIOServer } from "socket.io"
import { getRoom, removePlayerFromRoom, deleteRoom, updateRoom, cleanupEmptyRooms } from "./database"

interface RoomActivity {
  roomId: string
  lastActivity: Date
  warningIssued: boolean
  players: string[]
}

class RoomActivityMonitor {
  private io: SocketIOServer
  private roomActivities: Map<string, RoomActivity> = new Map()
  private monitorInterval: NodeJS.Timeout | null = null
  private readonly INACTIVITY_THRESHOLD = 120000 // 120 seconds
  private readonly WARNING_THRESHOLD = 90000 // 90 seconds
  private readonly CHECK_INTERVAL = 10000 // 10 seconds

  constructor(io: SocketIOServer) {
    this.io = io
    this.startMonitoring()
    console.log("🔍 Room Activity Monitor initialized")
  }

  // Start the monitoring system
  private startMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
    }

    this.monitorInterval = setInterval(() => {
      this.checkRoomActivities()
    }, this.CHECK_INTERVAL)

    console.log(`✅ Room monitoring started - checking every ${this.CHECK_INTERVAL / 1000}s`)
  }

  // Stop the monitoring system
  public stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
      console.log("🛑 Room monitoring stopped")
    }
  }

  // Update activity for a specific room
  public updateRoomActivity(roomId: string, playerId?: string): void {
    const now = new Date()
    const existing = this.roomActivities.get(roomId)

    if (existing) {
      existing.lastActivity = now
      existing.warningIssued = false // Reset warning when activity detected
      if (playerId && !existing.players.includes(playerId)) {
        existing.players.push(playerId)
      }
    } else {
      this.roomActivities.set(roomId, {
        roomId,
        lastActivity: now,
        warningIssued: false,
        players: playerId ? [playerId] : []
      })
    }

    console.log(`📊 Activity updated for room ${roomId} (${this.roomActivities.get(roomId)?.players.length} tracked players)`)
  }

  // Remove a player from room tracking
  public removePlayerFromTracking(roomId: string, playerId: string): void {
    const activity = this.roomActivities.get(roomId)
    if (activity) {
      activity.players = activity.players.filter(id => id !== playerId)
      console.log(`👤 Player ${playerId} removed from room ${roomId} tracking`)
      
      // If no players left, remove room from tracking
      if (activity.players.length === 0) {
        this.roomActivities.delete(roomId)
        console.log(`🗑️ Room ${roomId} removed from activity tracking (no players)`)
      }
    }
  }

  // Remove room from tracking entirely
  public removeRoomFromTracking(roomId: string): void {
    if (this.roomActivities.delete(roomId)) {
      console.log(`🗑️ Room ${roomId} removed from activity tracking`)
    }
  }

  // Add a room to tracking
  public addRoomToTracking(roomId: string, playerIds: string[] = []): void {
    if (!this.roomActivities.has(roomId)) {
      this.roomActivities.set(roomId, {
        roomId,
        lastActivity: new Date(),
        warningIssued: false,
        players: [...playerIds]
      })
      console.log(`📝 Room ${roomId} added to activity tracking with ${playerIds.length} players`)
    }
  }

  // Main monitoring logic
  private async checkRoomActivities(): Promise<void> {
    const now = new Date()
    const roomsToCheck = Array.from(this.roomActivities.values())

    console.log(`🔍 Checking ${roomsToCheck.length} rooms for activity...`)

    for (const activity of roomsToCheck) {
      const timeSinceLastActivity = now.getTime() - activity.lastActivity.getTime()

      try {
        // Check if room still exists in database
        const room = await getRoom(activity.roomId)
        if (!room) {
          console.log(`🗑️ Room ${activity.roomId} no longer exists in database, removing from tracking`)
          this.roomActivities.delete(activity.roomId)
          continue
        }

        // Handle different game states
        if (room.game_state === "finished") {
          // Finished rooms get extended grace period
          if (timeSinceLastActivity > this.INACTIVITY_THRESHOLD * 2) {
            console.log(`🏁 Finished room ${activity.roomId} inactive for ${Math.round(timeSinceLastActivity / 1000)}s, cleaning up`)
            await this.cleanupInactiveRoom(activity.roomId, "Game finished and room inactive")
          }
          continue
        }

        // Issue warning at 90 seconds
        if (timeSinceLastActivity > this.WARNING_THRESHOLD && !activity.warningIssued) {
          await this.issueInactivityWarning(activity.roomId, activity.players)
          activity.warningIssued = true
          console.log(`⚠️ Inactivity warning issued for room ${activity.roomId}`)
        }

        // Remove room at 120 seconds
        if (timeSinceLastActivity > this.INACTIVITY_THRESHOLD) {
          console.log(`🚨 Room ${activity.roomId} inactive for ${Math.round(timeSinceLastActivity / 1000)}s, removing`)
          await this.cleanupInactiveRoom(activity.roomId, "Room inactive for more than 2 minutes")
        }

      } catch (error) {
        console.error(`❌ Error checking room ${activity.roomId}:`, error)
        // Continue checking other rooms even if one fails
      }
    }

    // Cleanup empty rooms from database
    try {
      const cleanedUp = await cleanupEmptyRooms(this.io)
      if (cleanedUp > 0) {
        console.log(`🧹 Cleaned up ${cleanedUp} empty rooms from database`)
      }
    } catch (error) {
      console.error("❌ Error during empty room cleanup:", error)
    }
  }

  // Issue warning to room participants
  private async issueInactivityWarning(roomId: string, playerIds: string[]): Promise<void> {
    const warningMessage = {
      type: "inactivity_warning",
      message: "⚠️ Room will be closed in 30 seconds due to inactivity",
      countdown: 30,
      timestamp: new Date().toISOString()
    }

    // Send warning to all clients in the room
    this.io.to(roomId).emit("room-warning", warningMessage)

    // Also send to specific players if they're in different rooms
    playerIds.forEach(playerId => {
      this.io.to(playerId).emit("room-warning", warningMessage)
    })

    console.log(`⚠️ Inactivity warning sent to room ${roomId} and ${playerIds.length} players`)
  }

  // Clean up an inactive room
  private async cleanupInactiveRoom(roomId: string, reason: string): Promise<void> {
    try {
      console.log(`🧹 Starting cleanup for room ${roomId}: ${reason}`)

      // Get room details before cleanup
      const room = await getRoom(roomId)
      if (!room) {
        console.log(`⚠️ Room ${roomId} already doesn't exist`)
        this.roomActivities.delete(roomId)
        return
      }

      // Notify all players in the room
      const disconnectionMessage = {
        type: "room_closed",
        message: `Room closed: ${reason}`,
        reason: "inactivity",
        timestamp: new Date().toISOString()
      }

      this.io.to(roomId).emit("room-closed", disconnectionMessage)
      this.io.to(roomId).emit("error", { 
        message: `Room closed due to inactivity`, 
        status: 408,
        reason: "timeout"
      })

      // Remove all players from the room
      const playerRemovalPromises = room.players.map(async (player) => {
        try {
          console.log(`👤 Removing player ${player.id} (${player.name}) from inactive room ${roomId}`)
          
          // Disconnect the player's socket if still connected
          const playerSocket = this.io.sockets.sockets.get(player.id)
          if (playerSocket) {
            playerSocket.leave(roomId)
            playerSocket.emit("force-disconnect", {
              reason: "Room closed due to inactivity",
              redirectTo: "/"
            })
          }

          // Remove from database
          await removePlayerFromRoom(player.id, this.io)
          
          return { success: true, playerId: player.id }
        } catch (error) {
          console.error(`❌ Error removing player ${player.id} from room ${roomId}:`, error)
          return { success: false, playerId: player.id, error }
        }
      })

      // Wait for all player removals to complete
      const results = await Promise.allSettled(playerRemovalPromises)
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length

      console.log(`👥 Player removal results: ${successful} successful, ${failed} failed`)

      // Delete the room from database
      const roomDeleted = await deleteRoom(roomId)
      if (roomDeleted) {
        console.log(`🗑️ Room ${roomId} deleted from database`)
      } else {
        console.error(`❌ Failed to delete room ${roomId} from database`)
      }

      // Remove from activity tracking
      this.roomActivities.delete(roomId)

      // Clear any remaining socket room memberships
      this.io.in(roomId).disconnectSockets(true)

      console.log(`✅ Cleanup completed for room ${roomId}`)

    } catch (error) {
      console.error(`❌ Error during room cleanup for ${roomId}:`, error)
      
      // Fallback: still remove from tracking even if cleanup failed
      this.roomActivities.delete(roomId)
    }
  }

  // Get current monitoring statistics
  public getMonitoringStats(): {
    totalRooms: number
    roomsWithWarnings: number
    oldestActivity: Date | null
    newestActivity: Date | null
  } {
    const activities = Array.from(this.roomActivities.values())
    
    return {
      totalRooms: activities.length,
      roomsWithWarnings: activities.filter(a => a.warningIssued).length,
      oldestActivity: activities.length > 0 
        ? new Date(Math.min(...activities.map(a => a.lastActivity.getTime())))
        : null,
      newestActivity: activities.length > 0
        ? new Date(Math.max(...activities.map(a => a.lastActivity.getTime())))
        : null
    }
  }

  // Manual cleanup trigger (for testing or admin use)
  public async forceCleanupRoom(roomId: string, reason: string = "Manual cleanup"): Promise<boolean> {
    try {
      await this.cleanupInactiveRoom(roomId, reason)
      return true
    } catch (error) {
      console.error(`❌ Force cleanup failed for room ${roomId}:`, error)
      return false
    }
  }

  // Get activity info for a specific room
  public getRoomActivity(roomId: string): RoomActivity | null {
    return this.roomActivities.get(roomId) || null
  }

  // Update room activity when players join/leave
  public handlePlayerJoin(roomId: string, playerId: string): void {
    this.updateRoomActivity(roomId, playerId)
    console.log(`👋 Player ${playerId} joined room ${roomId} - activity updated`)
  }

  public handlePlayerLeave(roomId: string, playerId: string): void {
    this.removePlayerFromTracking(roomId, playerId)
    console.log(`👋 Player ${playerId} left room ${roomId} - tracking updated`)
  }

  // Handle room state changes
  public handleRoomStateChange(roomId: string, newState: string): void {
    this.updateRoomActivity(roomId)
    console.log(`🎮 Room ${roomId} state changed to ${newState} - activity updated`)
  }
}

// Fixed: Single export statement only
export { RoomActivityMonitor, type RoomActivity }