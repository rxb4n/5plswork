"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
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
  // Socket and connection state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [showRecoveryOption, setShowRecoveryOption] = useState(false);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);

  // Game state
  const [gameState, setGameState] = useState<GameState>("home");
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [targetScore, setTargetScore] = useState(100);
  const [winner, setWinner] = useState<Player | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  // Question and game flow state - COMPLETELY ISOLATED FROM ROOM UPDATES
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [startGameError, setStartGameError] = useState<string | null>(null);

  // Refs for tracking - ISOLATED TIMER IMPLEMENTATION
  const lastProcessedQuestionId = useRef<string | null>(null);
  const currentPlayerId = useRef<string | null>(null);
  const currentRoomId = useRef<string | null>(null); // Add room ID ref
  const socketRef = useRef<Socket | null>(null); // Add socket ref
  const questionStartTime = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingAnswer = useRef<boolean>(false);
  const currentQuestionRef = useRef<Question | null>(null); // Track current question in ref
  const ignoreRoomUpdates = useRef<boolean>(false); // Flag to ignore room updates during timer

  // Update refs when values change
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    currentRoomId.current = roomId;
  }, [roomId]);

  // Normalize server room to client expected format
  const normalizeRoom = (serverRoom: ServerRoom): {
    id: string;
    gameState: string;
    players: Player[];
    targetScore: number;
  } => {
    const normalizedPlayers = serverRoom.players.map((p) => ({
      id: p.id,
      name: p.name,
      language: p.language,
      ready: p.ready,
      score: p.score,
      isHost: p.is_host,
      currentQuestion: p.current_question || undefined,
    }));

    return {
      id: serverRoom.id,
      gameState: serverRoom.game_state,
      players: normalizedPlayers,
      targetScore: serverRoom.target_score || 100,
    };
  };

  // FIXED: Completely isolated timer that ignores room updates
  const startIndividualTimer = (question: Question) => {
    console.log(`⏰ Starting ISOLATED timer for question ${question.questionId}`);
    
    // Clear any existing timer
    stopIndividualTimer();
    
    // Reset states
    setSelectedAnswer(null);
    setShowResult(false);
    isProcessingAnswer.current = false;
    currentQuestionRef.current = question;
    
    // Set question start time
    questionStartTime.current = Date.now();
    setTimeLeft(10);
    
    // CRITICAL: Ignore room updates while timer is running
    ignoreRoomUpdates.current = true;
    
    // Start countdown timer - COMPLETELY ISOLATED
    timerRef.current = setInterval(() => {
      if (!questionStartTime.current || isProcessingAnswer.current) return;
      
      const elapsed = Math.floor((Date.now() - questionStartTime.current) / 1000);
      const remaining = Math.max(0, 10 - elapsed);
      
      setTimeLeft(remaining);
      
      // Handle timeout
      if (remaining <= 0 && !isProcessingAnswer.current && currentQuestionRef.current) {
        console.log("⏰ ISOLATED timer expired - auto-submitting timeout!");
        isProcessingAnswer.current = true;
        stopIndividualTimer();
        setShowResult(true);
        setSelectedAnswer(""); // Set empty answer for timeout
        
        // Submit timeout answer immediately
        handleTimeoutSubmission(currentQuestionRef.current);
      }
    }, 100);
  };

  // FIXED: Handle timeout submission with proper data validation
  const handleTimeoutSubmission = (question: Question) => {
    console.log("🔍 Checking timeout submission data:");
    console.log("  - Question:", question ? `${question.questionId} (${question.english})` : "null");
    console.log("  - Current Player ID:", currentPlayerId.current);
    console.log("  - Room ID:", currentRoomId.current);
    console.log("  - Socket:", socketRef.current ? "connected" : "null");

    if (!question) {
      console.log("❌ Cannot submit timeout - no question");
      return;
    }

    if (!currentPlayerId.current) {
      console.log("❌ Cannot submit timeout - no player ID");
      return;
    }

    if (!currentRoomId.current) {
      console.log("❌ Cannot submit timeout - no room ID");
      return;
    }

    if (!socketRef.current) {
      console.log("❌ Cannot submit timeout - no socket connection");
      return;
    }

    console.log(`✅ All data available - submitting timeout for question ${question.questionId}`);
    
    socketRef.current.emit("answer", { 
      roomId: currentRoomId.current, 
      playerId: currentPlayerId.current, 
      data: { 
        answer: "", // Empty answer for timeout
        timeLeft: 0,
        questionId: question.questionId
      } 
    }, (response: any) => {
      console.log("Timeout answer response:", response);
      isProcessingAnswer.current = false;
      ignoreRoomUpdates.current = false; // Re-enable room updates
      
      if (response?.room) {
        handleAnswerResponse(response);
      } else {
        console.error("No room in timeout response:", response);
        // Force re-enable room updates even if response is bad
        ignoreRoomUpdates.current = false;
      }
    });
  };

  // Stop individual timer
  const stopIndividualTimer = () => {
    if (timerRef.current) {
      console.log("⏰ Stopping ISOLATED timer");
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    ignoreRoomUpdates.current = false; // Always re-enable room updates when stopping timer
  };

  // FIXED: Submit answer function for manual selections
  const submitAnswer = (answer: string, actualTimeLeft?: number) => {
    if (isProcessingAnswer.current || !currentQuestionRef.current || !currentPlayerId.current || !socketRef.current) {
      console.log("❌ Cannot submit answer - already processing or missing data");
      console.log("  - Processing:", isProcessingAnswer.current);
      console.log("  - Question:", !!currentQuestionRef.current);
      console.log("  - Player ID:", !!currentPlayerId.current);
      console.log("  - Socket:", !!socketRef.current);
      return;
    }

    const question = currentQuestionRef.current;

    // Calculate actual time taken using individual timer
    const timeUsed = questionStartTime.current 
      ? Math.max(0, 10 - Math.floor((Date.now() - questionStartTime.current) / 1000))
      : (actualTimeLeft !== undefined ? actualTimeLeft : timeLeft);

    console.log(`🎯 Submitting manual answer for question ${question.questionId}: "${answer}"`);
    console.log(`⏰ Time left: ${timeUsed}s`);
    
    isProcessingAnswer.current = true;
    setSelectedAnswer(answer);
    setShowResult(true);
    stopIndividualTimer();

    socketRef.current.emit("answer", { 
      roomId: currentRoomId.current, 
      playerId: currentPlayerId.current, 
      data: { 
        answer, 
        timeLeft: timeUsed,
        questionId: question.questionId
      } 
    }, (response: any) => {
      console.log("Manual answer response:", response);
      isProcessingAnswer.current = false;
      ignoreRoomUpdates.current = false; // Re-enable room updates
      
      if (response?.room) {
        handleAnswerResponse(response);
      } else {
        console.error("No room in manual answer response:", response);
        // Force re-enable room updates even if response is bad
        ignoreRoomUpdates.current = false;
      }
    });
  };

  // FIXED: Centralized answer response handler
  const handleAnswerResponse = (response: any) => {
    const normalizedRoom = normalizeRoom(response.room);
    const updatedPlayer = normalizedRoom.players.find((p: Player) => p.id === currentPlayerId.current);
    
    setPlayers(normalizedRoom.players);
    setTargetScore(normalizedRoom.targetScore);

    if (updatedPlayer) {
      setCurrentPlayer(updatedPlayer);
    }

    // Handle game end
    if (normalizedRoom.gameState === "finished" && response.room.winner_id) {
      const winnerPlayer = normalizedRoom.players.find((p) => p.id === response.room.winner_id);
      setWinner(winnerPlayer || null);
      setGameState("finished");
      setCurrentQuestion(null);
      currentQuestionRef.current = null;
      lastProcessedQuestionId.current = null;
      return;
    }

    // Handle next question
    if (updatedPlayer?.currentQuestion) {
      const newQuestion = updatedPlayer.currentQuestion;
      if (newQuestion.questionId !== lastProcessedQuestionId.current) {
        console.log(`🔄 Setting new question after answer: ${newQuestion.questionId}`);
        setCurrentQuestion(newQuestion);
        lastProcessedQuestionId.current = newQuestion.questionId;
        
        // Start new isolated timer for new question
        setTimeout(() => {
          startIndividualTimer(newQuestion);
        }, 100);
        
        console.log("✅ New question received after answer:", newQuestion);
      }
    } else {
      console.log("❌ No new question received after answer");
    }
  };

  // Initialize Socket.IO connection
  useEffect(() => {
    console.log("Initializing Socket.IO connection...")
    
    const newSocket = io({
      path: "/api/socketio",
      transports: ["polling", "websocket"],
      forceNew: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 20000,
      upgrade: true,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Socket.IO connected successfully:", newSocket.id);
      setIsConnected(true);
      setConnectionError(null);
      setConsecutiveErrors(0);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Socket.IO disconnected:", reason);
      setIsConnected(false);
      setConnectionError(`Disconnected: ${reason}. Attempting to reconnect...`);
      setConsecutiveErrors((prev) => prev + 1);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket.IO connect error:", error.message);
      setConnectionError(`Connection error: ${error.message}`);
      setConsecutiveErrors((prev) => prev + 1);
      
      if (consecutiveErrors > 3) {
        setShowRecoveryOption(true);
      }
    });

    newSocket.on("room-update", (data: { room: ServerRoom; serverInfo?: ServerInfo }) => {
      console.log("=== ROOM UPDATE RECEIVED ===");

      // CRITICAL: Ignore room updates if timer is running to prevent interference
      if (ignoreRoomUpdates.current) {
        console.log("🚫 IGNORING room update - timer is running");
        return;
      }

      if (!data.room) {
        console.error("Missing room object in room-update");
        setConnectionError("Invalid server response: Missing room data");
        setConsecutiveErrors((prev) => prev + 1);
        setGameState("lobby");
        return;
      }

      const room = normalizeRoom(data.room);
      
      console.log("Processing room update:", {
        gameState: room.gameState,
        playerCount: room.players.length,
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

      // Find the current player using the stored player ID
      const updatedCurrentPlayer = room.players.find((p: Player) => p.id === currentPlayerId.current);
      if (updatedCurrentPlayer) {
        setCurrentPlayer(updatedCurrentPlayer);
      }

      // Handle game state transitions
      if (!room.gameState) {
        console.warn("Room gameState is undefined");
        setConnectionError("Server error: Game state not provided");
        setGameState("lobby");
        return;
      }

      // Handle transition to playing state
      if (room.gameState === "playing") {
        console.log("=== TRANSITIONING TO PLAYING STATE ===");
        setGameState("playing");
        setIsStartingGame(false);
        
        // ONLY set question if we don't have one or it's different
        if (updatedCurrentPlayer?.currentQuestion) {
          const newQuestion = updatedCurrentPlayer.currentQuestion;
          
          // Only start timer if this is a genuinely new question
          if (newQuestion.questionId !== lastProcessedQuestionId.current) {
            console.log(`🎯 SETTING NEW QUESTION WITH ISOLATED TIMER:`, {
              questionId: newQuestion.questionId,
              english: newQuestion.english,
            });
            
            setCurrentQuestion(newQuestion);
            lastProcessedQuestionId.current = newQuestion.questionId;
            
            // Start isolated timer for this player only
            startIndividualTimer(newQuestion);
            
            console.log("✅ Question set with isolated timer!");
          } else {
            console.log("🔄 Same question, keeping existing timer");
          }
        } else {
          console.log("❌ No question found for current player");
          setCurrentQuestion(null);
          currentQuestionRef.current = null;
          stopIndividualTimer();
        }
      } else if (room.gameState === "finished" && data.room.winner_id) {
        const winnerPlayer = room.players.find((p) => p.id === data.room.winner_id);
        setWinner(winnerPlayer || null);
        setGameState("finished");
        setCurrentQuestion(null);
        currentQuestionRef.current = null;
        stopIndividualTimer();
        lastProcessedQuestionId.current = null;
      } else if (room.gameState === "lobby" && gameState !== "lobby") {
        console.log("Game state is lobby, transitioning to lobby view");
        setGameState("lobby");
        setCurrentQuestion(null);
        currentQuestionRef.current = null;
        setWinner(null);
        setIsStartingGame(false);
        stopIndividualTimer();
        lastProcessedQuestionId.current = null;
      }

      console.log("=== ROOM UPDATE COMPLETE ===");
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
      console.log("Cleaning up Socket.IO connection");
      stopIndividualTimer();
      newSocket.disconnect();
      setSocket(null);
    };
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      stopIndividualTimer();
    };
  }, []);

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
    currentPlayerId.current = playerId;
    
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
    currentPlayerId.current = playerId;
    
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
    if (!roomId || !currentPlayerId.current || !socket) return;

    setConnectionError("Attempting to recover room...");
    socket.emit("join-room", { roomId, playerId: currentPlayerId.current, data: { name: currentPlayer?.name || "Unknown" } }, (response: any) => {
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
    if (currentPlayerId.current && socket) {
      socket.emit("leave-room", { roomId, playerId: currentPlayerId.current });
    }

    if (socket) {
      socket.disconnect();
      setSocket(null);
    }

    stopIndividualTimer();
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
    currentQuestionRef.current = null;
    setTargetScore(100);
    setIsStartingGame(false);
    lastProcessedQuestionId.current = null;
    currentPlayerId.current = null;
    currentRoomId.current = null;
  };

  // Update player language
  const updateLanguage = (language: Language) => {
    if (!language || !currentPlayerId.current || !socket) return;

    console.log(`Updating language for player ${currentPlayerId.current} to ${language}`);
    socket.emit("update-language", { roomId, playerId: currentPlayerId.current, data: { language } }, (response: any) => {
      if (response?.room) {
        const normalizedRoom = normalizeRoom(response.room);
        setPlayers(normalizedRoom.players);
        setTargetScore(normalizedRoom.targetScore);
        const updatedPlayer = normalizedRoom.players.find((p: Player) => p.id === currentPlayerId.current);
        if (updatedPlayer) {
          setCurrentPlayer(updatedPlayer);
          console.log(`Language updated for player ${currentPlayerId.current}`);
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

    console.log("=== STARTING GAME ===");
    console.log("Attempting to start game", { playerId: currentPlayer.id });
    setIsStartingGame(true);
    setStartGameError(null);

    socket.emit("start-game", { roomId, playerId: currentPlayer.id }, (response: any) => {
      console.log("Start game response:", response);
      
      if (response?.error) {
        console.error("Failed to start game:", response.error);
        setStartGameError(response.error);
        setIsStartingGame(false);
      } else {
        console.log("Start game succeeded");
        lastProcessedQuestionId.current = null;
      }
    });
  };

  // FIXED: Handle answer selection with isolated timing
  const selectAnswer = (answer: string) => {
    if (isProcessingAnswer.current || selectedAnswer || !currentQuestionRef.current || !currentPlayerId.current || !socketRef.current) {
      console.log("❌ Cannot select answer - already processing or missing data");
      return;
    }

    console.log(`🎯 Player selected answer: "${answer}"`);
    submitAnswer(answer);
  };

  // Restart game
  const restartGame = () => {
    if (!currentPlayer || !currentPlayer.isHost || !socket) return;
    console.log("Restarting game");
    stopIndividualTimer();
    socket.emit("restart", { roomId, playerId: currentPlayer.id }, () => {
      lastProcessedQuestionId.current = null;
      currentQuestionRef.current = null;
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
                    ? "Starting Game..."
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-4 pb-20">
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>Debug Information:</strong></p>
                  <p>Current Question: {currentQuestion ? "Yes" : "No"}</p>
                  <p>Player has question: {currentPlayer?.currentQuestion ? "Yes" : "No"}</p>
                  <p>Player language: {currentPlayer?.language || "None"}</p>
                  <p>Game state: {gameState}</p>
                  <p>Processing answer: {isProcessingAnswer.current ? "Yes" : "No"}</p>
                  <p>Ignoring room updates: {ignoreRoomUpdates.current ? "Yes" : "No"}</p>
                  <p>Player ID: {currentPlayerId.current || "None"}</p>
                  <p>Room ID: {currentRoomId.current || "None"}</p>
                  <p>Socket connected: {socketRef.current ? "Yes" : "No"}</p>
                </div>
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
                    <span className={`text-xl font-bold ${timeLeft <= 3 ? 'text-red-500' : ''}`}>
                      {timeLeft}s
                    </span>
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
                  <CardDescription>
                    Select the correct translation in {currentPlayer?.language}
                    <br />
                    <span className="text-xs text-gray-500">
                      🔒 Individual timer • Wrong answer/timeout = -5 points
                    </span>
                  </CardDescription>
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
                      disabled={!!selectedAnswer || timeLeft === 0 || isProcessingAnswer.current}
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
                    ) : timeLeft === 0 || selectedAnswer === "" ? (
                      <div className="text-orange-600">
                        <p className="text-xl font-bold">Time's up! ⏰</p>
                        <p className="text-red-600 font-semibold">-5 points penalty</p>
                        <p>The correct answer was: {currentQuestion.correctAnswer}</p>
                      </div>
                    ) : (
                      <div className="text-red-600">
                        <p className="text-xl font-bold">Wrong answer! ❌</p>
                        <p className="text-red-600 font-semibold">-5 points penalty</p>
                        <p>The correct answer was: {currentQuestion.correctAnswer}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Leave Game Button - Fixed at bottom */}
          <div className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto">
            <Button 
              onClick={leaveRoom} 
              variant="destructive" 
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 text-lg shadow-lg"
            >
              Leave Game
            </Button>
          </div>
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