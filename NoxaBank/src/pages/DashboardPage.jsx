/*
Ce composant affiche le tableau de bord du client dans l’application NoxaBank.
Il montre les informations principales du compte comme les soldes (Credit, Main, Savings),
l’historique des transactions, le dépôt par chèque, le transfert et la mise à jour du profil.
Si l’utilisateur connecté est un administrateur, il est automatiquement redirigé vers /admin.
*/

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import PayBills from "../components/PayBills";

const API_BASE = "http://localhost:5200/api";

export default function DashboardPage() {
  const navigate = useNavigate();
  const fullName = localStorage.getItem("fullName") || "Client";
  const role = (localStorage.getItem("role") || "client").toLowerCase();
  const token = localStorage.getItem("token");

  const [activeTab, setActiveTab] = useState("dashboard");
  const [message, setMessage] = useState("");

  const [summary, setSummary] = useState({
    id: 0,
    fullName,
    email: "",
    phone: "",
    address: "",
    birthDate: "",
    passportNumber: "",
    balances: {
      creditBalance: 0,
      mainBalance: 0,
      savingsBalance: 0,
    },
  });

  const [operations, setOperations] = useState([]);

  const [accountType, setAccountType] = useState("main");
  const [amount, setAmount] = useState("");
  const [supplier, setSupplier] = useState("");
  const [depositDate, setDepositDate] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [chequeImage, setChequeImage] = useState(null);

  const [transferMode, setTransferMode] = useState("other-client");
  const [recipientPassport, setRecipientPassport] = useState("");
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [transferSenderAccount, setTransferSenderAccount] = useState("main");
  const [transferAmount, setTransferAmount] = useState("");

  const [myFromAccount, setMyFromAccount] = useState("main");
  const [myToAccount, setMyToAccount] = useState("savings");
  const [myTransferAmount, setMyTransferAmount] = useState("");

  const [profileFullName, setProfileFullName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileBirthDate, setProfileBirthDate] = useState("");
  const [profilePassword, setProfilePassword] = useState("");

  useEffect(() => {
    if (role === "admin") {
      navigate("/admin");
      return;
    }

    loadSummary();
    loadOperations();
  }, [role, navigate]);

  async function readJsonSafe(res) {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }

  async function loadSummary() {
    try {
      const res = await fetch(`${API_BASE}/client/dashboard/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        setMessage(data?.message || "Erreur chargement summary.");
        return;
      }

      setSummary(data);
      setProfileFullName(data.fullName || "");
      setProfileEmail(data.email || "");
      setProfilePhone(data.phone || "");
      setProfileAddress(data.address || "");
      setProfileBirthDate(data.birthDate ? String(data.birthDate).split("T")[0] : "");
    } catch {
      setMessage("Erreur API summary.");
    }
  }

  async function loadOperations() {
    try {
      const res = await fetch(`${API_BASE}/client/dashboard/operations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await readJsonSafe(res);

      if (!res.ok) return;

      setOperations(Array.isArray(data) ? data : []);
    } catch {
      //
    }
  }

  function formatMoney(value) {
    const number = Number(value || 0);
    return number.toLocaleString("en-CA", {
      style: "currency",
      currency: "CAD",
    });
  }

  function formatDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  }

  function clearDepositForm() {
    setAccountType("main");
    setAmount("");
    setSupplier("");
    setDepositDate("");
    setChequeDate("");
    setChequeImage(null);
  }

  function clearTransferOtherForm() {
    setRecipientPassport("");
    setRecipientInfo(null);
    setTransferSenderAccount("main");
    setTransferAmount("");
  }

  function clearTransferMyAccountsForm() {
    setMyFromAccount("main");
    setMyToAccount("savings");
    setMyTransferAmount("");
  }

  async function handleDeposit() {
    setMessage("");

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setMessage("Veuillez entrer un montant valide.");
      return;
    }

    if (!supplier.trim()) {
      setMessage("Le fournisseur est obligatoire.");
      return;
    }

    if (!depositDate || !chequeDate) {
      setMessage("Les dates du chèque sont obligatoires.");
      return;
    }

    const depDate = new Date(depositDate);
    const chDate = new Date(chequeDate);
    const diffDays = Math.floor((depDate - chDate) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      setMessage("La date du chèque ne peut pas être après la date du dépôt.");
      return;
    }

    if (diffDays > 30) {
      setMessage("Chèque refusé : plus de 30 jours.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("DepositType", "cheque");
      formData.append("AccountType", accountType);
      formData.append("Amount", numericAmount.toString());
      formData.append("Supplier", supplier);
      formData.append("DepositDate", depositDate);
      formData.append("ChequeDate", chequeDate);

      if (chequeImage) {
        formData.append("ChequeImage", chequeImage);
      }

      const res = await fetch(`${API_BASE}/client/dashboard/deposit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        setMessage(data?.message || "Erreur pendant le dépôt.");
        return;
      }

      setSummary((prev) => ({
        ...prev,
        balances: data.balances,
      }));

      await loadOperations();
      clearDepositForm();
      setMessage(data?.message || "Dépôt effectué avec succès.");
      setActiveTab("dashboard");
    } catch {
      setMessage("Erreur API deposit.");
    }
  }

  async function handleSearchRecipient() {
    setMessage("");
    setRecipientInfo(null);

    if (!recipientPassport.trim()) {
      setMessage("Veuillez entrer le Passport ID du destinataire.");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/client/dashboard/search-recipient?passportNumber=${encodeURIComponent(
          recipientPassport.trim()
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await readJsonSafe(res);

      if (!res.ok) {
        setMessage(data?.message || "Destinataire introuvable.");
        return;
      }

      setRecipientInfo(data);
      setMessage("Destinataire trouvé.");
    } catch {
      setMessage("Erreur API recherche destinataire.");
    }
  }

  async function handleTransferToOtherClient() {
    setMessage("");

    const numericAmount = Number(transferAmount);

    if (!recipientPassport.trim()) {
      setMessage("Veuillez entrer le Passport ID du destinataire.");
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setMessage("Veuillez entrer un montant valide.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/client/dashboard/transfer/other-client`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientPassportNumber: recipientPassport.trim(),
          senderAccountType: transferSenderAccount,
          amount: numericAmount,
        }),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        setMessage(data?.message || "Erreur pendant le transfert.");
        return;
      }

      setSummary((prev) => ({
        ...prev,
        balances: data.balances,
      }));

      await loadOperations();
      clearTransferOtherForm();
      setMessage(data?.message || "Transfert effectué avec succès.");
      setActiveTab("dashboard");
    } catch {
      setMessage("Erreur API transfer.");
    }
  }

  async function handleTransferBetweenMyAccounts() {
    setMessage("");

    const numericAmount = Number(myTransferAmount);

    if (!numericAmount || numericAmount <= 0) {
      setMessage("Veuillez entrer un montant valide.");
      return;
    }

    if (myFromAccount === myToAccount) {
      setMessage("Le compte source et destination doivent être différents.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/client/dashboard/transfer/my-accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromAccountType: myFromAccount,
          toAccountType: myToAccount,
          amount: numericAmount,
        }),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        setMessage(data?.message || "Erreur pendant le transfert.");
        return;
      }

      setSummary((prev) => ({
        ...prev,
        balances: data.balances,
      }));

      await loadOperations();
      clearTransferMyAccountsForm();
      setMessage(data?.message || "Transfert entre vos comptes effectué avec succès.");
      setActiveTab("dashboard");
    } catch {
      setMessage("Erreur API transfer.");
    }
  }

  async function handleUpdateProfile() {
    setMessage("");

    if (!profileFullName.trim()) {
      setMessage("Le nom complet est obligatoire.");
      return;
    }

    if (!profileEmail.trim()) {
      setMessage("L'email est obligatoire.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/client/dashboard/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: profileFullName,
          email: profileEmail,
          phone: profilePhone,
          address: profileAddress,
          birthDate: profileBirthDate || null,
          password: profilePassword,
        }),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        setMessage(data?.message || "Erreur pendant la mise à jour du profil.");
        return;
      }

      localStorage.setItem("fullName", data?.user?.fullName || profileFullName);

      setProfilePassword("");
      await loadSummary();
      setMessage(data?.message || "Profil mis à jour avec succès.");
      setActiveTab("dashboard");
    } catch {
      setMessage("Erreur API profile.");
    }
  }

  return (
    <div className="db">
      <div className="db-main-wrapper">
        <aside className="sb">
          <div className="sb-brand">
            <div className="sb-title">NOXABANK</div>
            <div className="sb-sub">{summary.fullName || fullName}</div>
          </div>

          <nav className="sb-nav">
            <div
              className={`sb-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              Dashboard
            </div>

            <div
              className={`sb-item ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Balance Overview
            </div>

            <div
              className={`sb-item ${activeTab === "deposit" ? "active" : ""}`}
              onClick={() => setActiveTab("deposit")}
            >
              Deposit
            </div>

            <div
              className={`sb-item ${activeTab === "transfer" ? "active" : ""}`}
              onClick={() => setActiveTab("transfer")}
            >
              Transfer
            </div>

            <div
              className={`sb-item ${activeTab === "pay-bills" ? "active" : ""}`}
              onClick={() => setActiveTab("pay-bills")}
            >
              Pay Bills
            </div>

            <div
              className={`sb-item ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              Update Profile
            </div>
          </nav>

          <div className="sb-bottom">
            <button
              className="sb-logout"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("fullName");
                localStorage.removeItem("role");
                window.location.href = "/";
              }}
            >
              Logout
            </button>
          </div>
        </aside>

        <main className="db-main">
          <header className="tb">
            <div className="tb-left">
              <h2>
                {activeTab === "deposit"
                  ? "Deposit"
                  : activeTab === "transfer"
                  ? "Transfer"
                  : activeTab === "profile"
                  ? "Update Profile"
                  : "Dashboard"}
              </h2>
            </div>

            <div className="tb-search">
              <input placeholder="Search here..." />
              <span className="tb-search-icon">🔍</span>
            </div>

            <div className="tb-right">
              <div className="tb-user">
                <div className="tb-avatar" />
                <div className="tb-usertext">
                  <div className="tb-name">{summary.fullName || fullName}</div>
                  <div className="tb-role">Client</div>
                </div>
              </div>
            </div>
          </header>

          {message && (
            <div
              style={{
                marginBottom: "16px",
                padding: "12px 16px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.12)",
                color: "white",
              }}
            >
              {message}
            </div>
          )}

          {activeTab === "dashboard" && (
            <>
              <section className="db-cards">
                <div className="card">
                  <p className="card-title">Credit Balance</p>
                  <h3>{formatMoney(summary.balances.creditBalance)}</h3>
                  <span>{summary.fullName || fullName}</span>
                </div>

                <div className="card">
                  <p className="card-title">Main Balance</p>
                  <h3>{formatMoney(summary.balances.mainBalance)}</h3>
                  <span>{summary.fullName || fullName}</span>
                </div>

                <div className="card">
                  <p className="card-title">Savings</p>
                  <h3>{formatMoney(summary.balances.savingsBalance)}</h3>
                  <span>{summary.fullName || fullName}</span>
                </div>
              </section>

              <section className="db-table">
                <h3>Transaction History</h3>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Date</th>
                      <th>Recipient</th>
                      <th>Amount</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.length === 0 ? (
                      <tr>
                        <td colSpan="5">No transactions found.</td>
                      </tr>
                    ) : (
                      operations.slice(0, 8).map((op) => (
                        <tr key={op.id}>
                          <td>#{op.id}</td>
                          <td>{formatDate(op.date || op.createdAt)}</td>
                          <td>{op.recipient || op.recipientFullName || summary.fullName}</td>
                          <td>{formatMoney(op.amount)}</td>
                          <td>{op.type}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>
            </>
          )}

          {activeTab === "overview" && (
            <section className="db-table">
              <h3>Balance Overview</h3>
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Current Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Credit Balance</td>
                    <td>{formatMoney(summary.balances.creditBalance)}</td>
                  </tr>
                  <tr>
                    <td>Main Balance</td>
                    <td>{formatMoney(summary.balances.mainBalance)}</td>
                  </tr>
                  <tr>
                    <td>Savings</td>
                    <td>{formatMoney(summary.balances.savingsBalance)}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {activeTab === "deposit" && (
            <section className="db-table">
              <h3>My Deposit</h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginTop: "18px",
                }}
              >
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    Account
                  </label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.10)",
                      color: "white",
                    }}
                  >
                    <option value="main" style={{ color: "black" }}>
                      Main Balance
                    </option>
                    <option value="savings" style={{ color: "black" }}>
                      Savings
                    </option>
                    <option value="credit" style={{ color: "black" }}>
                      Credit Balance
                    </option>
                  </select>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.10)",
                      color: "white",
                    }}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    Supplier
                  </label>
                  <input
                    type="text"
                    placeholder="Supplier name"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.10)",
                      color: "white",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    Deposit Date
                  </label>
                  <input
                    type="date"
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.10)",
                      color: "white",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    Cheque Date
                  </label>
                  <input
                    type="date"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.10)",
                      color: "white",
                    }}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    Cheque Photo
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setChequeImage(e.target.files?.[0] || null)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.10)",
                      color: "white",
                    }}
                  />
                </div>

                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    gap: "12px",
                    marginTop: "8px",
                  }}
                >
                  <button
                    onClick={handleDeposit}
                    style={{
                      border: "none",
                      padding: "14px 22px",
                      borderRadius: "12px",
                      cursor: "pointer",
                      color: "white",
                      background: "rgba(255,255,255,0.18)",
                      fontWeight: "bold",
                    }}
                  >
                    Validate
                  </button>

                  <button
                    onClick={clearDepositForm}
                    style={{
                      border: "none",
                      padding: "14px 22px",
                      borderRadius: "12px",
                      cursor: "pointer",
                      color: "white",
                      background: "rgba(255,255,255,0.10)",
                      fontWeight: "bold",
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === "transfer" && (
            <section className="db-table">
              <h3>My Transfer</h3>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  marginTop: "18px",
                  marginBottom: "18px",
                }}
              >
                <button
                  onClick={() => setTransferMode("other-client")}
                  style={{
                    border: "none",
                    padding: "14px 22px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    color: "white",
                    background:
                      transferMode === "other-client"
                        ? "rgba(255,255,255,0.18)"
                        : "rgba(255,255,255,0.10)",
                    fontWeight: "bold",
                  }}
                >
                  Transfer to another client
                </button>

                <button
                  onClick={() => setTransferMode("my-accounts")}
                  style={{
                    border: "none",
                    padding: "14px 22px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    color: "white",
                    background:
                      transferMode === "my-accounts"
                        ? "rgba(255,255,255,0.18)"
                        : "rgba(255,255,255,0.10)",
                    fontWeight: "bold",
                  }}
                >
                  Transfer between my accounts
                </button>
              </div>

              {transferMode === "other-client" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                    marginTop: "10px",
                  }}
                >
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", marginBottom: "8px" }}>
                      Recipient Passport ID
                    </label>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <input
                        type="text"
                        placeholder="Search by Passport ID"
                        value={recipientPassport}
                        onChange={(e) => setRecipientPassport(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "14px",
                          borderRadius: "12px",
                          border: "1px solid rgba(255,255,255,0.15)",
                          background: "rgba(255,255,255,0.10)",
                          color: "white",
                        }}
                      />
                      <button
                        onClick={handleSearchRecipient}
                        style={{
                          border: "none",
                          padding: "14px 22px",
                          borderRadius: "12px",
                          cursor: "pointer",
                          color: "white",
                          background: "rgba(255,255,255,0.18)",
                          fontWeight: "bold",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Search
                      </button>
                    </div>
                  </div>

                  {recipientInfo && (
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        padding: "14px",
                        borderRadius: "12px",
                        background: "rgba(255,255,255,0.10)",
                        color: "white",
                      }}
                    >
                      <div><strong>Name:</strong> {recipientInfo.fullName}</div>
                      <div><strong>Email:</strong> {recipientInfo.email}</div>
                      <div><strong>Passport ID:</strong> {recipientInfo.passportNumber}</div>
                    </div>
                  )}

                  <div>
                    <label style={{ display: "block", marginBottom: "8px" }}>
                      Sender Account
                    </label>
                    <select
                      value={transferSenderAccount}
                      onChange={(e) => setTransferSenderAccount(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(255,255,255,0.10)",
                        color: "white",
                      }}
                    >
                      <option value="main" style={{ color: "black" }}>
                        Main Balance
                      </option>
                      <option value="savings" style={{ color: "black" }}>
                        Savings
                      </option>
                      <option value="credit" style={{ color: "black" }}>
                        Credit Balance
                      </option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "8px" }}>
                      Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(255,255,255,0.10)",
                        color: "white",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      gridColumn: "1 / -1",
                      display: "flex",
                      gap: "12px",
                      marginTop: "8px",
                    }}
                  >
                    <button
                      onClick={handleTransferToOtherClient}
                      style={{
                        border: "none",
                        padding: "14px 22px",
                        borderRadius: "12px",
                        cursor: "pointer",
                        color: "white",
                        background: "rgba(255,255,255,0.18)",
                        fontWeight: "bold",
                      }}
                    >
                      Validate Transfer
                    </button>

                    <button
                      onClick={clearTransferOtherForm}
                      style={{
                        border: "none",
                        padding: "14px 22px",
                        borderRadius: "12px",
                        cursor: "pointer",
                        color: "white",
                        background: "rgba(255,255,255,0.10)",
                        fontWeight: "bold",
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {transferMode === "my-accounts" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                    marginTop: "10px",
                  }}
                >
                  <div>
                    <label style={{ display: "block", marginBottom: "8px" }}>
                      From Account
                    </label>
                    <select
                      value={myFromAccount}
                      onChange={(e) => setMyFromAccount(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(255,255,255,0.10)",
                        color: "white",
                      }}
                    >
                      <option value="main" style={{ color: "black" }}>
                        Main Balance
                      </option>
                      <option value="savings" style={{ color: "black" }}>
                        Savings
                      </option>
                      <option value="credit" style={{ color: "black" }}>
                        Credit Balance
                      </option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "8px" }}>
                      To Account
                    </label>
                    <select
                      value={myToAccount}
                      onChange={(e) => setMyToAccount(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(255,255,255,0.10)",
                        color: "white",
                      }}
                    >
                      <option value="main" style={{ color: "black" }}>
                        Main Balance
                      </option>
                      <option value="savings" style={{ color: "black" }}>
                        Savings
                      </option>
                      <option value="credit" style={{ color: "black" }}>
                        Credit Balance
                      </option>
                    </select>
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", marginBottom: "8px" }}>
                      Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={myTransferAmount}
                      onChange={(e) => setMyTransferAmount(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(255,255,255,0.10)",
                        color: "white",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      gridColumn: "1 / -1",
                      display: "flex",
                      gap: "12px",
                      marginTop: "8px",
                    }}
                  >
                    <button
                      onClick={handleTransferBetweenMyAccounts}
                      style={{
                        border: "none",
                        padding: "14px 22px",
                        borderRadius: "12px",
                        cursor: "pointer",
                        color: "white",
                        background: "rgba(255,255,255,0.18)",
                        fontWeight: "bold",
                      }}
                    >
                      Validate Transfer
                    </button>

                    <button
                      onClick={clearTransferMyAccountsForm}
                      style={{
                        border: "none",
                        padding: "14px 22px",
                        borderRadius: "12px",
                        cursor: "pointer",
                        color: "white",
                        background: "rgba(255,255,255,0.10)",
                        fontWeight: "bold",
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === "pay-bills" && (
            <PayBills />
          )}

          {activeTab === "profile" && (
            <section className="db-table">
              <h3>Update My Profile</h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginTop: "18px",
                }}
              >
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileFullName}
                    onChange={(e) => setProfileFullName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.10)",
                      color: "white",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.10)",
                      color: "white",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.10)",
                      color: "white",
                    }}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    Address
                  </label>
                  <input
                    type="text"
                    value={profileAddress}
                    onChange={(e) => setProfileAddress(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.10)",
                      color: "white",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    Birth Date
                  </label>
                  <input
                    type="date"
                    value={profileBirthDate}
                    onChange={(e) => setProfileBirthDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.10)",
                      color: "white",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px" }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Leave empty if no change"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.10)",
                      color: "white",
                    }}
                  />
                </div>

                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    gap: "12px",
                    marginTop: "8px",
                  }}
                >
                  <button
                    onClick={handleUpdateProfile}
                    style={{
                      border: "none",
                      padding: "14px 22px",
                      borderRadius: "12px",
                      cursor: "pointer",
                      color: "white",
                      background: "rgba(255,255,255,0.18)",
                      fontWeight: "bold",
                    }}
                  >
                    Save Profile
                  </button>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}