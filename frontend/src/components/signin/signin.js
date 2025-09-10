import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";
import "./signin.css";

function Signin() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault(); // ✅ prevent page refresh
    console.log("Login attempted with:", formData);
    alert("Login submitted!"); // replace with API call later
  };

  return (
    <div className="container">
      {/* Left side */}
      <div className="illustration">
        <h1>TaxPal</h1>
        <img src="/illustration.png" alt="Illustration" />
      </div>

      {/* Right side */}
      <div className="form-box">
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <div className="form-options">
            <Link to="/forgot-password" className="forgot">
              Forgot Password?
            </Link>
          </div>

          <button type="submit">Login</button>
        </form>

        <p className="signup-text">
          Don’t have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}

export default Signin;
