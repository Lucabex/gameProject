// ACKNOWLEDGMENTS AND REFERENCES:
// - react-chessboard & chess.js: Used for board rendering, move validation, and Standard Algebraic Notation (SAN) generation.
// - @microsoft/signalr: Used for real-time, event-driven WebSocket communication with the backend.
//   All core game logic, API integration, and architectural decisions were implemented by the author.

import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import React, { useEffect, useState, useRef } from "react";
import * as signalR from "@microsoft/signalR";

// Initialize the SignalR connection builder.
// This establishes the interoperability layer between the frontend React app and the backend ASP.NET Core SignalR Hub.
const connection = new signalR.HubConnectionBuilder()
  .withUrl("http://localhost:5228/chesshub", {
    withCredentials: false,
  })
  .withAutomaticReconnect()
  .build();

console.log("Dashboard component loaded");

// Helper function to start the SignalR connection safely.
// It checks the current connection state to prevent attempting to start an already connecting or connected hub.
const startConnectio = async () => {
  if (connection.state === signalR.HubConnectionState.Connected) return;
  console.log("Current connection state:", connection.state);
  try {
    await connection.start();
    console.log("SignalR connected successfully");
  } catch (err) {
    console.error("SignalR Connection Error:", err);
  }
};

const Api_url = "http://localhost:5228/auth";

// TypeScript interface defining the structure of the puzzle data received from the third-party APIs.
interface PuzzleType {
  fen: string;
  themes: string[];
  solution: string[];
  playerColor: "white" | "black";
  moveToWin: number;
  type: "a" | "b";
}

