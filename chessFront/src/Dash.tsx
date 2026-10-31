import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
function Dash() {
  return (
    <>
      <div className="dashBox">
        <div className="boardBox">
          <Chessboard />
        </div>
      </div>
    </>
  );
}

export default Dash;
