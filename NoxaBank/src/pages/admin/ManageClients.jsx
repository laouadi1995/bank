/*
Ce composant permet à l’administrateur de consulter et gérer la liste des clients.
Il permet de charger tous les clients depuis l’API, de rechercher un client par nom ou email,
et d’activer ou désactiver un compte client.
Les informations des clients sont affichées dans un tableau.
*/

import { useEffect, useState } from "react";

const API_ADMIN = "http://localhost:5200/api/admin";

export default function ManageClients() {
  const token = localStorage.getItem("token");

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function loadClients(search = "") {
    setLoading(true);
    setErr("");

    try {
      const res = await fetch(`${API_ADMIN}/clients?q=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setErr(`Erreur API: ${res.status} ${txt}`);
        setClients([]);
        return;
      }

      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr("Impossible de contacter l’API. Vérifie que l’API tourne sur :5200");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(client) {
    const newStatus = !client.isActive;
    setBusyId(client.id);
    setErr("");

    // UI optimiste
    setClients((prev) =>
      prev.map((c) => (c.id === client.id ? { ...c, isActive: newStatus } : c))
    );

    try {
      const res = await fetch(`${API_ADMIN}/clients/${client.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`${res.status} ${txt}`);
      }
    } catch (e) {
      // rollback
      setClients((prev) =>
        prev.map((c) => (c.id === client.id ? { ...c, isActive: !newStatus } : c))
      );
      setErr(`Erreur status: ${e.message}`);
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    loadClients("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div style={{ color: "white", fontWeight: 800, fontSize: 18 }}>
                <span style={{ opacity: 0.7 }}></span>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email..."
            style={input}
            onKeyDown={(e) => e.key === "Enter" && loadClients(q)}
            
          />
          
          <button onClick={() => loadClients(q)} style={btn}>Search</button>
          <button onClick={() => { setQ(""); loadClients(""); }} style={btn}>Refresh</button>
        </div>
      </div>

      {err && <div style={{ color: "#ffd2d2", marginBottom: 10, fontWeight: 700 }}>{err}</div>}

      {loading ? (
        <div style={{ color: "white", opacity: 0.9 }}>Loading clients...</div>
      ) : (
        <div style={tableBox}>
          <table style={{ width: "100%", borderCollapse: "collapse", color: "white" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.06)" }}>
                <th style={th}>ID</th>
                <th style={th}>Full Name</th>
                <th style={th}>Passport ID</th>
                <th style={th}>Email</th>
                <th style={th}>Phone</th>
                <th style={th}>Birthday</th>
                <th style={th}>Status</th>
                <th style={th}>Action</th>
              </tr>
            </thead>

            <tbody>
              {clients.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <td style={td}>{c.id}</td>
                  <td style={td}>{c.fullName || "-"}</td>
                  <td style={td}>{c.passportId || "-"}</td>
                  <td style={td}>{c.email || "-"}</td>
                  <td style={td}>{c.phoneNumber || "-"}</td>
                  <td style={td}>{c.birthDate ? new Date(c.birthDate).toLocaleDateString() : "-"}</td>
                  <td style={td}>
                    <span style={statusBadge}>{c.isActive ? "Active" : "Inactive"}</span>
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => toggleStatus(c)}
                      disabled={busyId === c.id}
                      style={{ ...actionBtn, opacity: busyId === c.id ? 0.6 : 1 }}
                    >
                      {c.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}

              {clients.length === 0 && (
                <tr>
                  <td style={td} colSpan={8}>Aucun client trouvé.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { textAlign: "left", padding: "12px 12px", fontSize: 14, opacity: 0.9, whiteSpace: "nowrap" };
const td = { padding: "12px 12px", fontSize: 14, opacity: 0.95, whiteSpace: "nowrap" };

const tableBox = { overflow: "auto", borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)" };

const input = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  outline: "none",
  width: 320,
};

const btn = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const actionBtn = {
  padding: "8px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(0,0,0,0.18)",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
};

const statusBadge = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  fontWeight: 800,
};
