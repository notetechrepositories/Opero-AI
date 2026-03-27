import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
    getCompanies,
    validateQrToken,
    getBranches,
    getSections,
    getIssueTypes,
    submitTicket,
} from "../../services/ticketService";
import useImageAnalysis from "../../hooks/useImageAnalysis";
import "./RaiseTicket.css";

const INITIAL_FORM = {
    company_id: "",
    branch_id: "",
    section_id: "",
    issue_type_id: "",
    message: "",
    category: "",
    priority: "",
    image_url: "",
};

function RaiseTicket() {
    const [searchParams] = useSearchParams();

    const [formData, setFormData] = useState(INITIAL_FORM);
    const [response, setResponse]   = useState(null);
    const [loading, setLoading]     = useState(false);

    const {
        imagePreview,
        isAnalyzing,
        aiError,
        isDragOver,
        setIsDragOver,
        setDidUserEditMessage,
        setDidUserEditCategory,
        setDidUserEditPriority,
        processImageFile,
        handleImageChange,
        resetImageState,
    } = useImageAnalysis(setFormData);

    // Cascading dropdown data
    const [companies, setCompanies]         = useState([]);
    const [branches, setBranches]           = useState([]);
    const [sections, setSections]           = useState([]);
    const [issueTypes, setIssueTypes]       = useState([]);
    const [loadingDropdowns, setLoadingDropdowns] = useState(false);

    // ── Data fetching ───────────────────────────────────────
    useEffect(() => {
        const fetchInitial = async () => {
            try {
                setLoadingDropdowns(true);
                setCompanies(await getCompanies());

                const token = searchParams.get("token");
                if (token) {
                    try {
                        const tokenData = await validateQrToken(token);
                        if (tokenData.company_id && tokenData.branch_id) {
                            setFormData(prev => ({
                                ...prev,
                                company_id: tokenData.company_id,
                                branch_id:  tokenData.branch_id,
                            }));
                        }
                    } catch (tokenErr) {
                        console.error("Failed to validate QR token:", tokenErr);
                    }
                }
            } catch (err) {
                console.error("Failed to load initial dropdowns", err);
                setCompanies([
                    { company_code: "1", company_name: "Company 1" },
                    { company_code: "2", company_name: "Company 2" },
                ]);
            } finally {
                setLoadingDropdowns(false);
            }
        };
        fetchInitial();
    }, []);

    useEffect(() => {
        if (formData.company_id) {
            getBranches(formData.company_id)
                .then(data => setBranches(data))
                .catch(() => setBranches([{ branch_code: "101", branch_name: "Branch 101" }]));
        } else {
            setBranches([]);
            setSections([]);
            setIssueTypes([]);
        }
    }, [formData.company_id]);

    useEffect(() => {
        if (formData.branch_id) {
            getSections(formData.branch_id)
                .then(data => setSections(data))
                .catch(() => setSections([{ section_code: "sec_a", section_name: "Section A" }]));
        } else {
            setSections([]);
            setIssueTypes([]);
        }
    }, [formData.branch_id]);

    useEffect(() => {
        if (formData.section_id) {
            getIssueTypes(formData.section_id)
                .then(data => setIssueTypes(data))
                .catch(() => setIssueTypes([{ issue_type_code: "hw", issue_type_name: "Hardware" }]));
        } else {
            setIssueTypes([]);
        }
    }, [formData.section_id]);

    // ── Handlers ────────────────────────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "message")  setDidUserEditMessage(true);
        if (name === "category") setDidUserEditCategory(true);
        if (name === "priority") setDidUserEditPriority(true);

        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            if (name === "company_id") { updated.branch_id = ""; updated.section_id = ""; updated.issue_type_id = ""; }
            else if (name === "branch_id")  { updated.section_id = ""; updated.issue_type_id = ""; }
            else if (name === "section_id") { updated.issue_type_id = ""; }
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await submitTicket(formData);
            setResponse(data);
        } catch (error) {
            console.error(error);
            alert("Error submitting request. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFormData(INITIAL_FORM);
        resetImageState();
        setResponse(null);
    };

    // ── Render ──────────────────────────────────────────────
    return (
        <div className="app-container dashboard-page rt-page">
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">Raise a Request</h1>
                    <p className="page-subtitle">
                        Describe your issue below. Our AI assistant will automatically classify,
                        prioritize, and route it to the right team.
                    </p>
                </div>
            </div>

            {!response && (
                <form onSubmit={handleSubmit} className="rt-form">

                    {/* Organization & Branch */}
                    <div className="rt-primary-group">
                        <div className="rt-grid-2">
                            <div className="form-group rt-form-group">
                                <label className="form-label" style={{ fontWeight: 600, color: "var(--color-text)" }}>
                                    Organization <span style={{ color: "var(--color-danger)" }}>*</span>
                                </label>
                                <select
                                    name="company_id"
                                    className="form-control rt-select"
                                    value={formData.company_id}
                                    onChange={handleChange}
                                    required
                                    disabled={loading || loadingDropdowns}
                                >
                                    <option value="" disabled>Select Company...</option>
                                    {companies.map(c => (
                                        <option key={c.company_code || c.id} value={c.company_code || c.id}>
                                            {c.company_name || c.name || c.company_code}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group rt-form-group">
                                <label className="form-label" style={{ fontWeight: 600, color: "var(--color-text)" }}>
                                    Branch <span style={{ color: "var(--color-danger)" }}>*</span>
                                </label>
                                <select
                                    name="branch_id"
                                    className="form-control rt-select"
                                    value={formData.branch_id}
                                    onChange={handleChange}
                                    required
                                    disabled={loading || !formData.company_id}
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

                    {/* Optional Routing Context */}
                    <div className="rt-card">
                        <h4 className="rt-card-title">Optional Routing Context</h4>
                        <div className="rt-grid-2">
                            <div className="form-group rt-form-group">
                                <label className="form-label">Section</label>
                                <select
                                    name="section_id"
                                    className="form-control rt-select--surface"
                                    value={formData.section_id}
                                    onChange={handleChange}
                                    disabled={loading || !formData.branch_id}
                                >
                                    <option value="" disabled>I'm not sure...</option>
                                    {sections.map(s => (
                                        <option key={s.section_code || s.id} value={s.section_code || s.id}>
                                            {s.section_name || s.name || s.section_code}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group rt-form-group">
                                <label className="form-label">Issue Type</label>
                                <select
                                    name="issue_type_id"
                                    className="form-control rt-select--surface"
                                    value={formData.issue_type_id}
                                    onChange={handleChange}
                                    disabled={loading || !formData.section_id}
                                >
                                    <option value="" disabled>I'm not sure...</option>
                                    {issueTypes.map(it => (
                                        <option
                                            key={it.issue_type_id || it.id || it.issue_type_code}
                                            value={it.issue_type_id || it.id || it.issue_type_code}
                                        >
                                            {it.issue_type_name || it.name || it.issue_type_code || it.issue_type_id}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Image Upload + AI Analysis */}
                    <div className="rt-card">
                        <h4 className="rt-card-title">Image Analysis</h4>
                        <div
                            className={`rt-upload-zone${isDragOver ? " rt-upload-zone--drag" : ""}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragOver(false);
                                const file = e.dataTransfer.files?.[0];
                                if (file) processImageFile(file);
                            }}
                        >
                            <input
                                type="file"
                                accept="image/png, image/jpeg"
                                className="rt-upload-input"
                                onChange={handleImageChange}
                                disabled={isAnalyzing || loading}
                            />

                            {isAnalyzing && (
                                <div className="rt-analyzing-row">
                                    <div className="spinner" />
                                    <span>Analyzing Image...</span>
                                </div>
                            )}

                            {aiError && <p className="rt-ai-error">{aiError}</p>}

                            {imagePreview && (
                                <img src={imagePreview} alt="Preview" className="rt-image-preview" />
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="form-group rt-description-group">
                        <label className="form-label rt-description-label">
                            <span>Description <span style={{ color: "var(--color-danger)" }}>*</span></span>
                        </label>
                        <textarea
                            name="message"
                            className="form-control rt-textarea"
                            placeholder="What do you need help with? Please provide as much detail as possible..."
                            value={formData.message}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* Submit */}
                    <div className="rt-submit-row">
                        <button
                            type="submit"
                            className="btn-primary btn-lg rt-submit-btn"
                            disabled={loading || isAnalyzing}
                        >
                            {loading ? (
                                <div className="rt-spinner-row">
                                    <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: "currentColor", borderColor: "rgba(255,255,255,0.3)" }} />
                                    Submitting & Analyzing...
                                </div>
                            ) : "Submit Request"}
                        </button>
                    </div>
                </form>
            )}

            {/* Success card */}
            {response && (
                <div className="rt-result-box">
                    <div className="rt-result-header">
                        <div className="rt-success-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </div>
                        <h3 className="rt-result-title">Request Submitted Successfully</h3>
                    </div>

                    <div className="rt-result-body">
                        <div className="result-grid rt-result-grid">
                            <div className="result-item">
                                <span className="result-label">Assigned Category</span>
                                <span className="result-value"><span className="badge">{response.category}</span></span>
                            </div>

                            <div className="result-item">
                                <span className="result-label">Determined Priority</span>
                                <span className="result-value">
                                    <span className={`badge priority-badge ${response.priority?.toLowerCase() || "unassigned"}`}>
                                        {response.priority}
                                    </span>
                                </span>
                            </div>

                            <div className="result-item full">
                                <span className="result-label">Final Title</span>
                                <span className="result-value" style={{ lineHeight: 1.5 }}>{response.summary}</span>
                            </div>

                            <div className="result-item full">
                                <span className="result-label">Tracking ID</span>
                                <span className="result-value rt-tracking-id">{response.inserted_id}</span>
                            </div>
                        </div>

                        {imagePreview && (
                            <div>
                                <span className="rt-attached-label">Attached Image</span>
                                <img src={imagePreview} alt="Submitted issue" className="rt-attached-image" />
                            </div>
                        )}
                    </div>

                    <div className="rt-reset-row">
                        <button type="button" className="btn-secondary rt-reset-btn" onClick={handleReset}>
                            Submit Another Request
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RaiseTicket;
