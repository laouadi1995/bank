/*
Ce composant configure la navigation principale de l’application NoxaBank.
Il définit les routes pour la page de connexion, le tableau de bord du client
et le tableau de bord de l’administrateur. Il inclut aussi une protection
(RequireAuth) qui vérifie si l’utilisateur possède un token avant d’accéder
aux pages protégées.
*/



import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import VerifyLoginOtpPage from "./pages/VerifyLoginOtpPage";
import DashboardPage from "./pages/DashboardPage";
import AdminDashboard from "./pages/admin/AdminDashboard";

function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-otp" element={<VerifyLoginOtpPage />} />

        {/* CLIENT */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />

        {/* ADMIN */}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminDashboard />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
