import React, { useEffect, useMemo, useState } from "react";
import "../settings.css";
import "./notifications.css";
import { useToast } from "../../toast/ToastProvider";

const STORAGE_KEY = "taxpal_notification_prefs_v1";

const defaultPrefs = {
  categories: {
    transactions: true,
    budgets: true,
    reminders: true,
    reports: false,
  },
  channels: {
    email: true,
    inApp: true,
    sms: false,
  },
  digest: {
    frequency: "weekly",
    day: "Friday",
    dayOfMonth: "1",
    time: "09:00",
  },
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "07:00",
  },
  autoArchive: true,
  weeklySummary: true,
};

const clonePrefs = (prefs = defaultPrefs) => ({
  categories: { ...defaultPrefs.categories, ...prefs.categories },
  channels: { ...defaultPrefs.channels, ...prefs.channels },
  digest: { ...defaultPrefs.digest, ...prefs.digest },
  quietHours: { ...defaultPrefs.quietHours, ...prefs.quietHours },
  autoArchive: typeof prefs.autoArchive === 'boolean' ? prefs.autoArchive : defaultPrefs.autoArchive,
  weeklySummary: typeof prefs.weeklySummary === 'boolean' ? prefs.weeklySummary : defaultPrefs.weeklySummary,
});

const loadPrefs = () => {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs;
    const parsed = JSON.parse(raw);
    return clonePrefs(parsed);
  } catch (error) {
    console.warn("Failed to read notification preferences", error);
    return defaultPrefs;
  }
};

const savePrefs = (prefs) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.warn("Failed to persist notification preferences", error);
  }
};

const categoryOptions = [
  {
    key: "transactions",
    label: "Transaction activity",
    description: "New, updated, or deleted transactions",
  },
  {
    key: "budgets",
    label: "Budget health",
    description: "Limits reached, overspend alerts, and monthly recaps",
  },
  {
    key: "reminders",
    label: "Tax reminders",
    description: "Estimated tax deadlines and calendar events",
  },
  {
    key: "reports",
    label: "Report readiness",
    description: "Exports finished processing and scheduled reports",
  },
];

const channelOptions = [
  {
    key: "email",
    label: "Email",
    description: "Sent to your primary address immediately",
  },
  {
    key: "inApp",
    label: "In-app",
    description: "A badge in the notification center",
  },
  {
    key: "sms",
    label: "SMS",
    description: "Text message alerts (standard rates apply)",
  },
];

const digestFrequencies = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "off", label: "Never" },
];

const weekDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const dayOfMonthOptions = Array.from({ length: 28 }, (_, idx) => `${idx + 1}`);

