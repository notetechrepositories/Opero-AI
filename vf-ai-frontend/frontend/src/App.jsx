import React, { useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import RaiseTicket from "./components/RaiseTicket";
import TicketList from "./components/TicketList";
import Login from "./components/Login";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import UserManagement from "./components/UserManagement";
import CompanyList from "./components/CompanyList";
import CompanyDetails from "./components/CompanyDetails";
import { useAuth } from "./context/AuthContext";
import {
  Menu, X, LayoutDashboard, TicketPlus, List,
  Users, Building2, Settings, LogOut, Bell, Search
} from "lucide-react";

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="dashboard-layout">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={closeMobileMenu}></div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">VF</div>
          <span>AI Desk</span>
          <button className="mobile-close-btn" onClick={closeMobileMenu}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-nav">
          <span className="nav-section-label">General</span>
          {user && (
            <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")} onClick={closeMobileMenu}>
              <LayoutDashboard size={18} strokeWidth={2} />
              <span>Dashboard</span>
            </NavLink>
          )}
          {(!user || (user && user.role !== "Staff" && user.role !== "CompanyAdmin")) && (
            <NavLink to="/raise-ticket" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")} onClick={closeMobileMenu}>
              <TicketPlus size={18} strokeWidth={2} />
              <span>Raise Ticket</span>
            </NavLink>
          )}

          <span className="nav-section-label">Work Management</span>
          {user && (
            <NavLink to="/tickets" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")} onClick={closeMobileMenu}>
              <List size={18} strokeWidth={2} />
              <span>Ticket List</span>
            </NavLink>
          )}
          {user && (user.role === "SuperAdmin" || user.role === "CompanyAdmin") && (
            <NavLink to="/users" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")} onClick={closeMobileMenu}>
              <Users size={18} strokeWidth={2} />
              <span>User Management</span>
            </NavLink>
          )}
          {user && user.role === "SuperAdmin" && (
            <NavLink to="/companies" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")} onClick={closeMobileMenu}>
              <Building2 size={18} strokeWidth={2} />
              <span>Companies</span>
            </NavLink>
          )}

          <span className="nav-section-label">System</span>
          <div className="nav-item">
            <Settings size={18} strokeWidth={2} />
            <span>Settings</span>
          </div>

          {user && (
            <div className="nav-item logout-btn" onClick={logout} style={{ marginTop: '12px', borderTop: '1px solid var(--color-sidebar-border)', paddingTop: '16px', borderRadius: 0 }}>
              <LogOut size={18} strokeWidth={2} />
              <span>Logout</span>
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          {user ? (
            <div className="user-profile">
              <div className="user-avatar">{user.email ? user.email.substring(0, 2).toUpperCase() : "U"}</div>
              <div className="user-info">
                <span className="user-name">{user.email}</span>
                <span className="user-role">{user.role}</span>
              </div>
            </div>
          ) : (
            <div className="user-profile" style={{ justifyContent: 'center', width: '100%' }}>
              <NavLink to="/login" style={{ color: 'var(--color-brand)', textDecoration: 'none', fontWeight: '500', display: 'block', width: '100%', textAlign: 'center', padding: '6px', background: 'var(--color-bg-sunken)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>Staff Login</NavLink>
            </div>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <div className="main-wrapper">
        <header className="top-header">
          <div className="header-left">
            <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
              <Menu size={20} />
            </button>
            <h1 className="page-title">VF AI Support Desk</h1>
          </div>

          <div className="header-right">
            <div className="header-search">
              <Search size={16} />
              <input type="text" placeholder="Search..." />
            </div>
            <button className="utility-btn">
              <Bell size={18} />
            </button>
            <div style={{ color: 'var(--color-text-subtle)', fontSize: '13px', fontWeight: '500', marginLeft: '12px' }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
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
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<Layout><ProtectedRoute allowedRoles={["SuperAdmin", "CompanyAdmin", "Staff"]}><Dashboard /></ProtectedRoute></Layout>} />
        <Route path="/raise-ticket" element={<Layout><RaiseTicket /></Layout>} />
        <Route path="/tickets" element={<Layout><ProtectedRoute><TicketList /></ProtectedRoute></Layout>} />
        <Route path="/users" element={<Layout><ProtectedRoute allowedRoles={["SuperAdmin", "CompanyAdmin"]}><UserManagement /></ProtectedRoute></Layout>} />
        <Route path="/companies" element={<Layout><ProtectedRoute allowedRoles={["SuperAdmin"]}><CompanyList /></ProtectedRoute></Layout>} />
        <Route path="/companies/:companyId" element={<Layout><ProtectedRoute allowedRoles={["SuperAdmin"]}><CompanyDetails /></ProtectedRoute></Layout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;