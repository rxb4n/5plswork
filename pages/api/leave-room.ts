import { NextApiRequest, NextApiResponse } from "next"
import { removePlayerFromRoom } from "../../lib/database"

// API endpoint for removing players from rooms
// This is specifically designed to handle beforeunload scenarios
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests'
    })
  }

  try {
    const { roomId, playerId, reason = 'api_call' } = req.body

    // Validate required parameters
    if (!roomId || !playerId) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Both roomId and playerId are required'
      })
    }

    console.log(`🚪 API: Removing player ${playerId} from room ${roomId} (reason: ${reason})`)

    // Remove player from room using database function
    const result = await removePlayerFromRoom(playerId)

    if (result.roomId) {
      console.log(`✅ API: Successfully removed player ${playerId} from room ${result.roomId}`)
      
      return res.status(200).json({
        success: true,
        message: 'Player removed successfully',
        data: {
          roomId: result.roomId,
          wasHost: result.wasHost,
          roomDeleted: result.roomDeleted
        }
      })
    } else {
      console.log(`⚠️ API: Player ${playerId} was not found in any room`)
      
      return res.status(404).json({
        success: false,
        error: 'Player not found',
        message: 'Player was not found in any room'
      })
    }

  } catch (error) {
    console.error(`❌ API: Error removing player from room:`, error)
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to remove player from room',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Export config to handle the request properly
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}