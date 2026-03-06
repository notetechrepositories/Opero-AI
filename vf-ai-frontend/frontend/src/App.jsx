import React from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import RaiseTicket from "./components/RaiseTicket";
import TicketList from "./components/TicketList";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import UserManagement from "./components/UserManagement";
import { useAuth } from "./context/AuthContext";

const Layout = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">VF</div>
          <span>AI Desk</span>
        </div>

        <div className="sidebar-nav">
          {user && user.role !== "Staff" && (
            <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              📊 Dashboard
            </NavLink>
          )}
          {(!user || (user && user.role !== "Staff" && user.role !== "CompanyAdmin")) && (
            <NavLink to="/raise-ticket" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              🎫 Raise Ticket
            </NavLink>
          )}
          {user && (
            <NavLink to="/tickets" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              📁 Ticket List
            </NavLink>
          )}
          {user && (user.role === "SuperAdmin" || user.role === "CompanyAdmin") && (
            <NavLink to="/users" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              👥 User Management
            </NavLink>
          )}
          <div className="nav-item">
            ⚙️ Settings
          </div>
        </div>

        <div className="sidebar-footer">
          {user ? (
            <div className="user-profile">
              <div className="user-avatar">{user.email ? user.email.substring(0, 2).toUpperCase() : "U"}</div>
              <div className="user-info">
                <span className="user-name">{user.email}</span>
                <span className="user-role">{user.role}</span>
              </div>
              <button onClick={logout} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Logout</button>
            </div>
          ) : (
            <div className="user-profile" style={{ justifyContent: 'center', width: '100%' }}>
              <NavLink to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold', display: 'block', width: '100%', textAlign: 'center', padding: '10px', background: '#eef2ff', borderRadius: '6px' }}>Staff Login</NavLink>
            </div>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <div className="main-wrapper">
        <header className="top-header">
          <h1 className="page-title">VF AI Support Desk</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>
            {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout><ProtectedRoute allowedRoles={["SuperAdmin", "CompanyAdmin"]}><Dashboard /></ProtectedRoute></Layout>} />
        <Route path="/raise-ticket" element={<Layout><RaiseTicket /></Layout>} />
        <Route path="/tickets" element={<Layout><ProtectedRoute><TicketList /></ProtectedRoute></Layout>} />
        <Route path="/users" element={<Layout><ProtectedRoute allowedRoles={["SuperAdmin", "CompanyAdmin"]}><UserManagement /></ProtectedRoute></Layout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;