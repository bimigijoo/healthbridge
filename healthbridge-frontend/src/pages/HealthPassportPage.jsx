import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";
import PageStatus from "../components/PageStatus";

function HealthPassportPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [healthProfile, setHealthProfile] = useState(null);
    const [qrCodeUrl, setQrCodeUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!user?.id) {
            return;
        }

        const loadPassport = async () => {
            try {
                const profileResponse = await api.get(
                    `/health-profile/user/${user.id}`
                );

                const profile = profileResponse.data;
                setHealthProfile(profile);

                const qrResponse = await api.get(
                    `/health-profile/${profile.id}/qr`,
                    {
                        responseType: "blob",
                    }
                );

                const qrUrl = URL.createObjectURL(qrResponse.data);
                setQrCodeUrl(qrUrl);
            } catch (error) {
                setError(
                    error.response?.status === 404 ? "" : error.response?.data?.message ||
                    "Unable to load your digital health passport."
                );
            } finally {
                setLoading(false);
            }
        };

        void loadPassport();
    }, [user]);

    useEffect(() => {
        return () => {
            if (qrCodeUrl) {
                URL.revokeObjectURL(qrCodeUrl);
            }
        };
    }, [qrCodeUrl]);

    if (loading) {
        return <PageStatus loading title="Loading health passport" />;
    }

    if (error) {
        return <PageStatus error title="Passport could not be loaded" description={error}
            onRetry={() => window.location.reload()} />;
    }

    if (!healthProfile) {
        return <PageStatus title="Create your health profile" createProfile
            description="Your health passport will be available after you create a profile." />;
    }

    return (
        <div className="ui-page">
            <div className="ui-container">
                <div className="ui-header">
                    <div>
                        <h1 className="ui-title">
                            Digital Health Passport
                        </h1>

                        <p className="ui-subtitle">
                            Your portable HealthBridge identity and emergency
                            health information.
                        </p>
                    </div>

                    <button
                        className="secondary-button"
                        onClick={() => navigate("/dashboard")}
                    >
                        Back
                    </button>
                </div>

                <section className="ui-section">
                    <div className="ui-profileSection">
                        <div className="ui-profileInfo">
                            <h2 className="ui-sectionTitle">
                                Health Profile
                            </h2>

                            <div className="ui-infoRow">
                                <strong>Health ID</strong>
                                <span>
                  {healthProfile.healthId || "—"}
                </span>
                            </div>

                            <div className="ui-infoRow">
                                <strong>Name</strong>
                                <span>
                  {user?.name || "—"}
                </span>
                            </div>

                            <div className="ui-infoRow">
                                <strong>Date of Birth</strong>
                                <span>
                  {healthProfile.dateOfBirth || "—"}
                </span>
                            </div>

                            <div className="ui-infoRow">
                                <strong>Gender</strong>
                                <span>
                  {healthProfile.gender || "—"}
                </span>
                            </div>

                            <div className="ui-infoRow">
                                <strong>Blood Group</strong>
                                <span>
                  {healthProfile.bloodGroup || "—"}
                </span>
                            </div>

                            <div className="ui-infoRow">
                                <strong>Preferred Language</strong>
                                <span>
                  {healthProfile.preferredLanguage || "—"}
                </span>
                            </div>

                            <div className="ui-infoRow">
                                <strong>Emergency Contact</strong>
                                <span>
                  {healthProfile.emergencyContact || "—"}
                </span>
                            </div>
                        </div>

                        <div className="ui-qrSection">
                            <h2 className="ui-sectionTitle">
                                Health ID QR
                            </h2>

                            {qrCodeUrl ? (
                                <img
                                    src={qrCodeUrl}
                                    alt="HealthBridge Health ID QR code"
                                    className="ui-qrImage"
                                />
                            ) : (
                                <p>
                                    QR code is not available.
                                </p>
                            )}

                            <p className="ui-qrDescription">
                                This QR code represents your HealthBridge Health
                                ID. It does not contain your medical records.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="ui-section">
                    <h2 className="ui-sectionTitle">
                        Emergency Information
                    </h2>

                    <div className="ui-infoGrid">
                        <div className="ui-infoBox">
                            <strong>Blood Group</strong>
                            <span>
                {healthProfile.bloodGroup || "Not provided"}
              </span>
                        </div>

                        <div className="ui-infoBox">
                            <strong>Emergency Contact</strong>
                            <span>
                {healthProfile.emergencyContact ||
                    "Not provided"}
              </span>
                        </div>

                        <div className="ui-infoBox">
                            <strong>Preferred Language</strong>
                            <span>
                {healthProfile.preferredLanguage ||
                    "Not provided"}
              </span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}



export default HealthPassportPage;
