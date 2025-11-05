import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { FaEye, FaEyeSlash } from "react-icons/fa"; // 👈 import icons
import "../../App.css";
import "./resetpassword.css";
import { resetPassword as resetPasswordRequest } from "../../services/api";
import { useToast } from "../toast/ToastProvider";

function ResetPassword() {
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const [showPassword, setShowPassword] = useState(false); // 👈 toggle for new password
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // 👈 toggle for confirm password
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const emailFromStorage = sessionStorage.getItem("taxpal_reset_email") || "";
    setResetEmail(emailFromStorage);

    if (!sessionStorage.getItem("taxpal_reset_token")) {
      const message = "Reset token missing or expired. Please restart the forgot password process.";
      setServerError(message);
      showToast({ message, type: "error" });
    }
  }, [showToast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setServerError("");

    const newErrors = { ...errors };

    if (name === "newPassword") {
      if (!value.trim()) {
        newErrors.newPassword = "Password is required";
      } else if (value.length < 8) {
        newErrors.newPassword = "Password must be at least 8 characters";
      } else if (!/(?=.*[0-9])/.test(value)) {
        newErrors.newPassword = "Password must contain at least one number";
      } else if (!/(?=.*[!@#$%^&*])/.test(value)) {
        newErrors.newPassword = "Password must contain at least one special character";
      } else {
        delete newErrors.newPassword;
      }
    }

    if (name === "confirmPassword") {
      if (!value.trim()) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (value !== formData.newPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      } else {
        delete newErrors.confirmPassword;
      }
    }

    setErrors(newErrors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) {
      showToast({ message: "Please resolve the highlighted issues.", type: "warning" });
      return;
    }

    const token = sessionStorage.getItem("taxpal_reset_token");

    if (!token) {
      const message = "Reset token missing or expired. Please restart the forgot password process.";
      setServerError(message);
      showToast({ message, type: "error" });
      return;
    }

    setServerError("");
    setIsSubmitting(true);

    try {
      await resetPasswordRequest({
        token,
        password: formData.newPassword,
      });
      sessionStorage.removeItem("taxpal_reset_token");
      sessionStorage.removeItem("taxpal_reset_email");
      showToast({ message: "Your password has been reset successfully!" });
      navigate("/signin");
    } catch (err) {
      const message = err.message || "Unable to reset password. Please try again.";
      setServerError(message);
      showToast({ message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="illustration">
        <h1 className="logo">TaxPal</h1>
        <img src="/illustration.png" alt="Reset Password Illustration" />
      </div>

      <div className="form-box">
        <h2>Reset Password</h2>
        {resetEmail && <p className="subtitle">Resetting password for {resetEmail}</p>}
        {serverError && <p className="error-message">{serverError}</p>}

        <form onSubmit={handleSubmit}>
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              name="newPassword"
              placeholder="Enter new password"
              value={formData.newPassword}
              onChange={handleChange}
              required
            />
            <span className="eye-icon" onClick={() => setShowPassword((prev) => !prev)}>
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <div className="password-field">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            <span
              className="eye-icon"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          {errors.confirmPassword && (
            <p className="error-message">{errors.confirmPassword}</p>
          )}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
