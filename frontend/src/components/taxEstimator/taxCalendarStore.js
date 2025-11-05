let listeners = [];

const STORAGE_KEY = 'taxpal_tax_calendar_events_v1';

const storageAvailable = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const testKey = '__taxpal_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
};

const canUseStorage = storageAvailable();

const loadEvents = () => {
  if (!canUseStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load tax calendar events from storage', error);
    return [];
  }
};

const persistEvents = (events) => {
  if (!canUseStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.warn('Failed to persist tax calendar events', error);
  }
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const calendarStore = {
  events: loadEvents(),

  subscribe(fn) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((x) => x !== fn);
    };
  },

  addEvent(evt) {
    const id = generateId();
    this.events = [...this.events, { ...evt, id }];
    persistEvents(this.events);
    listeners.forEach((fn) => fn(this.events));
  },

  removeEvent(id) {
    this.events = this.events.filter((event) => event.id !== id);
    persistEvents(this.events);
    listeners.forEach((fn) => fn(this.events));
  },

  clear() {
    this.events = [];
    persistEvents(this.events);
    listeners.forEach((fn) => fn(this.events));
  },

  getEvents() {
    return this.events;
  },
};
