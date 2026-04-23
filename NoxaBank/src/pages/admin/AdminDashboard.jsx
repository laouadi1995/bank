/*
Ce composant représente le tableau de bord de l’administrateur dans l’application NoxaBank.

Il permet de naviguer entre plusieurs fonctionnalités administratives comme :
- la gestion des clients
- la gestion des comptes bancaires
- la supervision des opérations
- la gestion des profils clients
- l’accès global aux opérations (ex: dépôt)

Il contient une barre latérale (sidebar) pour changer de section
et affiche dynamiquement le contenu selon le menu sélectionné.
*/

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// adapte si tes chemins sont différents
import ManageClients from "./ManageClients";
import ManageBankAccounts from "./ManageBankAccounts";
import SuperviseOperations from "./SuperviseOperations";
import ManageClientProfile from "./ManageClientProfile";
import GlobalAccess from "./GlobalAccess";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [active, setActive] = useState("dashboard");

  useEffect(() => {
    // Check if user is admin
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      navigate("/dashboard");
      return;
    }

    const saved = localStorage.getItem("admin_active_tab");
    if (saved) setActive(saved);
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem("admin_active_tab", active);
  }, [active]);

  return (
    <div style={styles.page}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandTitle}>NOXABANK</div>
          <div style={styles.brandSub}>Noxa Admin</div>
        </div>

        <div style={styles.menu}>
          <MenuBtn label="Dashboard" active={active === "dashboard"} onClick={() => setActive("dashboard")} />
          <MenuBtn label="Manage Clients" active={active === "clients"} onClick={() => setActive("clients")} />
          <MenuBtn label="Manage Bank Accounts" active={active === "accounts"} onClick={() => setActive("accounts")} />
          <MenuBtn label="Supervise Operations" active={active === "ops"} onClick={() => setActive("ops")} />
          <MenuBtn label="Manage Client Profile" active={active === "profile"} onClick={() => setActive("profile")} />
          <MenuBtn label="Global Access" active={active === "global"} onClick={() => setActive("global")} />
        </div>

        <div style={{ flex: 1 }} />

        <button
          style={styles.logout}
          onClick={() => {
            localStorage.clear();
            window.location.href = "/";
          }}
        >
          Logout
        </button>
      </div>

      {/* CONTENT */}
      <div style={styles.content}>
        <div style={styles.topbar}>
          <div>
            <div style={styles.h1}>Admin Dashboard</div>
            <div style={styles.h2}>
              {active === "dashboard" && "Clique sur un menu à gauche."}
              {active === "clients" && "Gestion des clients"}
              {active === "accounts" && "Gestion des comptes (transfert, etc.)"}
              {active === "ops" && "Surveillance des opérations"}
              {active === "profile" && "Créer / Modifier / Supprimer un client"}
              {active === "global" && "Global Access — Deposit (cash / chèque)"}
            </div>
          </div>

          <div style={styles.userChip}>
            <div style={styles.avatar} />
            <div>
              <div style={{ fontWeight: 700, lineHeight: 1 }}>Noxa Admin</div>
              <div style={{ opacity: 0.85, fontSize: 12 }}>Admin</div>
            </div>
          </div>
        </div>

        <div style={styles.panel}>
          {active === "dashboard" && (
            <div style={{ opacity: 0.9 }}>
              Clique sur <b>Manage Clients</b>, <b>Manage Bank Accounts</b>, <b>Manage Client Profile</b> ou{" "}
              <b>Global Access</b>.
            </div>
          )}

          {active === "clients" && <ManageClients />}
          {active === "accounts" && <ManageBankAccounts />}
          {active === "ops" && <SuperviseOperations />}
          {active === "profile" && <ManageClientProfile />}
          {active === "global" && <GlobalAccess />}
        </div>
      </div>
    </div>
  );
}

function MenuBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.menuBtn,
        ...(active ? styles.menuBtnActive : {}),
      }}
    >
      {label}
    </button>
  );
}

const styles = {
  // ✅ FULL SCREEN (comme customer)
  page: {
    display: "flex",
    width: "100vw",
    minHeight: "100vh",
    padding: 14,         // petit padding global (pas margin sur les blocs)
    gap: 14,
    background: "#f5f6fb",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },

  // ✅ plus de margin ici (c’était ça le problème)
  sidebar: {
    flex: "0 0 280px",
    borderRadius: 18,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(180deg, rgba(120,64,220,0.95), rgba(65,33,160,0.95))",
    color: "white",
    minHeight: "calc(100vh - 28px)", // 14 top + 14 bottom
  },

  brand: {
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.08)",
    marginBottom: 14,
  },
  brandTitle: { fontWeight: 900, fontSize: 22, letterSpacing: 0.5 },
  brandSub: { opacity: 0.85, marginTop: 4, fontSize: 13 },

  menu: { display: "flex", flexDirection: "column", gap: 10 },

  menuBtn: {
    width: "100%",
    textAlign: "left",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.07)",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
  menuBtnActive: {
    background: "rgba(255,255,255,0.16)",
    border: "1px solid rgba(255,255,255,0.18)",
  },

  logout: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },

  content: {
    flex: 1,
    borderRadius: 18,
    padding: 18,
    background: "linear-gradient(180deg, rgba(120,64,220,0.95), rgba(65,33,160,0.95))",
    color: "white",
    display: "flex",
    flexDirection: "column",
    minHeight: "calc(100vh - 28px)",
    overflow: "hidden",
  },

  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
    flexWrap: "wrap",
  },

  h1: { fontSize: 26, fontWeight: 900 },
  h2: { opacity: 0.85, marginTop: 4, fontSize: 13 },

  userChip: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.12)",
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: "rgba(255,255,255,0.20)",
  },

  panel: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    overflow: "auto",
  },
};
