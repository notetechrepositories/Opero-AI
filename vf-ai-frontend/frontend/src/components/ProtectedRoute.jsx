import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ allowedRoles, children }) => {
    const { user, token, loading } = useAuth();

    if (loading) {
        return <div className="app-container"><div className="spinner" style={{ borderColor: '#3b82f6', borderTopColor: 'transparent', margin: 'auto' }}></div></div>;
    }

    if (!token || !user) {
        // Not logged in
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Role not authorized
        return (
            <div className="app-container">
                <h2 style={{ color: 'var(--error)' }}>Access Denied</h2>
                <p>Your role ({user.role}) does not have permission to view this page.</p>
                <a href="/tickets" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Go to Ticket List</a>
            </div>
        );
    }

    return children ? children : <Outlet />;
};

export default ProtectedRoute;
