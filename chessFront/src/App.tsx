import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./Home";
import Dash from "./Dash";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. The Login Screen is now ONLY shown when the URL is "/" */}
        <Route path="/" element={<Home />} />

        {/* 2. Test2 is ONLY shown when the URL is "/play" */}

        <Route path="/dash" element={<Dash />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
