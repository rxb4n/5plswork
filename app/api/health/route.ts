import { NextResponse } from "next/server"
import { healthCheck } from "../../../lib/database"

export async function GET() {
  try {
    const dbHealthy = await healthCheck()

    if (dbHealthy) {
      return NextResponse.json({
        status: "healthy",
        database: "connected",
        timestamp: new Date().toISOString(),
      })
    } else {
      return NextResponse.json(
        {
          status: "unhealthy",
          database: "disconnected",
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
