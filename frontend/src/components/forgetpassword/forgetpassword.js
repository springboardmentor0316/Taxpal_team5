import React, { useState } from "react";
import "../../App.css";
import "./forgetpassword.css";
import { useNavigate } from "react-router-dom";
import { forgotPassword, verifyResetCode } from "../../services/api";
import { useToast } from "../toast/ToastProvider";

function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    code: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;

    if (name === "code") {
      nextValue = value.replace(/\D/g, "").slice(0, 6);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
    setError("");
  };

  const handleNext = async (e) => {
    e.preventDefault();
    const email = formData.email.trim().toLowerCase();

    if (!email) {
      setError("Please enter your email first!");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await forgotPassword({ email });
      setFormData((prev) => ({ ...prev, email }));
      showToast({ message: response.message || "Verification code sent.", type: "success" });
      setStep(2);
    } catch (err) {
      const message = err.message || "Unable to process request. Please try again.";
      setError(message);
      showToast({ message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    const trimmedCode = formData.code.trim();

    if (!trimmedCode) {
      setError("Please enter the verification code!");
      return;
    }

    if (!/^\d{6}$/.test(trimmedCode)) {
      setError("Verification code must be 6 digits.");
      showToast({ message: "Verification code must be 6 digits.", type: "warning" });
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await verifyResetCode({
        email: formData.email,
        code: trimmedCode,
      });

      sessionStorage.setItem("taxpal_reset_token", response.resetToken);
      sessionStorage.setItem("taxpal_reset_email", formData.email);
      showToast({ message: response.message || "Code verified. You can reset your password now." });
      navigate("/reset-password");
    } catch (err) {
      const message = err.message || "Invalid verification code. Please try again.";
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
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Next"}
            </button>
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
              inputMode="numeric"
              maxLength={6}
              required
            />
            {error && <p className="error-message">{error}</p>}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Verify"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
