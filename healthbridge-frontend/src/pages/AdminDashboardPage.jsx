import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, UserCheck, UserX } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import PageStatus from "../components/PageStatus";

function AdminDashboardPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [updatingUserId, setUpdatingUserId] = useState(null);
    const [overview, setOverview] = useState(null);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [overviewError, setOverviewError] = useState("");
    const overviewRequest = useRef(0);

    const loadOverview = useCallback(async () => {
        const request = ++overviewRequest.current;
        setOverviewLoading(true);
        setOverviewError("");
        try {
            const response = await api.get("/admin/overview");
            if (request !== overviewRequest.current) return;
            setOverview(response.data);
        } catch (err) {
            if (request !== overviewRequest.current) return;
            setOverview(null);
            setOverviewError(err.response?.data?.message || "Administration overview could not be loaded.");
        } finally { if (request === overviewRequest.current) setOverviewLoading(false); }
    }, []);

    const loadUsers = useCallback(async () => {
        void loadOverview();
        try {
            setLoading(true);
            setError("");
            const response = await api.get("/admin/users");
            setUsers(response.data);
        } catch (err) {
            setError(err.response?.data?.message || "Unable to load users.");
        } finally {
            setLoading(false);
        }
    }, [loadOverview]);

    useEffect(() => {
        const timer = window.setTimeout(() => void loadUsers(), 0);
        return () => window.clearTimeout(timer);
    }, [loadUsers]);

    const handleToggleStatus = async (account) => {
        const nextActive = !account.active;
        const action = nextActive ? "activate" : "deactivate";
        if (!window.confirm(`Are you sure you want to ${action} the account for ${account.name}?`)) return;
        setError("");
        setStatusMessage("");
        setUpdatingUserId(account.id);
        try {
            const response = await api.patch(`/admin/users/${account.id}/status`, { active: nextActive });
            setStatusMessage(response.data?.message || `User account ${nextActive ? "activated" : "deactivated"} successfully.`);
            await loadUsers();
        } catch (err) {
            setError(err.response?.data?.message || `Unable to ${action} this account.`);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const activeUsers = users.filter(account => account.active).length;

    return <div className="page-container">
        <header className="page-header">
            <div><h1>Account management</h1><p>HealthBridge administration</p></div>
            <button type="button" className="secondary-button" onClick={() => void loadUsers()} disabled={loading}>
                <RefreshCw size={16} aria-hidden="true" /> Refresh
            </button>
        </header>
        {!loading && !error && <div className="metric-grid" aria-label="Account overview">
            <div className="metric"><span>Total users</span><strong>{users.length}</strong></div>
            <div className="metric success"><span>Active accounts</span><strong>{activeUsers}</strong></div>
            <div className="metric danger"><span>Inactive accounts</span><strong>{users.length - activeUsers}</strong></div>
        </div>}
        {statusMessage && <div className="success-message" role="status">{statusMessage}</div>}
        <section className="ui-section" aria-label="Administration overview">
            <h2>Workspace Overview</h2>
            {overviewLoading ? <p role="status">Loading administration overview...</p> : overviewError ?
                <div className="error-message" role="alert">{overviewError}
                    <button type="button" className="link-button" onClick={() => void loadOverview()}>Retry overview</button>
                </div> : overview && <>
                    <div className="metric-grid admin-metric-grid">
                        {[["Workers", "workers"], ["Worker profiles", "healthProfiles"], ["Sharing sessions", "sharingSessions"],
                            ["Active sessions", "activeSessions"]].map(([label, key]) =>
                            <div className="metric" key={key}><span>{label}</span><strong>{overview[key]}</strong></div>)}
                    </div>
                    <h3>Sharing Session Status</h3>
                    <dl className="admin-summary-grid">
                        {[["Expired", "expiredSessions"], ["Revoked", "revokedSessions"], ["Blocked by inactive worker", "inactiveWorkerSessions"]]
                            .map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{overview[key]}</dd></div>)}
                    </dl>
                    <h3>Recorded Consent Activity</h3>
                    <dl className="admin-summary-grid">
                        {[["Record views", "recordViews"], ["Consultations added", "consultationsAdded"], ["Audit events, last 24 hours", "auditEventsLast24Hours"]]
                            .map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{overview[key]}</dd></div>)}
                    </dl>
                </>}
        </section>
        {loading ? <PageStatus loading title="Loading accounts" /> : error ?
            <PageStatus error title="Accounts could not be loaded" description={error} onRetry={() => void loadUsers()} /> :
            users.length === 0 ? <PageStatus title="No accounts found" /> :
            <section className="ui-section">
                <h2>Users</h2>
                <div className="table-scroll" tabIndex={0} aria-label="Users table">
                    <table>
                        <thead><tr>{["ID", "Name", "Email", "Role", "Status", "Action"].map(heading =>
                            <th scope="col" key={heading}>{heading}</th>)}</tr></thead>
                        <tbody>{users.map(account => <tr key={account.id}>
                            <td>{account.id}</td><td>{account.name}</td><td>{account.email}</td><td>{account.role}</td>
                            <td><span className={`status-badge ${account.active ? "active" : "inactive"}`}>
                                {account.active ? "Active" : "Inactive"}
                            </span></td>
                            <td>{account.email === user?.email ? <span>Current account</span> :
                                <button type="button" className={account.active ? "danger-button" : "success-button"}
                                    disabled={updatingUserId !== null} onClick={() => void handleToggleStatus(account)}>
                                    {account.active ? <UserX size={16} aria-hidden="true" /> : <UserCheck size={16} aria-hidden="true" />}
                                    {updatingUserId === account.id ? "Updating..." : account.active ? "Deactivate" : "Activate"}
                                </button>}
                            </td>
                        </tr>)}</tbody>
                    </table>
                </div>
            </section>}
    </div>;
}

export default AdminDashboardPage;
