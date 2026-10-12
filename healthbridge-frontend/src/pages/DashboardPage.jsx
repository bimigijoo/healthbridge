import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import api from "../services/api";
import { Activity, ClipboardList, ContactRound, Share2 } from "lucide-react";
import PageStatus from "../components/PageStatus";

function DashboardPage() {
    const { user } = useAuth();
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

        const timer = window.setTimeout(() => {
            if (user?.id) {
                void loadHealthProfile();
            } else {
                setLoading(false);
            }
        }, 0);

        return () => {
            window.clearTimeout(timer);
        };
    }, [user]);

    return (
        <div className="dashboard-page">

            <header className="dashboard-header">
                <div>
                    <h1>Overview</h1>
                    <p>Your health, connected.</p>
                </div>

            </header>

            <div className="dashboard-content">

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
                    <div className="error-message" role="alert">
                        {error}
                    </div>
                )}

                {loading ? (
                    <PageStatus loading title="Loading your health profile" />
                ) : (
                    <section className="dashboard-grid">

                        <div className="dashboard-card">
                            <ContactRound size={25} aria-hidden="true" />
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
                            <ClipboardList size={25} aria-hidden="true" />
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
                            <Share2 size={25} aria-hidden="true" />
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
                            <Activity size={25} aria-hidden="true" />
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

            </div>
        </div>
    );
}

export default DashboardPage;
