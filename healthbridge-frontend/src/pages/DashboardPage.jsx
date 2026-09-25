import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [healthProfile, setHealthProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadHealthProfile = async () => {
            try {
                const response = await api.get(
                    `/health-profile/user/${user.id}`
                );

                setHealthProfile(response.data);
            } catch (err) {
                if (err.response?.status === 404) {
                    setHealthProfile(null);
                } else {
                    setError(
                        "Unable to load your health profile."
                    );
                }
            } finally {
                setLoading(false);
            }
        };

        if (user?.id) {
            loadHealthProfile();
        } else {
            setLoading(false);
        }
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="dashboard-page">

            <header className="dashboard-header">
                <div>
                    <h1>HealthBridge</h1>
                    <p>Digital Health Record Management</p>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={handleLogout}
                >
                    Logout
                </button>
            </header>

            <main className="dashboard-content">

                <section className="welcome-section">
                    <h2>
                        Welcome, {user?.name}
                    </h2>

                    <p>
                        Manage your digital health records,
                        health passport and record sharing
                        from one place.
                    </p>
                </section>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="loading-message">
                        Loading your health profile...
                    </div>
                ) : (
                    <section className="dashboard-grid">

                        <div className="dashboard-card">
                            <h3>Digital Health Passport</h3>

                            {healthProfile ? (
                                <>
                                    <p>
                                        <strong>Health ID:</strong>{" "}
                                        {healthProfile.healthId}
                                    </p>

                                    <p>
                                        <strong>Blood Group:</strong>{" "}
                                        {healthProfile.bloodGroup ||
                                            "Not provided"}
                                    </p>

                                    <button
                                        type="button"
                                        className="primary-button"
                                        onClick={() =>
                                            navigate(
                                                "/health-passport"
                                            )
                                        }
                                    >
                                        View Passport
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p>
                                        Your health profile has not
                                        been created yet.
                                    </p>

                                    <button
                                        type="button"
                                        className="primary-button"
                                        onClick={() =>
                                            navigate(
                                                "/health-profile"
                                            )
                                        }
                                    >
                                        Create Health Profile
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="dashboard-card">
                            <h3>Medical Records</h3>

                            <p>
                                View and manage your consultations,
                                diagnoses, medications, vaccinations
                                and laboratory records.
                            </p>

                            <button
                                type="button"
                                className="primary-button"
                                onClick={() =>
                                    navigate(
                                        "/medical-records"
                                    )
                                }
                            >
                                Medical Records
                            </button>
                        </div>

                        <div className="dashboard-card">
                            <h3>Share My Records</h3>

                            <p>
                                Create temporary, consent-based
                                access for healthcare providers.
                            </p>

                            <button
                                type="button"
                                className="primary-button"
                                onClick={() =>
                                    navigate(
                                        "/share-records"
                                    )
                                }
                            >
                                Share Records
                            </button>
                        </div>

                        <div className="dashboard-card">
                            <h3>Health Timeline</h3>

                            <p>
                                View your medical history and
                                follow-up activities chronologically.
                            </p>

                            <button
                                type="button"
                                className="primary-button"
                                onClick={() =>
                                    navigate(
                                        "/health-timeline"
                                    )
                                }
                            >
                                View Timeline
                            </button>
                        </div>

                    </section>
                )}

                <section className="account-section">
                    <h3>Account</h3>

                    <p>
                        <strong>Name:</strong>{" "}
                        {user?.name}
                    </p>

                    <p>
                        <strong>Email:</strong>{" "}
                        {user?.email}
                    </p>

                    <p>
                        <strong>Role:</strong>{" "}
                        {user?.role}
                    </p>
                </section>

            </main>
        </div>
    );
}

export default DashboardPage;