import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Building2, AlertCircle, FileSearch, Plus, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function CompanyList() {
    const { user } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Create company state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({ name: "", industry: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const navigate = useNavigate();

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/companies");
            setCompanies(res.data);
        } catch (err) {
            console.error("Failed to fetch companies:", err);
            setError("Failed to load companies. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCompany = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError("");
        try {
            await axios.post("/api/companies", formData);
            setShowCreateModal(false);
            setFormData({ name: "", industry: "" });
            fetchCompanies(); // Refresh list
        } catch (err) {
            setSubmitError(err.response?.data?.detail || "Failed to create company");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Fetch the raw list of all companies on mount
    useEffect(() => {
        fetchCompanies();
    }, []);

    // Reset pagination when searching
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Derived state for filtering and pagination
    // Creates a new array displaying only the companies that match the search bar's text query
    const filteredCompanies = companies.filter(company =>
        (company.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (company.company_code || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredCompanies.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    if (loading) return (
        <div className="app-container dashboard-page ticket-list-page" style={{ maxWidth: '1000px' }}>
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">Companies</h1>
                    <p className="page-subtitle">Manage corporate clients and view branch analytics.</p>
                </div>
            </div>

            <div className="table-container" style={{ backgroundColor: 'white', borderRadius: '12px' }}>
                <table className="ticket-table" style={{ width: '100%' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#F8FAFC' }}>
                            <th style={{ padding: '16px 24px' }}>Company</th>
                            <th style={{ padding: '16px 24px' }}>Industry</th>
                            <th style={{ padding: '16px 24px' }}>Code</th>
                            <th style={{ padding: '16px 24px', textAlign: 'right' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <tr key={i}>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div className="skeleton skeleton-box" style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)' }}></div>
                                        <div className="skeleton skeleton-text" style={{ width: '120px', margin: 0 }}></div>
                                    </div>
                                </td>
                                <td style={{ padding: '16px 24px' }}><div className="skeleton skeleton-text" style={{ width: '80px', margin: 0 }}></div></td>
                                <td style={{ padding: '16px 24px' }}><div className="skeleton skeleton-text" style={{ width: '60px', margin: 0 }}></div></td>
                                <td style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end' }}>
                                    <div className="skeleton skeleton-box" style={{ width: '90px', height: '30px', margin: 0 }}></div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    if (error) return (
        <div className="app-container dashboard-page ticket-list-page" style={{ maxWidth: '1000px', backgroundColor: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
            <div className="state-container error">
                <AlertCircle className="state-icon" size={48} strokeWidth={1.5} />
                <div className="state-title">Unable to Load Companies</div>
                <div className="state-description">{error}</div>
            </div>
        </div>
    );

    return (
        <div className="app-container dashboard-page ticket-list-page" style={{ maxWidth: '1000px' }}>
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">Companies</h1>
                    <p className="page-subtitle">Manage corporate clients and view branch analytics.</p>
                </div>

                <div className="page-header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '280px' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtlest)', zIndex: 1, fontSize: '14px' }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Search companies..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="form-control"
                            style={{ paddingLeft: '36px', height: '36px', fontSize: '13px' }}
                        />
                    </div>
                    {user?.role === "SuperAdmin" && (
                        <button
                            className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '36px', padding: '0 16px', fontSize: '13px' }}
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus size={16} /> New Company
                        </button>
                    )}
                </div>
            </div>

            {/* Table Section */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="ticket-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                            <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748B', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</th>
                            <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748B', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Industry</th>
                            <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748B', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Code</th>
                            <th style={{ padding: '16px 24px', textAlign: 'right', color: '#64748B', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.length > 0 ? (
                            currentItems.map((company, index) => (
                                <tr
                                    key={index}
                                    style={{
                                        borderBottom: '1px solid #E2E8F0',
                                        transition: 'background-color 0.2s',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    onClick={() => navigate(`/companies/${company.company_code}`)}
                                >
                                    <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: 'var(--radius-sm)',
                                                background: 'var(--color-bg-sunken)',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                color: 'var(--color-text-subtle)',
                                                fontWeight: '600',
                                                fontSize: '14px',
                                            }}>
                                                {company.name ? company.name.substring(0, 1).toUpperCase() : 'C'}
                                            </div>
                                            <span style={{ fontWeight: '500', color: '#0F172A', fontSize: '15px' }}>
                                                {company.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                        <span style={{ fontWeight: '500', color: '#334155', fontSize: '14px' }}>
                                            {company.industry || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Not Specified</span>}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                        <span style={{
                                            backgroundColor: '#F1F5F9',
                                            color: '#475569',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            fontFamily: 'monospace'
                                        }}>
                                            {company.company_code}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', verticalAlign: 'middle' }}>
                                        <button className="btn-tertiary btn-sm" onClick={() => window.location.href = `/companies/${company.company_code}`}>View Details</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4}>
                                    <div className="state-container" style={{ margin: '24px', border: 'none' }}>
                                        <FileSearch className="state-icon" size={48} strokeWidth={1.5} />
                                        <div className="state-title">No Companies Found</div>
                                        <div className="state-description">We couldn't find any companies matching '{searchTerm}'. Try adjusting your search query.</div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div style={{
                        padding: '16px 24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#F8FAFC',
                        borderTop: '1px solid #E2E8F0'
                    }}>
                        <span style={{ fontSize: '13px', color: '#64748B' }}>
                            Showing <span style={{ fontWeight: '600', color: '#0F172A' }}>{indexOfFirstItem + 1}</span> to <span style={{ fontWeight: '600', color: '#0F172A' }}>{Math.min(indexOfLastItem, filteredCompanies.length)}</span> of <span style={{ fontWeight: '600', color: '#0F172A' }}>{filteredCompanies.length}</span> results
                        </span>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="btn-pagination"
                            >
                                Previous
                            </button>

                            {Array.from({ length: totalPages }).map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => paginate(index + 1)}
                                    className={`btn-pagination ${currentPage === index + 1 ? 'active' : ''}`}
                                    style={{ width: '32px' }}
                                >
                                    {index + 1}
                                </button>
                            ))}

                            <button
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="btn-pagination"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        background: 'white', borderRadius: '12px', width: '400px',
                        padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', color: '#0F172A' }}>Create New Company</h2>
                            <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {submitError && (
                            <div style={{ padding: '12px', backgroundColor: '#FEF2F2', color: '#B91C1C', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
                                {submitError}
                            </div>
                        )}

                        <form onSubmit={handleCreateCompany} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#334155', fontWeight: '500' }}>Company Name</label>
                                <input
                                    type="text" required className="form-control"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#334155', fontWeight: '500' }}>Industry</label>
                                <input
                                    type="text" required className="form-control"
                                    value={formData.industry}
                                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Creating...' : 'Create Company'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CompanyList;
