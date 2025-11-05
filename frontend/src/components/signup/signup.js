import React, { useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './signup.css';
import { signup as signupRequest } from '../../services/api';
import { useToast } from '../toast/ToastProvider';

const SignUp = () => {
  const initialFormData = {
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    email: '',
    country: '',
    incomeBracket: ''
  };

  const [formData, setFormData] = useState(initialFormData);

  const [errors, setErrors] = useState({});

  // 👁️ separate toggles for each password field
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Australia',
    'Germany', 'France', 'India', 'Japan', 'Other'
  ];

  const incomeBrackets = [
    'Under ₹3,00,000',
    '₹3,00,000 - ₹6,00,000',
    '₹6,00,000 - ₹10,00,000',
    '₹10,00,000 - ₹15,00,000',
    '₹15,00,000 - ₹25,00,000',
    'Over ₹25,00,000'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Live validation for password + confirmPassword
    const newErrors = { ...errors };

    if (name === "password") {
      if (!value.trim()) {
        newErrors.password = "Password is required";
      } else if (value.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      } else if (!/(?=.*[0-9])/.test(value)) {
        newErrors.password = "Password must contain at least one number";
      } else if (!/(?=.*[!@#$%^&*])/.test(value)) {
        newErrors.password = "Password must contain at least one special character";
      } else {
        delete newErrors.password;
      }

      // also check confirmPassword if already filled
      if (formData.confirmPassword && formData.confirmPassword !== value) {
        newErrors.confirmPassword = "Passwords do not match";
      } else {
        delete newErrors.confirmPassword;
      }
    }

    if (name === "confirmPassword") {
      if (!value.trim()) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (value !== formData.password) {
        newErrors.confirmPassword = "Passwords do not match";
      } else {
        delete newErrors.confirmPassword;
      }
    }

    if (errors[name]) {
      newErrors[name] = '';
    }

    setErrors(newErrors);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[0-9])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
    } else if (!/(?=.*[!@#$%^&*])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one special character';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.country) {
      newErrors.country = 'Please select your country';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast({ message: 'Please fix the highlighted errors.', type: 'warning' });
      return;
    }

    setErrors({});
    setServerError('');
    setIsSubmitting(true);

    try {
      const response = await signupRequest(formData);
      showToast({ message: response.message || 'Account created successfully!' });
      setFormData(initialFormData);
      navigate('/signin');
    } catch (err) {
      const message = err.message || 'Unable to create account. Please try again.';
      setServerError(message);
      showToast({ message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container">
      {/* Left Side */}
      <div className="illustration">
        <h1 className="logo">TaxPal</h1>
        <img src="/illustration.png" alt="Create Account Illustration" />
        <div className="illustration-text">
          <h3>Join TaxPal Today</h3>
          <p>Simplify your tax management and financial planning with our easy-to-use platform.</p>
        </div>
      </div>

      {/* Right Side */}
      <div className="form-box">
        <h2>Create an Account</h2>
        <p className="subtitle">Enter your information to create your TaxPal account</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            placeholder="Choose a username"
            value={formData.username}
            onChange={handleInputChange}
            className={errors.username ? 'error' : ''}
          />
          {errors.username && <span className="error-message">{errors.username}</span>}

          {/* Password */}
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Choose a password"
              value={formData.password}
              onChange={handleInputChange}
              className={errors.password ? 'error' : ''}
            />
            <span
              className="eye-icon"
              onClick={() => setShowPassword(prev => !prev)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          {errors.password && <span className="error-message">{errors.password}</span>}

          {/* Confirm Password */}
          <div className="password-field">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={errors.confirmPassword ? 'error' : ''}
            />
            <span
              className="eye-icon"
              onClick={() => setShowConfirmPassword(prev => !prev)}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}

          <input
            type="email"
            name="email"
            placeholder="Enter your email address"
            value={formData.email}
            onChange={handleInputChange}
            className={errors.email ? 'error' : ''}
          />
          {errors.email && <span className="error-message">{errors.email}</span>}

          <select
            name="country"
            value={formData.country}
            onChange={handleInputChange}
            className={errors.country ? 'error' : ''}
          >
            <option value="">Select your country</option>
            {countries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
          {errors.country && <span className="error-message">{errors.country}</span>}

          <select
            name="incomeBracket"
            value={formData.incomeBracket}
            onChange={handleInputChange}
          >
            <option value="">Select your income bracket (Optional)</option>
            {incomeBrackets.map(bracket => (
              <option key={bracket} value={bracket}>{bracket}</option>
            ))}
          </select>

          {serverError && <span className="error-message">{serverError}</span>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="signin-text">
          Already have an account? <Link to="/signin">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
