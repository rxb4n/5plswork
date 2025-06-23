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
  isHost: boolean; // Client expects isHost
  currentQuestion?: {
    english: string;
    correctAnswer: string;
    options: string[];
  };
}

interface Question {
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
  game_state: string; // Server uses snake_case
  players: Array<{
    id: string;
    name: string;
    language: Language | null;
    ready: boolean;
    score: number;
    is_host: boolean; // Server uses is_host
    current_question: Question | null; // Server uses current_question
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
  const [lastSuccessfulPoll, setLastSuccessfulPoll] = useState(Date.now());
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [roomBackup, setRoomBackup] = useState<string | null>(null);
  const [showRecoveryOption, setShowRecoveryOption] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [startGameError, setStartGameError] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [playingTimeout, setPlayingTimeout] = useState<NodeJS.Timeout | null>(null);

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

  // Server-Sent Events connection
  const connectEventSource = useCallback(
    (roomId: string, playerId: string) => {
      const es = new EventSource(`/api/events?roomId=${roomId}&playerId=${playerId}`);

      es.onopen = () => {
        setIsConnected(true);
        setEventSource(es);
        setConnectionError(null);
      };

      es.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
      };

      es.onerror = () => {
        setIsConnected(false);
        setConnectionError("Connection lost. Retrying...");
        setTimeout(() => {
          if (gameState !== "home") {
            connectEventSource(roomId, playerId);
          }
        }, 3000);
      };

      return es;
    },
    [gameState],
  );

  const handleServerMessage = (message: any) => {
    // For now, we'll poll for updates instead of using SSE for simplicity
  };

  // Enhanced API call helper with better error handling
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
          setConnectionError(`Error: ${error.message}`);
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

