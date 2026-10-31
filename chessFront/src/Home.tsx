import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigation,
  useNavigate,
} from "react-router-dom";
const Api_url = "http://localhost:5228/auth";
function Home() {
  const [inputUserName, setInputUserName] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const response = await fetch(`${Api_url}/reg`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName: inputUserName,
        password: inputPassword,
      }),
    });
    if (!response.ok) {
      let errorMessage = "";
      if (response.status == 400) {
        errorMessage = "User name already in use";
      } else if (response.status == 401) {
        errorMessage = "Invalid username or password";
      }
      setError(errorMessage);
      return false;
    }

    const data = await response.json();
    console.log(data);
    return data;
  };
  const handleRoute = () => {
    navigate("/test2", {
      state: {
        userName: inputUserName,
      },
    });
  };
  return (
    <>
      <div className="chessBox">
        <h1>Chess Game</h1>
        <div className="logBox">
          <h2>Log-in or register</h2>
          <div className="infoBox">
            <input
              type="text"
              placeholder="User name..."
              value={inputUserName}
              onChange={(e) => setInputUserName(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password..."
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
            />
          </div>
          <div className="buttonBox">
            <button onClick={handleRoute}>Log-in</button>
            <button onClick={handleRegister}>Register</button>

            <p></p>
          </div>
          <p>{error}</p>
        </div>
      </div>
    </>
  );
}

export default Home;
