import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../../App.css";
import "./signin.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function Signin() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // 👁️ state only for login password
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login attempted with:", formData);
    alert("Login submitted!");
  };

  return (
    <div className="container">
      <div className="illustration">
        <h1>TaxPal</h1>
        <img src="/illustration.png" alt="Illustration" />
      </div>

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

          {/* Password with its own eye */}
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <span
              className="eye-icon"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

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
