import React from "react";
import { NavLink } from "react-router-dom";
import { FiUser, FiFolder, FiBell, FiShield } from "react-icons/fi";
import "./settingsNav.css";

export default function SettingsNav() {
  const itemClass = ({ isActive }) => `side-item ${isActive ? "active" : ""}`;

  return (
    <nav className="side-list">
      <NavLink to="profile" className={itemClass}>
        <span className="nav-icon"><FiUser size={16} /></span>
        <span class="nav-item">Profile</span>
      </NavLink>

      <NavLink to="categories" className={itemClass}>
        <span className="nav-icon"><FiFolder size={16} /></span>
        <span class="nav-item">Categories</span>
      </NavLink>

      <NavLink to="notifications" className={itemClass}>
        <span className="nav-icon"><FiBell size={16} /></span>
        <span class="nav-item">Notifications</span>
      </NavLink>

      <NavLink to="security" className={itemClass}>
        <span className="nav-icon"><FiShield size={16} /></span>
        <span class="nav-item">Security</span>
      </NavLink>
    </nav>
  );
}
