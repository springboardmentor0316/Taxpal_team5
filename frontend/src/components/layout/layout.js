import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../sidebar/sidebar";  // relative to layout.js
import "./layout.css";                     // layout.css is in the same folder

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname.replace(/^\//, "");
  const activeTab =
    path.startsWith("transactions") ? "transactions" :
    path.startsWith("budgets") ? "budgets" :
    path.startsWith("tax") ? "tax" :
    path.startsWith("reports") ? "reports" :
    "dashboard";

  return (
    <div className="dash-shell">
      <Sidebar activeTab={activeTab} onNavigate={navigate} />
      <main className="dash-main">
        <Outlet />
      </main>
    </div>
  );
}
