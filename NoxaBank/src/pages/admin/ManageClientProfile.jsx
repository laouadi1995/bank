/*
This component allows the administrator to manage client profiles in the NoxaBank application.
It provides three main actions: add a new client, search and edit an existing client,
or delete a client by passport number. It sends requests to the API and supports
both the current profile routes and fallback routes for compatibility with older frontend code.
*/


import { useState } from "react";

const API_PROFILE = "http://localhost:5200/api/admin/profile"; // ✅ route logique
const API_FALLBACK = "http://localhost:5200/api/admin";        // ✅ fallback (si ton ancien code l'utilise)

export default function ManageClientProfile() {
  const token = localStorage.getItem("token");

  const [mode, setMode] = useState("add"); // add | edit | delete
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // ADD form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [passportId, setPassportId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(false);

  // EDIT/DELETE search
  const [searchPassport, setSearchPassport] = useState("");
  const [found, setFound] = useState(null); // {id, fullName, ...}

  function clearAddForm() {
    setFullName("");
    setEmail("");
    setPhoneNumber("");
    setPassportId("");
    setBirthDate("");
    setPassword("");
    setIsActive(false);
  }

  async function safeFetch(url, options) {
    // ✅ essaye d’abord l’url "profile", si ça échoue tu peux fallback
    return fetch(url, options);
  }

  async function handleCreate() {
    setErr("");
    setMsg("");

    const payload = {
      fullName,
      email,
      phone: phoneNumber,
      passportNumber: passportId,
      birthDate: birthDate ? birthDate : null,
      password,
      isActive,
    };

    try {
      // ✅ route correcte
      let res = await safeFetch(`${API_PROFILE}/clients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      // ✅ si jamais ton serveur répond pas ici, fallback ancien endpoint
      if (res.status === 404 || res.status === 405) {
        res = await safeFetch(`${API_FALLBACK}/clients`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }

      if (!res.ok) {
        setErr(data?.message || text || `Erreur API: ${res.status}`);
        return;
      }

      setMsg(data?.message || "Inscription réussie");
      clearAddForm();
    } catch (e) {
      setErr("Impossible de contacter l’API. Vérifie que l’API tourne sur :5200");
    }
  }

  async function handleSearch() {
    setErr("");
    setMsg("");
    setFound(null);

    if (!searchPassport.trim()) {
      setErr("Entre un Passport Number.");
      return;
    }

    try {
      let res = await fetch(`${API_PROFILE}/clients/by-passport/${encodeURIComponent(searchPassport.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 404 || res.status === 405) {
        res = await fetch(`${API_FALLBACK}/clients/by-passport/${encodeURIComponent(searchPassport.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch {}

      if (!res.ok) {
        setErr(data?.message || text || `Erreur API: ${res.status}`);
        return;
      }

      setFound(data);
    } catch {
      setErr("Impossible de contacter l’API.");
    }
  }

  async function handleUpdate() {
    setErr("");
    setMsg("");
    if (!found?.id) return;

    const payload = {
      fullName: found.fullName || "",
      email: found.email || "",
      phone: found.phoneNumber || "",
      birthDate: found.birthDate ? found.birthDate : null,
      isActive: !!found.isActive,
    };

    try {
      let res = await fetch(`${API_PROFILE}/clients/${found.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 404 || res.status === 405) {
        res = await fetch(`${API_FALLBACK}/clients/${found.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch {}

      if (!res.ok) {
        setErr(data?.message || text || `Erreur API: ${res.status}`);
        return;
      }

      setMsg(data?.message || "Client modifié.");
    } catch {
      setErr("Impossible de contacter l’API.");
    }
  }

  async function handleDelete() {
    setErr("");
    setMsg("");
    if (!found?.id) return;

    const ok = window.confirm(
      `Êtes-vous sûr de supprimer ce client ?\n\nNom: ${found.fullName}\nPassport: ${found.passportId}`
    );
    if (!ok) return;

    try {
      let res = await fetch(`${API_PROFILE}/clients/${found.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 404 || res.status === 405) {
        res = await fetch(`${API_FALLBACK}/clients/${found.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch {}

      if (!res.ok) {
        setErr(data?.message || text || `Erreur API: ${res.status}`);
        return;
      }

      setMsg(data?.message || "Client supprimé.");
      setFound(null);
      setSearchPassport("");
    } catch {
      setErr("Impossible de contacter l’API.");
    }
  }

  return (
    <div style={{ color: "white" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}>Manage Client Profile</h3>

        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            setErr("");
            setMsg("");
            setFound(null);
          }}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.08)",
            color: "white",
            outline: "none",
            fontWeight: 800,
          }}
        >
          <option value="add">Ajouter</option>
          <option value="edit">Modifier</option>
          <option value="delete">Supprimer</option>
        </select>
      </div>

      {err && <div style={{ marginBottom: 10, color: "#ffd2d2", fontWeight: 900 }}>{err}</div>}
      {msg && <div style={{ marginBottom: 10, color: "#b8ffca", fontWeight: 900 }}>{msg}</div>}

      {mode === "add" && (
        <div style={box}>
          <h4 style={{ marginTop: 0 }}>Ajouter un client</h4>

          <div style={grid2}>
            <Field label="Full Name" value={fullName} setValue={setFullName} />
            <Field label="Email" value={email} setValue={setEmail} />
            <Field label="Phone" value={phoneNumber} setValue={setPhoneNumber} />
            <Field label="Passport Number" value={passportId} setValue={setPassportId} />
            <Field label="Birth Date" type="date" value={birthDate} setValue={setBirthDate} />
            <Field label="Password (required)" type="password" value={password} setValue={setPassword} />
          </div>

          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span style={{ fontWeight: 800 }}>Active account</span>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button style={btn} onClick={handleCreate}>Valider</button>
            <button style={btn} onClick={clearAddForm}>Vider</button>
          </div>
        </div>
      )}

      {(mode === "edit" || mode === "delete") && (
        <div style={box}>
          <h4 style={{ marginTop: 0 }}>{mode === "edit" ? "Modifier un client" : "Supprimer un client"}</h4>

          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <input
              value={searchPassport}
              onChange={(e) => setSearchPassport(e.target.value)}
              placeholder="Search by Passport Number..."
              style={input}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button style={btn} onClick={handleSearch}>Search</button>
          </div>

          {found && (
            <>
              <div style={grid2}>
                <Field label="Full Name" value={found.fullName || ""} setValue={(v) => setFound({ ...found, fullName: v })} disabled={mode === "delete"} />
                <Field label="Email" value={found.email || ""} setValue={(v) => setFound({ ...found, email: v })} disabled={mode === "delete"} />
                <Field label="Phone" value={found.phoneNumber || ""} setValue={(v) => setFound({ ...found, phoneNumber: v })} disabled={mode === "delete"} />
                <Field label="Passport Number" value={found.passportId || ""} setValue={() => {}} disabled />
                <Field
                  label="Birth Date"
                  type="date"
                  value={found.birthDate ? String(found.birthDate).slice(0, 10) : ""}
                  setValue={(v) => setFound({ ...found, birthDate: v })}
                  disabled={mode === "delete"}
                />
              </div>

              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={!!found.isActive}
                  onChange={(e) => setFound({ ...found, isActive: e.target.checked })}
                  disabled={mode === "delete"}
                />
                <span style={{ fontWeight: 800 }}>Active account</span>
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
                {mode === "edit" ? (
                  <button style={btn} onClick={handleUpdate}>Enregistrer</button>
                ) : (
                  <button style={{ ...btn, borderColor: "rgba(255,120,120,0.5)" }} onClick={handleDelete}>
                    Supprimer
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, setValue, type = "text", disabled = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontWeight: 800, opacity: 0.95 }}>{label}</div>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.18)",
          background: disabled ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
          color: "white",
          outline: "none",
        }}
      />
    </div>
  );
}

const box = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  padding: 16,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const input = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  outline: "none",
};

const btn = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  cursor: "pointer",
  fontWeight: 900,
};
