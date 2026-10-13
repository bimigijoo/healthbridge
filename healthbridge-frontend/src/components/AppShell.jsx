import { NavLink, Link, useNavigate } from "react-router-dom";
import { Activity, ClipboardList, ContactRound, HeartPulse, LayoutDashboard, LogOut, ShieldCheck, Share2, Users } from "lucide-react";
import { useAuth } from "../context/useAuth";

const workerLinks = [
    ["/dashboard", "Overview", LayoutDashboard],
    ["/health-profile", "Health profile", HeartPulse],
    ["/health-passport", "Health passport", ContactRound],
    ["/medical-records", "Medical records", ClipboardList],
    ["/health-timeline", "Health timeline", Activity],
    ["/share-records", "Consent & sharing", Share2],
];

export default function AppShell({ children, publicAccess = false, publicLabel = "Provider access" }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const links = user?.role === "ADMIN" ? [["/admin", "Account management", Users]] : workerLinks;

    if (publicAccess) {
        return <div className="provider-shell">
            <header className="public-header">
                <Link to="/login" className="brand"><HeartPulse aria-hidden="true" /><span>HealthBridge</span></Link>
                <span className="workspace-label"><ShieldCheck size={16} aria-hidden="true" /> {publicLabel}</span>
            </header>
            <main id="main-content">{children}</main>
        </div>;
    }

    return <div className="app-shell">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <aside className="sidebar">
            <Link to={user?.role === "ADMIN" ? "/admin" : "/dashboard"} className="brand">
                <HeartPulse aria-hidden="true" /><span>HealthBridge</span>
            </Link>
            <span className="nav-label">{user?.role === "ADMIN" ? "Administration" : "My health"}</span>
            <nav aria-label="Main navigation">
                {links.map(([to, label, Icon]) => <NavLink key={to} to={to}>
                    <Icon size={19} aria-hidden="true" /><span>{label}</span>
                </NavLink>)}
            </nav>
            <div className="sidebar-footer">
                <span className="workspace-label"><ShieldCheck size={16} aria-hidden="true" /> Consent-based care</span>
                <Link to="/provider-access">Provider access <Share2 size={15} aria-hidden="true" /></Link>
            </div>
        </aside>
        <div className="workspace">
            <header className="workspace-header">
                <span className="workspace-label">{user?.role === "ADMIN" ? "Administration" : "Worker workspace"}</span>
                <div className="account-menu">
                    <span className="avatar" aria-hidden="true">{user?.name?.slice(0, 1).toUpperCase()}</span>
                    <span className="account-name">{user?.name}</span>
                    <button type="button" className="icon-button" title="Sign out" aria-label="Sign out"
                        onClick={() => { logout(); navigate("/login", { replace: true }); }}>
                        <LogOut size={19} aria-hidden="true" />
                    </button>
                </div>
            </header>
            <main id="main-content" className="workspace-content">{children}</main>
        </div>
    </div>;
}
