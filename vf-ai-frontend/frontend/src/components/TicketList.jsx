import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Inbox } from "lucide-react";

function TicketList() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lightboxImage, setLightboxImage] = useState(null);

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [companyFilter, setCompanyFilter] = useState(user?.role !== "SuperAdmin" ? user?.company_id : "");
    const [branchFilter, setBranchFilter] = useState(user?.role === "Staff" ? user?.branch_id : "");

    // Dropdown options
    const [companies, setCompanies] = useState([]);
    const [branches, setBranches] = useState([]);

    useEffect(() => {
        // Fetch companies on mount
        axios.get("/api/companies").then(res => setCompanies(res.data)).catch(err => console.error(err));
    }, []);

    useEffect(() => {
        // Fetch branches when company changes
        if (companyFilter) {
            axios.get(`/api/branches?company_code=${companyFilter}`)
                .then(res => setBranches(res.data))
                .catch(err => console.error(err));
        } else {
            setBranches([]);
        }
    }, [companyFilter]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            // Build query string based on filters
            const params = new URLSearchParams();
            if (statusFilter) params.append("status", statusFilter);
            if (priorityFilter) params.append("priority", priorityFilter);
            if (companyFilter) params.append("company_id", companyFilter);
            if (branchFilter) params.append("branch_id", branchFilter);

            const endpoint = `/api/tickets${params.toString() ? `?${params.toString()}` : ""}`;
            const res = await axios.get(endpoint);
            setTickets(res.data);
        } catch (err) {
            console.error("Failed to load tickets", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [statusFilter, priorityFilter, companyFilter, branchFilter]);

    const handleSearchChange = (e) => setSearchQuery(e.target.value);
    const handleStatusChange = (e) => setStatusFilter(e.target.value);
    const handlePriorityChange = (e) => setPriorityFilter(e.target.value);
    const handleCompanyChange = (e) => {
        setCompanyFilter(e.target.value);
        setBranchFilter(""); // reset branch when company changes
    };
    const handleBranchChange = (e) => setBranchFilter(e.target.value);

    // Client-side search for simplicity since we don't have a backend text search endpoint yet
    const filteredTickets = tickets.filter(t => {
        const query = searchQuery.toLowerCase();
        return (
            (t.summary && t.summary.toLowerCase().includes(query)) ||
            (t.message && t.message.toLowerCase().includes(query)) ||
            (t._id && t._id.toLowerCase().includes(query))
        );
    });

    return (
        <div className="app-container dashboard-page ticket-list-page" style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">My Issues</h1>
                    <p className="page-subtitle">View and filter all submitted support requests.</p>
                </div>
                <div className="page-header-actions">
                    <button
                        className="btn-secondary btn-sm"
                        onClick={fetchTickets}
                        disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        Refresh Data
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: '32px' }}></div> {/* Spacer */}
            <div className="filters-bar" style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '24px',
                alignItems: 'center'
            }}>
                <div style={{ flex: '1 1 200px', position: 'relative' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input
                        type="text"
                        placeholder="Search tickets..."
                        className="form-control"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        style={{ height: '36px', paddingLeft: '36px', width: '100%', fontSize: '13px' }}
                    />
                </div>

                <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', margin: '0 4px' }}></div>

                <select
                    className="form-control"
                    value={companyFilter}
                    onChange={handleCompanyChange}
                    style={{ height: '36px', width: 'auto', minWidth: '140px', fontSize: '13px', paddingTop: '0', paddingBottom: '0' }}
                    disabled={user?.role !== "SuperAdmin"}
                >
                    {user?.role === "SuperAdmin" && <option value="">All Companies</option>}
                    {companies.map(c => <option key={c.company_code || c.id} value={c.company_code || c.id}>{c.company_name || c.name || c.company_code}</option>)}
                </select>

                <select
                    className="form-control"
                    value={branchFilter}
                    onChange={handleBranchChange}
                    disabled={user?.role === "Staff" || !companyFilter}
                    style={{ height: '36px', width: 'auto', minWidth: '140px', fontSize: '13px', paddingTop: '0', paddingBottom: '0' }}
                >
                    {user?.role !== "Staff" && <option value="">All Branches</option>}
                    {branches.map(b => <option key={b.branch_code || b.id} value={b.branch_code || b.id}>{b.branch_name || b.name || b.branch_code}</option>)}
                </select>

                <select className="form-control" value={statusFilter} onChange={handleStatusChange} style={{ height: '36px', width: 'auto', minWidth: '140px', fontSize: '13px', paddingTop: '0', paddingBottom: '0' }}>
                    <option value="">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                </select>

                <select className="form-control" value={priorityFilter} onChange={handlePriorityChange} style={{ height: '36px', width: 'auto', minWidth: '140px', fontSize: '13px', paddingTop: '0', paddingBottom: '0' }}>
                    <option value="">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                </select>
            </div>

            {loading ? (
                <div className="table-container" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <table className="ticket-table" style={{ fontSize: '13px' }}>
                        <thead>
                            <tr>
                                <th>Ticket ID</th>
                                <th>Summary</th>
                                <th>Company</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Image</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <tr key={i}>
                                    <td style={{ padding: '8px 16px' }}><div className="skeleton skeleton-text" style={{ width: '60px', margin: 0, height: '14px' }}></div></td>
                                    <td style={{ padding: '8px 16px' }}><div className="skeleton skeleton-text" style={{ width: '50%', margin: 0, height: '14px' }}></div></td>
                                    <td style={{ padding: '8px 16px' }}><div className="skeleton skeleton-text" style={{ width: '80px', margin: 0, height: '14px' }}></div></td>
                                    <td style={{ padding: '8px 16px' }}><div className="skeleton skeleton-text" style={{ width: '90px', margin: 0, height: '14px' }}></div></td>
                                    <td style={{ padding: '8px 16px' }}><div className="skeleton skeleton-text" style={{ width: '70px', margin: 0, height: '20px', borderRadius: '4px' }}></div></td>
                                    <td style={{ padding: '8px 16px' }}><div className="skeleton skeleton-text" style={{ width: '60px', margin: 0, height: '20px', borderRadius: '4px' }}></div></td>
                                    <td style={{ padding: '8px 16px' }}><div className="skeleton skeleton-text" style={{ width: '44px', height: '36px', margin: 0, borderRadius: '4px' }}></div></td>
                                    <td style={{ padding: '8px 16px' }}><div className="skeleton skeleton-text" style={{ width: '70px', margin: 0, height: '14px' }}></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="table-container" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <table className="ticket-table" style={{ fontSize: '13px' }}>
                        <thead>
                            <tr>
                                <th>Ticket ID</th>
                                <th>Summary</th>
                                <th>Company</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Image</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTickets.length > 0 ? (
                                filteredTickets.map((ticket) => (
                                    <tr key={ticket._id}>
                                        <td className="ticket-id" title={ticket._id} style={{ padding: '10px 16px', color: 'var(--color-primary)', fontWeight: '500' }}>
                                            {ticket._id.substring(0, 8).toUpperCase()}
                                        </td>
                                        <td style={{ padding: '10px 16px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>
                                            {ticket.summary || ticket.message || "No Summary"}
                                        </td>
                                        <td style={{ padding: '10px 16px', color: 'var(--color-text-subtle)' }}>{ticket.company_id}</td>
                                        <td style={{ padding: '10px 16px' }}>{ticket.category || "-"}</td>
                                        <td style={{ padding: '10px 16px' }}>
                                            <span className={`badge status-badge ${(ticket.status || "Unassigned").toLowerCase().replace(" ", "-")}`}>
                                                {ticket.status || "Unassigned"}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 16px' }}>
                                            <span className={`badge priority-badge ${(ticket.priority || "Unassigned").toLowerCase()}`}>
                                                {ticket.priority || "Unassigned"}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 16px' }}>
                                            {ticket.image_url ? (
                                                <img
                                                    src={ticket.image_url}
                                                    alt="ticket"
                                                    title="Click to enlarge"
                                                    onClick={() => setLightboxImage(ticket.image_url)}
                                                    style={{
                                                        width: '48px',
                                                        height: '36px',
                                                        objectFit: 'cover',
                                                        borderRadius: '4px',
                                                        border: '1px solid var(--color-border)',
                                                        cursor: 'zoom-in',
                                                        display: 'block'
                                                    }}
                                                />
                                            ) : (
                                                <span style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>—</span>
                                            )}
                                        </td>
                                        <td className="date-col" style={{ padding: '10px 16px', color: 'var(--color-text-subtle)' }}>
                                            {new Date(ticket.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8">
                                        <div className="state-container" style={{ margin: '48px auto', border: 'none', maxWidth: '400px' }}>
                                            <div style={{ background: 'var(--color-bg-sunken)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                                <Inbox className="state-icon" size={32} strokeWidth={1.5} style={{ margin: 0, color: 'var(--color-text-subtle)' }} />
                                            </div>
                                            <div className="state-title" style={{ fontSize: '16px', marginBottom: '8px' }}>No issues found</div>
                                            <div className="state-description" style={{ fontSize: '14px' }}>We couldn't find any tickets matching your current search or filter criteria. Please try adjusting them.</div>
                                            {(searchQuery || statusFilter || priorityFilter || companyFilter || branchFilter) && (
                                                <button
                                                    className="btn-tertiary btn-sm"
                                                    style={{ marginTop: '16px' }}
                                                    onClick={() => {
                                                        setSearchQuery("");
                                                        setStatusFilter("");
                                                        setPriorityFilter("");
                                                        setCompanyFilter("");
                                                        setBranchFilter("");
                                                    }}
                                                >
                                                    Clear All Filters
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Image dialog popup */}
            {lightboxImage && (
                <div
                    onClick={() => setLightboxImage(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.55)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'var(--color-bg-surface, #1e293b)',
                            borderRadius: '12px',
                            boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
                            padding: '16px',
                            maxWidth: '480px',
                            width: '90%',
                            position: 'relative'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text, #f1f5f9)' }}>Issue Image</span>
                            <button
                                onClick={() => setLightboxImage(null)}
                                style={{
                                    background: 'var(--color-bg-sunken, rgba(255,255,255,0.08))',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--color-text-subtle, #94a3b8)',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    lineHeight: 1
                                }}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>
                        <img
                            src={lightboxImage}
                            alt="Issue"
                            style={{
                                width: '100%',
                                maxHeight: '340px',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
                                display: 'block'
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default TicketList;