export default function Notifications() {
  const [prefs, setPrefs] = useState(() => clonePrefs(loadPrefs()));
  const { showToast } = useToast();

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  const toggleCategory = (key) =>
    setPrefs((prev) => ({
      ...prev,
      categories: { ...prev.categories, [key]: !prev.categories[key] },
    }));

  const toggleChannel = (key) =>
    setPrefs((prev) => ({
      ...prev,
      channels: { ...prev.channels, [key]: !prev.channels[key] },
    }));

  const updateDigest = (updates) =>
    setPrefs((prev) => ({
      ...prev,
      digest: { ...prev.digest, ...updates },
    }));

  const updateQuietHours = (updates) =>
    setPrefs((prev) => ({
      ...prev,
      quietHours: { ...prev.quietHours, ...updates },
    }));

  const handleTestNotification = () => {
    showToast({ message: "We'll nudge you here soon. (Test notification simulated)" });
  };

  const resetPreferences = () => {
    setPrefs(clonePrefs(defaultPrefs));
    showToast({ message: "Notification preferences reset" });
  };

  const digestDescription = useMemo(() => {
    switch (prefs.digest.frequency) {
      case 'daily':
        return `Every day at ${prefs.digest.time}`;
      case 'weekly':
        return `${prefs.digest.day}s at ${prefs.digest.time}`;
      case 'monthly':
        return `Day ${prefs.digest.dayOfMonth} of each month at ${prefs.digest.time}`;
      default:
        return 'Digest disabled';
    }
  }, [prefs.digest]);

  return (
    <div className="panel notifications-panel">
      <div className="set-head compact">
        <div>
          <h2 className="set-title">Notifications</h2>
          <p className="set-sub">Decide what we send you, how often, and when to keep things quiet.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn ghost sm" onClick={resetPreferences}>
            Reset
          </button>
          <button type="button" className="btn primary sm" onClick={handleTestNotification}>
            Send Test
          </button>
        </div>
      </div>

      <section className="notif-section">
        <h3>Alerts you\'ll receive</h3>
        <p className="section-sub">Toggle the topics you care about. We\'ll respect these choices across email, SMS, and in-app notifications.</p>
        <div className="toggle-grid">
          {categoryOptions.map((option) => (
            <label key={option.key} className="toggle-card">
              <div className="toggle-copy">
                <span className="toggle-title">{option.label}</span>
                <span className="toggle-description">{option.description}</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(prefs.categories[option.key])}
                onChange={() => toggleCategory(option.key)}
              />
              <span className="slider" aria-hidden="true" />
            </label>
          ))}
        </div>
      </section>

      <section className="notif-section">
        <h3>Delivery channels</h3>
        <p className="section-sub">Choose where we deliver real-time alerts. We recommend leaving email or in-app enabled so nothing is missed.</p>
        <div className="toggle-grid">
          {channelOptions.map((option) => (
            <label key={option.key} className="toggle-card">
              <div className="toggle-copy">
                <span className="toggle-title">{option.label}</span>
                <span className="toggle-description">{option.description}</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(prefs.channels[option.key])}
                onChange={() => toggleChannel(option.key)}
              />
              <span className="slider" aria-hidden="true" />
            </label>
          ))}
        </div>
      </section>

      <section className="notif-section">
        <h3>Digest email</h3>
        <p className="section-sub">Get a periodic roll-up of everything that happened.</p>
        <div className="digest-controls">
          <label className="set-field">
            <span className="set-label">Frequency</span>
            <select
              value={prefs.digest.frequency}
              onChange={(event) => updateDigest({ frequency: event.target.value })}
            >
              {digestFrequencies.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {prefs.digest.frequency === 'weekly' && (
            <label className="set-field">
              <span className="set-label">Send on</span>
              <select
                value={prefs.digest.day}
                onChange={(event) => updateDigest({ day: event.target.value })}
              >
                {weekDays.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
          )}

          {prefs.digest.frequency === 'monthly' && (
            <label className="set-field">
              <span className="set-label">Day of month</span>
              <select
                value={prefs.digest.dayOfMonth}
                onChange={(event) => updateDigest({ dayOfMonth: event.target.value })}
              >
                {dayOfMonthOptions.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
          )}

          {prefs.digest.frequency !== 'off' && (
            <label className="set-field">
              <span className="set-label">Send at</span>
              <input
                type="time"
                value={prefs.digest.time}
                onChange={(event) => updateDigest({ time: event.target.value })}
              />
            </label>
          )}
        </div>
        <p className="digest-summary">{digestDescription}</p>
      </section>

      <section className="notif-section">
        <h3>Quiet hours</h3>
        <p className="section-sub">Mute notifications overnight or during focus time.</p>
        <div className="quiet-hours">
          <label className="toggle-card inline">
            <div className="toggle-copy">
              <span className="toggle-title">Enable quiet hours</span>
              <span className="toggle-description">We\'ll hold alerts outside the window you choose.</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.quietHours.enabled}
              onChange={(event) => updateQuietHours({ enabled: event.target.checked })}
            />
            <span className="slider" aria-hidden="true" />
          </label>

          <div className={`quiet-inputs ${prefs.quietHours.enabled ? 'active' : 'disabled'}`}>
            <label className="set-field">
              <span className="set-label">Start</span>
              <input
                type="time"
                value={prefs.quietHours.start}
                onChange={(event) => updateQuietHours({ start: event.target.value })}
                disabled={!prefs.quietHours.enabled}
              />
            </label>
            <label className="set-field">
              <span className="set-label">End</span>
              <input
                type="time"
                value={prefs.quietHours.end}
                onChange={(event) => updateQuietHours({ end: event.target.value })}
                disabled={!prefs.quietHours.enabled}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="notif-section">
        <h3>Housekeeping</h3>
        <div className="toggle-grid single">
          <label className="toggle-card">
            <div className="toggle-copy">
              <span className="toggle-title">Auto-archive read alerts</span>
              <span className="toggle-description">Move notifications to history after 30 days.</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.autoArchive}
              onChange={(event) => setPrefs((prev) => ({ ...prev, autoArchive: event.target.checked }))}
            />
            <span className="slider" aria-hidden="true" />
          </label>

          <label className="toggle-card">
            <div className="toggle-copy">
              <span className="toggle-title">Weekly recap in-app</span>
              <span className="toggle-description">See a snapshot banner when you sign in each Monday.</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.weeklySummary}
              onChange={(event) => setPrefs((prev) => ({ ...prev, weeklySummary: event.target.checked }))}
            />
            <span className="slider" aria-hidden="true" />
          </label>
        </div>
      </section>
    </div>
  );
}
