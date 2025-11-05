// App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import ForgotPassword from "./components/forgetpassword/forgetpassword";
import SignUp from "./components/signup/signup";
import Signin from "./components/signin/signin";
import ResetPassword from "./components/resetpassword/resetpassword";

import Layout from "./components/layout/layout";           // Sidebar + <Outlet/>
import Dashboard from "./components/dashboard/dashboard";
import SettingsLayout from "./components/settings/settings"; // SettingsNav + <Outlet/>
import Profile from "./components/settings/profile/profile";
import Categories from "./components/settings/categories/categories";
import Notifications from "./components/settings/notifications/notifications";
import Security from "./components/settings/security/security";
import Budgets from "./components/budgets/budgets";

import { ToastProvider } from "./components/toast/ToastProvider";
import { ModalProvider } from "./components/modal/ModalProvider";
import ProtectedRoute from "./components/common/ProtectedRoute";

import TaxEstimator from "./components/taxEstimator/taxEstimator";
import TaxCalendar from "./components/taxCalender/taxCalender";
import Reports from "./components/report/reports";
import Transactions from "./components/transactions/transactions";

function App() {
  return (
    <ToastProvider>
      <ModalProvider>
        <Router>
          <Routes>
          {/* Auth routes */}
          <Route path="/" element={<Navigate to="/signin" replace />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected routes under Layout */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/tax-estimator" element={<TaxEstimator />} />
            <Route path="/tax-calendar" element={<TaxCalendar />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/transactions" element={<Transactions />} />

            {/* Settings nested inside Layout */}
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="profile" replace />} />
              <Route path="profile" element={<Profile />} />
              <Route path="categories" element={<Categories />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="security" element={<Security />} />
            </Route>
          </Route>
        </Routes>
        </Router>
      </ModalProvider>
    </ToastProvider>
  );
}

export default App;
