import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

function UserManagement() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [selectedRole, setSelectedRole] = useState(user?.role === "CompanyAdmin" ? "Staff" : "CompanyAdmin");
    const [companyId, setCompanyId] = useState(user?.company_id || "");
    const [branchId, setBranchId] = useState("");

    // Dropdown Data
    const [companies, setCompanies] = useState([]);
    const [branches, setBranches] = useState([]);

    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/users");
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        // Load companies for the dropdown
        axios.get("/api/companies").then(res => setCompanies(res.data)).catch(console.error);
    }, []);

    // Load branches dynamically when companyId changes
    useEffect(() => {
        if (companyId) {
            axios.get(`/api/branches?company_code=${companyId}`)
                .then(res => setBranches(res.data))
                .catch(console.error);
        } else {
            setBranches([]);
        }
    }, [companyId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        setError(null);

        const payload = {
            email,
            password,
            role: selectedRole,
            company_id: companyId || null,
            branch_id: branchId || null
        };

        try {
            await axios.post("/api/users", payload);
            setMessage("User created successfully!");
            // Reset form
            setEmail("");
            setPassword("");
            if (user?.role !== "CompanyAdmin") {
                setCompanyId("");
            }
            setBranchId("");

            // Reload table
            fetchUsers();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to create user.");
        }
    };

    return (
        <div className="app-container dashboard-page">
            <h2 className="title">User Management</h2>
            <p className="subtitle">Manage system access, roles, and branch assignments.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '24px', marginTop: '24px' }}>

                {/* Create User Form Box */}
                <div className="card" style={{ padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Create New User</h3>

                    {message && <div style={{ color: 'var(--success)', background: '#ECFDF5', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>{message}</div>}
                    {error && <div style={{ color: 'var(--error)', background: '#FEF2F2', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="form-group full-width">
                            <label className="form-label">Email Address</label>
                            <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>

                        <div className="form-group full-width">
                            <label className="form-label">Password</label>
                            <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>

                        <div className="form-group full-width">
                            <label className="form-label">Role</label>
                            <select className="form-control" value={selectedRole} onChange={e => setSelectedRole(e.target.value)} required>
                                {user?.role === "SuperAdmin" && <option value="SuperAdmin">SuperAdmin</option>}
                                {user?.role === "SuperAdmin" && <option value="CompanyAdmin">CompanyAdmin</option>}
                                <option value="Staff">Staff</option>
                            </select>
                        </div>

                        {(selectedRole === "CompanyAdmin" || selectedRole === "Staff") && (
                            <div className="form-group full-width">
                                <label className="form-label">Assign Company</label>
                                <select
                                    className="form-control"
                                    value={companyId}
                                    onChange={e => { setCompanyId(e.target.value); setBranchId(""); }}
                                    required
                                    disabled={user?.role === "CompanyAdmin"}
                                >
                                    <option value="">Select Company...</option>
                                    {companies.map(c => (
                                        <option key={c.company_code || c.id} value={c.company_code || c.id}>
                                            {c.company_name || c.name || c.company_code}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {selectedRole === "Staff" && (
                            <div className="form-group full-width">
                                <label className="form-label">Assign Branch (Optional)</label>
                                <select
                                    className="form-control"
                                    value={branchId}
                                    onChange={e => setBranchId(e.target.value)}
                                    disabled={!companyId}
                                >
                                    <option value="">All Branches</option>
                                    {branches.map(b => (
                                        <option key={b.branch_code || b.id} value={b.branch_code || b.id}>
                                            {b.branch_name || b.name || b.branch_code}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button type="submit" className="btn-submit" style={{ marginTop: '8px' }}>Create Account</button>
                    </form>
                </div>

                {/* Users Table */}
                <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Existing Accounts</h3>

                    {loading ? (
                        <div className="spinner" style={{ margin: 'auto', borderColor: 'var(--primary)', borderTopColor: 'transparent' }}></div>
                    ) : (
                        <div className="table-container" style={{ margin: 0, border: 'none' }}>
                            <table className="ticket-table" style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th>Email Address</th>
                                        <th>Role</th>
                                        <th>Company</th>
                                        <th>Branch</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length > 0 ? (
                                        users.map(u => (
                                            <tr key={u.id}>
                                                <td style={{ fontWeight: '600' }}>{u.email}</td>
                                                <td><span className={`badge priority-badge ${u.role === 'SuperAdmin' ? 'high' : u.role === 'CompanyAdmin' ? 'medium' : 'low'}`}>{u.role}</span></td>
                                                <td><span style={{ color: "var(--text-muted)" }}>{u.company_id || "-"}</span></td>
                                                <td><span style={{ color: "var(--text-muted)" }}>{u.branch_id || "-"}</span></td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No users found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default UserManagement;
