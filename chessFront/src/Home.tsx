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

  const handleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError("");
    if (inputUserName == "" || inputPassword == "") {
      console.error("Missing username or password");
      setError("Missing username or password");
      return;
    }
    try {
      const response = await fetch(`${Api_url}/log`, {
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
          console.error("Worng username or password");
          errorMessage = "Wrong username or password";
        } else if (response.status == 401) {
          console.error("Missing User name or passord");
          errorMessage = "Missing User name or passord";
        } else if (response == null) {
          console.error("Server Error:Not connected");
          errorMessage = "Server Error:Not connected";
        } else {
          errorMessage = `Server Error:${response.status} ${response.statusText}`;
        }
        setError(errorMessage);
        return false;
      }
      const data = await response.json();
      const token = data.token;
      const id = data.id;
      const name = data.userName;
      console.log("this is token:", token);
      console.log("this is id:", id);
      console.log("this is id:", id);
      console.log("this is Username:", name);

      if (id && token && name) {
        localStorage.setItem("token", token);
        localStorage.setItem("id", id);
        localStorage.setItem("userName", name);
      }
      navigate("/dash");
      return data;
    } catch (error) {
      console.error("Your not connected to the backend");
      setError("Not connected");
      return;
    }
  };

  const handleRegister = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError("");
    if (inputUserName == "" || inputPassword == "") {
      console.error("Missing username or password");
      setError("Missing username or password");
      return;
    }
    try {
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
          console.error("User Name already in use");
          errorMessage = "User Name already in use";
        } else if (response.status == 401) {
          errorMessage = "Missing User name or passord";
        } else if (response == null) {
          errorMessage = `Server Error:Not connected`;
        } else {
          errorMessage = `Server Error:${response.status} ${response.statusText}`;
        }
        setError(errorMessage);
        return false;
      }

      const data = await response.json();
      console.log(data);
      navigate("/dash");
      return data;
    } catch (error) {
      console.error(
        "Server Error,BACKEND NOT CONNECTED, please try again later",
      );
      return;
    }
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
            <button onClick={handleLogin}>Log-in</button>
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
