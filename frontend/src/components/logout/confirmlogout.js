import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import "./confirmLogout.css";


export default function ConfirmLogout({ open, onCancel, onConfirm }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="confirm-backdrop" role="dialog" aria-modal="true">
      <div className="confirm-sheet">
        <div className="confirm-header">
          <h3>Confirm Logout</h3>
          <button className="icon-btn" type="button" onClick={onCancel}>✕</button>
        </div>
        <div className="confirm-body">
          <img
            src="/illustration.png"
            alt="Logout illustration"
            className="confirm-illustration"
          />
          <p>Are you sure you want to logout?</p>
        </div>
        <div className="confirm-footer">
          <button className="btn ghost" type="button" onClick={onCancel}>Cancel</button>
          <button className="btn danger confirm-btn" type="button" onClick={onConfirm}>
            <span className="btn-text default">Confirm</span>
            <span className="btn-text hover">Sign out now</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
