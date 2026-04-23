/*
Ce composant permet à l’administrateur de superviser les opérations bancaires.
Il récupère les transactions depuis l’API, permet de rechercher une opération par nom
et affiche la liste des opérations (dépôts et transferts) dans un tableau avec
la date, l’expéditeur, le destinataire et le montant.
*/


import React, { useEffect, useMemo, useState } from "react";

const API_BASE =
  import.meta?.env?.VITE_API_BASE?.replace(/\/$/, "") || "http://localhost:5200/api";

export default function SuperviseOperations() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setMsg("");
    try {
      const url =
        `${API_BASE}/admin/operations` +
        (search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "");

      const res = await fetch(url);
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || "Erreur API");

      setRows(JSON.parse(txt));
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => rows, [rows]);

  return (
    <div style={{ color: "white" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Supervise Operations</div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            style={input}
          />
          <button onClick={load} style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy}>
            Search
          </button>
        </div>
      </div>

      {msg && <div style={errBox}>{msg}</div>}

      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Date</th>
              <th style={th}>Type</th>
              <th style={th}>Receiver</th>
              <th style={th}>Sender</th>
              <th style={th}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td style={td} colSpan={6}>
                  Aucune opération.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td style={td}>#{r.id}</td>
                  <td style={td}>{new Date(r.date).toLocaleString()}</td>
                  <td style={td}>{r.type === "deposit" ? "deposit" : "transfer"}</td>
                  <td style={td}>{r.receiver || "-"}</td>
                  <td style={td}>{r.sender || "-"}</td>
                  <td style={td}>${Number(r.amount).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tableWrap = {
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  overflow: "auto",
  maxHeight: "60vh",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 900,
};

const th = {
  textAlign: "left",
  padding: "12px 12px",
  fontWeight: 900,
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  opacity: 0.95,
  position: "sticky",
  top: 0,
  background: "#1a1a2e",
  zIndex: 1,
};

const td = {
  padding: "12px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  opacity: 0.95,
};

const input = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  outline: "none",
  width: 260,
};

const btn = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.10)",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const errBox = {
  background: "rgba(255,80,80,0.12)",
  border: "1px solid rgba(255,80,80,0.25)",
  padding: 10,
  borderRadius: 12,
  marginBottom: 10,
  fontWeight: 800,
};
