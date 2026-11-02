import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { useSearchParams } from "react-router-dom";
import React, { useState } from "react";
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

  const fetchTwo = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const token = localStorage.getItem("token")?.trim();
    console.log("this is the token to send", token);
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
      console.log(color);
      const playerColor = color == "w" ? "black" : "white";
      const moveToWin = solution.length / 2;
      console.log("this is move to win", moveToWin);
      console.log("this is fen:", fen);
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
      setTimeout(() => {
        const nextMove = solution[0];

        const start = nextMove.substring(0, 2);
        const target = nextMove.substring(2, 4);
        try {
          const gameCopy = new Chess(newGame.fen());
          console.log("this is gamecopy:", gameCopy);
          gameCopy.move({
            from: start,
            to: target,
            promotion: "q",
          });
          console.log("we are here");
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
    console.log("this is the token to send", token);
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
      console.log(data);

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
      console.log(color);
      setStatus("Playing");
      setGame(new Chess(fen));

      return;
    } catch (error) {
      console.error("Server Error you are not connected");
    }
  };
  const onDrop = (start: string, target: string): boolean => {
    console.log("this is right move:");
    if (!puzzle || status !== "Playing") {
      console.log("this is right move:No game");
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
      console.log(rightMove);

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
  return (
    <>
      <div className="dashBox">
        <div className="boardBox">
          <Chessboard
            position={game.fen()}
            boardOrientation={puzzle?.playerColor}
            onPieceDrop={onDrop}
          />
        </div>
        <div className="gameInfoBox">
          <button onClick={fetchOne}>puzzle</button>
          <button onClick={fetchTwo}>puzzle2</button>
        </div>
      </div>
    </>
  );
}

export default Dash;