  // Enhanced polling with retry for undefined gameState
  const pollRoomUpdates = useCallback(async (retries = 3) => {
    if (!roomId || gameState === "home") return;

    for (let attempt = 0; attempt < retries; attempt++) {
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
            if (attempt < retries - 1) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
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
          setLastSuccessfulPoll(Date.now());
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
            console.warn(`Room gameState is undefined (attempt ${attempt + 1})`, room);
            setConnectionError("Server error: Game state not provided");
            if (attempt < retries - 1) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
            setGameState("lobby");
            return;
          }

          if (room.gameState === "playing") {
            console.log("Game state changed to playing:", { updatedCurrentPlayer, hasQuestion: !!updatedCurrentPlayer?.currentQuestion });
            setGameState("playing");
            if (updatedCurrentPlayer?.currentQuestion) {
              setCurrentQuestion(updatedCurrentPlayer.currentQuestion);
              setTimeLeft(10);
              setSelectedAnswer(null);
              setShowResult(false);
              if (playingTimeout) {
                clearTimeout(playingTimeout);
                setPlayingTimeout(null);
              }
            } else {
              console.log("No currentQuestion for player, waiting for server update");
              if (!playingTimeout) {
                const timeout = setTimeout(() => {
                  console.warn("No question received in playing state, reverting to lobby");
                  setGameState("lobby");
                  setConnectionError("Game failed to start: No questions received");
                  setPlayingTimeout(null);
                }, 10000);
                setPlayingTimeout(timeout);
              }
            }
          } else if (room.gameState === "finished" && data.room.winner_id) {
            const winnerPlayer = updatedPlayers.find((p) => p.id === data.room.winner_id);
            setWinner(winnerPlayer || null);
            setGameState("finished");
            if (playingTimeout) {
              clearTimeout(playingTimeout);
              setPlayingTimeout(null);
            }
          } else if (room.gameState === "lobby" && gameState !== "lobby") {
            setGameState("lobby");
            setCurrentQuestion(null);
            setWinner(null);
            if (playingTimeout) {
              clearTimeout(playingTimeout);
              setPlayingTimeout(null);
            }
          }
          return; // Successful poll, exit retry loop
        } else if (response.status === 404) {
          setConnectionError("Room not found or expired.");
          setTimeout(() => setGameState("home"), 3000);
          return;
        } else if (response.status === 408) {
          setConnectionError("Server timeout. Game may be overloaded.");
          setConsecutiveErrors((prev) => prev + 1);
        } else {
          const text = await response.text();
          console.error("Polling error response:", text);
          throw new Error(`HTTP ${response.status}: ${text}`);
        }
      } catch (error) {
        console.error(`Failed to poll room updates (attempt ${attempt + 1}):`, error);
        setConsecutiveErrors((prev) => prev + 1);

        if (error.name === "AbortError") {
          setConnectionError("Polling timed out. Server may be overloaded.");
        } else {
          setConnectionError(`Connection issues: ${error.message}`);
        }

        if (attempt < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        if (consecutiveErrors > 5) {
          setConnectionError("Too many connection errors. Please try creating a new room.");
          setGameState("lobby");
        }
      }
    }
  }, [roomId, gameState, currentPlayer, consecutiveErrors, creatorId, playingTimeout]);

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
  }, [gameState, pollRoomUpdates, consecutiveErrors]);

  // Ping to keep connection alive during game
  useEffect(() => {
    if (gameState === "playing" && currentPlayer) {
      const pingInterval = setInterval(async () => {
        await apiCall("ping", {}, currentPlayer.id);
      }, 30000);

      return () => clearInterval(pingInterval);
    }
  }, [gameState, currentPlayer]);

  // Cleanup playing timeout on component unmount
  useEffect(() => {
    return () => {
      if (playingTimeout) {
        clearTimeout(playingTimeout);
      }
    };
  }, [playingTimeout]);

  // Generate random room ID
  const generateRoomId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Create room
  const createRoom = async () => {
    if (!playerName.trim()) return;

    const newRoomId = generateRoomId();
    const playerId = `player-${Date.now()}`;

    console.log(`Creating room ${newRoomId} with player ${playerId}`);

    const player: Player = {
      id: playerId,
      name: playerName.trim(),
      language: null,
      ready: false,
      score: 0,
      isHost: true,
    };

    try {
      setConnectionError("Creating room...");

      console.log("Creating room...");
      const createResult = await apiCall("create", {}, playerId, newRoomId);
      console.log("Create result:", createResult);

      if (createResult.error) {
        console.error("Failed to create room:", createResult.error);
        setConnectionError(`Failed to create room: ${createResult.error}`);
        return;
      }

      console.log("Joining room...");
      const joinResult = await apiCall("join", { name: playerName.trim(), isHost: true }, playerId, newRoomId);
      console.log("Join result:", joinResult);

      if (joinResult?.room) {
        const normalizedRoom = normalizeRoom(joinResult.room);
        setRoomId(newRoomId);
        setCreatorId(playerId);
        const serverPlayer = normalizedRoom.players.find((p: Player) => p.id === playerId);
        console.log("Server player data:", serverPlayer);
        setCurrentPlayer({
          ...(serverPlayer || player),
          isHost: true,
        });
        setGameState("lobby");
        setIsConnected(true);
        setPlayers(normalizedRoom.players);
        setConnectionError(null);
        setConsecutiveErrors(0);
        console.log("Room created successfully with players:", normalizedRoom.players);
      } else {
        console.error("Failed to join room after creation");
        setConnectionError(`Failed to create room: ${joinResult?.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error creating room:", error);
      setConnectionError(`Failed to create room: ${error.message}`);
    }
  };

  // Join room
  const joinRoom = async () => {
    if (!playerName.trim() || !roomId.trim()) return;

    const playerId = `player-${Date.now()}`;
    const targetRoomId = roomId.trim();

    console.log(`Joining room ${targetRoomId} with player ${playerId}`);

    const player: Player = {
      id: playerId,
      name: playerName.trim(),
      language: null,
      ready: false,
      score: 0,
      isHost: false,
    };

    try {
      setConnectionError("Joining room...");

      console.log("Attempting to join room...");
      const result = await apiCall("join", { name: playerName.trim() }, playerId, targetRoomId);
      console.log("Join result:", result);

      if (!result || result.error) {
        console.error("Join failed:", result?.error);
        setConnectionError(`Failed to join room: ${result?.error || "Unknown error"}. Please check the room ID.`);
        return;
      }

      if (result.room) {
        const normalizedRoom = normalizeRoom(result.room);
        setCurrentPlayer({
          ...player,
          isHost: playerId === creatorId,
        });
        setGameState("lobby");
        setIsConnected(true);
        setPlayers(normalizedRoom.players);
        setConnectionError(null);
        setConsecutiveErrors(0);

        const serverPlayer = normalizedRoom.players.find((p: Player) => p.id === playerId);
        if (serverPlayer) {
          setCurrentPlayer({
            ...serverPlayer,
            isHost: playerId === creatorId,
          });
          console.log("Successfully joined room with players:", normalizedRoom.players);
        }
      }
    } catch (error) {
      console.error("Error joining room:", error);
      setConnectionError(`Failed to join room: ${error.message}`);
    }
  };

  const leaveRoom = async () => {
    if (currentPlayer) {
      await apiCall("leave");
    }

    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }

    setGameState("home");
    setPlayers([]);
    setCurrentPlayer(null);
    setRoomId("");
    setPlayerName("");
    setIsConnected(false);
    setConnectionError(null);
    setConsecutiveErrors(0);
    setServerInfo(null);
    setStartGameError(null);
    setCreatorId(null);
    if (playingTimeout) {
      clearTimeout(playingTimeout);
      setPlayingTimeout(null);
    }
  };

  // Update player language
  const updateLanguage = async (language: Language) => {
    if (!currentPlayer) return;

    console.log(`Updating language for player ${currentPlayer.id} to ${language}`);
    const isCreator = currentPlayer.id === creatorId;
    const result = await apiCall("update-language", { language });

    if (result?.room) {
      const normalizedRoom = normalizeRoom(result.room);
      setPlayers(normalizedRoom.players);
      const updatedPlayer = normalizedRoom.players.find((p: Player) => p.id === currentPlayer.id);
      if (updatedPlayer) {
        setCurrentPlayer({
          ...updatedPlayer,
          isHost: isCreator,
        });
        console.log(`Language updated for player ${currentPlayer.id}, isHost preserved: ${isCreator}`);
      }
    }
  };

  // Toggle ready status
  const toggleReady = async () => {
    if (!currentPlayer || !currentPlayer.language) return;

    console.log(`Toggling ready for player ${currentPlayer.id}`);
    const isCreator = currentPlayer.id === creatorId;
    const result = await apiCall("toggle-ready");

    if (result?.room) {
      const normalizedRoom = normalizeRoom(result.room);
      setPlayers(normalizedRoom.players);
      const updatedPlayer = normalizedRoom.players.find((p: Player) => p.id === currentPlayer.id);
      if (updatedPlayer) {
        setCurrentPlayer({
          ...updatedPlayer,
          isHost: isCreator,
        });
        console.log(`Ready toggled for player ${currentPlayer.id}, isHost preserved: ${isCreator}`);
      }
    }
  };

  // Start game with forced state transition
  const startGame = async () => {
    if (!currentPlayer || currentPlayer.id !== creatorId) {
      console.log("Start game blocked: Current player is not creator", { currentPlayer, creatorId });
      setStartGameError("Only the room creator can start the game.");
      return;
    }

    console.log("Attempting to start game", { playerId: currentPlayer.id, creatorId });
    setIsStartingGame(true);
    setStartGameError(null);

    const result = await apiCall("start-game");
    console.log("Start game API call result:", result);
    setIsStartingGame(false);

    if (result?.error) {
      console.error("Failed to start game:", result.error);
      setStartGameError(result.error);
    } else {
      console.log("Start game API call successful:", result);
      // Force transition to playing state for creator
      setGameState("playing");
      // Poll multiple times to ensure all clients sync
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * i));
        await pollRoomUpdates(3);
        if (result.room?.game_state === "playing" && currentPlayer?.currentQuestion) {
          setCurrentQuestion(currentPlayer.currentQuestion);
          setTimeLeft(10);
          setSelectedAnswer(null);
          setShowResult(false);
          break;
        }
      }
    }
  };

  // Handle answer selection
  const selectAnswer = async (answer: string) => {
    if (selectedAnswer || !currentQuestion || !currentPlayer) return;

    setSelectedAnswer(answer);
    setShowResult(true);

    await apiCall("answer", { answer, timeLeft });
  };

  // Timer effect
  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0 && !selectedAnswer && currentQuestion) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !selectedAnswer && gameState === "playing" && currentQuestion) {
      setShowResult(true);
    }
  }, [gameState, timeLeft, selectedAnswer, currentQuestion]);

  // Restart game
  const restartGame = async () => {
    if (!currentPlayer || currentPlayer.id !== creatorId) return;
    await apiCall("restart");
  };

  // Connection status indicator
  const getConnectionStatus = () => {
    if (consecutiveErrors > 3) {
      return { icon: WifiOff, color: "text-red-500", text: "Poor Connection" };
    } else if (consecutiveErrors > 0) {
      return { icon: AlertTriangle, color: "text-yellow-500", text: "Connection Issues" };
    } else {
      return { icon: Wifi, color: "text-green-500", text: "Connected" };
    }
  };

  const connectionStatus = getConnectionStatus();

  // Home Screen
  if (gameState === "home") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-indigo-700">Language Quiz Game</CardTitle>
            <CardDescription>Test your language skills with friends!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <connectionStatus.icon className={`w-4 h-4 ${connectionStatus.color}`} />
                  {connectionError}
                </div>
                {showRecoveryOption && (
                  <Button onClick={attemptRoomRecovery} size="sm" variant="outline" className="mt-2">
                    Try to Recover Room
                  </Button>
                )}
              </div>
            )}

            {serverInfo && (
              <div className="p-2 bg-gray-50 border rounded-lg text-xs text-gray-600">
                Server: {serverInfo.roomCount} rooms, {serverInfo.processingTime}ms response
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Your Name</label>
              <Input
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Room ID (optional)</label>
              <Input
                placeholder="Enter 6-character room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                maxLength={6}
              />
            </div>

            <div className="space-y-2">
              <Button onClick={joinRoom} className="w-full" disabled={!playerName.trim() || !roomId.trim()}>
                Join Room
              </Button>
              <Button onClick={createRoom} variant="outline" className="w-full" disabled={!playerName.trim()}>
                Create New Room
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Lobby Screen
  if (gameState === "lobby") {
    const playersWithLanguages = players.filter((p) => p.language);
    const allPlayersWithLanguagesReady = playersWithLanguages.length > 0 && playersWithLanguages.every((p) => p.ready);
    const canStartGame = currentPlayer?.id === creatorId && allPlayersWithLanguagesReady;

    console.log("Lobby debug:", {
      currentPlayer,
      isCreator: currentPlayer?.id === creatorId,
      creatorId,
      canStartGame,
      playersWithLanguages,
      allPlayersWithLanguagesReady,
      players,
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Room: {roomId}
                <connectionStatus.icon className={`w-4 h-4 ${connectionStatus.color}`} />
                <Badge className={consecutiveErrors > 0 ? "bg-yellow-500" : "bg-green-500"}>
                  {connectionStatus.text}
                </Badge>
              </CardTitle>
              <CardDescription>Players in room</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm mb-4">
                Debug: Current player is {currentPlayer?.id === creatorId ? "Creator" : "Not Creator"}
              </div>
              {connectionError && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <connectionStatus.icon className={`w-4 h-4 ${connectionStatus.color}`} />
                    {connectionError}
                  </div>
                  {showRecoveryOption && (
                    <Button onClick={attemptRoomRecovery} size="sm" variant="outline" className="mt-2">
                      Try to Recover Room
                    </Button>
                  )}
                </div>
              )}
              {startGameError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
                  Error starting game: {startGameError}
                </div>
              )}

              {serverInfo && (
                <div className="p-2 bg-gray-50 border rounded-lg text-xs text-gray-600 mb-4">
                  Server: {serverInfo.roomCount} rooms, {serverInfo.processingTime}ms response
                </div>
              )}

              <div className="space-y-3">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {player.isHost && <Crown className="w-4 h-4 text-yellow-500" />}
                      <span className="font-medium">{player.name}</span>
                      {player.isHost && <span className="text-xs text-gray-500">(Creator)</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {player.language && (
                        <Badge variant="secondary">
                          {player.language.charAt(0).toUpperCase() + player.language.slice(1)}
                        </Badge>
                      )}
                      {player.ready && <Badge className="bg-green-500">Ready</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Game Settings</CardTitle>
              <CardDescription>Choose your language and get ready!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={leaveRoom} variant="destructive" className="w-full">
                Leave Room
              </Button>

              <div>
                <label className="text-sm font-medium mb-2 block">Select Language to Learn</label>
                <Select value={currentPlayer?.language || ""} onValueChange={updateLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="french">French</SelectItem>
                    <SelectItem value="german">German</SelectItem>
                    <SelectItem value="russian">Russian</SelectItem>
                    <SelectItem value="japanese">Japanese (Romaji)</SelectItem>
                    <SelectItem value="spanish">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={toggleReady}
                className="w-full"
                disabled={!currentPlayer?.language}
                variant={currentPlayer?.ready ? "secondary" : "default"}
              >
                {currentPlayer?.ready ? "Not Ready" : "Ready Up!"}
              </Button>

              {currentPlayer?.id === creatorId && (
                <Button
                  onClick={startGame}
                  className="w-full"
                  disabled={!canStartGame || isStartingGame}
                  variant="outline"
                >
                  {isStartingGame
                    ? "Starting..."
                    : playersWithLanguages.length === 0
                    ? "At least one player needs to select a language"
                    : !allPlayersWithLanguagesReady
                    ? "All players with languages must be ready"
                    : "Start Game"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Game Screen
  if (gameState === "playing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {connectionError && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
              <div className="flex items-center gap-2">
                <connectionStatus.icon className={`w-4 h-4 ${connectionStatus.color}`} />
                {connectionError}
              </div>
              {showRecoveryOption && (
                <Button onClick={attemptRoomRecovery} size="sm" variant="outline" className="mt-2">
                  Try to Recover Room
                </Button>
              )}
            </div>
          )}

          {!currentQuestion ? (
            <Card className="text-center">
              <CardHeader>
                <CardTitle>Loading Question...</CardTitle>
                <CardDescription>Please wait while the game prepares the next question.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <Badge className="text-lg px-3 py-1">Your Score: {currentPlayer?.score || 0}</Badge>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    Target: 100
                  </Badge>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5" />
                    <span className="text-xl font-bold">{timeLeft}s</span>
                  </div>
                  <div className="space-y-1">
                    {players.map((player) => (
                      <div key={player.id} className="flex items-center gap-2 text-sm">
                        {player.isHost && <Crown className="w-3 h-3 text-yellow-500" />}
                        <span className={`font-medium ${player.id === currentPlayer?.id ? "text-blue-600" : ""}`}>
                          {player.name}
                        </span>
                        <Badge variant={player.id === currentPlayer?.id ? "default" : "secondary"} className="text-xs">
                          {player.score}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Progress value={(10 - timeLeft) * 10} className="h-2" />

              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl font-bold text-blue-700">{currentQuestion.english}</CardTitle>
                  <CardDescription>Select the correct translation in {currentPlayer?.language}</CardDescription>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option, index) => {
                  let buttonClass = "h-16 text-lg font-medium";

                  if (showResult) {
                    if (option === currentQuestion.correctAnswer) {
                      buttonClass += " bg-green-500 hover:bg-green-500 text-white";
                    } else if (option === selectedAnswer && option !== currentQuestion.correctAnswer) {
                      buttonClass += " bg-red-500 hover:bg-red-500 text-white";
                    } else {
                      buttonClass += " opacity-50";
                    }
                  }

                  return (
                    <Button
                      key={index}
                      onClick={() => selectAnswer(option)}
                      disabled={!!selectedAnswer || timeLeft === 0}
                      className={buttonClass}
                      variant={showResult ? "default" : "outline"}
                    >
                      {option}
                    </Button>
                  );
                })}
              </div>

              {showResult && (
                <Card className="text-center">
                  <CardContent className="pt-6">
                    {selectedAnswer === currentQuestion.correctAnswer ? (
                      <div className="text-green-600">
                        <p className="text-xl font-bold">Correct! 🎉</p>
                        <p>You earned {Math.max(1, 10 - (10 - timeLeft))} points!</p>
                      </div>
                    ) : timeLeft === 0 ? (
                      <div className="text-orange-600">
                        <p className="text-xl font-bold">Time's up! ⏰</p>
                        <p>The correct answer was: {currentQuestion.correctAnswer}</p>
                      </div>
                    ) : (
                      <div className="text-red-600">
                        <p className="text-xl font-bold">Wrong answer!</p>
                        <p>The correct answer was: {currentQuestion.correctAnswer}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Winner Screen
  if (gameState === "finished" && winner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-yellow-700">🎉 Congratulations!</CardTitle>
            <CardDescription className="text-lg">
              {winner.name} wins with {winner.score} points!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="font-medium">Final Scores:</p>
              {players.map((player) => (
                <div key={player.id} className="flex justify-between items-center mt-2">
                  <span>{player.name}</span>
                  <Badge variant={player.id === winner.id ? "default" : "secondary"}>{player.score} pts</Badge>
                </div>
              ))}
            </div>

            {currentPlayer?.id === creatorId && (
              <Button onClick={restartGame} className="w-full">
                Play Again
              </Button>
            )}
            <Button onClick={leaveRoom} variant="outline" className="w-full">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}