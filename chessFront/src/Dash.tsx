import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

import React, { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalR";
const connection = new signalR.HubConnectionBuilder()
  .withUrl("http://localhost:5228/chesshub", {
    withCredentials: false,
  })
  .withAutomaticReconnect()
  .build();

const startConnectio = async () => {
  if (connection.state == signalR.HubConnectionState.Connected) return;
  console.log("this is state of connection", connection.state);
  try {
    await connection.start();
    console.log("signalR connected");
  } catch (err) {
    console.error("signalR Connection Error:", err);
  }
};
const Api_url = "http://localhost:5228/auth";

interface PuzzleType {
  fen: string;
  themes: string[];
  solution: string[];
  playerColor: "white" | "black";
  moveToWin: number;
  type: "a" | "b";
}

function Dash() {
  const [game, setGame] = useState(new Chess());
  const [puzzle, setPuzzle] = useState<PuzzleType | null>(null);
  const [status, setStatus] = useState<
    "Loading" | "Playing" | "Solved" | "Failed"
  >("Loading");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [info, setInfo] = useState<boolean>(false);
  const [fetchedCount, setFetchedCount] = useState(0);
  const [fetchedSolved, setFetchedSolved] = useState(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSearchingMatch, setIsSearchingMatch] = useState<boolean>(false);
  const [isOnLine, setIsOnLine] = useState<boolean>(false);
  const [onLineRoomId, setOnLineRoomId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string>("");
  const [onlineColor, setOnlineColor] = useState<"white" | "black">("white");
  const [onLineGame, setOnLineGame] = useState(new Chess());
  const [currentUserName, setCurrentUserName] = useState<string>("Player");
  const [logged, setLogged] = useState<boolean>(false);
  useEffect(() => {
    const handleWaiting = () => {
      setIsSearchingMatch(true);
    };

    const handleMatchFound = (
      roomId: string,
      oppName: string,
      color: string,
    ) => {
      console.log("MatchFound received!", {
        roomId,
        oppName,
        color,
      });
      setIsSearchingMatch(false);
      setIsOnLine(true);
      setOpponentName(oppName);
      setOnLineRoomId(roomId);
      setOnlineColor(color === "black" ? "black" : "white");
      setOnLineGame(new Chess());
    };

    const handleOpponentMove = (moveData: any) => {
      setOnLineGame((prevGame) => {
        const gameCopy = new Chess(prevGame.fen());
        const move = gameCopy.move({
          from: moveData.from,
          to: moveData.to,
          promotion: "q",
        });
        if (!move) return prevGame;
        return gameCopy;
      });
    };

    const handleCancelSearchSignalR = () => {
      setIsSearchingMatch(false);
    };

    connection.on("WaitingForMatch", handleWaiting);
    connection.on("MatchFound", handleMatchFound);
    connection.on("CancelSearch", handleCancelSearchSignalR);
    connection.on("OpponentMove", handleOpponentMove);

    startConnectio();

    return () => {
      connection.off("WaitingForMatch", handleWaiting);
      connection.off("MatchFound", handleMatchFound);
      connection.off("CancelSearch", handleCancelSearchSignalR);
      connection.off("OpponentMove", handleOpponentMove);
    };
  }, []);
  const handleSearchOnLine = async () => {
    setIsSearchingMatch(true);
    setOpponentName("");

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
      return false;
    }

    if (!move) {
      return false;
    }
    setOnLineGame(gameCopy);

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

  const handleSolved = async () => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${Api_url}/solve`, {
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
    const data = await response.json();
    const solved = data.newCount;

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

        const count = data.count;

        setFetchedCount(count);

        const response2 = await fetch(`${Api_url}/count`, {
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

        const data2 = await response2.json();
        const solved = data2.count;

        setFetchedSolved(solved);
      } catch (error) {
        console.error("Error fetchinf user info", error);
      }
    };

    fetchUserInfo();
    setLogged((prev) => !prev);
  }, []);

  const fetchTwo = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
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
      const solutionString = data.Moves;
      const themesString = data.Themes;
      const solution: string[] = solutionString.split(" ");
      const themes: string[] = themesString.split(" ");
      const color = fen.split(" ")[1];

      const playerColor = color == "w" ? "black" : "white";
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
      setTimeout(() => {
        const nextMove = solution[0];

        const start = nextMove.substring(0, 2);
        const target = nextMove.substring(2, 4);
        try {
          const gameCopy = new Chess(newGame.fen());

          gameCopy.move({
            from: start,
            to: target,
            promotion: "q",
          });

          setGame(gameCopy);
          setCurrentIndex(1);
        } catch (error) {
          console.error("cpu failed first move", error);
        }
      }, 2000);
    } catch (error) {
      console.error("Server Error you are not connected");
    }
  };
  const fetchOne = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
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

      const playerColor = color == "w" ? "white" : "black";
      if (!solution) {
        console.error("Service error: nu puzzle info");
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
      addCount();
      setGame(new Chess(fen));

      return;
    } catch (error) {
      console.error("Server Error you are not connected");
    }
  };
  const onDrop = (start: string, target: string): boolean => {
    if (!puzzle || status !== "Playing") {
      return false;
    }
    if (puzzle.type == "a") {
      const p1Move = start + target;
      const rightMove = puzzle.solution[currentIndex];
      console.log("this is right move:", rightMove);

      if (p1Move !== rightMove) {
        console.log("invalid Move");
        return false;
      }
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: start,
        to: target,
        promotion: "q",
      });
      if (!move) {
        console.log("Invalid move");
        return false;
      }

      setGame(gameCopy);

      const nextIndex = currentIndex + 1;
      if (nextIndex >= puzzle.solution.length) {
        console.log("Solved");
        handleSolved();
        return true;
      }

      setTimeout(() => {
        const cpuMove = puzzle.solution[nextIndex];
        const cpuStart = cpuMove.substring(0, 2);
        const cpuTarget = cpuMove.substring(2, 4);
        console.log("this is cpuMove", cpuMove);

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
        setCurrentIndex(nextIndex + 1);
      }, 1000);
      return true;
    } else if (puzzle.type == "b") {
      const p1Move = start + target;
      const rightMove = puzzle.solution[currentIndex];
      console.log("this is right move", rightMove);

      if (p1Move !== rightMove) {
        console.log("invalid Move");
        return false;
      }
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: start,
        to: target,
        promotion: "q",
      });
      if (!move) {
        console.log("Invalid move");
        return false;
      }

      setGame(gameCopy);

      const nextIndex = currentIndex + 1;
      if (nextIndex >= puzzle.solution.length) {
        console.log("Solved");
        handleSolved();
        return true;
      }

      setTimeout(() => {
        const cpuMove = puzzle.solution[nextIndex];
        const cpuStart = cpuMove.substring(0, 2);
        const cpuTarget = cpuMove.substring(2, 4);
        console.log("this is cpuMove", cpuMove);

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
        setCurrentIndex(nextIndex + 1);
      }, 1000);
      return true;
    }
    return true;
  };
  console.log(
    "🔄 RENDER CHECK: isSearchingMatch =",
    isSearchingMatch,
    "isOnLine =",
    isOnLine,
  );
  return (
    <>
      {!isSearchingMatch && !isOnLine && (
        <div className="dashBox">
          <div className="boardBox">
            <Chessboard
              position={game.fen()}
              boardOrientation={puzzle?.playerColor}
              onPieceDrop={onDrop}
            />
          </div>
          <div className="gameInfoBox">
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
        </div>
      )}

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

      {/* 3. ONLINE MATCH VIEW (CLEAN & PROFESSIONAL) */}
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
        </div>
      )}
    </>
  );
}

export default Dash;
