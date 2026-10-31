import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./Home";
import Dash from "./Dash";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/dash" element={<Dash />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
