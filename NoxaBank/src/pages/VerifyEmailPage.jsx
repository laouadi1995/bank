import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/verify-email.css";
import API_BASE from "../config";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState(
    () => sessionStorage.getItem("pendingEmail") || ""
  );
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "error" ou "success"
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(() => {
    const savedTimer = sessionStorage.getItem("resendTimer");
    return savedTimer ? parseInt(savedTimer) : 0;
  });

  // Décroître le timer chaque seconde
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => {
        const newTimer = prev - 1;
        sessionStorage.setItem("resendTimer", newTimer.toString());
        return newTimer;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);
  const handleResendCode = async () => {
    if (timer > 0) return;

    setResendLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/resend-signup-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Code de vérification renvoyé à votre email.");
        setMessageType("success");
        setTimer(60);
        sessionStorage.setItem("resendTimer", "60");
      } else {
        setMessage(data.message || "Erreur lors du renvoi du code.");
        setMessageType("error");
      }
    } catch (err) {
      setMessage("Erreur lors du renvoi du code.");
      setMessageType("error");
    } finally {
      setResendLoading(false);
    }
  };

  // Décrémenter le timer
  const handleVerify = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setMessage("❌ Veuillez entrer un code à 6 chiffres.");
      setMessageType("error");
      return;
    }

    if (!userEmail) {
      setMessage("❌ Erreur: Email manquant.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      // 🎯 Nouvel endpoint: /verify-signup (crée le compte)
      const res = await fetch(`${API_BASE}/auth/verify-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          verificationCode: verificationCode.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Email vérifié avec succès! Votre compte est créé. Vous pouvez maintenant vous connecter.");
        setMessageType("success");

        // Nettoyer sessionStorage
        sessionStorage.removeItem("pendingUserId");
        sessionStorage.removeItem("pendingEmail");
        sessionStorage.removeItem("resendTimer");

        // Rediriger vers login après 2 secondes
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } else {
        setMessage(data.message || "❌ Code de vérification invalide ou expiré.");
        setMessageType("error");
      }
    } catch (err) {
      setMessage("❌ Erreur lors de la vérification.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // Si pas d'email, afficher message
  if (!userEmail) {
    return (
      <div className="verify-email-container">
        <div className="verify-email-box">
          <h2>❌ Accès invalide</h2>
          <p>Veuillez d'abord créer un compte.</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate("/")}
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-email-container">
      <div className="verify-email-box">
        <div className="verify-icon">📧</div>
        <h2>Vérifiez votre email</h2>
        <p className="subtitle">
          Nous avons envoyé un code de vérification à:
          <br />
          <strong>{userEmail}</strong>
        </p>

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label htmlFor="code">Code de vérification (6 chiffres)</label>
            <input
              id="code"
              type="text"
              maxLength="6"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) =>
                setVerificationCode(e.target.value.replace(/\D/g, ""))
              }
              className="code-input"
              disabled={loading}
            />
          </div>

          {message && (
            <div className={`alert alert-${messageType}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || verificationCode.length !== 6}
          >
            {loading ? "Vérification..." : "Vérifier l'email"}
          </button>
        </form>

        <div className="resend-section">
          <p className="resend-text">Vous n'avez pas reçu le code?</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResendCode}
            disabled={resendLoading || timer > 0}
          >
            {timer > 0 ? `Renvoyez dans ${timer}s` : "Renvoyer le code"}
          </button>
        </div>

        <div className="help-text">
          <p>💡 Conseil: Vérifiez votre dossier spam si vous ne voyez pas l'email.</p>
        </div>
      </div>
    </div>
  );
}
