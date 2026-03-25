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

    const handleDeleteUser = async (userId, email) => {
        if (!window.confirm(`Are you sure you want to delete user ${email}?`)) return;
        try {
            await axios.delete(`/api/users/${userId}`);
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Failed to delete user.");
        }
    };

    const handleChangePassword = async (userId, email) => {
        const newPassword = window.prompt(`Enter new password for ${email}:`);
        if (!newPassword) return;
        try {
            await axios.put(`/api/users/${userId}/password`, { new_password: newPassword });
            alert("Password updated successfully.");
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Failed to update password.");
        }
    };

    return (
        <div className="app-container dashboard-page">
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">Manage system access, roles, and branch assignments.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2fr', gap: '32px', marginTop: '24px' }}>

                {/* Create User Form Box */}
                <div className="card">
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Create New User</h3>

                    {message && <div style={{ color: 'var(--color-success-text)', background: 'var(--color-success-bg)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '13px', marginBottom: '16px' }}>{message}</div>}
                    {error && <div style={{ color: 'var(--color-danger-text)', background: 'var(--color-danger-bg)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

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

                        <button type="submit" className="btn-primary btn-md" style={{ marginTop: '16px' }}>Create Account</button>
                    </form>
                </div>

                {/* Users Table */}
                <div className="card">
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Existing Accounts</h3>

                    {loading ? (
                        <div className="spinner" style={{ margin: 'auto', borderColor: 'var(--color-brand)', borderTopColor: 'transparent' }}></div>
                    ) : (
                        <div className="table-container" style={{ margin: 0, border: 'none' }}>
                            <table className="ticket-table" style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th>Email Address</th>
                                        <th>Role</th>
                                        <th>Company</th>
                                        <th>Branch</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length > 0 ? (
                                        users.map(u => (
                                            <tr key={u.id}>
                                                <td style={{ fontWeight: '600' }}>{u.email}</td>
                                                <td><span className={`badge priority-badge ${u.role === 'SuperAdmin' ? 'high' : u.role === 'CompanyAdmin' ? 'medium' : 'low'}`}>{u.role}</span></td>
                                                <td><span style={{ color: "var(--color-text-subtle)" }}>{u.company_id || "-"}</span></td>
                                                <td><span style={{ color: "var(--color-text-subtle)" }}>{u.branch_id || "-"}</span></td>
                                                <td>
                                                    {(user?.role === "SuperAdmin" || (user?.role === "CompanyAdmin" && u.role === "Staff")) && (
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button onClick={() => handleChangePassword(u.id, u.email)} className="btn-tertiary btn-sm">Reset PW</button>
                                                            <button onClick={() => handleDeleteUser(u.id, u.email)} className="btn-destructive btn-sm">Delete</button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="5" className="empty-state">No users found.</td></tr>
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
