import React, { useMemo, useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ResetPassword() {
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("Missing reset token. Please use the link from your email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post("/api/auth/reset-password", { token, new_password: password });
      setMessage(res.data?.message || "Password updated successfully.");
      setTimeout(() => navigate("/login"), 900);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reset password.");
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
          <h2 className="title" style={{ fontSize: "24px" }}>Reset password</h2>
          <p className="subtitle" style={{ marginBottom: 0 }}>Choose a new password for your account.</p>
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
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group full-width">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-control"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-submit" disabled={submitting} style={{ marginTop: "16px" }}>
            {submitting ? <div className="spinner"></div> : "Update password"}
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

