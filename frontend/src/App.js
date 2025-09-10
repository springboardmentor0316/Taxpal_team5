import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import SignUp from "./components/signup/signup";
import Signin from "./components/signin/signin";

function App() {
  return (
    <Router>
      <Routes>
        {/* Default redirect to /signup */}
        <Route path="/" element={<Navigate to="/signup" />} />

        {/* Routes */}
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<Signin />} />
      </Routes>
    </Router>
  );
}

export default App;
