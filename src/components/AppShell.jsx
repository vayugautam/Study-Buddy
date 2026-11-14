import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";

const navigation = [
  { to: "/app", label: "Overview", icon: "grid", end: true },
  { to: "/app/documents", label: "My documents", icon: "files" },
  { to: "/app/chat", label: "AI study chat", icon: "spark" },
  { to: "/app/conversations", label: "Conversations", icon: "clock" },
];

const pageNames = {
  "/app": "Overview",
  "/app/documents": "My documents",
  "/app/chat": "AI study chat",
  "/app/conversations": "Conversations",
  "/app/account": "Your account",
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const title = pageNames[location.pathname] || "Study Buddy";
  const chatMode = location.pathname === "/app/chat";
  const initials = (user?.email || "S").slice(0, 1).toUpperCase();

  const signOut = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className={`app-frame${chatMode ? " chat-mode" : ""}`}>
      {!chatMode && mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      {!chatMode && <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <NavLink className="brand-lockup" to="/app" onClick={() => setMobileOpen(false)}>
          <span className="brand-mark"><Icon name="book" size={22} /></span>
          <span><strong>study buddy</strong><small>AI learning workspace</small></span>
        </NavLink>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}>
              <Icon name={item.icon} size={19} /><span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <span className="note-icon"><Icon name="spark" size={17} /></span>
          <strong>Grounded in your material</strong>
          <p>Answers are built from your PDFs and linked back to their sources.</p>
        </div>
        <div className="sidebar-account">
          <div className="avatar">{initials}</div>
          <div className="account-copy"><strong>{user?.email}</strong><span>Personal workspace</span></div>
          <button className="icon-button signout-button" title="Sign out" aria-label="Sign out" onClick={signOut}><Icon name="logout" size={18} /></button>
        </div>
      </aside>}

      <div className="app-main">
        {!chatMode && <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Icon name="menu" /></button>
          <div className="topbar-title"><span className="eyebrow">STUDY BUDDY AI</span><strong>{title}</strong></div>
          <div className="topbar-actions">
            <NavLink className="topbar-profile" to="/app/account" title="Account settings"><span className="avatar avatar-small">{initials}</span><span>Account</span></NavLink>
          </div>
        </header>}
        <main className={`page-content${chatMode ? " chat-page-content" : ""}`}><Outlet /></main>
      </div>
    </div>
  );
}
