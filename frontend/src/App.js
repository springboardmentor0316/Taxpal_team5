import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import ForgotPassword from "./components/forgetpassword/forgetpassword";
import SignUp from "./components/signup/signup";
import Signin from "./components/signin/signin";
import ResetPassword from "./components/resetpassword/resetpassword";

function App() {
  return (
    <Router>
      <Routes>
        {/* Default redirect to /signup */}
        <Route path="/" element={<Navigate to="/signup" />} />

        {/* Routes */}
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </Router>
  );
}

export default App;
