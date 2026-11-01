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
}

function Dash() {
  const [game, setGame] = useState(new Chess());
  const [puzzle, setPuzzle] = useState<PuzzleType | null>(null);

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
      const playerColor = color == "w" ? "white" : "black";
      const moveToWin = solution.length / 2;
      console.log("this is move to win", moveToWin);

      setGame(new Chess(fen));

      return;
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
      console.log(fen);
      setGame(new Chess(fen));

      return;
    } catch (error) {
      console.error("Server Error you are not connected");
    }
  };
  return (
    <>
      <div className="dashBox">
        <div className="boardBox">
          <Chessboard position={game.fen()} />
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
