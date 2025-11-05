import React, { useEffect, useState } from "react";
import { calendarStore } from "../taxEstimator/taxCalendarStore";
import "./taxCalender.css";

const getTodayISO = () => new Date().toISOString().slice(0, 10);

export default function AddReminderModal({ open, onClose, seed }) {
  const [form, setForm] = useState({
    title: seed?.title || "",
    date: getTodayISO(),
    type: seed?.type || "reminder",
  });

  // When modal opens or seed changes, initialize fields
  useEffect(() => {
    if (open) {
      setForm({
        title: seed?.title || "",
        date: getTodayISO(),
        type: seed?.type || "reminder",
      });
    }
  }, [open, seed?.title, seed?.type]);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onCreate = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;

    calendarStore.addEvent({
      title: form.title.trim(),
      date: form.date,
      type: form.type,
    });

    // Reset fields after successful create
    setForm({ title: "", date: getTodayISO(), type: "reminder" });

    // Close modal (optional). Remove if keeping it open for multiple adds.
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-head">
          <h3 className="modal-title">Add Tax Reminder</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="modal-grid" onSubmit={onCreate}>
          <label className="set-field">
            <span className="set-label">Title</span>
            <input
              name="title"
              value={form.title}
              onChange={onChange}
              placeholder="e.g., Q4 Estimated Tax Payment"
            />
          </label>

          <label className="set-field">
            <span className="set-label">Date</span>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={onChange}
            />
          </label>

          <label className="set-field">
            <span className="set-label">Type</span>
            <select name="type" value={form.type} onChange={onChange}>
              <option value="reminder">reminder</option>
              <option value="payment">payment</option>
              <option value="note">note</option>
            </select>
          </label>

          <div className="toolbar right">
            <button type="button" className="btn ghost sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary sm">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
