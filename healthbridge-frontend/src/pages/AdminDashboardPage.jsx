import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function AdminDashboardPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadUsers = async () => {
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
        };

        loadUsers();
    }, []);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

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
                    maxWidth: "1100px",
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
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "20px",
                        }}
                    >
                        <h2 style={{ margin: 0 }}>
                            User Management
                        </h2>

                        <span
                            style={{
                                fontWeight: "bold",
                            }}
                        >
                            Total Users: {users.length}
                        </span>
                    </div>

                    {loading && (
                        <p>Loading users...</p>
                    )}

                    {error && (
                        <div
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

                    {!loading && !error && users.length === 0 && (
                        <p>No users found.</p>
                    )}

                    {!loading && !error && users.length > 0 && (
                        <div
                            style={{
                                overflowX: "auto",
                            }}
                        >
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                }}
                            >
                                <thead>
                                <tr>
                                    <th
                                        style={{
                                            textAlign: "left",
                                            padding: "12px",
                                            borderBottom:
                                                "2px solid #ddd",
                                        }}
                                    >
                                        ID
                                    </th>

                                    <th
                                        style={{
                                            textAlign: "left",
                                            padding: "12px",
                                            borderBottom:
                                                "2px solid #ddd",
                                        }}
                                    >
                                        Name
                                    </th>

                                    <th
                                        style={{
                                            textAlign: "left",
                                            padding: "12px",
                                            borderBottom:
                                                "2px solid #ddd",
                                        }}
                                    >
                                        Email
                                    </th>

                                    <th
                                        style={{
                                            textAlign: "left",
                                            padding: "12px",
                                            borderBottom:
                                                "2px solid #ddd",
                                        }}
                                    >
                                        Role
                                    </th>
                                </tr>
                                </thead>

                                <tbody>
                                {users.map((account) => (
                                    <tr key={account.id}>
                                        <td
                                            style={{
                                                padding: "12px",
                                                borderBottom:
                                                    "1px solid #eee",
                                            }}
                                        >
                                            {account.id}
                                        </td>

                                        <td
                                            style={{
                                                padding: "12px",
                                                borderBottom:
                                                    "1px solid #eee",
                                            }}
                                        >
                                            {account.name}
                                        </td>

                                        <td
                                            style={{
                                                padding: "12px",
                                                borderBottom:
                                                    "1px solid #eee",
                                            }}
                                        >
                                            {account.email}
                                        </td>

                                        <td
                                            style={{
                                                padding: "12px",
                                                borderBottom:
                                                    "1px solid #eee",
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {account.role}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default AdminDashboardPage;