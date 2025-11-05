import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../App.css";
import "./signin.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { login } from "../../services/api";
import { setStoredUser } from "../../utils/user";
import { useToast } from "../toast/ToastProvider";

function Signin() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // 👁️ state only for login password
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await login(formData);
      localStorage.setItem("taxpal_token", response.token);
      setStoredUser(response.user);
      showToast({ message: response.message || "Login successful!" });
      navigate("/dashboard");
    } catch (err) {
      const message = err.message || "Unable to login. Please try again.";
      setError(message);
      showToast({ message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="illustration">
        <h1 className="logo">TaxPal</h1>
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

          {error && <p className="error-message">{error}</p>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="signup-text">
          Don’t have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}

export default Signin;
