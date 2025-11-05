const USER_KEY = 'taxpal_user';
const USER_UPDATED_EVENT = 'taxpal:user-updated';

const dispatchUpdate = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(USER_UPDATED_EVENT));
};

export const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.warn('Failed to parse stored user', error);
    return null;
  }
};

export const setStoredUser = (value) => {
  if (typeof window === 'undefined') return;
  try {
    if (!value) {
      window.localStorage.removeItem(USER_KEY);
    } else {
      window.localStorage.setItem(USER_KEY, JSON.stringify(value));
    }
  } catch (error) {
    console.warn('Failed to persist user in storage', error);
  }
  dispatchUpdate();
};

export const updateStoredUser = (updates = {}) => {
  if (typeof window === 'undefined') return null;
  const current = getStoredUser() || {};
  const next = { ...current, ...updates };
  setStoredUser(next);
  return next;
};

export const onStoredUserChange = (handler) => {
  if (typeof window === 'undefined') {
    return () => {};
  }
  window.addEventListener(USER_UPDATED_EVENT, handler);
  return () => window.removeEventListener(USER_UPDATED_EVENT, handler);
};
