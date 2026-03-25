import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Plus, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function CompanyDetails() {
    const { companyId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth(); // Import user to check role

    const [companyName, setCompanyName] = useState("");
    const [industry, setIndustry] = useState("");
    const [branches, setBranches] = useState([]);
    const [branchTokens, setBranchTokens] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedBranch, setExpandedBranch] = useState(null);

    // Dynamic states for cascading data
    const [sectionsMap, setSectionsMap] = useState({});
    const [expandedSection, setExpandedSection] = useState(null);
    const [issueTypesMap, setIssueTypesMap] = useState({});

    // Modals
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [branchForm, setBranchForm] = useState({ name: '', location: '' });

    const [showSectionModal, setShowSectionModal] = useState(false);
    const [activeBranchForSection, setActiveBranchForSection] = useState(null);
    const [sectionForm, setSectionForm] = useState({ name: '' });

    const [showIssueTypeModal, setShowIssueTypeModal] = useState(false);
    const [activeSectionForIssue, setActiveSectionForIssue] = useState(null);
    const [issueTypeForm, setIssueTypeForm] = useState({ name: '' });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");

    const fetchBranchesOnly = async () => {
        try {
            const branchRes = await axios.get(`/api/branches?company_code=${companyId}`);
            const fetchedBranches = branchRes.data;
            setBranches(fetchedBranches);

            const tokenPromises = fetchedBranches.map(async (branch) => {
                try {
                    const tokenRes = await axios.post('/api/generate-qr-token', {
                        company_id: companyId,
                        branch_id: branch.branch_code
                    });
                    return { branchCode: branch.branch_code, token: tokenRes.data.token };
                } catch (err) {
                    return { branchCode: branch.branch_code, token: null };
                }
            });

            const tokens = await Promise.all(tokenPromises);
            const tokenMap = {};
            tokens.forEach(t => {
                if (t.token) tokenMap[t.branchCode] = t.token;
            });
            setBranchTokens(tokenMap);
        } catch (err) {
            console.error("Failed to fetch branches:", err);
        }
    };

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const compRes = await axios.get("/api/companies");
                const matchedCompany = compRes.data.find(c => c.company_code === companyId);
                if (matchedCompany) {
                    setCompanyName(matchedCompany.company_name || matchedCompany.name); // Using matching field
                    setIndustry(matchedCompany.industry || "Not Specified");
                } else {
                    setCompanyName(companyId);
                    setIndustry("Not Specified");
                }
                await fetchBranchesOnly();
            } catch (err) {
                console.error("Failed to fetch company details:", err);
                setError("Failed to load company details or branches. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [companyId]);

    const toggleAccordion = async (index) => {
        const isExpanding = expandedBranch !== index;
        setExpandedBranch((prev) => (prev === index ? null : index));

        if (isExpanding) {
            const branchCode = branches[index].branch_code;
            if (!sectionsMap[branchCode]) {
                await fetchSectionsForBranch(branchCode);
            }
        }
    };

    const fetchSectionsForBranch = async (branchCode) => {
        try {
            const res = await axios.get(`/api/sections?branch_code=${branchCode}`);
            setSectionsMap(prev => ({ ...prev, [branchCode]: res.data }));
        } catch (err) {
            console.error("Failed to fetch sections:", err);
        }
    };

    const toggleSectionAccordion = async (branchCode, sectionCode) => {
        const key = `${branchCode}-${sectionCode}`;
        const isExpanding = expandedSection !== key;
        setExpandedSection((prev) => (prev === key ? null : key));

        if (isExpanding) {
            if (!issueTypesMap[sectionCode]) {
                await fetchIssueTypesForSection(sectionCode);
            }
        }
    };

    const fetchIssueTypesForSection = async (sectionCode) => {
        try {
            const res = await axios.get(`/api/issue-types?section_code=${sectionCode}`);
            setIssueTypesMap(prev => ({ ...prev, [sectionCode]: res.data }));
        } catch (err) {
            console.error("Failed to fetch issue types:", err);
        }
    };

    // Form Handlers
    const handleCreateBranch = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError("");
        try {
            await axios.post("/api/branches", { ...branchForm, company_code: companyId });
            setShowBranchModal(false);
            setBranchForm({ name: '', location: '' });
            await fetchBranchesOnly();
        } catch (err) {
            setSubmitError(err.response?.data?.detail || "Failed to create branch");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateSection = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError("");
        try {
            await axios.post("/api/sections", { ...sectionForm, branch_code: activeBranchForSection });
            setShowSectionModal(false);
            setSectionForm({ name: '' });
            await fetchSectionsForBranch(activeBranchForSection);
        } catch (err) {
            setSubmitError(err.response?.data?.detail || "Failed to create section");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateIssueType = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError("");
        try {
            await axios.post("/api/issue-types", { ...issueTypeForm, section_code: activeSectionForIssue });
            setShowIssueTypeModal(false);
            setIssueTypeForm({ name: '' });
            await fetchIssueTypesForSection(activeSectionForIssue);
        } catch (err) {
            setSubmitError(err.response?.data?.detail || "Failed to create issue type");
        } finally {
            setIsSubmitting(false);
        }
    };


    if (loading) return (
        <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <div className="spinner" style={{ borderColor: 'var(--color-brand)', borderTopColor: 'transparent', margin: 'auto' }}></div>
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
                background: 'var(--color-bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                marginBottom: '24px',
                border: '1px solid var(--color-border)',
                position: 'relative',
                boxShadow: 'var(--shadow-raised)'
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', position: 'relative', zIndex: 1 }}>
                    <button
                        onClick={() => navigate('/companies')}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'black',  // fixed visibility issue from original
                            borderRadius: '8px',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            // ... button styles from original
                        }}
                    >
                        ←
                    </button>
                    <div style={{ width: '100%', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
                                Company Details
                            </h2>
                            <span style={{
                                background: 'rgba(79, 70, 229, 0.2)',
                                color: '#4F46E5', // improved visibility
                                padding: '4px 12px',
                                borderRadius: '999px',
                                fontSize: '13px',
                                fontWeight: '600'
                            }}>
                                {companyId}
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ color: '#94A3B8', fontSize: '14px', width: '140px', fontWeight: '500' }}>Company Name:</span>
                                <strong style={{ fontSize: '16px', fontWeight: '600' }}>{companyName}</strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ color: '#94A3B8', fontSize: '14px', width: '140px', fontWeight: '500' }}>Industry:</span>
                                <strong style={{ fontSize: '16px', fontWeight: '600' }}>{industry}</strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ color: '#94A3B8', fontSize: '14px', width: '140px', fontWeight: '500' }}>Total Branches:</span>
                                <strong style={{ fontSize: '16px', fontWeight: '600' }}>{branches.length}</strong>
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
                    {user?.role === "SuperAdmin" && (
                        <button
                            className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '36px', padding: '0 16px', fontSize: '14px' }}
                            onClick={() => setShowBranchModal(true)}
                        >
                            <Plus size={16} /> New Branch
                        </button>
                    )}
                </div>

                {branches.length === 0 ? (
                    <div className="empty-state" style={{ backgroundColor: 'var(--color-bg-sunken)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
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
                                    boxShadow: isExpanded ? '0 10px 15px -3px rgba(79, 70, 229, 0.1), 0 4px 6px -2px rgba(79, 70, 229, 0.05)' : 'none'
                                }}>
                                    <div
                                        onClick={() => toggleAccordion(index)}
                                        style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: isExpanded ? '#EEF2FF' : '#E2E8F0', display: 'flex', justifyContent: 'center', alignItems: 'center', color: isExpanded ? '#4F46E5' : '#64748B' }}>
                                                📍
                                            </div>
                                            <div>
                                                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: isExpanded ? '#1E293B' : '#334155' }}>
                                                    {branch.branch_name || branch.name}
                                                </h4>
                                                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>
                                                    Code: {branch.branch_code}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</div>
                                    </div>

                                    {/* Accordion Body */}
                                    {isExpanded && (
                                        <div style={{ padding: '0 24px 24px 24px', borderTop: '1px solid #F1F5F9', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '32px' }}>
                                                <div>
                                                    <span style={{ display: 'block', fontSize: '12px', color: '#64748B', textTransform: 'uppercase', fontWeight: '700', marginBottom: '8px' }}>Target Location</span>
                                                    <p style={{ margin: 0, color: '#0F172A', fontSize: '15px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                                        {branch.location || 'No location provided'}
                                                    </p>
                                                </div>

                                                {/* QR Code */}
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', background: 'linear-gradient(to bottom, #FFFFFF, #F8FAFC)', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Scan for Branch</span>
                                                    <div style={{ padding: '12px', background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                                        <QRCodeSVG value={qrPayload} size={130} level="M" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Sections UI */}
                                            <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: '24px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                    <h4 style={{ margin: 0, fontSize: '16px', color: '#0F172A', fontWeight: '600' }}>Sections in {branch.branch_code}</h4>
                                                    {user?.role === "SuperAdmin" && (
                                                        <button
                                                            className="btn-secondary btn-sm"
                                                            onClick={() => { setActiveBranchForSection(branch.branch_code); setShowSectionModal(true); }}
                                                        >
                                                            <Plus size={14} style={{ marginRight: '4px' }} /> Add Section
                                                        </button>
                                                    )}
                                                </div>

                                                {(sectionsMap[branch.branch_code] || []).length === 0 ? (
                                                    <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1', color: '#64748B', fontSize: '14px' }}>
                                                        No sections found.
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {sectionsMap[branch.branch_code].map((section, sIdx) => {
                                                            const isSecExpanded = expandedSection === `${branch.branch_code}-${section.section_code}`;
                                                            return (
                                                                <div key={sIdx} style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                                                                    <div
                                                                        onClick={() => toggleSectionAccordion(branch.branch_code, section.section_code)}
                                                                        style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: isSecExpanded ? '#EEF2FF' : 'transparent' }}
                                                                    >
                                                                        <div style={{ fontWeight: '500', color: '#1E293B', fontSize: '14px' }}>
                                                                            {section.name} <span style={{ color: '#94A3B8', fontSize: '13px', marginLeft: '8px' }}>({section.section_code})</span>
                                                                        </div>
                                                                        <div style={{ fontSize: '12px', transform: isSecExpanded ? 'rotate(180deg)' : 'none' }}>▼</div>
                                                                    </div>

                                                                    {isSecExpanded && (
                                                                        <div style={{ padding: '16px', borderTop: '1px solid #E2E8F0', backgroundColor: 'white' }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Issue Types</span>
                                                                                {user?.role === "SuperAdmin" && (
                                                                                    <button
                                                                                        className="btn-tertiary btn-sm"
                                                                                        style={{ fontSize: '12px', padding: '4px 8px' }}
                                                                                        onClick={() => { setActiveSectionForIssue(section.section_code); setShowIssueTypeModal(true); }}
                                                                                    >
                                                                                        + Add Issue Type
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            {(issueTypesMap[section.section_code] || []).length === 0 ? (
                                                                                <div style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>No issue types defined.</div>
                                                                            ) : (
                                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                                                    {issueTypesMap[section.section_code].map((it, itIdx) => (
                                                                                        <span key={itIdx} style={{ backgroundColor: '#F1F5F9', color: '#334155', padding: '4px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: '500', border: '1px solid #E2E8F0' }}>
                                                                                            {it.name} <span style={{ opacity: 0.5 }}>({it.issue_type_id})</span>
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modals */}
            {showBranchModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '12px', width: '400px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px' }}>Add New Branch</h2>
                            <button onClick={() => setShowBranchModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        {submitError && <div style={{ color: 'red', marginBottom: '16px' }}>{submitError}</div>}
                        <form onSubmit={handleCreateBranch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Branch Name</label>
                                <input type="text" required className="form-control" value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Location</label>
                                <input type="text" required className="form-control" value={branchForm.location} onChange={e => setBranchForm({ ...branchForm, location: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowBranchModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showSectionModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '12px', width: '400px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px' }}>Add Section to {activeBranchForSection}</h2>
                            <button onClick={() => setShowSectionModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        {submitError && <div style={{ color: 'red', marginBottom: '16px' }}>{submitError}</div>}
                        <form onSubmit={handleCreateSection} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Section Name</label>
                                <input type="text" required className="form-control" value={sectionForm.name} onChange={e => setSectionForm({ ...sectionForm, name: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowSectionModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showIssueTypeModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '12px', width: '400px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px' }}>Add Issue Type to {activeSectionForIssue}</h2>
                            <button onClick={() => setShowIssueTypeModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        {submitError && <div style={{ color: 'red', marginBottom: '16px' }}>{submitError}</div>}
                        <form onSubmit={handleCreateIssueType} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Name</label>
                                <input type="text" required className="form-control" value={issueTypeForm.name} onChange={e => setIssueTypeForm({ ...issueTypeForm, name: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowIssueTypeModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

export default CompanyDetails;
