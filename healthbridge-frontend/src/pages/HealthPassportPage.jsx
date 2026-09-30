import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function HealthPassportPage() {
    const { user } = useAuth();

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
                console.error(error);

                setError(
                    error.response?.data?.message ||
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
        return (
            <div style={styles.page}>
                <div style={styles.container}>
                    <p>Loading your digital health passport...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.page}>
                <div style={styles.container}>
                    <div style={styles.error}>
                        {error}
                    </div>
                </div>
            </div>
        );
    }

    if (!healthProfile) {
        return (
            <div style={styles.page}>
                <div style={styles.container}>
                    <p>
                        No health profile is available yet.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.title}>
                            Digital Health Passport
                        </h1>

                        <p style={styles.subtitle}>
                            Your portable HealthBridge identity and emergency
                            health information.
                        </p>
                    </div>

                    <button
                        style={styles.backButton}
                        onClick={() => window.history.back()}
                    >
                        Back
                    </button>
                </div>

                <section style={styles.card}>
                    <div style={styles.profileSection}>
                        <div style={styles.profileInfo}>
                            <h2 style={styles.sectionTitle}>
                                Health Profile
                            </h2>

                            <div style={styles.infoRow}>
                                <strong>Health ID</strong>
                                <span>
                  {healthProfile.healthId || "—"}
                </span>
                            </div>

                            <div style={styles.infoRow}>
                                <strong>Name</strong>
                                <span>
                  {user?.name || "—"}
                </span>
                            </div>

                            <div style={styles.infoRow}>
                                <strong>Date of Birth</strong>
                                <span>
                  {healthProfile.dateOfBirth || "—"}
                </span>
                            </div>

                            <div style={styles.infoRow}>
                                <strong>Gender</strong>
                                <span>
                  {healthProfile.gender || "—"}
                </span>
                            </div>

                            <div style={styles.infoRow}>
                                <strong>Blood Group</strong>
                                <span>
                  {healthProfile.bloodGroup || "—"}
                </span>
                            </div>

                            <div style={styles.infoRow}>
                                <strong>Preferred Language</strong>
                                <span>
                  {healthProfile.preferredLanguage || "—"}
                </span>
                            </div>

                            <div style={styles.infoRow}>
                                <strong>Emergency Contact</strong>
                                <span>
                  {healthProfile.emergencyContact || "—"}
                </span>
                            </div>
                        </div>

                        <div style={styles.qrSection}>
                            <h2 style={styles.sectionTitle}>
                                Health ID QR
                            </h2>

                            {qrCodeUrl ? (
                                <img
                                    src={qrCodeUrl}
                                    alt="HealthBridge Health ID QR code"
                                    style={styles.qrImage}
                                />
                            ) : (
                                <p>
                                    QR code is not available.
                                </p>
                            )}

                            <p style={styles.qrDescription}>
                                This QR code represents your HealthBridge Health
                                ID. It does not contain your medical records.
                            </p>
                        </div>
                    </div>
                </section>

                <section style={styles.card}>
                    <h2 style={styles.sectionTitle}>
                        Emergency Information
                    </h2>

                    <div style={styles.infoGrid}>
                        <div style={styles.infoBox}>
                            <strong>Blood Group</strong>
                            <span>
                {healthProfile.bloodGroup || "Not provided"}
              </span>
                        </div>

                        <div style={styles.infoBox}>
                            <strong>Emergency Contact</strong>
                            <span>
                {healthProfile.emergencyContact ||
                    "Not provided"}
              </span>
                        </div>

                        <div style={styles.infoBox}>
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

const styles = {
    page: {
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "30px 20px",
    },

    container: {
        maxWidth: "1000px",
        margin: "0 auto",
    },

    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "20px",
        marginBottom: "25px",
    },

    title: {
        margin: 0,
        fontSize: "32px",
    },

    subtitle: {
        marginTop: "8px",
        color: "#555",
    },

    card: {
        background: "#fff",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "20px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    },

    sectionTitle: {
        marginTop: 0,
        marginBottom: "20px",
    },

    profileSection: {
        display: "flex",
        gap: "50px",
        alignItems: "flex-start",
    },

    profileInfo: {
        flex: 1,
    },

    qrSection: {
        width: "280px",
        textAlign: "center",
    },

    qrImage: {
        width: "240px",
        height: "240px",
        objectFit: "contain",
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "10px",
        background: "#fff",
    },

    qrDescription: {
        marginTop: "15px",
        color: "#666",
        fontSize: "14px",
        lineHeight: 1.5,
    },

    infoRow: {
        display: "flex",
        justifyContent: "space-between",
        gap: "20px",
        padding: "12px 0",
        borderBottom: "1px solid #eee",
    },

    infoGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "15px",
    },

    infoBox: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "16px",
        border: "1px solid #ddd",
        borderRadius: "8px",
    },

    backButton: {
        padding: "10px 18px",
        border: "1px solid #ccc",
        borderRadius: "7px",
        background: "#fff",
        cursor: "pointer",
    },

    error: {
        background: "#fdecec",
        padding: "12px",
        borderRadius: "7px",
        color: "#8a1c1c",
    },
};

export default HealthPassportPage;