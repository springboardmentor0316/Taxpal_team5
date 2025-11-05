import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { changePassword } from "../../../services/api";
import { useToast } from "../../toast/ToastProvider";
import "./changePasswordModal.css";

const initialState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const validate = ({ currentPassword, newPassword, confirmPassword }) => {
  const errors = {};
  if (!currentPassword.trim()) {
    errors.currentPassword = "Current password is required";
  }
  if (!newPassword.trim()) {
    errors.newPassword = "New password is required";
  } else if (newPassword.length < 8) {
    errors.newPassword = "Must be at least 8 characters";
  } else if (!/[0-9]/.test(newPassword)) {
    errors.newPassword = "Must include at least one number";
  } else if (!/[!@#$%^&*]/.test(newPassword)) {
    errors.newPassword = "Must include a special character";
  }
  if (!confirmPassword.trim()) {
    errors.confirmPassword = "Confirm your new password";
  } else if (confirmPassword !== newPassword) {
    errors.confirmPassword = "Passwords do not match";
  }
  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.newPassword = "New password must be different from current password";
  }
  return errors;
};

export default function ChangePasswordModal({ open, onClose }) {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setForm(initialState);
      setErrors({});
    }
  }, [open]);

  if (!open) return null;

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    try {
      setSubmitting(true);
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      showToast({ message: "Password updated successfully" });
      if (onClose) onClose(true);
    } catch (error) {
      const message = error.message || "Unable to change password. Please try again.";
      setErrors({ form: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    if (onClose) onClose(false);
  };

  return createPortal(
    <div className="cp-modal-backdrop" role="dialog" aria-modal="true">
      <form className="cp-modal" onSubmit={onSubmit}>
        <header className="cp-head">
          <h3>Change Password</h3>
          <button type="button" className="icon-btn" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </header>
        <section className="cp-body">
          {errors.form ? <div className="cp-error">{errors.form}</div> : null}

          <label className="set-field">
            <span className="set-label">Current password</span>
            <input
              type="password"
              name="currentPassword"
              value={form.currentPassword}
              onChange={onChange}
              autoComplete="current-password"
              required
            />
            {errors.currentPassword ? <span className="cp-field-error">{errors.currentPassword}</span> : null}
          </label>

          <label className="set-field">
            <span className="set-label">New password</span>
            <input
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={onChange}
              autoComplete="new-password"
              required
            />
            {errors.newPassword ? <span className="cp-field-error">{errors.newPassword}</span> : null}
          </label>

          <label className="set-field">
            <span className="set-label">Confirm new password</span>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={onChange}
              autoComplete="new-password"
              required
            />
            {errors.confirmPassword ? <span className="cp-field-error">{errors.confirmPassword}</span> : null}
          </label>
        </section>
        <footer className="cp-foot">
          <button type="button" className="btn ghost" onClick={handleClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? "Updating…" : "Update Password"}
          </button>
        </footer>
      </form>
    </div>,
    document.body
  );
}
