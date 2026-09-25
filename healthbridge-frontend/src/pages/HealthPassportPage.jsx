import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function HealthPassportPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [qrImage, setQrImage] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let qrUrl = "";

        const loadPassport = async () => {
            try {
                const profileResponse = await api.get(
                    `/health-profile/user/${user.id}`
                );

                const profileData = profileResponse.data;

                setProfile(profileData);

                const qrResponse = await api.get(
                    `/health-profile/${profileData.id}/qr`,
                    {
                        responseType: "blob",
                    }
                );

                qrUrl = URL.createObjectURL(
                    qrResponse.data
                );

                setQrImage(qrUrl);
            } catch (err) {
                setError(
                    "Unable to load your digital health passport."
                );
            } finally {
                setLoading(false);
            }
        };

        if (user?.id) {
            loadPassport();
        } else {
            setLoading(false);
        }

        return () => {
            if (qrUrl) {
                URL.revokeObjectURL(qrUrl);
            }
        };
    }, [user]);

    if (loading) {
        return (
            <div className="page-container">
                <p>Loading your digital health passport...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container">
                <div className="error-message">
                    {error}
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={() => navigate("/dashboard")}
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="page-container">
                <p>
                    No health profile was found.
                </p>

                <button
                    type="button"
                    className="primary-button"
                    onClick={() =>
                        navigate("/health-profile")
                    }
                >
                    Create Health Profile
                </button>
            </div>
        );
    }

    return (
        <div className="page-container">

            <header className="page-header">
                <div>
                    <h1>Digital Health Passport</h1>
                    <p>
                        Your portable HealthBridge health identity
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

            <main className="passport-card">

                <section className="passport-header">
                    <div>
                        <h2>HealthBridge</h2>
                        <p>
                            Digital Health Passport
                        </p>
                    </div>

                    <div className="health-id">
                        <span>Health ID</span>
                        <strong>
                            {profile.healthId}
                        </strong>
                    </div>
                </section>

                <section className="passport-content">

                    <div className="passport-details">

                        <div className="passport-field">
                            <span>Name</span>
                            <strong>
                                {user.name}
                            </strong>
                        </div>

                        <div className="passport-field">
                            <span>Date of Birth</span>
                            <strong>
                                {profile.dateOfBirth ||
                                    "Not provided"}
                            </strong>
                        </div>

                        <div className="passport-field">
                            <span>Gender</span>
                            <strong>
                                {profile.gender ||
                                    "Not provided"}
                            </strong>
                        </div>

                        <div className="passport-field">
                            <span>Blood Group</span>
                            <strong>
                                {profile.bloodGroup ||
                                    "Not provided"}
                            </strong>
                        </div>

                        <div className="passport-field">
                            <span>Emergency Contact</span>
                            <strong>
                                {profile.emergencyContact ||
                                    "Not provided"}
                            </strong>
                        </div>

                        <div className="passport-field">
                            <span>Preferred Language</span>
                            <strong>
                                {profile.preferredLanguage ||
                                    "Not provided"}
                            </strong>
                        </div>

                    </div>

                    <div className="passport-qr">
                        <h3>Health ID QR</h3>

                        {qrImage && (
                            <img
                                src={qrImage}
                                alt="HealthBridge Health ID QR Code"
                            />
                        )}

                        <p>
                            Scan this QR to identify the
                            HealthBridge health profile.
                        </p>
                    </div>

                </section>

                <section className="passport-notice">
                    <strong>Privacy notice</strong>

                    <p>
                        This QR code contains a HealthBridge
                        identifier only. Medical records are
                        not stored directly inside the QR code.
                    </p>
                </section>

            </main>

        </div>
    );
}

export default HealthPassportPage;