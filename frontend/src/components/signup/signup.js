import React, { useState } from 'react';
import './signup.css';

const SignUp = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    country: '',
    incomeBracket: ''
  });

  const [errors, setErrors] = useState({});

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 
    'Germany', 'France', 'India', 'Japan', 'Other'
  ];

  const incomeBrackets = [
    'Under $25,000', '$25,000 - $50,000', '$50,000 - $75,000',
    '$75,000 - $100,000', '$100,000 - $150,000', 'Over $150,000'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length === 0) {
      console.log('Form submitted:', formData);
      alert('Account created successfully!');
    } else {
      setErrors(newErrors);
    }
  };

  const handleSignInClick = () => {
    alert('Navigate to sign in page');
  };

  return (
    <div className="container">
      {/* Left Side - Illustration */}
      <div className="illustration">
        <h1 className="logo">TaxPal</h1>
        <img src="/illustration.png" alt="Create Account Illustration" />
        <div className="illustration-text">
          <h3>Join TaxPal Today</h3>
          <p>Simplify your tax management and financial planning with our easy-to-use platform.</p>
        </div>
      </div>

      {/* Right Side - Form */}
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

          <input
            type="password"
            name="password"
            placeholder="Choose a password"
            value={formData.password}
            onChange={handleInputChange}
            className={errors.password ? 'error' : ''}
          />
          {errors.password && <span className="error-message">{errors.password}</span>}

          <input
            type="text"
            name="fullName"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChange={handleInputChange}
            className={errors.fullName ? 'error' : ''}
          />
          {errors.fullName && <span className="error-message">{errors.fullName}</span>}

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

          <button type="submit">Create Account</button>
        </form>

        <p className="signin-text">
          Already have an account? <a href="/login" onClick={handleSignInClick}>Sign In</a>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
