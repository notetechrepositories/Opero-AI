import React, { useState, useEffect } from "react";
import axios from "axios";

function TicketList() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [statusFilter, setStatusFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [companyFilter, setCompanyFilter] = useState("");
    const [branchFilter, setBranchFilter] = useState("");

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

    const handleStatusChange = (e) => setStatusFilter(e.target.value);
    const handlePriorityChange = (e) => setPriorityFilter(e.target.value);
    const handleCompanyChange = (e) => {
        setCompanyFilter(e.target.value);
        setBranchFilter(""); // reset branch when company changes
    };
    const handleBranchChange = (e) => setBranchFilter(e.target.value);

    return (
        <div className="app-container dashboard-page ticket-list-page">
            <h2 className="title">My Issues</h2>
            <p className="subtitle">View and filter all submitted support requests.</p>

            {/* Filters Bar */}
            <div className="filters-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                <div className="filter-group">
                    <label className="filter-label">Company</label>
                    <select
                        className="form-control filter-select"
                        value={companyFilter}
                        onChange={handleCompanyChange}
                    >
                        <option value="">All Companies</option>
                        {companies.map(c => (
                            <option key={c.company_code || c.id} value={c.company_code || c.id}>
                                {c.company_name || c.name || c.company_code}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Branch</label>
                    <select
                        className="form-control filter-select"
                        value={branchFilter}
                        onChange={handleBranchChange}
                        disabled={!companyFilter}
                    >
                        <option value="">All Branches</option>
                        {branches.map(b => (
                            <option key={b.branch_code || b.id} value={b.branch_code || b.id}>
                                {b.branch_name || b.name || b.branch_code}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Filter by Status</label>
                    <select
                        className="form-control filter-select"
                        value={statusFilter}
                        onChange={handleStatusChange}
                    >
                        <option value="">All Statuses</option>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Filter by Priority</label>
                    <select
                        className="form-control filter-select"
                        value={priorityFilter}
                        onChange={handlePriorityChange}
                    >
                        <option value="">All Priorities</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loader-wrapper">
                    <div className="spinner" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}></div>
                </div>
            ) : (
                <div className="table-container">
                    <table className="ticket-table">
                        <thead>
                            <tr>
                                <th>Ticket ID</th>
                                <th>Company</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.length > 0 ? (
                                tickets.map((ticket) => (
                                    <tr key={ticket._id}>
                                        <td className="ticket-id" title={ticket._id}>{ticket._id.substring(0, 8)}...</td>
                                        <td>{ticket.company_id}</td>
                                        <td>{ticket.category || "Uncategorized"}</td>
                                        <td>
                                            <span className={`badge status-badge ${(ticket.status || "Unassigned").toLowerCase().replace(" ", "-")}`}>
                                                {ticket.status || "Unassigned"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge priority-badge ${(ticket.priority || "Unassigned").toLowerCase()}`}>
                                                {ticket.priority || "Unassigned"}
                                            </span>
                                        </td>
                                        <td className="date-col">
                                            {new Date(ticket.created_at).toLocaleDateString(undefined, {
                                                month: 'short', day: 'numeric', year: 'numeric'
                                            })}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="empty-state">No tickets found matching your criteria.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default TicketList;
