import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function AdminDashboardPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [updatingUserId, setUpdatingUserId] = useState(null);

    const loadUsers = useCallback(async () => {
        try {
            setError("");

            const response = await api.get("/admin/users");
            setUsers(response.data);
        } catch (err) {
            const message =
                err.response?.data?.message ||
                "Unable to load users.";

            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadUsers();
        }, 0);

        return () => clearTimeout(timer);
    }, [loadUsers]);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const handleToggleStatus = async (account) => {
        const nextActive = !account.active;
        const action = nextActive ? "activate" : "deactivate";

        const confirmed = window.confirm(
            `Are you sure you want to ${action} the account for ${account.name}?`
        );

        if (!confirmed) {
            return;
        }

        setError("");
        setStatusMessage("");
        setUpdatingUserId(account.id);

        try {
            const response = await api.patch(
                `/admin/users/${account.id}/status`,
                { active: nextActive }
            );

            setStatusMessage(
                response.data?.message ||
                `User account ${nextActive ? "activated" : "deactivated"} successfully.`
            );

            await loadUsers();
        } catch (err) {
            const message =
                err.response?.data?.message ||
                `Unable to ${action} this account.`;

            setError(message);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const activeUsers = users.filter((account) => account.active).length;
    const inactiveUsers = users.length - activeUsers;

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#f5f7fa",
                padding: "40px",
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    maxWidth: "1200px",
                    margin: "0 auto",
                }}
            >
                <header
                    style={{
                        backgroundColor: "#ffffff",
                        padding: "30px",
                        borderRadius: "12px",
                        marginBottom: "25px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "20px",
                        }}
                    >
                        <div>
                            <h1
                                style={{
                                    margin: "0 0 8px",
                                    fontSize: "32px",
                                }}
                            >
                                HealthBridge Admin Portal
                            </h1>

                            <p
                                style={{
                                    margin: 0,
                                    color: "#666",
                                }}
                            >
                                System administration and user management
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleLogout}
                            style={{
                                padding: "10px 18px",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                backgroundColor: "#333",
                                color: "#fff",
                            }}
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <section
                    style={{
                        backgroundColor: "#ffffff",
                        padding: "30px",
                        borderRadius: "12px",
                        marginBottom: "25px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                    }}
                >
                    <h2
                        style={{
                            marginTop: 0,
                            marginBottom: "10px",
                        }}
                    >
                        Welcome, {user?.name}
                    </h2>

                    <p
                        style={{
                            margin: 0,
                            color: "#666",
                        }}
                    >
                        Role: <strong>{user?.role}</strong>
                    </p>
                </section>

                <section
                    style={{
                        backgroundColor: "#ffffff",
                        padding: "30px",
                        borderRadius: "12px",
                        marginBottom: "25px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                    }}
                >
                    <h2 style={{ marginTop: 0 }}>
                        Account Overview
                    </h2>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: "16px",
                        }}
                    >
                        <div
                            style={{
                                padding: "20px",
                                backgroundColor: "#f5f7fa",
                                borderRadius: "8px",
                            }}
                        >
                            <p style={{ margin: "0 0 8px", color: "#666" }}>
                                Total Users
                            </p>

                            <h3 style={{ margin: 0, fontSize: "28px" }}>
                                {users.length}
                            </h3>
                        </div>

                        <div
                            style={{
                                padding: "20px",
                                backgroundColor: "#e8f7ee",
                                borderRadius: "8px",
                            }}
                        >
                            <p style={{ margin: "0 0 8px", color: "#276749" }}>
                                Active Accounts
                            </p>

                            <h3 style={{ margin: 0, fontSize: "28px" }}>
                                {activeUsers}
                            </h3>
                        </div>

                        <div
                            style={{
                                padding: "20px",
                                backgroundColor: "#ffecec",
                                borderRadius: "8px",
                            }}
                        >
                            <p style={{ margin: "0 0 8px", color: "#b00020" }}>
                                Inactive Accounts
                            </p>

                            <h3 style={{ margin: 0, fontSize: "28px" }}>
                                {inactiveUsers}
                            </h3>
                        </div>
                    </div>
                </section>

                <section
                    style={{
                        backgroundColor: "#ffffff",
                        padding: "30px",
                        borderRadius: "12px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "16px",
                            marginBottom: "20px",
                        }}
                    >
                        <h2 style={{ margin: 0 }}>
                            User Management
                        </h2>

                        <button
                            type="button"
                            onClick={loadUsers}
                            disabled={loading}
                            style={{
                                padding: "9px 14px",
                                border: "1px solid #ccc",
                                borderRadius: "6px",
                                backgroundColor: "#fff",
                                cursor: loading ? "not-allowed" : "pointer",
                            }}
                        >
                            Refresh
                        </button>
                    </div>

                    {loading && <p>Loading users...</p>}

                    {error && (
                        <div
                            role="alert"
                            style={{
                                padding: "12px",
                                marginBottom: "15px",
                                borderRadius: "6px",
                                backgroundColor: "#ffe5e5",
                                color: "#b00020",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {statusMessage && (
                        <div
                            role="status"
                            style={{
                                padding: "12px",
                                marginBottom: "15px",
                                borderRadius: "6px",
                                backgroundColor: "#e8f7ee",
                                color: "#276749",
                            }}
                        >
                            {statusMessage}
                        </div>
                    )}

                    {!loading && !error && users.length === 0 && (
                        <p>No users found.</p>
                    )}

                    {!loading && !error && users.length > 0 && (
                        <div style={{ overflowX: "auto" }}>
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                }}
                            >
                                <thead>
                                <tr>
                                    {["ID", "Name", "Email", "Role", "Status", "Action"].map(
                                        (heading) => (
                                            <th
                                                key={heading}
                                                style={{
                                                    textAlign: "left",
                                                    padding: "12px",
                                                    borderBottom: "2px solid #ddd",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {heading}
                                            </th>
                                        )
                                    )}
                                </tr>
                                </thead>

                                <tbody>
                                {users.map((account) => {
                                    const isCurrentUser =
                                        account.email === user?.email;

                                    return (
                                        <tr key={account.id}>
                                            <td style={cellStyle}>
                                                {account.id}
                                            </td>

                                            <td style={cellStyle}>
                                                {account.name}
                                            </td>

                                            <td style={cellStyle}>
                                                {account.email}
                                            </td>

                                            <td
                                                style={{
                                                    ...cellStyle,
                                                    fontWeight: "bold",
                                                }}
                                            >
                                                {account.role}
                                            </td>

                                            <td style={cellStyle}>
                                                    <span
                                                        style={{
                                                            display: "inline-block",
                                                            padding: "5px 10px",
                                                            borderRadius: "20px",
                                                            fontSize: "13px",
                                                            fontWeight: "bold",
                                                            backgroundColor: account.active
                                                                ? "#e8f7ee"
                                                                : "#ffe5e5",
                                                            color: account.active
                                                                ? "#276749"
                                                                : "#b00020",
                                                        }}
                                                    >
                                                        {account.active
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </span>
                                            </td>

                                            <td style={cellStyle}>
                                                {isCurrentUser ? (
                                                    <span
                                                        style={{
                                                            color: "#666",
                                                            fontSize: "13px",
                                                        }}
                                                    >
                                                            Current account
                                                        </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            updatingUserId === account.id
                                                        }
                                                        onClick={() =>
                                                            handleToggleStatus(account)
                                                        }
                                                        style={{
                                                            padding: "8px 12px",
                                                            border: "none",
                                                            borderRadius: "6px",
                                                            cursor:
                                                                updatingUserId === account.id
                                                                    ? "not-allowed"
                                                                    : "pointer",
                                                            backgroundColor: account.active
                                                                ? "#b00020"
                                                                : "#237a45",
                                                            color: "#fff",
                                                            opacity:
                                                                updatingUserId === account.id
                                                                    ? 0.6
                                                                    : 1,
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {updatingUserId === account.id
                                                            ? "Updating..."
                                                            : account.active
                                                                ? "Deactivate"
                                                                : "Activate"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

const cellStyle = {
    padding: "12px",
    borderBottom: "1px solid #eee",
    verticalAlign: "middle",
};

export default AdminDashboardPage;