function Dash() {
  // --- STATE MANAGEMENT ---
  // Puzzle and local game state
  const [game, setGame] = useState(new Chess());
  const [puzzle, setPuzzle] = useState<PuzzleType | null>(null);
  const [status, setStatus] = useState<
    "Loading" | "Playing" | "Solved" | "Failed"
  >("Loading");
  const [currentIndex, setCurrentIndex] = useState(0);

  // User statistics state
  const [info, setInfo] = useState<boolean>(false);
  const [fetchedCount, setFetchedCount] = useState(0);
  const [fetchedSolved, setFetchedSolved] = useState(0);

  // Online matchmaking state
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSearchingMatch, setIsSearchingMatch] = useState<boolean>(false);
  const [isOnLine, setIsOnLine] = useState<boolean>(false);
  const [onLineRoomId, setOnLineRoomId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string>("");
  const [onlineColor, setOnlineColor] = useState<"white" | "black">("white");
  const [onLineGame, setOnLineGame] = useState(new Chess());

  // User identity and UI feedback state
  const [currentUserName, setCurrentUserName] = useState<string>("Player");
  const [logged, setLogged] = useState<boolean>(false);
  const [onScreenFeedback, setOnScreenFeedback] = useState<string>("");

  // Move history state: stores an array of Standard Algebraic Notation (SAN) strings.
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  // useRef is used here to solve a React 18 Strict Mode "stale closure" bug.
  // SignalR event handlers are attached once on mount. Without a ref, the handler would only see
  // the initial empty board state. The ref ensures the handler always accesses the absolute latest board FEN.
  const onLineGameRef = useRef(onLineGame);

  useEffect(() => {
    onLineGameRef.current = onLineGame;
  }, [onLineGame]);

  // --- EVENT-DRIVEN PROGRAMMING: SIGNALR SETUP ---
  // This effect runs exactly once on component mount to attach event listeners.
  // This decouples the UI from the server, allowing the server to push events asynchronously.
  useEffect(() => {
    const handleWaiting = () => {
      setIsSearchingMatch(true);
    };

    const handleMatchFound = (
      roomId: string,
      oppName: string,
      color: string,
    ) => {
      console.log("MatchFound event received!", { roomId, oppName, color });
      setIsSearchingMatch(false);
      setIsOnLine(true);
      setOpponentName(oppName);
      setOnLineRoomId(roomId);
      setOnlineColor(color === "black" ? "black" : "white");
      setOnLineGame(new Chess());
      setMoveHistory([]); // Reset move history for the new online match
    };

    const handleOpponentMove = (moveData: any) => {
      // Use the ref to get the latest board state, preventing stale closure bugs.
      const gameCopy = new Chess(onLineGameRef.current.fen());
      const move = gameCopy.move({
        from: moveData.from,
        to: moveData.to,
        promotion: "q",
      });

      if (!move) return;

      // Update the board state and append the opponent's move to the history using immutable state update.
      setOnLineGame(gameCopy);
      setMoveHistory((prev) => [...prev, move.san]);

      // Check for end-game conditions triggered by the opponent's move.
      if (gameCopy.isCheckmate()) {
        console.log("CHECKMATE! You lost!");
        setOnScreenFeedback("You lost.");
      } else if (gameCopy.isDraw()) {
        console.log("Game is a draw");
        setOnScreenFeedback("Draw!");
      } else if (gameCopy.isCheck()) {
        console.log("You're in check!");
        setOnScreenFeedback("Check!");
      }
    };

    const handleCancelSearchSignalR = () => {
      setIsSearchingMatch(false);
    };

    // Subscribe to server-published events
    connection.on("WaitingForMatch", handleWaiting);
    connection.on("MatchFound", handleMatchFound);
    connection.on("CancelSearch", handleCancelSearchSignalR);
    connection.on("OpponentMove", handleOpponentMove);

    // Initiate the connection after listeners are attached
    startConnectio();

    // Cleanup function to prevent memory leaks and duplicate listeners on unmount
    return () => {
      connection.off("WaitingForMatch", handleWaiting);
      connection.off("MatchFound", handleMatchFound);
      connection.off("CancelSearch", handleCancelSearchSignalR);
      connection.off("OpponentMove", handleOpponentMove);
    };
  }, []);

  // --- ONLINE MATCHMAKING FUNCTIONS ---
  const handleSearchOnLine = async () => {
    setIsSearchingMatch(true);
    setOpponentName("");
    setMoveHistory([]);

    if (connection.state !== signalR.HubConnectionState.Connected) {
      await startConnectio();
    }

    if (connection.state !== signalR.HubConnectionState.Connected) {
      setIsSearchingMatch(false);
      alert("Could not connect to the matchmaking server.");
      return;
    }

    const userName = localStorage.getItem("userName") || "Player";

    try {
      // Invoke the backend Hub method to find or create a match
      await connection.invoke("FindNewMatch", userName);
    } catch (err) {
      setIsSearchingMatch(false);
      alert(
        "Matchmaking error: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    }
  };

  const handleStopSearch = async () => {
    setIsSearchingMatch(false);

    // Only attempt to cancel on the server if the connection is actively established
    if (connection.state === signalR.HubConnectionState.Connected) {
      try {
        await connection.invoke("CancelSearch");
        console.log("Successfully canceled search on server.");
      } catch (err) {
        console.error("Error canceling search on server:", err);
      }
    } else {
      console.log(
        "Connection not established yet, no need to cancel on server.",
      );
    }
  };

  // --- ONLINE MOVE HANDLING ---
  const onOnlineDrop = (start: string, target: string): boolean => {
    const gameCopy = new Chess(onLineGame.fen());
    const turn = gameCopy.turn();
    const isMyTurn =
      (turn === "w" && onlineColor === "white") ||
      (turn === "b" && onlineColor === "black");

    if (!isMyTurn) {
      console.log("Not your turn!");
      return false;
    }

    let move;
    try {
      move = gameCopy.move({ from: start, to: target, promotion: "q" });
    } catch (e) {
      console.log("Invalid move attempted:", e);
      setOnScreenFeedback("Invalid move");
      setTimeout(() => {
        setOnScreenFeedback("");
      }, 1000);
      return false;
    }

    if (!move) {
      return false;
    }

    setOnLineGame(gameCopy);
    // Append the player's move to history using the functional update pattern for immutability
    setMoveHistory((prev) => [...prev, move.san]);

    // Evaluate game state after the player's move
    if (gameCopy.isCheckmate()) {
      console.log("CHECKMATE! You won!");
      setOnScreenFeedback("Check mate");
    } else if (gameCopy.isDraw()) {
      console.log("Game is a draw");
      setOnScreenFeedback("Draw");
    } else if (gameCopy.isCheck()) {
      console.log("Check!");
      setOnScreenFeedback("Check");
    }

    // Broadcast the move to the opponent via the SignalR Hub
    if (onLineRoomId) {
      connection
        .invoke("MakeOnlineMove", onLineRoomId, {
          from: start,
          to: target,
          fen: gameCopy.fen(),
        })
        .catch((err) => console.error("SignalR invoke error:", err));
    }
    return true;
  };

  // --- INTEROPERABILITY: USER STATISTICS API ---
  const handleSolved = async () => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${Api_url}/solve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Virtual identity established via JWT
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server Error ${response.status} here:`, errorText);
      return;
    }
    const data = await response.json();
    // Note: Backend returns "NewCount" with a capital N
    const solved = data.NewCount;
    console.log("this is solved", solved);
    setFetchedSolved(solved);
  };

  const addCount = async () => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${Api_url}/AddPuzzle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server Error ${response.status} here:`, errorText);
      return;
    }
    setInfo((prev) => !prev);
    const data = await response.json();
    const count = data.count;
    setFetchedCount(count);
    return;
  };

  const toggleInfo = () => {
    setInfo((prev) => !prev);
  };

  useEffect(() => {
    setInfo((prev) => !prev);
  }, []);

  // Fetch user statistics on component mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = localStorage.getItem("token");
      const name = localStorage.getItem("userName") || "Player";
      setCurrentUserName(name);
      try {
        const response = await fetch(`${Api_url}/countAttempt`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Server Error ${response.status} here:`, errorText);
          return;
        }
        const data = await response.json();
        setFetchedCount(data.count);

        const response2 = await fetch(`${Api_url}/count`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response2.ok) {
          const errorText = await response2.text();
          console.error(`Server Error ${response2.status} here:`, errorText);
          return;
        }
        const data2 = await response2.json();
        setFetchedSolved(data2.count);
      } catch (error) {
        console.error("Error fetching user info", error);
      }
    };

    fetchUserInfo();
    setLogged((prev) => !prev);
  }, []);

  // --- INTEROPERABILITY: THIRD-PARTY PUZZLE APIS ---
  const fetchTwo = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setOnScreenFeedback("");
    setMoveHistory([]);
    const token = localStorage.getItem("token")?.trim();

    if (!token) {
      console.error("You must be logged in to fetch a puzzle");
      return;
    }
    try {
      const response = await fetch(`${Api_url}/puz2`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server Error ${response.status} here:`, errorText);
        return;
      }
      const data = await response.json();
      const fen = data.FEN;
      const solutionString = data.Moves || "";
      const themesString = data.Themes || "";
      const solution: string[] = solutionString.split(" ");
      const themes: string[] = themesString.split(" ");
      const color = fen.split(" ")[1];

      const playerColor = color === "w" ? "black" : "white";
      const moveToWin = solution.length / 2;

      setPuzzle({
        fen: fen,
        themes: themes,
        playerColor: playerColor,
        solution: solution,
        moveToWin: moveToWin,
        type: "b",
      });
      setStatus("Playing");
      const newGame = new Chess(fen);
      setGame(newGame);
      setCurrentIndex(0);
      addCount();

      // Simulate the first CPU move after a 2-second delay
      setTimeout(() => {
        const nextMove = solution[0];
        const start = nextMove.substring(0, 2);
        const target = nextMove.substring(2, 4);
        try {
          const gameCopy = new Chess(newGame.fen());
          const move = gameCopy.move({
            from: start,
            to: target,
            promotion: "q",
          });
          setGame(gameCopy);
          if (move) {
            setMoveHistory((prev) => [...prev, move.san]);
          }
          setOnScreenFeedback("");
          setCurrentIndex(1);
        } catch (error) {
          console.error("cpu failed first move", error);
        }
      }, 2000);
    } catch (error) {
      console.error("Server Error you are not connected", error);
    }
  };

  const fetchOne = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setOnScreenFeedback("");
    setMoveHistory([]);
    const token = localStorage.getItem("token");

    if (token == null) {
      console.error("You must be logged in to fetch a puzzle");
      return;
    }
    try {
      const response = await fetch(`${Api_url}/puz`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        console.error("Server error");
        return;
      }
      const data = await response.json();
      const fen = data.puzzle.fen;
      const solution = data.puzzle.solution;
      const themes = data.puzzle.themes;
      const color = fen.split(" ")[1];

      const playerColor = color === "w" ? "white" : "black";
      if (!solution) {
        console.error("Service error: no puzzle info");
        setOnScreenFeedback("Error loading puzzle");
        return;
      }
      const moveToWin = solution.length / 2;
      setPuzzle({
        fen: fen,
        solution: solution,
        themes: themes,
        moveToWin: moveToWin,
        playerColor: playerColor,
        type: "a",
      });

      setStatus("Playing");
      setCurrentIndex(0);
      setOnScreenFeedback("");
      addCount();
      setGame(new Chess(fen));
      return;
    } catch (error) {
      console.error("Server Error you are not connected", error);
    }
  };

  // --- LOCAL PUZZLE MOVE VALIDATION ---
  const onDrop = (start: string, target: string): boolean => {
    if (!puzzle || status !== "Playing") {
      return false;
    }

    // Handle Puzzle Type A logic
    if (puzzle.type === "a") {
      const p1Move = start + target;
      const rightMove = puzzle.solution[currentIndex];

      if (p1Move !== rightMove) {
        console.log("invalid Move");
        return false;
      }
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({ from: start, to: target, promotion: "q" });

      if (!move) {
        console.log("Invalid move");
        return false;
      }

      setMoveHistory((prev) => [...prev, move.san]);
      setGame(gameCopy);

      const nextIndex = currentIndex + 1;
      if (nextIndex >= puzzle.solution.length) {
        console.log("Solved");
        setStatus("Solved");
        setOnScreenFeedback("Solved");
        handleSolved();
        return true;
      }

      setTimeout(() => {
        const cpuMove = puzzle.solution[nextIndex];
        const cpuStart = cpuMove.substring(0, 2);
        const cpuTarget = cpuMove.substring(2, 4);

        const gameCpuCopy = new Chess(gameCopy.fen());
        const cpuNext = gameCpuCopy.move({
          from: cpuStart,
          to: cpuTarget,
          promotion: "q",
        });

        if (!cpuNext) {
          console.log("Invalid Move");
          return false;
        }
        setGame(gameCpuCopy);
        setMoveHistory((prev) => [...prev, cpuNext.san]);
        setCurrentIndex(nextIndex + 1);
      }, 1000);
      return true;
    }

    // Handle Puzzle Type B logic
    else if (puzzle.type === "b") {
      const p1Move = start + target;
      const rightMove = puzzle.solution[currentIndex];

      if (p1Move !== rightMove) {
        console.log("invalid Move");
        return false;
      }
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({ from: start, to: target, promotion: "q" });

      if (!move) {
        console.log("Invalid move");
        return false;
      }

      setMoveHistory((prev) => [...prev, move.san]);
      setGame(gameCopy);

      const nextIndex = currentIndex + 1;
      if (nextIndex >= puzzle.solution.length) {
        console.log("Solved");
        setStatus("Solved");
        setOnScreenFeedback("Solved");
        handleSolved();
        return true;
      }

      setTimeout(() => {
        const cpuMove = puzzle.solution[nextIndex];
        const cpuStart = cpuMove.substring(0, 2);
        const cpuTarget = cpuMove.substring(2, 4);

        const gameCpuCopy = new Chess(gameCopy.fen());
        const cpuNext = gameCpuCopy.move({
          from: cpuStart,
          to: cpuTarget,
          promotion: "q",
        });

        if (!cpuNext) {
          console.log("Invalid Move");
          return false;
        }
        setGame(gameCpuCopy);
        setMoveHistory((prev) => [...prev, cpuNext.san]);
        setCurrentIndex(nextIndex + 1);
      }, 1000);
      return true;
    }
    return true;
  };

  // --- JSX RENDERING ---
  return (
    <>
      {/* VIEW 1: Default Puzzle Dashboard */}
      {!isSearchingMatch && !isOnLine && (
        <div className="dashBox">
          <div className="boardBox">
            <Chessboard
              position={game.fen()}
              boardOrientation={puzzle?.playerColor}
              onPieceDrop={onDrop}
            />
          </div>
          <div className="rightSide">
            <div className="feedback">
              <p>{onScreenFeedback}</p>
            </div>

            <div className="gameInfoBox">
              <h2>Chess Puzzle</h2>
              <p>UserName : {localStorage.getItem("userName")}</p>
              <p>Puzzle played: {fetchedCount}</p>
              <p>Puzzle solved: {fetchedSolved}</p>
              <div className="buttonBox">
                <button onClick={fetchOne}>Puzzle</button>
                <button onClick={fetchTwo}>Puzzle2</button>
              </div>
              <button id="onLineButton" onClick={handleSearchOnLine}>
                Play Online
              </button>
            </div>

            {/* Move History Display */}
            {moveHistory.length === 0 ? (
              <p style={{ color: "#888", fontSize: "14px" }}>No moves yet</p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  width: "280px",
                  maxHeight: "100px",
                  overflow: "scroll",
                }}
              >
                {moveHistory.map((move, index) => (
                  <span
                    key={index}
                    style={{
                      backgroundColor: "#f0f0f0",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    {Math.floor(index / 2) + 1}. {move}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Matchmaking Search Screen */}
      {isSearchingMatch && !isOnLine && (
        <div className="searchingBox">
          <div className="searchingInfoBox">
            <h3>Searching for an opponent...</h3>
            <button
              onClick={handleStopSearch}
              style={{ marginTop: "10px", padding: "8px 16px" }}
            >
              Stop Search
            </button>
          </div>
        </div>
      )}

      {/* VIEW 3: Active Online Match Screen */}
      {!isSearchingMatch && isOnLine && (
        <div className="dashBox">
          <div className="boardBox">
            <h2
              style={{
                textAlign: "center",
                marginBottom: "15px",
                color: "#333",
              }}
            >
              Playing as{" "}
              <strong
                style={{
                  color: onlineColor === "white" ? "#fff" : "#000",
                  textShadow:
                    onlineColor === "white" ? "1px 1px 2px #000" : "none",
                }}
              >
                {onlineColor.toUpperCase()}
              </strong>{" "}
              vs <strong>{opponentName || "Opponent"}</strong>
            </h2>
            <Chessboard
              position={onLineGame.fen()}
              boardOrientation={onlineColor}
              onPieceDrop={onOnlineDrop}
            />
          </div>
          <div className="rightSide">
            <div className="feedback">
              <p>{onScreenFeedback}</p>
            </div>
            <div className="gameInfoBox" style={{ textAlign: "center" }}>
              <p>
                <strong>You:</strong> {currentUserName}
              </p>
              <p>
                <strong>Opponent:</strong> {opponentName}
              </p>
              <p>
                <strong>Room ID:</strong> {onLineRoomId?.substring(0, 8)}...
              </p>

              <button
                onClick={() => {
                  setIsOnLine(false);
                  setOnLineGame(new Chess());
                  setOpponentName("");
                  setOnLineRoomId(null);
                  setOnScreenFeedback("");
                  setMoveHistory([]);
                }}
                style={{
                  marginTop: "15px",
                  padding: "10px 20px",
                  backgroundColor: "#ff4444",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                Leave Match
              </button>
            </div>

            {/* Move History Display for Online Mode */}
            {moveHistory.length === 0 ? (
              <p style={{ color: "#888", fontSize: "14px" }}>No moves yet</p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  width: "280px",
                  maxHeight: "100px",
                  overflow: "scroll",
                }}
              >
                {moveHistory.map((move, index) => (
                  <span
                    key={index}
                    style={{
                      backgroundColor: "#f0f0f0",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    {Math.floor(index / 2) + 1}. {move}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default Dash;
