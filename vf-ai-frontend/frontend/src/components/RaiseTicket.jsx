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
        message: ""
    });

    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResponse(null);

        try {
            const res = await axios.post("/api/classify", formData, {
                headers: { "Content-Type": "application/json" }
            });
            setResponse(res.data);
        } catch (error) {
            console.error(error);
            alert("Error submitting ticket");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container">
            <h2 className="title">New Support Request</h2>
            <p className="subtitle">Please provide the details below, and our AI will automatically classify and route your ticket.</p>

            <form onSubmit={handleSubmit}>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Company</label>
                        <select
                            name="company_id"
                            className="form-control"
                            value={formData.company_id}
                            onChange={handleChange}
                            required
                            disabled={loadingDropdowns}
                        >
                            <option value="" disabled>Select Company...</option>
                            {companies.map(c => (
                                <option key={c.company_code || c.id} value={c.company_code || c.id}>
                                    {c.company_name || c.name || c.company_code}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Branch</label>
                        <select
                            name="branch_id"
                            className="form-control"
                            value={formData.branch_id}
                            onChange={handleChange}
                            required
                            disabled={!formData.company_id}
                        >
                            <option value="" disabled>Select Branch...</option>
                            {branches.map(b => (
                                <option key={b.branch_code || b.id} value={b.branch_code || b.id}>
                                    {b.branch_name || b.name || b.branch_code}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Section</label>
                        <select
                            name="section_id"
                            className="form-control"
                            value={formData.section_id}
                            onChange={handleChange}
                            disabled={!formData.branch_id}
                        >
                            <option value="" disabled>Select Section...</option>
                            {sections.map(s => (
                                <option key={s.section_code || s.id} value={s.section_code || s.id}>
                                    {s.section_name || s.name || s.section_code}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Issue Type</label>
                        <select
                            name="issue_type_id"
                            className="form-control"
                            value={formData.issue_type_id}
                            onChange={handleChange}
                            disabled={!formData.section_id}
                        >
                            <option value="" disabled>Select Issue Type...</option>
                            {issueTypes.map(it => (
                                <option key={it.issue_type_id || it.id || it.issue_type_code} value={it.issue_type_id || it.id || it.issue_type_code}>
                                    {it.issue_type_name || it.name || it.issue_type_code || it.issue_type_id}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-group full-width">
                    <label className="form-label">Description</label>
                    <textarea
                        name="message"
                        className="form-control"
                        placeholder="Please describe your issue in detail..."
                        value={formData.message}
                        onChange={handleChange}
                        required
                    />
                </div>

                <button type="submit" className="btn-submit" disabled={loading}>
                    {loading ? (
                        <>
                            <div className="spinner"></div>
                            Processing via AI...
                        </>
                    ) : (
                        "Submit Ticket"
                    )}
                </button>
            </form>

            {response && (
                <div className="result-box">
                    <h3 className="result-title">Classification Successful</h3>

                    <div className="result-grid">
                        <div className="result-item">
                            <span className="result-label">Assigned Category</span>
                            <span className="result-value"><span className="badge">{response.category}</span></span>
                        </div>

                        <div className="result-item">
                            <span className="result-label">Determined Priority</span>
                            <span className="result-value">
                                <span className={`badge ${response.priority?.toLowerCase() === 'high' ? 'high' : ''}`}>
                                    {response.priority}
                                </span>
                            </span>
                        </div>

                        <div className="result-item full">
                            <span className="result-label">AI Summary</span>
                            <span className="result-value">{response.summary}</span>
                        </div>

                        <div className="result-item full">
                            <span className="result-label">Ticket ID / Tracking</span>
                            <span className="result-value" style={{ fontFamily: 'monospace', color: '#64748B' }}>{response.inserted_id}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RaiseTicket;
