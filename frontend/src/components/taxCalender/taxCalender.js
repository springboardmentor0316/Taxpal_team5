import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { calendarStore } from "../taxEstimator/taxCalendarStore";
import { useModal } from "../modal/ModalProvider";
import "./taxCalender.css";

export default function TaxCalendar() {
  const navigate = useNavigate();
  const { confirm } = useModal();
  const [events, setEvents] = useState(calendarStore.getEvents());

  useEffect(() => {
    const unsub = calendarStore.subscribe(setEvents);
    return unsub;
  }, []);

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  const onDelete = async (id) => {
    if (!id) return;
    const confirmed = await confirm({
      title: "Delete reminder",
      message: "This reminder will be removed from your tax calendar.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!confirmed) return;
    calendarStore.removeEvent(id);
  };

  return (
    <div className="panel calendar-panel">
      <div className="calendar-head">
        <button
          type="button"
          className="icon-btn"
          aria-label="Back to Tax Estimator"
          title="Back"
          onClick={() => navigate("/tax-estimator")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="set-head compact">
          <h2 className="set-title">Tax Calendar</h2>
          <p className="set-sub">Quarterly estimated tax reminders and due dates.</p>
        </div>
      </div>

      <ul className="calendar-list">
        {sorted.map((e) => (
          <li key={e.id} className={`calendar-item ${e.type}`}>
            <div className="left">
              <div className="date">
                {new Date(e.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" })}
              </div>
              <div className="title">{e.title}</div>
            </div>
            <div className="actions">
              <span className={`chip ${e.type === "payment" ? "warn" : "good"}`}>{e.type}</span>
              <button type="button" className="icon-btn danger" onClick={() => onDelete(e.id)} aria-label="Delete reminder">
                🗑
              </button>
            </div>
          </li>
        ))}
        {sorted.length === 0 && (
            <li className="calendar-item">
            <div className="left">
            <div className="title calendar-empty">No reminders yet.</div>
            </div>
            </li>
        )}
      </ul>
    </div>
  );
}
