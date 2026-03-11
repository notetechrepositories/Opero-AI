import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

function CompanyDetails() {
    const { companyId } = useParams();
    const navigate = useNavigate();

    const [companyName, setCompanyName] = useState("");
    const [industry, setIndustry] = useState("");
    const [branches, setBranches] = useState([]);
    const [branchTokens, setBranchTokens] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedBranch, setExpandedBranch] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const compRes = await axios.get("/api/companies");
                const matchedCompany = compRes.data.find(c => c.company_code === companyId);
                if (matchedCompany) {
                    setCompanyName(matchedCompany.company_name);
                    setIndustry(matchedCompany.industry || "Not Specified");
                } else {
                    setCompanyName(companyId);
                    setIndustry("Not Specified");
                }

                const branchRes = await axios.get(`/api/branches?company_code=${companyId}`);
                const fetchedBranches = branchRes.data;
                console.log(fetchedBranches);

                setBranches(fetchedBranches);

                // ==========================================
                // SECURE QR TOKEN FETCHING:
                // Instead of putting raw IDs in the URL, we ask the backend
                // to generate a signed token for EVERY branch retrieved.
                // ==========================================
                const tokenPromises = fetchedBranches.map(async (branch) => {
                    try {
                        // Request a secure token for this specific branch
                        const tokenRes = await axios.post('/api/generate-qr-token', {
                            company_id: companyId,
                            branch_id: branch.branch_code
                        });
                        return { branchCode: branch.branch_code, token: tokenRes.data.token };
                    } catch (err) {
                        console.error(`Failed to fetch token for branch ${branch.branch_code}:`, err);
                        return { branchCode: branch.branch_code, token: null };
                    }
                });

                // Wait for all token requests to finish concurrently
                const tokens = await Promise.all(tokenPromises);

                // Map the tokens back to their respective branch codes locally
                const tokenMap = {};
                tokens.forEach(t => {
                    if (t.token) tokenMap[t.branchCode] = t.token;
                });

                // Store the parsed tokens in React state for rendering
                setBranchTokens(tokenMap);

            } catch (err) {
                console.error("Failed to fetch company details:", err);
                setError("Failed to load company details or branches. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [companyId]);

    const toggleAccordion = (index) => {
        setExpandedBranch((prev) => (prev === index ? null : index));
    };

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
        <div className="app-container" style={{ maxWidth: '900px', backgroundColor: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
            {/* Header Section */}
            <div style={{
                background: 'linear-gradient(135deg, #1E293B, #0F172A)',
                borderRadius: '16px',
                padding: '32px',
                marginBottom: '32px',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -2px rgba(15, 23, 42, 0.05)'
            }}>
                {/* Decorative Elements */}
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0) 70%)', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', bottom: '-40px', left: '20%', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, rgba(6,182,212,0) 70%)', borderRadius: '50%' }}></div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', position: 'relative', zIndex: 1 }}>
                    <button
                        onClick={() => navigate('/companies')}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white',
                            borderRadius: '8px',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flexShrink: 0
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateX(-2px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                    >
                        ←
                    </button>
                    <div style={{ width: '100%', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', letterSpacing: '-0.02em', color: 'white' }}>
                                Company Details
                            </h2>
                            <span style={{
                                background: 'rgba(79, 70, 229, 0.2)',
                                color: '#A5B4FC',
                                padding: '4px 12px',
                                borderRadius: '999px',
                                fontSize: '13px',
                                fontWeight: '600',
                                border: '1px solid rgba(79, 70, 229, 0.3)'
                            }}>
                                {companyId}
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ color: '#94A3B8', fontSize: '14px', width: '140px', fontWeight: '500' }}>Company Name:</span>
                                <strong style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>{companyName}</strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ color: '#94A3B8', fontSize: '14px', width: '140px', fontWeight: '500' }}>Industry:</span>
                                <strong style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>{industry}</strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ color: '#94A3B8', fontSize: '14px', width: '140px', fontWeight: '500' }}>Total Branches:</span>
                                <strong style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>{branches.length}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Branches List */}
            <div style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#0F172A', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#4F46E5' }}>🏢</span> Organizational Branches
                    </h3>
                </div>

                {branches.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>📭</div>
                        <p style={{ margin: 0 }}>No branches configured for this company yet.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {branches.map((branch, index) => {
                            const isExpanded = expandedBranch === index;
                            const baseUrl = window.location.origin;
                            const secureToken = branchTokens[branch.branch_code];
                            const qrPayload = secureToken ? `${baseUrl}/raise-ticket?token=${secureToken}` : `${baseUrl}/raise-ticket?error=token_missing`;

                            return (
                                <div key={index} style={{
                                    border: isExpanded ? '1px solid #818CF8' : '1px solid #E2E8F0',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    backgroundColor: isExpanded ? '#FFFFFF' : '#F8FAFC',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: isExpanded ? '0 10px 15px -3px rgba(79, 70, 229, 0.1), 0 4px 6px -2px rgba(79, 70, 229, 0.05)' : 'none',
                                    transform: isExpanded ? 'translateY(-2px)' : 'none'
                                }}>
                                    {/* Accordion Header */}
                                    <div
                                        onClick={() => toggleAccordion(index)}
                                        style={{
                                            padding: '20px 24px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: isExpanded ? '#FFFFFF' : 'transparent',
                                            transition: 'background-color 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                                        onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                background: isExpanded ? 'linear-gradient(135deg, #4F46E5, #06B6D4)' : '#E2E8F0',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                color: isExpanded ? 'white' : '#64748B',
                                                transition: 'all 0.3s ease'
                                            }}>
                                                📍
                                            </div>
                                            <div>
                                                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: isExpanded ? '#1E293B' : '#334155' }}>
                                                    {branch.branch_name}
                                                </h4>
                                                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>
                                                    {branch.name}
                                                    <br />
                                                    Code: {branch.branch_code}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            border: '1px solid #E2E8F0',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            color: '#64748B',
                                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s',
                                            backgroundColor: isExpanded ? '#F1F5F9' : 'transparent'
                                        }}>
                                            ▼
                                        </div>
                                    </div>

                                    {/* Accordion Body */}
                                    <div style={{
                                        maxHeight: isExpanded ? '500px' : '0px',
                                        opacity: isExpanded ? 1 : 0,
                                        overflow: 'hidden',
                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}>
                                        <div style={{
                                            padding: '0 24px 24px 24px',
                                            display: 'grid',
                                            gridTemplateColumns: '1fr auto',
                                            gap: '32px',
                                            alignItems: 'start'
                                        }}>
                                            {/* Details Section */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                                                <div>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                                                        <span style={{ color: '#4F46E5' }}>●</span> Branch Location
                                                    </span>
                                                    <p style={{ margin: 0, color: '#0F172A', fontSize: '15px', lineHeight: '1.5', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                                        {branch.location || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>No location provided</span>}
                                                    </p>
                                                </div>
                                                {/* <div>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                                                        <span style={{ color: '#06B6D4' }}>●</span> Contact Number
                                                    </span>
                                                    <p style={{ margin: 0, color: '#0F172A', fontSize: '15px', fontWeight: '500' }}>
                                                        {branch.phone || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>N/A</span>}
                                                    </p>
                                                </div> */}
                                            </div>

                                            {/* QR Code Card */}
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                padding: '20px',
                                                background: 'linear-gradient(to bottom, #FFFFFF, #F8FAFC)',
                                                borderRadius: '16px',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), inset 0 2px 4px rgba(255,255,255,1)',
                                                border: '1px solid #E2E8F0',
                                                marginTop: '16px'
                                            }}>
                                                <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                                                    <span style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1E293B', marginBottom: '4px' }}>Scan for Branch</span>
                                                    {/* <span style={{ display: 'block', fontSize: '12px', color: '#64748B' }}>Device Registration</span> */}
                                                </div>
                                                <div style={{
                                                    padding: '12px',
                                                    background: 'white',
                                                    borderRadius: '12px',
                                                    border: '1px solid #E2E8F0',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                }}>
                                                    <QRCodeSVG value={qrPayload} size={130} level="M" />
                                                </div>
                                                {/* <div style={{
                                                    marginTop: '16px',
                                                    background: '#EEF2FF',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    width: '100%',
                                                    boxSizing: 'border-box'
                                                }}>
                                                    <span style={{ display: 'block', fontSize: '10px', color: '#4F46E5', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>Payload Data</span>
                                                    <span style={{ display: 'block', fontSize: '11px', color: '#312E81', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: '1.4' }}>
                                                        {qrPayload}
                                                    </span>
                                                </div> */}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default CompanyDetails;
