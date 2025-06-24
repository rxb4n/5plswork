"use client"

import React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Progress } from "../components/ui/progress"
import { Users, Crown, Clock, Trophy, AlertTriangle, Wifi, WifiOff } from "lucide-react"
import io, { Socket } from "socket.io-client"

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
  winner_id: string | null;
  question_count: number | null;
  target_score: number;
}

export default function LanguageQuizGame() {
  const [socket, setSocket] = useState<Socket | null>(null);
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
  const [showRecoveryOption, setShowRecoveryOption] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [startGameError, setStartGameError] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [waitingForNewQuestion, setWaitingForNewQuestion] = useState(true);
  const [targetScore, setTargetScore] = useState(100);
  const lastProcessedQuestionId = useRef<string | null>(null);

  // Memoize currentQuestion to prevent unnecessary re-renders
  const memoizedCurrentQuestion = useMemo(() => currentQuestion, [currentQuestion?.questionId]);

  // Normalize server room to client expected format
  const normalizeRoom = (serverRoom: ServerRoom): {
    id: string;
    gameState: string;
    players: Player[];
    targetScore: number;
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
    targetScore: serverRoom.target_score || 100,
  });

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io({
      path: "/api/socketio",
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 20000,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Socket.IO connected");
      setIsConnected(true);
      setConnectionError(null);
      setConsecutiveErrors(0);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket.IO disconnected");
      setIsConnected(false);
      setConnectionError("Disconnected from server. Attempting to reconnect...");
      setConsecutiveErrors((prev) => prev + 1);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket.IO connect error:", error.message);
      setConnectionError(`Connection error: ${error.message}`);
      setConsecutiveErrors((prev) => prev + 1);
    });

    newSocket.on("room-update", (data: { room: ServerRoom; serverInfo?: ServerInfo }) => {
      if (!data.room) {
        console.error("Missing room object in room-update");
        setConnectionError("Invalid server response: Missing room data");
        setConsecutiveErrors((prev) => prev + 1);
        setGameState("lobby");
        return;
      }

      const room = normalizeRoom(data.room);
      console.log("Room update received:", {
        gameState: room.gameState,
        players: room.players,
        currentPlayerQuestion: room.players.find((p: Player) => p.id === currentPlayer?.id)?.currentQuestion?.questionId,
        waitingForNewQuestion,
        targetScore: room.targetScore,
      });

      setPlayers(room.players);
      setConnectionError(null);
      setConsecutiveErrors(0);
      setShowRecoveryOption(false);
      setTargetScore(room.targetScore);

      if (data.serverInfo) {
        setServerInfo(data.serverInfo);
      }

      const updatedCurrentPlayer = room.players.find((p: Player) => p.id === currentPlayer?.id);
      if (updatedCurrentPlayer) {
        setCurrentPlayer(updatedCurrentPlayer);
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
        if (waitingForNewQuestion && !currentQuestionId && updatedCurrentPlayer?.currentQuestion) {
          const newQuestionId = updatedCurrentPlayer.currentQuestion.questionId;
          if (newQuestionId !== lastProcessedQuestionId.current) {
            console.log(`Setting initial question ${newQuestionId}`);
            setCurrentQuestion(updatedCurrentPlayer.currentQuestion);
            setCurrentQuestionId(newQuestionId);
            setTimeLeft(10);
            setSelectedAnswer(null);
            setShowResult(false);
            setWaitingForNewQuestion(false);
            lastProcessedQuestionId.current = newQuestionId;
            console.log("New question received:", updatedCurrentPlayer.currentQuestion);
          }
        }
      } else if (room.gameState === "finished" && data.room.winner_id) {
        const winnerPlayer = room.players.find((p) => p.id === data.room.winner_id);
        setWinner(winnerPlayer || null);
        setGameState("finished");
        setWaitingForNewQuestion(true);
      } else if (room.gameState === "lobby" && gameState !== "lobby") {
        setGameState("lobby");
        setCurrentQuestion(null);
        setCurrentQuestionId(null);
        setWinner(null);
        setWaitingForNewQuestion(true);
        lastProcessedQuestionId.current = null;
      }
    });

    newSocket.on("error", (data: { message: string; status?: number }) => {
      console.error("Server error:", data.message);
      setConnectionError(data.message);
      setConsecutiveErrors((prev) => prev + 1);

      if (data.status === 404) {
        setConnectionError("Room not found or expired.");
        setTimeout(() => setGameState("home"), 3000);
      } else if (data.status === 408) {
        setConnectionError("Server timeout. Game may be overloaded.");
      }

      if (consecutiveErrors > 5) {
        setConnectionError("Too many connection errors. Please try creating a new room.");
        setGameState("lobby");
      }
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, []);

  // Timer effect
  useEffect(() => {
    console.log("Timer effect triggered:", { gameState, timeLeft, selectedAnswer, currentQuestionId });
    if (gameState === "playing" && timeLeft > 0 && !selectedAnswer && memoizedCurrentQuestion) {
      console.log(`Starting timer for question ${currentQuestionId} at ${timeLeft}s`);
      let isMounted = true;
      const timer = setInterval(() => {
        if (!isMounted) return;
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          console.log(`Timer tick: ${newTime}s for question ${currentQuestionId}`);
          return newTime;
        });
      }, 1000);

      return () => {
        isMounted = false;
        console.log(`Cleaning up timer for question ${currentQuestionId}`);
        clearInterval(timer);
      };
    } else if (timeLeft === 0 && !selectedAnswer && gameState === "playing" && memoizedCurrentQuestion) {
      console.log(`Time's up for question ${currentQuestionId}`);
      setShowResult(true);
      selectAnswer("");
    }
  }, [gameState, selectedAnswer, memoizedCurrentQuestion, currentQuestionId]);

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
  const createRoom = () => {
    if (!playerName.trim() || !socket) return;

    const newRoomId = generateRoomId();
    const playerId = `player-${Date.now()}`;
    const player: Player = {
      id: playerId,
      name: playerName.trim(),
      language: null,
      ready: false,
      score: 0,
      isHost: true,
    };

    setConnectionError("Creating room...");
    socket.emit("create-room", { roomId: newRoomId, playerId, data: { targetScore } }, (response: any) => {
      if (response.error) {
        console.error("Failed to create room:", response.error);
        setConnectionError(`Failed to create room: ${response.error}`);
        return;
      }

      socket.emit("join-room", { roomId: newRoomId, playerId, data: { name: playerName.trim(), isHost: true } }, (joinResponse: any) => {
        if (joinResponse?.room) {
          const normalizedRoom = normalizeRoom(joinResponse.room);
          setRoomId(newRoomId);
          setCreatorId(playerId);
          setTargetScore(normalizedRoom.targetScore || 100);
          const serverPlayer = normalizedRoom.players.find((p: Player) => p.id === playerId);
          setCurrentPlayer({
            ...(serverPlayer || player),
            isHost: true,
          });
          setGameState("lobby");
          setIsConnected(true);
          setPlayers(normalizedRoom.players);
          setConnectionError(null);
          console.log("Room created successfully with players:", normalizedRoom.players);
        } else {
          console.error("Failed to join room after creation");
          setConnectionError(`Failed to create room: ${joinResponse?.error || "Unknown error"}`);
        }
      });
    });
  };

  // Join room
  const joinRoom = () => {
    if (!playerName.trim() || !roomId.trim() || !socket) return;

    const playerId = `player-${Date.now()}`;
    const targetRoomId = roomId.trim();
    const player: Player = {
      id: playerId,
      name: playerName.trim(),
      language: null,
      ready: false,
      score: 0,
      isHost: false,
    };

    setConnectionError("Joining room...");
    socket.emit("join-room", { roomId: targetRoomId, playerId, data: { name: playerName.trim() } }, (response: any) => {
      if (response.error) {
        console.error("Join failed:", response.error);
        setConnectionError(`Failed to join room: ${response.error}. Please check the room ID.`);
        return;
      }

      if (response.room) {
        const normalizedRoom = normalizeRoom(response.room);
        setCurrentPlayer({
          ...player,
          isHost: false,
        });
        setRoomId(targetRoomId);
        setGameState("lobby");
        setIsConnected(true);
        setPlayers(normalizedRoom.players);
        setTargetScore(normalizedRoom.targetScore);
        setConnectionError(null);
        setConsecutiveErrors(0);

        const serverPlayer = normalizedRoom.players.find((p: Player) => p.id === playerId);
        if (serverPlayer) {
          setCurrentPlayer(serverPlayer);
          console.log("Successfully joined room with players:", normalizedRoom.players);
        }
      }
    });
  };

  // Attempt room recovery
  const attemptRoomRecovery = () => {
    if (!roomId || !currentPlayer || !socket) return;

    setConnectionError("Attempting to recover room...");
    socket.emit("join-room", { roomId, playerId: currentPlayer.id, data: { name: currentPlayer.name } }, (response: any) => {
      if (response?.room) {
        const normalizedRoom = normalizeRoom(response.room);
        setPlayers(normalizedRoom.players);
        setTargetScore(normalizedRoom.targetScore);
        setConnectionError("Room recovered successfully!");
        setShowRecoveryOption(false);
        setTimeout(() => setConnectionError(null), 3000);
      } else {
        setConnectionError("Could not recover room. Please create a new one.");
        setShowRecoveryOption(false);
        setTimeout(() => setGameState("home"), 3000);
      }
    });
  };

  // Leave room
  const leaveRoom = () => {
    if (currentPlayer && socket) {
      socket.emit("leave-room", { roomId, playerId: currentPlayer.id });
    }

    if (socket) {
      socket.disconnect();
      setSocket(null);
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
    setCurrentQuestion(null);
    setCurrentQuestionId(null);
    setWaitingForNewQuestion(true);
    setTargetScore(100);
    lastProcessedQuestionId.current = null;
  };

  // Update player language
  const updateLanguage = (language: Language) => {
    if (!language || !currentPlayer || !socket) return;

    console.log(`Updating language for player ${currentPlayer.id} to ${language}`);
    socket.emit("update-language", { roomId, playerId: currentPlayer.id, data: { language } }, (response: any) => {
      if (response?.room) {
        const normalizedRoom = normalizeRoom(response.room);
        setPlayers(normalizedRoom.players);
        setTargetScore(normalizedRoom.targetScore);
        const updatedPlayer = normalizedRoom.players.find((p: Player) => p.id === currentPlayer.id);
        if (updatedPlayer) {
          setCurrentPlayer(updatedPlayer);
          console.log(`Language updated for player ${currentPlayer.id}`);
        }
      }
    });
  };

  // Toggle ready status
  const toggleReady = () => {
    if (!currentPlayer || !currentPlayer.language || !socket) return;

    console.log(`Toggling ready for player ${currentPlayer.id}`);
    socket.emit("toggle-ready", { roomId, playerId: currentPlayer.id }, (response: any) => {
      if (response?.room) {
        const normalizedRoom = normalizeRoom(response.room);
        setPlayers(normalizedRoom.players);
        setTargetScore(normalizedRoom.targetScore);
        const updatedPlayer = normalizedRoom.players.find((p) => p.id === currentPlayer.id);
        if (updatedPlayer) {
          setCurrentPlayer(updatedPlayer);
          console.log(`Ready toggled for player ${currentPlayer.id}`);
        }
      }
    });
  };

  // Update target score
  const updateTargetScore = (score: number) => {
    if (!currentPlayer || !currentPlayer.isHost || !socket) return;

    console.log(`Updating target score for room ${roomId} to ${score}`);
    socket.emit("update-target-score", { roomId, playerId: currentPlayer.id, data: { targetScore: score } }, (response: any) => {
      if (response?.room) {
        const normalizedRoom = normalizeRoom(response.room);
        setPlayers(normalizedRoom.players);
        setTargetScore(normalizedRoom.targetScore);
        console.log(`Target score updated to ${normalizedRoom.targetScore}`);
      }
    });
  };

  // Start game
  const startGame = () => {
    if (!currentPlayer || !currentPlayer.isHost || !socket) {
      console.log("Start game blocked: Current player is not host", { currentPlayer });
      setStartGameError("Only the room creator can start the game.");
      return;
    }

    console.log("Attempting to start game", { playerId: currentPlayer.id });
    setIsStartingGame(true);
    setStartGameError(null);

    socket.emit("start-game", { roomId, playerId: currentPlayer.id }, (response: any) => {
      console.log("Start game response:", response);
      setIsStartingGame(false);
      if (response?.error) {
        console.error("Failed to start game:", response.error);
        setStartGameError(response.error);
      } else {
        console.log("Start game succeeded");
        setGameState("playing");
        setWaitingForNewQuestion(true);
        lastProcessedQuestionId.current = null;
      }
    });
  };

  // Handle answer selection
  const selectAnswer = (answer: string) => {
    if (selectedAnswer || !memoizedCurrentQuestion || !currentPlayer || !socket) return;

    console.log(`Submitting answer for question ${currentQuestionId}: ${answer}`);
    setSelectedAnswer(answer);
    setShowResult(true);
    setWaitingForNewQuestion(true);

    socket.emit("answer", { roomId, playerId: currentPlayer.id, data: { answer, timeLeft } }, (response: any) => {
      console.log("Answer response:", response);
      if (response?.room) {
        const normalizedRoom = normalizeRoom(response.room);
        const updatedPlayer = normalizedRoom.players.find((p: Player) => p.id === currentPlayer.id);
        setPlayers(normalizedRoom.players);
        setTargetScore(normalizedRoom.targetScore);

        if (updatedPlayer) {
          setCurrentPlayer(updatedPlayer);
        }

        if (normalizedRoom.gameState === "finished" && response.room.winner_id) {
          const winnerPlayer = normalizedRoom.players.find((p) => p.id === response.room.winner_id);
          setWinner(winnerPlayer || null);
          setGameState("finished");
          setCurrentQuestion(null);
          setCurrentQuestionId(null);
          setWaitingForNewQuestion(true);
          lastProcessedQuestionId.current = null;
        } else if (updatedPlayer?.currentQuestion) {
          const newQuestionId = updatedPlayer.currentQuestion.questionId;
          if (newQuestionId !== lastProcessedQuestionId.current) {
            console.log(`Setting new question after answer: ${newQuestionId}`);
            setCurrentQuestion(updatedPlayer.currentQuestion);
            setCurrentQuestionId(newQuestionId);
            setTimeLeft(10);
            setSelectedAnswer(null);
            setShowResult(false);
            setWaitingForNewQuestion(false);
            lastProcessedQuestionId.current = newQuestionId;
            console.log("New question received:", updatedPlayer.currentQuestion);
          } else {
            console.log(`No new question after answer, waiting for next update`);
          }
        } else {
          console.log(`No new question available after answer`);
          setWaitingForNewQuestion(true);
        }
      }
    });
  };

  // Restart game
  const restartGame = () => {
    if (!currentPlayer || !currentPlayer.isHost || !socket) return;
    console.log("Restarting game");
    socket.emit("restart", { roomId, playerId: currentPlayer.id }, () => {
      setWaitingForNewQuestion(true);
      lastProcessedQuestionId.current = null;
      setTargetScore(100);
    });
  };

  // Connection status indicator
  const getConnectionStatus = () => {
    if (!isConnected || consecutiveErrors > 3) {
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
    const canStartGame = currentPlayer?.isHost && allPlayersWithLanguagesReady;

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
                      {player.isHost && <span className="text-xs text-gray-500">(Host)</span>}
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

              {currentPlayer?.isHost && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Target Score</label>
                  <Select
                    value={targetScore.toString()}
                    onValueChange={(value) => updateTargetScore(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target score" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="250">250</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                onClick={toggleReady}
                className="w-full"
                disabled={!currentPlayer?.language}
                variant={currentPlayer?.ready ? "secondary" : "default"}
              >
                {currentPlayer?.ready ? "Not Ready" : "Ready Up!"}
              </Button>

              {currentPlayer?.isHost && (
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

          {!memoizedCurrentQuestion ? (
            <Card className="text-center">
              <CardHeader>
                <CardTitle>Loading Question...</CardTitle>
                <CardDescription>Please wait while the game prepares the next question.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <Badge className="text-lg px-3 py-1">Your Score: {currentPlayer?.score || 0}</Badge>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    Target: {targetScore}
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
                  <CardTitle className="text-3xl font-bold text-blue-700">{memoizedCurrentQuestion.english}</CardTitle>
                  <CardDescription>Select the correct translation in {currentPlayer?.language}</CardDescription>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {memoizedCurrentQuestion.options.map((option, index) => {
                  let buttonClass = "h-16 text-lg font-medium";

                  if (showResult) {
                    if (option === memoizedCurrentQuestion.correctAnswer) {
                      buttonClass += " bg-green-500 hover:bg-green-500 text-white";
                    } else if (option === selectedAnswer && option !== memoizedCurrentQuestion.correctAnswer) {
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
                    {selectedAnswer === memoizedCurrentQuestion.correctAnswer ? (
                      <div className="text-green-600">
                        <p className="text-xl font-bold">Correct! 🎉</p>
                        <p>You earned {Math.max(1, 10 - (10 - timeLeft))} points!</p>
                      </div>
                    ) : timeLeft === 0 ? (
                      <div className="text-orange-600">
                        <p className="text-xl font-bold">Time's up! ⏰</p>
                        <p>The correct answer was: {memoizedCurrentQuestion.correctAnswer}</p>
                      </div>
                    ) : (
                      <div className="text-red-600">
                        <p className="text-xl font-bold">Wrong answer!</p>
                        <p>The correct answer was: {memoizedCurrentQuestion.correctAnswer}</p>
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
              <p className="font-medium">Final Scores (Target: {targetScore}):</p>
              {players.map((player) => (
                <div key={player.id} className="flex justify-between items-center mt-2">
                  <span>{player.name}</span>
                  <Badge variant={player.id === winner.id ? "default" : "secondary"}>{player.score} pts</Badge>
                </div>
              ))}
            </div>
            {currentPlayer?.isHost && (
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