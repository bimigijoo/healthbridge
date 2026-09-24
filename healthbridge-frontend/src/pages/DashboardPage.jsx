import { useAuth } from "../context/AuthContext";

function DashboardPage() {
    const { user, logout } = useAuth();

    return (
        <div>
            <h1>HealthBridge Dashboard</h1>

            <p>
                Welcome, {user?.name}
            </p>

            <p>
                Email: {user?.email}
            </p>

            <p>
                Role: {user?.role}
            </p>

            <button onClick={logout}>
                Logout
            </button>
        </div>
    );
}

export default DashboardPage;