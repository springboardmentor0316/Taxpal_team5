// src/components/sidebar/sidebar.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmLogout from "../logout/confirmLogout";
import "./sidebar.css";
import { FiHome, FiCreditCard, FiPocket, FiPercent, FiBarChart2, FiSettings, FiLogOut } from "react-icons/fi";
import { getStoredUser, setStoredUser, onStoredUserChange } from "../../utils/user";

export default function Sidebar({ activeTab = "dashboard" }) {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [user, setUser] = useState(() => getStoredUser());

  const openConfirm = () => setShowConfirm(true);
  const cancel = () => setShowConfirm(false);
  const confirm = () => {
    localStorage.removeItem('taxpal_token');
    setStoredUser(null);
    setShowConfirm(false);
    navigate('/signin');
  };

  useEffect(() => onStoredUserChange(() => setUser(getStoredUser())), []);

  const displayName = user?.fullName || user?.username || 'User';
  const displayEmail = user?.email || '—';

  return (
    <>
      <aside className="dash-sidebar">
        <div className="brand">TaxPal</div>
        <hr className="bar" />

        <nav className="side-nav">
          <button className={`nav-btn ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => navigate("/dashboard")}>
            <span className="nav-icon"><FiHome /></span>
            Dashboard
          </button>

          <button className={`nav-btn ${activeTab === "transactions" ? "active" : ""}`} onClick={() => navigate("/transactions")}>
            <span className="nav-icon"><FiCreditCard /></span>
            Transactions
          </button>

          <button className={`nav-btn ${activeTab === "budgets" ? "active" : ""}`} onClick={() => navigate("/budgets")}>
            <span className="nav-icon"><FiPocket /></span>
            Budgets
          </button>

          <button className={`nav-btn ${activeTab === "tax" ? "active" : ""}`} onClick={() => navigate("/tax-estimator")}>
            <span className="nav-icon"><FiPercent size={18} /></span>
            Tax Estimator
          </button>

          <button className={`nav-btn ${activeTab === "reports" ? "active" : ""}`} onClick={() => navigate("/reports")}>
            <span className="nav-icon"><FiBarChart2 /></span>
            Reports
          </button>
        </nav>

        <div className="profile-info">
          <img
            src="/profile.png"
            alt="User avatar"
            className="avatar-img"
            width={36}
            height={36}
          />
          <div>
            <p className="name">{displayName}</p>
            <p className="email">{displayEmail}</p>
          </div>
        </div>

          <div className="profile-actions">
            <button className="link-btn" onClick={() => navigate("/settings")}>
              <span className="nav-icon"><FiSettings /></span>
              Settings
            </button>

            <button className="link-btn" onClick={openConfirm}>
              <span className="nav-icon"><FiLogOut /></span>
              Logout
            </button>
          </div>
        </aside>
     <ConfirmLogout open={showConfirm} onCancel={cancel} onConfirm={confirm} />
    </>
  );
}
