import React, { useState } from "react";
import "../../App.css";
import "./forgetpassword.css";
import { useNavigate } from "react-router-dom";

function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    code: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (!formData.email) {
      setError("Please enter your email first!");
      return;
    }
    setError("");
    console.log("Email submitted:", formData.email);
    setStep(2);
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    if (!formData.code) {
      setError("Please enter the verification code!");
      return;
    }

    // ✅ Hardcoded correct code for testing
    if (formData.code === "123456") {
      setError("");
      console.log("Code verified successfully");
      navigate("/reset-password"); // 👉 Redirect to ResetPassword page
    } else {
      setError("Invalid verification code. Please try again.");
    }
  };

  return (
    <div className="container">
      <div className="illustration">
        <h1>TaxPal</h1>
        <img src="/illustration.png" alt="Forgot Password Illustration" />
      </div>

      <div className="form-box">
        <h2>Forgot Password</h2>

        {step === 1 && (
          <form onSubmit={handleNext}>
            <input
              type="email"
              name="email"
              placeholder="Enter your registered email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {error && <p className="error-message">{error}</p>}
            <button type="submit">Next</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleCodeSubmit}>
            <input
              type="text"
              name="code"
              placeholder="Enter verification code"
              value={formData.code}
              onChange={handleChange}
              required
            />
            {error && <p className="error-message">{error}</p>}
            <button type="submit">Verify</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;