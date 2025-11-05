import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import "./deleteAccount.css";

export default function DeleteAccount({ open, onCancel, onConfirm, loading = false }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="confirm-backdrop" role="dialog" aria-modal="true">
      <div className="confirm-sheet">
        <div className="confirm-header">
          <h3>Delete Account</h3>
          <button className="icon-btn" type="button" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="confirm-body">
          <img
            src="/warnings.png"
            alt="Warning"
            className="confirm-illustration"
          />
          <p>
            Are you sure you want to delete this <strong>account permanently</strong>? Once this action is
            performed it cannot be undone.
          </p>
        </div>
        <div className="confirm-footer">
          <button className="btn ghost" type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="btn danger" type="button" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
