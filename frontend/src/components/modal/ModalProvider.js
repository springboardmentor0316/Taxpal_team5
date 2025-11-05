import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import "./modal.css";

const ModalContext = createContext(null);

const getDefaultTitle = (type) => (type === "confirm" ? "Are you sure?" : "Heads up");

export function ModalProvider({ children }) {
  const [modalState, setModalState] = useState(null);

  const closeWith = useCallback((value) => {
    setModalState((current) => {
      if (current?.resolve) {
        current.resolve(value);
      }
      return null;
    });
  }, []);

  const confirm = useCallback(
    (options = {}) =>
      new Promise((resolve) => {
        setModalState({
          type: "confirm",
          title: options.title || getDefaultTitle("confirm"),
          message: options.message || "",
          confirmLabel: options.confirmLabel || "Confirm",
          cancelLabel: options.cancelLabel || "Cancel",
          destructive: options.destructive ?? false,
          resolve,
        });
      }),
    []
  );

  const alert = useCallback(
    (options = {}) =>
      new Promise((resolve) => {
        setModalState({
          type: "alert",
          title: options.title || getDefaultTitle("alert"),
          message: options.message || "",
          confirmLabel: options.confirmLabel || "OK",
          resolve,
        });
      }),
    []
  );

  useEffect(() => {
    if (!modalState) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeWith(modalState.type === "confirm" ? false : undefined);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [modalState, closeWith]);

  const value = useMemo(
    () => ({
      confirm,
      alert,
    }),
    [confirm, alert]
  );

  const handlePrimary = () => {
    if (!modalState) return;
    closeWith(modalState.type === "confirm" ? true : undefined);
  };

  const handleSecondary = () => {
    if (!modalState) return;
    closeWith(modalState.type === "confirm" ? false : undefined);
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
      {modalState ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={handleSecondary}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-message"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-body">
              <h3 id="modal-title" className="modal-title">
                {modalState.title}
              </h3>
              {modalState.message ? (
                <p id="modal-message" className="modal-message">
                  {modalState.message}
                </p>
              ) : null}
            </div>
            <div className="modal-actions">
              {modalState.type === "confirm" ? (
                <button
                  type="button"
                  className="modal-btn ghost"
                  onClick={handleSecondary}
                >
                  {modalState.cancelLabel}
                </button>
              ) : null}
              <button
                type="button"
                className={`modal-btn primary${
                  modalState.destructive ? " danger" : ""
                }`}
                onClick={handlePrimary}
              >
                {modalState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ModalContext.Provider>
  );
}

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};
