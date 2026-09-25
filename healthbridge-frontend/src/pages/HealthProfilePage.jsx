import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function HealthProfilePage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        healthId: "",
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
                "Unable to create the health profile. " +
                "Please check the information and try again."
            );
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <p>Loading health profile...</p>
            </div>
        );
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
                <div className="error-message">
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
                        Enter your basic health profile
                        information to create your Health ID.
                    </p>

                    <form
                        className="profile-form"
                        onSubmit={handleSubmit}
                    >

                        <div className="form-group">
                            <label htmlFor="healthId">
                                Health ID
                            </label>

                            <input
                                id="healthId"
                                name="healthId"
                                value={formData.healthId}
                                onChange={handleChange}
                                placeholder="Example: HB-KL-2026-001285"
                                required
                            />
                        </div>

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

                            <input
                                id="gender"
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="bloodGroup">
                                Blood Group
                            </label>

                            <input
                                id="bloodGroup"
                                name="bloodGroup"
                                value={formData.bloodGroup}
                                onChange={handleChange}
                                placeholder="Example: O+"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="emergencyContact">
                                Emergency Contact
                            </label>

                            <input
                                id="emergencyContact"
                                name="emergencyContact"
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
                        >
                            Create Health Profile
                        </button>

                    </form>

                </section>
            )}

        </div>
    );
}

export default HealthProfilePage;