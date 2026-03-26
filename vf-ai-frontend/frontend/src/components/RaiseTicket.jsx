import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";

function RaiseTicket() {
    // Hook to read query strings from the URL
    // e.g. /raise-ticket?company_id=123 or /raise-ticket?token=xyz
    const [searchParams] = useSearchParams();

    // Fallback logic for unencrypted navigation scenarios
    const initialCompanyId = searchParams.get("company_id") || "";
    const initialBranchId = searchParams.get("branch_id") || "";

    const [formData, setFormData] = useState({
        company_id: "",
        branch_id: "",
        section_id: "",
        issue_type_id: "",
        message: "",
        category: "",
        priority: "",
        imageurl: ""
    });

    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);

    // New states for image and AI analysis
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [didUserEditMessage, setDidUserEditMessage] = useState(false);
    const [didUserEditCategory, setDidUserEditCategory] = useState(false);
    const [didUserEditPriority, setDidUserEditPriority] = useState(false);

    // Cascading dropdown states
    const [companies, setCompanies] = useState([]);
    const [branches, setBranches] = useState([]);
    const [sections, setSections] = useState([]);
    const [issueTypes, setIssueTypes] = useState([]);

    const [loadingDropdowns, setLoadingDropdowns] = useState(false);

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                setLoadingDropdowns(true);
                const compRes = await axios.get("/api/companies");
                setCompanies(compRes.data);

                // ==========================================
                // SECURE TOKEN RESOLUTION:
                // Extract the secure token from the QR Code URL
                // ==========================================
                const token = searchParams.get("token");
                if (token) {
                    try {
                        // Pass the token to the backend. The backend will decrypt the token
                        // and return the raw company_id and branch_id it was signed with
                        const tokenRes = await axios.get(`/api/validate-qr-token?token=${token}`);
                        if (tokenRes.data.company_id && tokenRes.data.branch_id) {
                            // Automatically update the form to pre-select the dropdowns
                            // which automatically triggers the cascading cascade effects in other useEffect hooks
                            setFormData(prev => ({
                                ...prev,
                                company_id: tokenRes.data.company_id,
                                branch_id: tokenRes.data.branch_id
                            }));
                        }
                    } catch (tokenErr) {
                        console.error("Failed to validate QR token:", tokenErr);
                    }
                }

            } catch (err) {
                console.error("Failed to load initial dropdowns", err);
                setCompanies([{ company_code: '1', company_name: 'Company 1' }, { company_code: '2', company_name: 'Company 2' }]);
            } finally {
                setLoadingDropdowns(false);
            }
        };
        fetchInitial();
    }, []);

    useEffect(() => {
        if (formData.company_id) {
            axios.get(`/api/branches?company_code=${formData.company_id}`)
                .then(res => setBranches(res.data))
                .catch(() => {
                    setBranches([{ branch_code: '101', branch_name: `Branch 101` }]);
                });
        } else {
            setBranches([]);
            setSections([]);
            setIssueTypes([]);
        }
    }, [formData.company_id]);

    useEffect(() => {
        if (formData.branch_id) {
            axios.get(`/api/sections?branch_code=${formData.branch_id}`)
                .then(res => setSections(res.data))
                .catch(() => {
                    setSections([{ section_code: 'sec_a', section_name: `Section A` }]);
                });
        } else {
            setSections([]);
            setIssueTypes([]);
        }
    }, [formData.branch_id]);

    useEffect(() => {
        if (formData.section_id) {
            axios.get(`/api/issue-types?section_code=${formData.section_id}`)
                .then(res => setIssueTypes(res.data))
                .catch(() => {
                    setIssueTypes([{ issue_type_code: 'hw', issue_type_name: 'Hardware' }]);
                });
        } else {
            setIssueTypes([]);
        }
    }, [formData.section_id]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "message") setDidUserEditMessage(true);
        if (name === "category") setDidUserEditCategory(true);
        if (name === "priority") setDidUserEditPriority(true);

        setFormData((prev) => {
            let updatedForm = { ...prev, [name]: value };

            if (name === "company_id") {
                updatedForm.branch_id = "";
                updatedForm.section_id = "";
                updatedForm.issue_type_id = "";
            } else if (name === "branch_id") {
                updatedForm.section_id = "";
                updatedForm.issue_type_id = "";
            } else if (name === "section_id") {
                updatedForm.issue_type_id = "";
            }

            return updatedForm;
        });
    };

    const processImageFile = async (file) => {
        if (!file) return;

        if (!["image/jpeg", "image/png"].includes(file.type)) {
            alert("Please upload only JPG or PNG images.");
            return;
        }

        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
        setAiError(null);
        setIsAnalyzing(true);

        try {
            const formDataPayload = new FormData();
            formDataPayload.append("file", file);

            const res = await axios.post("/api/analyze-image", formDataPayload, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            const { issue, category, priority, image_url } = res.data || {};

            setFormData(prev => ({
                ...prev,
                imageurl: image_url || prev.imageurl,
                // Auto-fill only when user hasn't edited yet (or field is empty).
                message: (prev.message || "").trim() === "" || !didUserEditMessage ? (issue || prev.message) : prev.message,
                category: (prev.category || "").trim() === "" || !didUserEditCategory ? (category || prev.category) : prev.category,
                priority: (prev.priority || "").trim() === "" || !didUserEditPriority ? (priority || prev.priority) : prev.priority,
            }));
        } catch (err) {
            console.error("AI Analysis failed", err);
            const detail = err?.response?.data?.detail;
            setAiError(detail ? `AI analysis failed: ${detail}` : "AI analysis failed. Please fill the fields manually.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files && e.target.files[0];
        processImageFile(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await axios.post("/api/submit-ticket", formData, {
                headers: { "Content-Type": "application/json" }
            });
            setResponse(res.data);
        } catch (error) {
            console.error(error);
            alert("Error submitting request. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="app-container dashboard-page" style={{ maxWidth: '1000px' }}>
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">Raise a Request</h1>
                    <p className="page-subtitle">Describe your issue below. Our AI assistant will automatically classify, prioritize, and route it to the right team.</p>
                </div>
            </div>

            {(!response) && (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Primary Group */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontWeight: '600', color: 'var(--color-text)' }}>Organization <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                                <select
                                    name="company_id"
                                    className="form-control"
                                    value={formData.company_id}
                                    onChange={handleChange}
                                    required
                                    disabled={loading || loadingDropdowns}
                                    style={{ height: '40px' }}
                                >
                                    <option value="" disabled>Select Company...</option>
                                    {companies.map(c => (
                                        <option key={c.company_code || c.id} value={c.company_code || c.id}>
                                            {c.company_name || c.name || c.company_code}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontWeight: '600', color: 'var(--color-text)' }}>Branch <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                                <select
                                    name="branch_id"
                                    className="form-control"
                                    value={formData.branch_id}
                                    onChange={handleChange}
                                    required
                                    disabled={loading || !formData.company_id}
                                    style={{ height: '40px' }}
                                >
                                    <option value="" disabled>Select Branch...</option>
                                    {branches.map(b => (
                                        <option key={b.branch_code || b.id} value={b.branch_code || b.id}>
                                            {b.branch_name || b.name || b.branch_code}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                    </div>

                    {/* Secondary/Optional Group */}
                    <div style={{ background: 'var(--color-bg-sunken)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-subtle)' }}>Optional Routing Context</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Section</label>
                                <select
                                    name="section_id"
                                    className="form-control"
                                    value={formData.section_id}
                                    onChange={handleChange}
                                    disabled={loading || !formData.branch_id}
                                    style={{ backgroundColor: 'var(--color-bg-surface)' }}
                                >
                                    <option value="" disabled>I'm not sure...</option>
                                    {sections.map(s => (
                                        <option key={s.section_code || s.id} value={s.section_code || s.id}>
                                            {s.section_name || s.name || s.section_code}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Issue Type</label>
                                <select
                                    name="issue_type_id"
                                    className="form-control"
                                    value={formData.issue_type_id}
                                    onChange={handleChange}
                                    disabled={loading || !formData.section_id}
                                    style={{ backgroundColor: 'var(--color-bg-surface)' }}
                                >
                                    <option value="" disabled>I'm not sure...</option>
                                    {issueTypes.map(it => (
                                        <option key={it.issue_type_id || it.id || it.issue_type_code} value={it.issue_type_id || it.id || it.issue_type_code}>
                                            {it.issue_type_name || it.name || it.issue_type_code || it.issue_type_id}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Image Upload + AI Analysis */}
                    <div style={{ background: 'var(--color-bg-sunken)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-subtle)' }}>Image Analysis</h4>
                        <div
                            className="upload-zone"
                            style={{
                                border: isDragOver ? "2px dashed #3b82f6" : "2px dashed rgba(148,163,184,0.6)",
                                borderRadius: "12px",
                                padding: "14px",
                                background: "rgba(15,23,42,0.1)",
                                transition: "border-color 0.15s ease"
                            }}
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragOver(false);
                                const file = e.dataTransfer.files && e.dataTransfer.files[0];
                                if (file) processImageFile(file);
                            }}
                        >
                            <input
                                type="file"
                                accept="image/png, image/jpeg"
                                onChange={handleImageChange}
                                disabled={isAnalyzing || loading}
                                style={{ width: "100%" }}
                            />

                            {isAnalyzing && (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                                    <div className="spinner"></div>
                                    <span>Analyzing Image...</span>
                                </div>
                            )}

                            {aiError && <p style={{ color: "#EF4444", marginTop: "10px" }}>{aiError}</p>}

                            {imagePreview && (
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    style={{ marginTop: "10px", maxWidth: "220px", borderRadius: "8px" }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Description at end of form */}
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: '600', color: 'var(--color-text)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Description <span style={{ color: 'var(--color-danger)' }}>*</span></span>
                        </label>
                        <textarea
                            name="message"
                            className="form-control"
                            placeholder="What do you need help with? Please provide as much detail as possible..."
                            value={formData.message}
                            onChange={handleChange}
                            required
                            disabled={loading}
                            style={{ minHeight: '120px', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '24px' }}>
                        <button type="submit" className="btn-primary btn-lg" disabled={loading || isAnalyzing} style={{ minWidth: '200px' }}>
                            {loading ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                    <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: 'currentColor', borderColor: 'rgba(255,255,255,0.3)' }}></div>
                                    Submitting & Analyzing...
                                </div>
                            ) : (
                                "Submit Request"
                            )}
                        </button>
                    </div>
                </form>
            )}

            {response && (
                <div className="result-box" style={{ background: 'var(--color-bg-surface)', border: '1px solid rgba(0, 135, 90, 0.2)', padding: '32px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: '50%', padding: '4px', display: 'flex' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        </div>
                        <h3 className="result-title" style={{ margin: 0, fontSize: '16px', color: 'var(--color-text)' }}>Request Submitted Successfully</h3>
                    </div>

                    <div className="result-grid" style={{ gridTemplateColumns: '1fr 1fr', rowGap: '20px' }}>
                        <div className="result-item">
                            <span className="result-label">Assigned Category</span>
                            <span className="result-value"><span className="badge">{response.category}</span></span>
                        </div>

                        <div className="result-item">
                            <span className="result-label">Determined Priority</span>
                            <span className="result-value">
                                <span className={`badge priority-badge ${response.priority?.toLowerCase() || 'unassigned'}`}>
                                    {response.priority}
                                </span>
                            </span>
                        </div>

                        <div className="result-item full">
                            <span className="result-label">Final Title</span>
                            <span className="result-value" style={{ lineHeight: '1.5' }}>{response.summary}</span>
                        </div>

                        <div className="result-item full">
                            <span className="result-label">Tracking ID</span>
                            <span className="result-value" style={{ fontFamily: 'monospace', color: 'var(--color-text-subtle)', background: 'var(--color-bg-sunken)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>{response.inserted_id}</span>
                        </div>
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                                setFormData({
                                    company_id: "",
                                    branch_id: "",
                                    section_id: "",
                                    issue_type_id: "",
                                    message: "",
                                    category: "",
                                    priority: "",
                                    imageurl: ""
                                });
                                setSelectedImage(null);
                                setImagePreview(null);
                                setAiError(null);
                                setDidUserEditMessage(false);
                                setDidUserEditCategory(false);
                                setDidUserEditPriority(false);
                                setResponse(null);
                            }}
                            style={{ height: '36px', padding: '0 20px', fontSize: '14px' }}
                        >
                            Submit Another Request
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RaiseTicket;
