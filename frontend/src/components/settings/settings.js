import React from "react";
import { Outlet } from "react-router-dom";
import SettingsNav from "./settingsNav/settingsNav";
import "./settings.css";

export default function Settings() {
  return (
    <div className="settings-wrap">
      <aside className="settings-side">
        <h3 className="side-title">Settings</h3>
        <hr />
        <SettingsNav />
      </aside>
      <main className="settings-main">
        <Outlet />
      </main>
    </div>
  );
}
