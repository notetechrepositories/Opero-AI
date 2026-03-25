import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { AlertCircle, Activity, FolderOpen, AlertTriangle, CheckCircle2, CheckCircle, BrainCircuit, BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";

const COLORS = ['#0052CC', '#00875A', '#FF991F', '#DE350B', '#6554C0', '#00B8D9'];

function Dashboard() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // System Analytics State
    const [selectedCompanyAnalytics, setSelectedCompanyAnalytics] = useState(user?.role !== "SuperAdmin" ? user?.company_id : "");

    // AI Insights State
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(user?.role !== "SuperAdmin" ? user?.company_id : "");
    const [insights, setInsights] = useState(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [insightsError, setInsightsError] = useState(null);

    const fetchAnalytics = async (compId = "") => {
        try {
            setLoading(compId ? false : true); // don't show full page loading if just filtering
            const url = compId ? `/api/analytics?company_id=${compId}` : "/api/analytics";
            const res = await axios.get(url);
            setData(res.data);
        } catch (err) {
            console.error("Failed to fetch analytics", err);
            const msg = err.response?.data?.detail || "Could not load dashboard data.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const res = await axios.get("/api/companies");
                setCompanies(res.data);
            } catch (err) {
                console.error("Failed to fetch companies", err);
            }
        };

        if (user) {
            if (user.role !== "SuperAdmin") {
                setSelectedCompanyAnalytics(user.company_id);
                setSelectedCompany(user.company_id);
            }
            fetchAnalytics(user.role !== "SuperAdmin" ? user.company_id : "");
            fetchCompanies();
        }
    }, [user]);

    useEffect(() => {
        if (loading) return; // avoid double fetch on mount
        fetchAnalytics(selectedCompanyAnalytics);
    }, [selectedCompanyAnalytics]);

    useEffect(() => {
        if (!selectedCompany) {
            setInsights(null);
            return;
        }
        const fetchInsights = async () => {
            setLoadingInsights(true);
            setInsightsError(null);
            try {
                const res = await axios.get(`/api/ai-insights/${selectedCompany}`);
                setInsights(res.data);
            } catch (err) {
                console.error("Failed to fetch AI insights", err);
                setInsightsError("Could not load AI Insights for this company.");
                setInsights(null);
            } finally {
                setLoadingInsights(false);
            }
        };
        fetchInsights();
    }, [selectedCompany]);

    if (loading) return (
        <div className="app-container dashboard-page">
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">Analytics Dashboard</h1>
                    <p className="page-subtitle">Real-time overview of ticket metrics and support request statuses.</p>
                </div>
            </div>
            <div className="summary-cards">
                {[1, 2, 3, 4, 5].map(i => (
                    <div className="card skeleton-box" key={i} style={{ height: '100px' }}></div>
                ))}
            </div>
            <div className="charts-grid">
                <div className="chart-box skeleton-box" style={{ height: '300px' }}></div>
                <div className="chart-box skeleton-box" style={{ height: '300px' }}></div>
            </div>
        </div>
    );

    if (error) return (
        <div className="app-container dashboard-page">
            <div className="state-container error">
                <AlertCircle className="state-icon" size={48} strokeWidth={1.5} />
                <div className="state-title">Dashboard Unavailable (EDITED)</div>
                <div className="state-description">{error}</div>
            </div>
        </div>
    );

    if (!data) return null;

    const { summary, priorityBreakdown, categoryBreakdown } = data;

    return (
        <div className="app-container dashboard-page">
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">Analytics Dashboard</h1>
                    <p className="page-subtitle" style={{ marginBottom: '32px' }}>Real-time overview of ticket metrics and support request statuses.</p>
                </div>
            </div>

            {/* SECTION 1: Overview */}
            <div className="dashboard-section">
                <h3 className="section-header"><Activity size={18} /> High-Level Overview</h3>
                <div className="summary-cards">
                    <div className="card summary-card">
                        <div className="summary-header">
                            <div className="card-title">Total Tickets</div>
                            <div className="summary-icon total"><FolderOpen size={20} /></div>
                        </div>
                        <div className="card-value">{summary.total}</div>

                    </div>

                    <div className="card summary-card" style={{ borderColor: 'var(--color-danger-bg)' }}>
                        <div className="summary-header">
                            <div className="card-title" style={{ color: 'var(--color-danger-text)' }}>Open (Action Req.)</div>
                            <div className="summary-icon open"><AlertTriangle size={20} /></div>
                        </div>
                        <div className="card-value open-val">{summary.open}</div>

                    </div>

                    <div className="card summary-card">
                        <div className="summary-header">
                            <div className="card-title">In Progress</div>
                            <div className="summary-icon progress"><Activity size={20} /></div>
                        </div>
                        <div className="card-value progress-val">{summary.inProgress}</div>

                    </div>

                    <div className="card summary-card">
                        <div className="summary-header">
                            <div className="card-title">Resolved</div>
                            <div className="summary-icon resolved"><CheckCircle size={20} /></div>
                        </div>
                        <div className="card-value resolved-val">{summary.resolved}</div>

                    </div>

                    <div className="card summary-card">
                        <div className="summary-header">
                            <div className="card-title">Closed</div>
                            <div className="summary-icon closed"><CheckCircle2 size={20} /></div>
                        </div>
                        <div className="card-value closed-val">{summary.closed}</div>

                    </div>
                </div>
            </div>

            {/* SECTION 2: Actionable Intelligence */}
            {user?.role !== "Staff" && (
                <div className="dashboard-section">
                    <h3 className="section-header"><BrainCircuit size={18} /> Actionable Intelligence</h3>
                    <div className="chart-box" style={{ marginTop: '0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 className="chart-title" style={{ margin: 0 }}>AI Executive Insights</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Organization:</span>
                                <select
                                    className="form-control"
                                    style={{ width: '250px' }}
                                    value={selectedCompany}
                                    onChange={(e) => setSelectedCompany(e.target.value)}
                                    disabled={user?.role !== "SuperAdmin"}
                                >
                                    {user?.role === "SuperAdmin" && <option value="">Select Company...</option>}
                                    {companies.map(c => (
                                        <option key={c.company_code || c.id} value={c.company_code || c.id}>
                                            {c.company_name || c.name || c.company_code}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {loadingInsights && (
                            <div style={{ padding: '24px 0' }}>
                                <div className="skeleton skeleton-title"></div>
                                <div className="skeleton skeleton-text medium"></div>
                                <div className="skeleton skeleton-text"></div>
                                <div className="skeleton skeleton-text short"></div>
                            </div>
                        )}
                        {insightsError && (
                            <div className="state-container error" style={{ padding: '24px', margin: '24px 0' }}>
                                <AlertCircle className="state-icon" size={32} strokeWidth={1.5} />
                                <div className="state-title">Insights Failed to Load</div>
                                <div className="state-description">{insightsError}</div>
                            </div>
                        )}

                        {insights && !loadingInsights && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Critical Issues (Surfaced to top for urgency) */}
                                {insights.critical_issues && insights.critical_issues.length > 0 && (
                                    <div className="dashboard-section" style={{ marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {insights.critical_issues.map((issue, idx) => (
                                                <div key={idx} className="alert-row">
                                                    <div className="alert-meta">
                                                        <span className={`badge priority-badge ${(issue.priority || 'High').toLowerCase()}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                                                            {issue.priority || 'High'}
                                                        </span>
                                                        <span style={{ fontWeight: '700', fontSize: '11px', color: 'var(--color-danger-text)', textTransform: 'uppercase' }}>
                                                            {issue.category || 'Issue'}
                                                        </span>
                                                    </div>
                                                    <div className="alert-content">
                                                        {issue.message || issue}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Theme Analysis */}
                                <div>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--color-text)', fontWeight: '600' }}>Theme Analysis</h4>
                                    <div style={{ background: 'var(--color-bg-sunken)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                                        {typeof insights.theme_analysis === 'object' ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {Object.entries(insights.theme_analysis).map(([theme, details], i) => {
                                                    const totalIssues = Object.values(details).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
                                                    return (
                                                        <div key={i} style={{ background: 'var(--color-info-bg)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--color-info-text)', fontWeight: '600' }}>
                                                            {theme} <span style={{ opacity: 0.7 }}>({totalIssues})</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-subtle)' }}>{insights.theme_analysis}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Recommendations */}
                                {insights.operational_recommendations && insights.operational_recommendations.length > 0 && (
                                    <div>
                                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--color-text)', fontWeight: '600' }}>Operational Recommendations</h4>
                                        <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--color-text-subtle)', fontSize: '14px', lineHeight: '1.6' }}>
                                            {insights.operational_recommendations.map((rec, idx) => (
                                                <li key={idx}>{rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                        {!insights && !loadingInsights && !insightsError && selectedCompany && (
                            <div className="state-container" style={{ padding: '32px', border: 'none' }}>
                                <Activity className="state-icon" size={40} strokeWidth={1.5} />
                                <div className="state-title">No Insights Available</div>
                                <div className="state-description">The AI did not identify any significant patterns or actionable insights for {companies.find(c => (c.company_code || c.id) === selectedCompany)?.name || "this company"} over the recent period.</div>
                            </div>
                        )}
                        {!selectedCompany && (
                            <div className="state-container" style={{ padding: '32px', border: 'none', background: 'transparent' }}>
                                <Activity className="state-icon" size={40} strokeWidth={1.5} />
                                <div className="state-title">Select an Organization</div>
                                <div className="state-description">Choose a company to view AI-generated insights and critical summaries from their recent ticket history.</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SECTION 3: Deep Insights */}
            <div className="dashboard-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 className="section-header" style={{ margin: 0 }}><BarChart3 size={18} /> System Analytics</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Filter:</span>
                        <select
                            className="form-control"
                            style={{ width: '250px', height: '32px', fontSize: '13px', padding: '0 12px' }}
                            value={selectedCompanyAnalytics}
                            onChange={(e) => setSelectedCompanyAnalytics(e.target.value)}
                            disabled={user?.role !== "SuperAdmin"}
                        >
                            {user?.role === "SuperAdmin" && <option value="">Global Overview (All)</option>}
                            {companies.map(c => (
                                <option key={c.company_code || c.id} value={c.company_code || c.id}>
                                    {c.company_name || c.name || c.company_code}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="charts-grid">
                    {/* Priority Breakdown (Bar Chart) */}
                    <div className="chart-box">
                        <div style={{ marginBottom: '20px' }}>
                            <h3 className="chart-title" style={{ marginBottom: '4px' }}>Tickets by Priority</h3>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-subtle)' }}>Recent volume breakdown by severity level</p>
                        </div>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={priorityBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                    <XAxis dataKey="name" stroke="var(--color-text-subtle)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="var(--color-text-subtle)" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} dx={-10} />
                                    <Tooltip
                                        cursor={{ fill: 'var(--color-bg-surface-hover)' }}
                                        contentStyle={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', boxShadow: 'var(--shadow-overlay)' }}
                                        itemStyle={{ color: 'var(--color-text)' }}
                                    />
                                    <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={50}>
                                        {priorityBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.name === 'High' ? '#DE350B' : entry.name === 'Medium' ? '#FF991F' : '#0052CC'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category Breakdown (Pie Chart) */}
                    <div className="chart-box">
                        <div style={{ marginBottom: '20px' }}>
                            <h3 className="chart-title" style={{ marginBottom: '4px' }}>Tickets by Category</h3>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-subtle)' }}>Distribution of issues across domains</p>
                        </div>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 20, right: 0, left: 0, bottom: 20 }}>
                                    <Pie
                                        data={categoryBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelStyle={{ fill: 'var(--color-text-subtle)', fontSize: '12px', fontWeight: '500' }}
                                        labelLine={{ stroke: 'var(--color-border)' }}
                                    >
                                        {categoryBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="var(--color-bg-surface)" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', boxShadow: 'var(--shadow-overlay)' }}
                                        itemStyle={{ color: 'var(--color-text)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px', color: 'var(--color-text-subtle)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>



        </div>
    );
}

export default Dashboard;
