import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmLogout from "../../logout/confirmLogout";
import "../settings.css";
import "./security.css";
import DeleteAccount from "../deleteAccount/deleteAccount";
import { useModal } from "../../modal/ModalProvider";
import { setStoredUser } from "../../../utils/user";
import ChangePasswordModal from "./ChangePasswordModal";
import { deleteAccount as deleteAccountRequest } from "../../../services/api";
import { useToast } from "../../toast/ToastProvider";

export default function Security() {
  const navigate = useNavigate();
  const { alert } = useModal();
  const { showToast } = useToast();

  // Logout modal state
  const [showConfirm, setShowConfirm] = useState(false);

  // Delete account modal state
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Logout modal handlers
  const openConfirm = () => setShowConfirm(true);
  const cancel = () => setShowConfirm(false);
  const confirm = () => {
    // Perform logout logic here
    localStorage.removeItem('taxpal_token');
    setStoredUser(null);

    // Close the modal
    setShowConfirm(false);

    // Now redirect
    navigate("/signin");
  };

  // Navigation
  const openChangePassword = () => setShowChangePassword(true);
  const closeChangePassword = () => {
    setShowChangePassword(false);
  };

  // Delete account modal handlers
  const openConfirmDelete = () => setShowConfirmDelete(true);
  const cancelDelete = () => {
    if (!deleting) setShowConfirmDelete(false);
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);

      await deleteAccountRequest();

      // On success: clear auth and redirect to signup
      localStorage.removeItem('taxpal_token');
      setStoredUser(null);
      setShowConfirmDelete(false);
      showToast({ message: "Account deleted" });
      navigate("/signup");
    } catch (err) {
      console.error(err);
      await alert({
        title: "Delete account failed",
        message: "Unable to delete account. Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="panel">
        <div className="set-head compact">
          <h2 className="set-title">Security</h2>
          <p className="set-sub">Protect the account and sessions.</p>
        </div>

        <div className="security-grid">
          <div className="card">
            <h4>Active sessions</h4>
            <p>Sign out from this device and browser.</p>
            <div className="toolbar">
              <button
                className="btn danger signout-btn"
                type="button"
                onClick={openConfirm}
              >
                Sign out all
              </button>
            </div>
          </div>

          <div className="card">
            <h4>Password</h4>
            <p>Update a strong, unique password.</p>
            <div className="toolbar">
              <button
                className="btn34 change-password-btn"
                type="button"
                onClick={openChangePassword}
              >
                Change password
              </button>
            </div>
          </div>

          <div className="card">
            <h4>Delete Account</h4>
            <p>Delete your account permanently.</p>
            <div className="toolbar">
              <button
                className="btn danger delete-btn"
                type="button"
                onClick={openConfirmDelete}
                disabled={deleting}
                aria-disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ConfirmLogout modal */}
      <ConfirmLogout
        open={showConfirm}
        onCancel={cancel}
        onConfirm={confirm}
      />

      {/* DeleteAccount modal */}
      <DeleteAccount
        open={showConfirmDelete}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        loading={deleting}
      />

      <ChangePasswordModal open={showChangePassword} onClose={closeChangePassword} />
    </>
  );
}
