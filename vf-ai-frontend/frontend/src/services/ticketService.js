import axios from "axios";

export const getCompanies = async () => {
    const res = await axios.get("/api/companies");
    return res.data;
};

export const validateQrToken = async (token) => {
    const res = await axios.get(`/api/validate-qr-token?token=${token}`);
    return res.data;
};

export const getBranches = async (companyId) => {
    const res = await axios.get(`/api/branches?company_code=${companyId}`);
    return res.data;
};

export const getSections = async (branchId) => {
    const res = await axios.get(`/api/sections?branch_code=${branchId}`);
    return res.data;
};

export const getIssueTypes = async (sectionId) => {
    const res = await axios.get(`/api/issue-types?section_code=${sectionId}`);
    return res.data;
};

export const analyzeImage = async (file) => {
    const payload = new FormData();
    payload.append("file", file);
    const res = await axios.post("/api/analyze-image", payload, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
};

export const submitTicket = async (formData) => {
    const res = await axios.post("/api/submit-ticket", formData, {
        headers: { "Content-Type": "application/json" },
    });
    return res.data;
};
