import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { FaEye, FaEyeSlash } from "react-icons/fa"; // 👈 import icons
import "../../App.css";
import "./resetpassword.css";

function ResetPassword() {
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  
  const [errors, setErrors] = useState({});

  const [showPassword, setShowPassword] = useState(false); // 👈 toggle for new password
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // 👈 toggle for confirm password
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) {
      return;
    }

    alert("Your password has been reset successfully!");
    console.log("Password reset successful:", formData.newPassword);

    navigate("/signin");
  };

  return (
    <div className="container">
      <div className="illustration">
        <h1>TaxPal</h1>
        <img src="/illustration.png" alt="Reset Password Illustration" />
      </div>

      <div className="form-box">
        <h2>Reset Password</h2>
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
            <span
               className="eye-icon"
               onClick={() => setShowPassword(prev => !prev)}
               >
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
        onClick={() => setShowConfirmPassword(prev => !prev)}
       >
        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
    </span>
    </div>

    {errors.confirmPassword && (
        <p className="error-message">{errors.confirmPassword}</p>
    )}

        <button type="submit">Reset Password</button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
