import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function CompanyList() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const navigate = useNavigate();

    useEffect(() => {
        const fetchCompanies = async () => {
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

        fetchCompanies();
    }, []);

    // Reset pagination when searching
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Derived state for filtering and pagination
    const filteredCompanies = companies.filter(company =>
        (company.company_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (company.company_code || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredCompanies.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    if (loading) return (
        <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <div className="spinner" style={{ borderColor: '#3b82f6', borderTopColor: 'transparent', margin: 'auto' }}></div>
        </div>
    );

    if (error) return (
        <div className="app-container" style={{ color: 'red', textAlign: 'center', padding: '40px' }}>
            <span style={{ fontSize: '40px', display: 'block', marginBottom: '16px' }}>⚠️</span>
            {error}
        </div>
    );

    return (
        <div className="app-container dashboard-page ticket-list-page" style={{ maxWidth: '1000px', backgroundColor: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
            {/* Header Section */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div>
                    <h2 className="title" style={{ margin: 0, fontSize: '28px', background: 'linear-gradient(135deg, #1E293B, #475569)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Connected Companies
                    </h2>
                    <p className="subtitle" style={{ margin: '8px 0 0 0', fontSize: '15px' }}>
                        Manage corporate clients and view branch analytics.
                    </p>
                </div>

                <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '12px', color: '#94A3B8' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Search companies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-control"
                        style={{ paddingLeft: '40px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #E2E8F0' }}
                    />
                </div>
            </div>

            {/* Table Section */}
            <div className="table-container" style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
                <table className="ticket-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                            <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748B', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</th>
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
                                                borderRadius: '8px',
                                                background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                color: '#4F46E5',
                                                fontWeight: '600',
                                                fontSize: '14px',
                                            }}>
                                                {company.company_name ? company.company_name.substring(0, 1).toUpperCase() : 'C'}
                                            </div>
                                            <span style={{ fontWeight: '500', color: '#0F172A', fontSize: '15px' }}>
                                                {company.company_name}
                                            </span>
                                        </div>
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
                                        <button
                                            style={{
                                                background: 'transparent',
                                                border: '1px solid #E2E8F0',
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                color: '#4F46E5',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = '#EEF2FF';
                                                e.currentTarget.style.borderColor = '#C7D2FE';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.borderColor = '#E2E8F0';
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/companies/${company.company_code}`);
                                            }}
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>📭</div>
                                    <p style={{ margin: 0 }}>No companies matched your search.</p>
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
                                style={{
                                    padding: '6px 14px',
                                    border: '1px solid #E2E8F0',
                                    backgroundColor: currentPage === 1 ? '#F1F5F9' : 'white',
                                    color: currentPage === 1 ? '#94A3B8' : '#334155',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Previous
                            </button>

                            {Array.from({ length: totalPages }).map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => paginate(index + 1)}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        border: currentPage === index + 1 ? '1px solid #4F46E5' : '1px solid #E2E8F0',
                                        backgroundColor: currentPage === index + 1 ? '#EEF2FF' : 'white',
                                        color: currentPage === index + 1 ? '#4F46E5' : '#334155',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: currentPage === index + 1 ? '600' : '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {index + 1}
                                </button>
                            ))}

                            <button
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: '6px 14px',
                                    border: '1px solid #E2E8F0',
                                    backgroundColor: currentPage === totalPages ? '#F1F5F9' : 'white',
                                    color: currentPage === totalPages ? '#94A3B8' : '#334155',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CompanyList;
