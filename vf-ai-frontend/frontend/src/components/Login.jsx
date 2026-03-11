import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Link } from "react-router-dom";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        // The backend FastAPI OAuth2 explicitly expects a field called 'username', even though we use email
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        try {
            const response = await axios.post("/api/auth/login", formData, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            });

            const { access_token, user } = response.data;
            login(access_token, user);

            if (user.role === "Staff") {
                navigate("/tickets"); // Staff cannot view the dashboard
            } else {
                navigate("/");
            }
        } catch (err) {
            console.error("Login Error", err);
            setError("Invalid email or password");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box app-container">
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div className="sidebar-logo" style={{ margin: '0 auto 16px auto', width: '48px', height: '48px', fontSize: '20px' }}>VF</div>
                    <h2 className="title" style={{ fontSize: '24px' }}>Welcome Back</h2>
                    <p className="subtitle" style={{ marginBottom: 0 }}>Log in to access your VF AI Desk</p>
                </div>

                {error && <div style={{ color: 'var(--error)', background: '#FEF2F2', padding: '12px', borderRadius: '6px', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
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
                    <div className="form-group full-width">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-submit" disabled={isSubmitting} style={{ marginTop: '24px' }}>
                        {isSubmitting ? (
                            <div className="spinner"></div>
                        ) : "Sign In"}
                    </button>
                </form>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '14px' }}>
                    <Link to="/forgot-password" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>
                        Forgot password?
                    </Link>
                    <Link to="/raise-ticket" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>
                        Back to Raise Ticket →
                    </Link>
                </div>
            </div>

            <style jsx>{`
                .login-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    width: 100vw;
                    background-color: var(--sidebar-bg);
                }
                .login-box {
                    width: 100%;
                    max-width: 400px;
                    background: var(--card-bg);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }
            `}</style>
        </div>
    );
};

export default Login;
