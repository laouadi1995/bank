import React, { useState, useEffect } from "react";
import "../styles/pay-bills.css";

const PayBills = () => {
  const [provider, setProvider] = useState("");
  const [accountType, setAccountType] = useState("main");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [billPayments, setBillPayments] = useState([]);
  const [balances, setBalances] = useState({});
  const [activeTab, setActiveTab] = useState("pay"); // "pay" ou "history"

  import API_BASE from "../config";

  const providers = [
    "Bell",
    "Collège la cité",
    "Université",
    "Telus",
    "Rogers",
    "Hydro-Québec",
    "Gaz naturel",
    "Internet provider",
    "Téléphone mobile",
    "Autre"
  ];

  useEffect(() => {
    fetchBillPayments();
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/client/dashboard/summary`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (res.ok) {
        setBalances(data.balances);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des soldes:", err);
    }
  };

  const fetchBillPayments = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/client/dashboard/bill-payments`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (res.ok) {
        setBillPayments(data);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des paiements:", err);
    }
  };

  const handlePayBill = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!provider || !amount || amount <= 0) {
      setError("Veuillez remplir tous les champs correctement.");
      return;
    }

    const accountBalance = balances[
      accountType === "main" ? "mainBalance" :
      accountType === "savings" ? "savingsBalance" : "creditBalance"
    ];

    if (accountBalance < parseFloat(amount)) {
      setError("Solde insuffisant pour ce paiement.");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/client/dashboard/pay-bill`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            provider,
            accountType,
            amount: parseFloat(amount)
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || "Erreur lors du paiement.");
        return;
      }

      setSuccess(data.message);
      setProvider("");
      setAmount("");
      setAccountType("main");
      
      // Rafraîchir les données
      await fetchBillPayments();
      await fetchBalances();

      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError("Erreur lors du paiement.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = async (billPaymentId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler ce paiement?")) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/client/dashboard/pay-bill/cancel/${billPaymentId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || "Erreur lors de l'annulation.");
        return;
      }

      setSuccess(data.message);
      
      // Rafraîchir les données
      await fetchBillPayments();
      await fetchBalances();

      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError("Erreur lors de l'annulation.");
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (createdAt) => {
    const createdTime = new Date(createdAt);
    const expiryTime = new Date(createdTime.getTime() + 48 * 60 * 60 * 1000);
    const now = new Date();
    const hoursRemaining = Math.floor((expiryTime - now) / (1000 * 60 * 60));
    const minutesRemaining = Math.floor(((expiryTime - now) % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hoursRemaining < 0) return "Expiré";
    return `${hoursRemaining}h ${minutesRemaining}m`;
  };

  const accountBalance = balances[
    accountType === "main" ? "mainBalance" :
    accountType === "savings" ? "savingsBalance" : "creditBalance"
  ] || 0;

  return (
    <div className="pay-bills-container">
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === "pay" ? "active" : ""}`}
          onClick={() => setActiveTab("pay")}
        >
          Payer une facture
        </button>
        <button
          className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          Historique (Solde: ${accountBalance.toFixed(2)})
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {activeTab === "pay" ? (
        <div className="pay-bill-form">
          <h3>Paiement de facture</h3>
          <form onSubmit={handlePayBill}>
            <div className="form-group">
              <label htmlFor="provider">Fournisseur *</label>
              <select
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                required
              >
                <option value="">-- Sélectionner un fournisseur --</option>
                {providers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="accountType">Compte à débiter *</label>
              <select
                id="accountType"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
              >
                <option value="main">Main Balance (${balances.mainBalance?.toFixed(2) || "0.00"})</option>
                <option value="savings">Savings Balance (${balances.savingsBalance?.toFixed(2) || "0.00"})</option>
                <option value="credit">Credit Balance (${balances.creditBalance?.toFixed(2) || "0.00"})</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="amount">Montant ($) *</label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Entrez le montant"
                required
              />
            </div>

            <div className="balance-info">
              <p>Solde disponible: <strong>${accountBalance.toFixed(2)}</strong></p>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Traitement..." : "Valider le paiement"}
            </button>
          </form>
        </div>
      ) : (
        <div className="bill-payments-history">
          <h3>Historique des paiements de factures</h3>
          {billPayments.length === 0 ? (
            <p className="no-data">Aucun paiement de facture trouvé.</p>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Fournisseur</th>
                    <th>Montant</th>
                    <th>Compte</th>
                    <th>Statut</th>
                    <th>Temps restant (annulation)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {billPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{new Date(payment.createdAt).toLocaleDateString("fr-CA", { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                      <td><strong>{payment.provider}</strong></td>
                      <td>${payment.amount.toFixed(2)}</td>
                      <td>
                        <span className={`account-badge account-${payment.accountType}`}>
                          {payment.accountType === "main" ? "Main" : payment.accountType === "savings" ? "Savings" : "Credit"}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${payment.status}`}>
                          {payment.status === "completed" ? "Complété" : payment.status === "cancelled" ? "Annulé" : "En attente"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {payment.canCancel ? (
                          <span style={{ color: "#ff9800", fontWeight: "600" }}>
                            {getTimeRemaining(payment.createdAt)}
                          </span>
                        ) : (
                          <span style={{ color: "#999" }}>Expiré</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {payment.canCancel && (
                          <button
                            className="btn btn-danger btn-small"
                            onClick={() => handleCancelPayment(payment.id)}
                            disabled={loading}
                          >
                            Annuler
                          </button>
                        )}
                        {!payment.canCancel && payment.status === "completed" && (
                          <span style={{ color: "#999", fontSize: "12px" }}>Non annulable</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PayBills;
