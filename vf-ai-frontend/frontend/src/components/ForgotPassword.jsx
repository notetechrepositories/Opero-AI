import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setSubmitting(true);
    try {
      const res = await axios.post("/api/auth/request-password-reset", { email });
      setMessage(res.data?.message || "If your account exists, a reset link has been sent.");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to request password reset.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box app-container">
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div className="sidebar-logo" style={{ margin: "0 auto 16px auto", width: "48px", height: "48px", fontSize: "20px" }}>
            VF
          </div>
          <h2 className="title" style={{ fontSize: "24px" }}>Forgot password</h2>
          <p className="subtitle" style={{ marginBottom: 0 }}>Enter your email and we’ll send a reset link.</p>
        </div>

        {message && (
          <div style={{ color: "var(--success)", background: "#ECFDF5", padding: "12px", borderRadius: "6px", fontSize: "14px", marginBottom: "16px", textAlign: "center" }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{ color: "var(--error)", background: "#FEF2F2", padding: "12px", borderRadius: "6px", fontSize: "14px", marginBottom: "16px", textAlign: "center" }}>
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group full-width">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              className="form-control"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button type="submit" className="btn-submit" disabled={submitting} style={{ marginTop: "16px" }}>
            {submitting ? <div className="spinner"></div> : "Send reset link"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "24px", fontSize: "14px" }}>
          <Link to="/login" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: "500" }}>
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

