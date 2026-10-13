import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import api from "../services/api";
import PageStatus from "../components/PageStatus";

function HealthProfilePage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        dateOfBirth: "",
        gender: "",
        bloodGroup: "",
        emergencyContact: "",
        preferredLanguage: "",
    });

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await api.get(
                    `/health-profile/user/${user.id}`
                );

                setProfile(response.data);
            } catch (err) {
                if (err.response?.status !== 404) {
                    setError(
                        "Unable to load your health profile."
                    );
                }
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [user.id]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setSubmitting(true);

        try {
            const response = await api.post(
                "/health-profile",
                {
                    userId: user.id,
                    ...formData,
                }
            );

            setProfile(response.data);
        } catch (err) {
            setError(
                err.response?.status === 409 ? "A health profile already exists for your account. Reload to view it." :
                err.response?.data?.message || "Unable to create the health profile. Please check the information and try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <PageStatus loading title="Loading health profile" />;
    }

    return (
        <div className="page-container">

            <header className="page-header">
                <div>
                    <h1>Health Profile</h1>
                    <p>
                        Your personal digital health information
                    </p>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={() => navigate("/dashboard")}
                >
                    Back to Dashboard
                </button>
            </header>

            {error && (
                <div className="error-message" role="alert">
                    {error}
                </div>
            )}

            {profile ? (
                <section className="profile-card">

                    <h2>Digital Health Profile</h2>

                    <div className="profile-grid">

                        <div>
                            <span>Health ID</span>
                            <strong>
                                {profile.healthId}
                            </strong>
                        </div>

                        <div>
                            <span>Date of Birth</span>
                            <strong>
                                {profile.dateOfBirth ||
                                    "Not provided"}
                            </strong>
                        </div>

                        <div>
                            <span>Gender</span>
                            <strong>
                                {profile.gender ||
                                    "Not provided"}
                            </strong>
                        </div>

                        <div>
                            <span>Blood Group</span>
                            <strong>
                                {profile.bloodGroup ||
                                    "Not provided"}
                            </strong>
                        </div>

                        <div>
                            <span>Emergency Contact</span>
                            <strong>
                                {profile.emergencyContact ||
                                    "Not provided"}
                            </strong>
                        </div>

                        <div>
                            <span>Preferred Language</span>
                            <strong>
                                {profile.preferredLanguage ||
                                    "Not provided"}
                            </strong>
                        </div>

                    </div>

                    <button
                        type="button"
                        className="primary-button"
                        onClick={() =>
                            navigate("/health-passport")
                        }
                    >
                        View Digital Health Passport
                    </button>

                </section>
            ) : (
                <section className="profile-card">

                    <h2>Create Your Health Profile</h2>

                    <p>
                        Basic health information
                    </p>

                    <form
                        className="profile-form"
                        onSubmit={handleSubmit}
                    >

                        <div className="form-group">
                            <label htmlFor="dateOfBirth">
                                Date of Birth
                            </label>

                            <input
                                id="dateOfBirth"
                                name="dateOfBirth"
                                type="date"
                                value={formData.dateOfBirth}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="gender">
                                Gender
                            </label>

                            <select
                                id="gender"
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                            >
                                <option value="">Not provided</option>
                                <option>Female</option><option>Male</option><option>Other</option>
                                <option>Prefer not to say</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="bloodGroup">
                                Blood Group
                            </label>

                            <select
                                id="bloodGroup"
                                name="bloodGroup"
                                value={formData.bloodGroup}
                                onChange={handleChange}
                            >
                                <option value="">Not provided</option>
                                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(group => <option key={group}>{group}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="emergencyContact">
                                Emergency Contact
                            </label>

                            <input
                                id="emergencyContact"
                                name="emergencyContact"
                                type="tel"
                                value={formData.emergencyContact}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="preferredLanguage">
                                Preferred Language
                            </label>

                            <input
                                id="preferredLanguage"
                                name="preferredLanguage"
                                value={formData.preferredLanguage}
                                onChange={handleChange}
                                placeholder="Example: Malayalam"
                            />
                        </div>

                        <button
                            type="submit"
                            className="primary-button"
                            disabled={submitting}
                        >
                            {submitting ? "Creating profile..." : "Create Health Profile"}
                        </button>

                    </form>

                </section>
            )}

        </div>
    );
}

export default HealthProfilePage;
