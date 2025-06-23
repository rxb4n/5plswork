"use client"

import React from "react" // Explicit import for JSX compatibility
import { useState, useEffect, useCallback } from "react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Progress } from "../components/ui/progress"
import { Users, Crown, Clock, Trophy, AlertTriangle, Wifi, WifiOff } from "lucide-react"

type Language = "french" | "german" | "russian" | "japanese" | "spanish";
type GameState = "home" | "lobby" | "playing" | "finished";

interface Player {
  id: string;
  name: string;
  language: Language | null;
  ready: boolean;
  score: number;
  isHost: boolean;
  currentQuestion?: Question;
}

interface Question {
  questionId: string;
  english: string;
  correctAnswer: string;
  options: string[];
}

interface ServerInfo {
  processingTime: number;
  roomCount: number;
  timestamp: number;
}

interface ServerRoom {
  id: string;
  game_state: string;
  players: Array<{
    id: string;
    name: string;
    language: Language | null;
    ready: boolean;
    score: number;
    is_host: boolean;
    current_question: Question | null;
  }>;
  creator_id: string;
  winner_id: string | null;
  question_count: number | null;
}

export default function LanguageQuizGame() {
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState>("home");
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [roomBackup, setRoomBackup] = useState<string | null>(null);
  const [showRecoveryOption, setShowRecoveryOption] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [startGameError, setStartGameError] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);

  // Memoize currentQuestion to prevent unnecessary re-renders
  const memoizedCurrentQuestion = useMemo(() => currentQuestion, [currentQuestion?.questionId]);

  // Normalize server room to client expected format
  const normalizeRoom = (serverRoom: ServerRoom): {
    id: string;
    gameState: string;
    players: Player[];
    creatorId: string;
  } => ({
    id: serverRoom.id,
    gameState: serverRoom.game_state,
    players: serverRoom.players.map((p) => ({
      id: p.id,
      name: p.name,
      language: p.language,
      ready: p.ready,
      score: p.score,
      isHost: p.is_host,
      currentQuestion: p.current_question || undefined,
    })),
    creatorId: serverRoom.creator_id,
  });

  // API call helper
  const apiCall = async (action: string, data: any = {}, playerId?: string, targetRoomId?: string, retries = 2) => {
    const useRoomId = targetRoomId || roomId;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        console.log(`Making API call: ${action} (attempt ${attempt + 1})`, {
          roomId: useRoomId,
          playerId: playerId || currentPlayer?.id,
          data,
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            roomId: useRoomId,
            playerId: playerId || currentPlayer?.id,
            data,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error(`Non-JSON response for ${action}:`, text);
          throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
        }

        const result = await response.json();
        console.log(`API call ${action} result:`, result);

        if (!response.ok) {
          console.error(`API call ${action} failed:`, result);
          const errorMsg = result.error || `API call failed with status ${response.status}`;
          if (response.status === 408) {
            setConnectionError("Server is overloaded. Please wait...");
          } else if (response.status === 404) {
            setConnectionError(result.error || "Room expired or not found.");
            setShowRecoveryOption(true);
            if (gameState !== "home") {
              setTimeout(() => {
                setGameState("home");
                setShowRecoveryOption(false);
              }, 5000);
            }
          } else if (response.status === 500) {
            setConnectionError(`Server error: ${result.error || "Internal server error"}`);
          } else if (action === "start-game") {
            setStartGameError(errorMsg);
          }

          if (attempt === retries - 1) {
            return { error: errorMsg };
          }
          await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
          continue;
        }

        setConnectionError(null);
        setConsecutiveErrors(0);
        setShowRecoveryOption(false);
        setStartGameError(null);
        return result;
      } catch (error) {
        console.error(`API call failed (attempt ${attempt + 1}):`, error);

        const errorMsg = error.message || "Network error";
        if (error.name === "AbortError") {
          setConnectionError("Request timed out. Server may be overloaded.");
        } else if (error.message.includes("Failed to fetch")) {
          setConnectionError("Network error. Please check your connection.");
        } else {
          setConnectionError(`Error: ${errorMsg}`);
        }

        if (action === "start-game") {
          setStartGameError(errorMsg);
        }

        if (attempt === retries - 1) {
          setConsecutiveErrors((prev) => prev + 1);
          return { error: errorMsg };
        }
        await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      }
    }
  };

  // Polling for room updates
  const pollRoomUpdates = async () => {
    if (!roomId || gameState === "home") return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`/api/rooms?roomId=${roomId}`, {
        headers: {
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Non-JSON response from polling:", text);
          throw new Error("Server returned non-JSON response");
        }

        const data = await response.json();
        console.log("Poll room updates raw response:", data);

        if (!data.room) {
          console.error("Missing room object in poll response");
          setConnectionError("Invalid server response: Missing room data");
          setConsecutiveErrors((prev) => prev + 1);
          setGameState("lobby");
          return;
        }

        const room = normalizeRoom(data.room);
        console.log("Poll room updates normalized:", {
          gameState: room.gameState,
          players: room.players,
          currentPlayerQuestion: room.players.find((p: Player) => p.id === currentPlayer?.id)?.currentQuestion,
        });

        // Enforce creator as host
        const updatedPlayers = room.players.map((p: Player) => ({
          ...p,
          isHost: p.id === creatorId,
        }));

        setPlayers(updatedPlayers);
        setConnectionError(null);
        setConsecutiveErrors(0);
        setShowRecoveryOption(false);

        if (data.serverInfo) {
          setServerInfo(data.serverInfo);
        }

        const updatedCurrentPlayer = updatedPlayers.find((p: Player) => p.id === currentPlayer?.id);
        if (updatedCurrentPlayer) {
          setCurrentPlayer({
            ...updatedCurrentPlayer,
            isHost: updatedCurrentPlayer.id === creatorId,
          });
        }

        // Handle game state
        if (!room.gameState) {
          console.warn("Room gameState is undefined");
          setConnectionError("Server error: Game state not provided");
          setGameState("lobby");
          return;
        }

        if (room.gameState === "playing") {
          setGameState("playing");
          if (updatedCurrentPlayer?.currentQuestion) {
            // Only update question and reset timer if questionId has changed
            if (updatedCurrentPlayer.currentQuestion.questionId !== currentQuestionId) {
              console.log(`Resetting timer to 10s for new question ${updatedCurrentPlayer.currentQuestion.questionId}`);
              setCurrentQuestion(updatedCurrentPlayer.currentQuestion);
              setCurrentQuestionId(updatedCurrentPlayer.currentQuestion.questionId);
              setTimeLeft(10);
              setSelectedAnswer(null);
              setShowResult(false);
              console.log("New question received:", updatedCurrentPlayer.currentQuestion);
            }
          }
        } else if (room.gameState === "finished" && data.room.winner_id) {
          const winnerPlayer = updatedPlayers.find((p) => p.id === data.room.winner_id);
          setWinner(winnerPlayer || null);
          setGameState("finished");
        } else if (room.gameState === "lobby" && gameState !== "lobby") {
          setGameState("lobby");
          setCurrentQuestion(null);
          setCurrentQuestionId(null);
          setWinner(null);
        }
      } else if (response.status === 404) {
        setConnectionError("Room not found or expired.");
        setTimeout(() => setGameState("home"), 3000);
      } else if (response.status === 408) {
        setConnectionError("Server timeout. Game may be overloaded.");
        setConsecutiveErrors((prev) => prev + 1);
      } else {
        const text = await response.text();
        console.error("Polling error response:", text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
    } catch (error) {
      console.error("Failed to poll room updates:", error);
      setConsecutiveErrors((prev) => prev + 1);

      if (error.name === "AbortError") {
        setConnectionError("Polling timed out. Server may be overloaded.");
      } else {
        setConnectionError(`Connection issues: ${error.message}`);
      }

      if (consecutiveErrors > 5) {
        setConnectionError("Too many connection errors. Please try creating a new room.");
        setGameState("lobby");
      }
    }
  };

  // Attempt room recovery
  const attemptRoomRecovery = async () => {
    if (!roomId || !currentPlayer) return;

    setConnectionError("Attempting to recover room...");

    const result = await apiCall("join", { name: currentPlayer.name }, currentPlayer.id);
    if (result?.room) {
      const normalizedRoom = normalizeRoom(result.room);
      setPlayers(normalizedRoom.players);
      setConnectionError("Room recovered successfully!");
      setShowRecoveryOption(false);
      setTimeout(() => setConnectionError(null), 3000);
    } else {
      setConnectionError("Could not recover room. Please create a new one.");
      setShowRecoveryOption(false);
      setTimeout(() => setGameState("home"), 3000);
    }
  };

  // Adaptive polling with circuit breaker
  useEffect(() => {
    if (gameState !== "home") {
      const baseInterval = gameState === "playing" ? 1000 : 3000;
      const errorMultiplier = Math.min(consecutiveErrors * 0.5 + 1, 3);
      const interval = baseInterval * errorMultiplier;

      console.log(`Polling every ${interval}ms (errors: ${consecutiveErrors})`);

      const pollInterval = setInterval(() => pollRoomUpdates(), interval);
      return () => clearInterval(pollInterval);
    }
  }, [gameState, consecutiveErrors]);