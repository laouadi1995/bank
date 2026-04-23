import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/verify-login-otp.css';
import API_BASE from '../config';

const VerifyLoginOtpPage = () => {
  const navigate = useNavigate();
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(900); // 15 minutes in seconds
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Get userId and email from sessionStorage
    const pendingUserId = sessionStorage.getItem('pendingUserId');
    const pendingEmail = sessionStorage.getItem('pendingEmail');

    if (!pendingUserId || !pendingEmail) {
      navigate('/'); // Redirect to login if no pending verification
    } else {
      setUserId(parseInt(pendingUserId));
      setUserEmail(pendingEmail);
    }
  }, [navigate]);

  // Timer effect
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setError('OTP expired. Please request a new one.');
    }
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    setOtpCode(value);
    setError('');
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a 6-digit code');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/verify-login-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          otpCode: otpCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('✅ Login successful!');
        // Store token and user info in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('role', data.user.role);
        localStorage.setItem('fullName', data.user.fullName);
        localStorage.setItem('userId', data.user.id);

        // Clear sessionStorage
        sessionStorage.removeItem('pendingUserId');
        sessionStorage.removeItem('pendingEmail');

        // Redirect based on user role
        const redirectPath = data.user.role === 'admin' ? '/admin' : '/dashboard';
        setTimeout(() => navigate(redirectPath), 1000);
      } else {
        setError(data.message || 'Invalid OTP code');
      }
    } catch (err) {
      setError('Error verifying OTP: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE}/auth/resend-login-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userId }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('New OTP code sent to your email!');
        setOtpCode('');
        setTimer(900); // Reset to 15 minutes
      } else {
        setError(data.message || 'Failed to resend OTP');
      }
    } catch (err) {
      setError('Error resending OTP: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-login-otp-container">
      <div className="verify-login-otp-card">
        <div className="verify-login-otp-header">
          <h2>Two-Factor Authentication</h2>
          <p>Enter the code sent to your email</p>
        </div>

        <div className="verify-login-otp-email">
          <p>Code sent to: <strong>{userEmail}</strong></p>
        </div>

        {error && <div className="verify-login-otp-error">{error}</div>}
        {success && <div className="verify-login-otp-success">{success}</div>}

        <form onSubmit={handleVerifyOtp} className="verify-login-otp-form">
          <div className="verify-login-otp-input-group">
            <label htmlFor="otpCode">Verification Code</label>
            <input
              id="otpCode"
              type="text"
              value={otpCode}
              onChange={handleOtpChange}
              placeholder="000000"
              maxLength="6"
              className="verify-login-otp-input"
              disabled={loading || timer === 0}
            />
            <small className="verify-login-otp-hint">Enter the 6-digit code</small>
          </div>

          <div className="verify-login-otp-timer">
            <p>Code expires in: <strong>{formatTime(timer)}</strong></p>
          </div>

          <button
            type="submit"
            className="verify-login-otp-btn"
            disabled={loading || timer === 0}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        <div className="verify-login-otp-resend">
          <p>Did not receive the code?</p>
          <button
            type="button"
            className="verify-login-otp-resend-btn"
            onClick={handleResendOtp}
            disabled={loading}
          >
            Resend Code
          </button>
        </div>

        <div className="verify-login-otp-divider"></div>

        <button
          type="button"
          className="verify-login-otp-back-btn"
          onClick={() => {
            sessionStorage.removeItem('pendingUserId');
            sessionStorage.removeItem('pendingEmail');
            navigate('/');
          }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default VerifyLoginOtpPage;
