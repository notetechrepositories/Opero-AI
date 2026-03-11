import React, { useState, useEffect } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // AI Insights State
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState("");
    const [insights, setInsights] = useState(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [insightsError, setInsightsError] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await axios.get("/api/analytics");
                setData(res.data);
            } catch (err) {
                console.error("Failed to fetch analytics", err);
                setError("Could not load dashboard data.");
            } finally {
                setLoading(false);
            }
        };
        const fetchCompanies = async () => {
            try {
                const res = await axios.get("/api/companies");
                setCompanies(res.data);
            } catch (err) {
                console.error("Failed to fetch companies", err);
            }
        };
        fetchAnalytics();
        fetchCompanies();
    }, []);

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

    if (loading) return <div className="app-container"><div className="spinner" style={{ borderColor: '#3b82f6', borderTopColor: 'transparent', margin: 'auto' }}></div></div>;
    if (error) return <div className="app-container" style={{ color: 'red' }}>{error}</div>;
    if (!data) return null;

    const { summary, priorityBreakdown, categoryBreakdown } = data;

    return (
        <div className="app-container dashboard-page">
            <h2 className="title">Analytics Dashboard</h2>
            <p className="subtitle">Real-time overview of ticket metrics and support request statuses.</p>

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="card">
                    <div className="card-title">Total Tickets</div>
                    <div className="card-value">{summary.total}</div>
                </div>
                <div className="card">
                    <div className="card-title">Open</div>
                    <div className="card-value open-val">{summary.open}</div>
                </div>
                <div className="card">
                    <div className="card-title">Closed</div>
                    <div className="card-value closed-val">{summary.closed}</div>
                </div>
                <div className="card">
                    <div className="card-title">In Progress</div>
                    <div className="card-value progress-val">{summary.inProgress}</div>
                </div>
                <div className="card">
                    <div className="card-title">Resolved</div>
                    <div className="card-value resolved-val">{summary.resolved}</div>
                </div>
            </div>

            <div className="charts-grid">
                {/* Priority Breakdown (Bar Chart) */}
                <div className="chart-box">
                    <h3 className="chart-title">Tickets by Priority</h3>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={priorityBreakdown} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <XAxis dataKey="name" stroke="#cbd5e1" fontSize={12} />
                                <YAxis stroke="#cbd5e1" fontSize={12} allowDecimals={false} />
                                <Tooltip cursor={{ fill: 'rgba(235, 221, 221, 0.05)' }} contentStyle={{ backgroundColor: '#989ca1ff', border: '1px solid #e2e4e7ff', borderRadius: '8px' }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {priorityBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'High' ? '#ef4444' : entry.name === 'Medium' ? '#f59e0b' : '#10b981'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Breakdown (Pie Chart) */}
                <div className="chart-box">
                    <h3 className="chart-title">Tickets by Category</h3>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {categoryBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#e3e7ecff', border: '1px solid #334155', borderRadius: '8px' }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* AI Executive Summary */}
            <div className="chart-box" style={{ marginTop: '24px', gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 className="chart-title" style={{ margin: 0 }}>🧠 AI Executive Insights</h3>
                    <select
                        className="form-control"
                        style={{ width: '250px' }}
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                    >
                        <option value="">Select Company...</option>
                        {companies.map(c => (
                            <option key={c.company_code || c.id} value={c.company_code || c.id}>
                                {c.company_name || c.name || c.company_code}
                            </option>
                        ))}
                    </select>
                </div>

                {loadingInsights && (
                    <div className="loader-wrapper" style={{ height: '100px' }}>
                        <div className="spinner" style={{ borderColor: '#3b82f6', borderTopColor: 'transparent' }}></div>
                        <span style={{ color: 'var(--text-muted)' }}>Generating insights... this may take a few seconds</span>
                    </div>
                )}
                {insightsError && <div style={{ color: 'var(--error)' }}>{insightsError}</div>}

                {insights && !loadingInsights && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Theme Analysis */}
                        <div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-main)' }}>Theme Analysis</h4>
                            <div style={{ background: 'var(--bg-color)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                {typeof insights.theme_analysis === 'object' ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {Object.entries(insights.theme_analysis).map(([theme, details], i) => {
                                            const totalIssues = Object.values(details).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
                                            return (
                                                <div key={i} style={{ background: '#EEF2FF', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', color: '#4F46E5', fontWeight: '500' }}>
                                                    {theme} ({totalIssues})
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>{insights.theme_analysis}</p>
                                )}
                            </div>
                        </div>

                        {/* Critical Issues */}
                        {insights.critical_issues && insights.critical_issues.length > 0 && (
                            <div>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-main)' }}>Critical Issues</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {insights.critical_issues.map((issue, idx) => (
                                        <div key={idx} style={{ background: '#FEF2F2', padding: '12px 16px', borderRadius: '8px', border: '1px solid #FECACA' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span className="badge high" style={{ fontSize: '10px' }}>{issue.priority || 'High'}</span>
                                                <span style={{ fontWeight: '600', fontSize: '13px', color: '#991B1B' }}>{issue.category || 'Issue'}</span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#7F1D1D' }}>{issue.message || issue}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recommendations */}
                        {insights.operational_recommendations && insights.operational_recommendations.length > 0 && (
                            <div>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-main)' }}>Operational Recommendations</h4>
                                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
                                    {insights.operational_recommendations.map((rec, idx) => (
                                        <li key={idx}>{rec}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
                {!insights && !loadingInsights && !insightsError && selectedCompany && (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                        No insights returned from AI.
                    </div>
                )}
                {!selectedCompany && (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                        Select a company above to view AI-generated insights for their recent tickets.
                    </div>
                )}
            </div>

        </div>
    );
}

export default Dashboard;
