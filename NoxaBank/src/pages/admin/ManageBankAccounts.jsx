/*
This component allows the administrator to manage bank account transfers between clients.
It can search the sender and recipient by passport number, display their account balances,
choose the source and destination account types, and transfer an amount after confirmation.
It also verifies the available balance before sending the transfer request to the API.
*/


import { useMemo, useState } from "react";
import API_BASE from "../../config";


const API = `${API_BASE}/admin/accounts`;

export default function ManageBankAccounts() {
  const token = localStorage.getItem("token");

  const [senderPassport, setSenderPassport] = useState("");
  const [recipientPassport, setRecipientPassport] = useState("");

  const [sender, setSender] = useState(null);
  const [recipient, setRecipient] = useState(null);

  const [senderAccType, setSenderAccType] = useState("Main");      // Main | Savings
  const [recipientAccType, setRecipientAccType] = useState("Main"); // Main | Savings

  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // ✅ Normalisation Passport (IMPORTANT)
  function normalizePassport(data) {
    return (
      data?.passportNumber ||
      data?.passportId ||
      data?.passport ||
      data?.PassportNumber ||
      data?.PassportId ||
      ""
    );
  }

  // ✅ On garde toujours un champ "passport" fiable dans sender/recipient
  function normalizeClient(data) {
    const passport = normalizePassport(data);
    return {
      ...data,
      passport, // ✅ champ unique utilisé partout
      fullName: data?.fullName ?? data?.FullName ?? "",
    };
  }

  async function loadClient(passport, setClient) {
    setErr("");
    setOk("");

    const p = passport.trim();
    if (!p) {
      setErr("Entre un Passport Number.");
      return;
    }

    const res = await fetch(`${API}/client-by-passport/${encodeURIComponent(p)}`, {
      headers: {
        // Authorization: `Bearer ${token}`,
      },
    });

    const txt = await res.text();
    if (!res.ok) {
      setClient(null);
      setErr(txt || "Client introuvable.");
      return;
    }

    const data = JSON.parse(txt);
    setClient(normalizeClient(data));
  }

  async function getAccounts(passport) {
    const p = (passport || "").trim();
    const res = await fetch(`${API}/${encodeURIComponent(p)}/list`);
    const txt = await res.text();
    if (!res.ok) throw new Error(txt || "Erreur comptes");
    return JSON.parse(txt);
  }

  // ✅ Affichage solde (Main/Savings) directement dans la carte
  const senderBalances = useMemo(() => {
    if (!sender) return { main: 0, savings: 0 };
    return {
      main: Number(sender.mainBalance ?? sender.MainBalance ?? 0),
      savings: Number(sender.savingsBalance ?? sender.SavingsBalance ?? 0),
    };
  }, [sender]);

  const recipientBalances = useMemo(() => {
    if (!recipient) return { main: 0, savings: 0 };
    return {
      main: Number(recipient.mainBalance ?? recipient.MainBalance ?? 0),
      savings: Number(recipient.savingsBalance ?? recipient.SavingsBalance ?? 0),
    };
  }, [recipient]);

  const senderAvailable = useMemo(() => {
    if (!sender) return 0;
    if (senderAccType === "Main") return senderBalances.main;
    if (senderAccType === "Savings") return senderBalances.savings;
    return 0;
  }, [sender, senderAccType, senderBalances]);

  async function doTransfer() {
    setBusy(true);
    setErr("");
    setOk("");

    try {
      if (!sender || !recipient) {
        setErr("Choisis expéditeur et destinataire d’abord.");
        return;
      }

      const a = Number(amount);
      if (!a || a <= 0) {
        setErr("Montant invalide.");
        return;
      }

      // ✅ check solde dispo via API /list (la source la plus fiable)
      const sData = await getAccounts(sender.passport);
      const sAcc = (sData?.accounts || []).find((x) => x.type === senderAccType);
      const sBal = Number(sAcc?.balance ?? 0);

      if (a > sBal) {
        setErr("Tu n’as pas ce montant (solde insuffisant).");
        return;
      }

      const res = await fetch(`${API}/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          senderPassport: sender.passport,             // ✅ PassportNumber fiable
          senderAccountType: senderAccType,            // Main | Savings
          recipientPassport: recipient.passport,       // ✅ PassportNumber fiable
          recipientAccountType: recipientAccType,      // Main | Savings
          amount: a,
        }),
      });

      const txt = await res.text();
      if (!res.ok) throw new Error(txt || "Erreur transfert");

      const data = JSON.parse(txt);
      setOk(data.message || "Transfert effectué ✅");

      // ✅ refresh clients (pour afficher les soldes à jour)
      await loadClient(sender.passport, setSender);
      await loadClient(recipient.passport, setRecipient);
      setAmount("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  function clearAll() {
    setSenderPassport("");
    setRecipientPassport("");
    setSender(null);
    setRecipient(null);
    setSenderAccType("Main");
    setRecipientAccType("Main");
    setAmount("");
    setErr("");
    setOk("");
    setConfirmOpen(false);
  }

  return (
    <div style={{ color: "white" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Manage Bank Accounts — Transfer</div>
        <button onClick={clearAll} style={btn}>Supprimer (vider)</button>
      </div>

      {err && <div style={errBox}>{err}</div>}
      {ok && <div style={okBox}>{ok}</div>}

      <div style={grid}>
        {/* SENDER */}
        <div style={card}>
          <div style={cardTitle}>Expéditeur</div>

          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={senderPassport}
              onChange={(e) => setSenderPassport(e.target.value)}
              placeholder="Passport Number..."
              style={input}
            />
            <button onClick={() => loadClient(senderPassport, setSender)} style={btn}>
              Search
            </button>
          </div>

          {sender && (
            <div style={miniInfo}>
              <div><b>Nom:</b> {sender.fullName}</div>
              <div><b>Passport:</b> {sender.passport}</div>

              <div style={{ marginTop: 10 }}>
                <div><b>Solde Main Balance:</b> {senderBalances.main}</div>
                <div><b>Solde Savings:</b> {senderBalances.savings}</div>
              </div>

              <div style={{ marginTop: 10 }}>
                <label style={label}>Compte</label>
                <select value={senderAccType} onChange={(e) => setSenderAccType(e.target.value)} style={select}>
                  <option value="Main">Main Balance</option>
                  <option value="Savings">Savings</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* RECIPIENT */}
        <div style={card}>
          <div style={cardTitle}>Destinataire</div>

          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={recipientPassport}
              onChange={(e) => setRecipientPassport(e.target.value)}
              placeholder="Passport Number..."
              style={input}
            />
            <button onClick={() => loadClient(recipientPassport, setRecipient)} style={btn}>
              Search
            </button>
          </div>

          {recipient && (
            <div style={miniInfo}>
              <div><b>Nom:</b> {recipient.fullName}</div>
              <div><b>Passport:</b> {recipient.passport}</div>

              <div style={{ marginTop: 10 }}>
                <div><b>Solde Main Balance:</b> {recipientBalances.main}</div>
                <div><b>Solde Savings:</b> {recipientBalances.savings}</div>
              </div>

              <div style={{ marginTop: 10 }}>
                <label style={label}>Compte</label>
                <select value={recipientAccType} onChange={(e) => setRecipientAccType(e.target.value)} style={select}>
                  <option value="Main">Main Balance</option>
                  <option value="Savings">Savings</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AMOUNT + ACTION */}
      <div style={{ ...card, marginTop: 12 }}>
        <div style={cardTitle}>Montant</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Montant..."
            style={{ ...input, width: 220 }}
          />

          <div style={{ fontWeight: 900, opacity: 0.95 }}>
            Solde dispo ({senderAccType}): {sender ? senderAvailable : 0}
          </div>

          <button
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            style={{ ...btn, opacity: busy ? 0.6 : 1 }}
          >
            Transfert
          </button>
        </div>
      </div>

      {/* CONFIRM MODAL */}
      {confirmOpen && (
        <div style={overlay}>
          <div style={modal}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Confirmation</div>
            <div style={{ opacity: 0.9, marginBottom: 12 }}>
              Tu es sûr de faire le transfert ?
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmOpen(false)} style={btn}>Non</button>
              <button onClick={doTransfer} style={btnPrimary} disabled={busy}>
                Oui
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const grid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const card = { border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 12, background: "rgba(255,255,255,0.04)" };
const cardTitle = { fontWeight: 900, marginBottom: 10 };

const input = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  outline: "none",
  width: "100%",
};

const select = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  outline: "none",
  width: "100%",
};

const btn = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const btnPrimary = {
  ...btn,
  background: "rgba(255,255,255,0.16)",
};

const miniInfo = { marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" };
const label = { display: "block", fontWeight: 800, opacity: 0.9, marginBottom: 6 };

const errBox = { background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.25)", padding: 10, borderRadius: 12, marginBottom: 10, fontWeight: 800 };
const okBox = { background: "rgba(80,255,160,0.10)", border: "1px solid rgba(80,255,160,0.25)", padding: 10, borderRadius: 12, marginBottom: 10, fontWeight: 800 };

const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 };
const modal = { width: 360, borderRadius: 16, padding: 14, background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)" };
