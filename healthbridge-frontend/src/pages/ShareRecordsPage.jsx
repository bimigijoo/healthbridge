import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function ShareRecordsPage() {
    const { user } = useAuth();

    const [healthProfile, setHealthProfile] = useState(null);
    const [records, setRecords] = useState([]);
    const [sessions, setSessions] = useState([]);

    const [selectedRecordIds, setSelectedRecordIds] = useState([]);
    const [durationHours, setDurationHours] = useState(24);

    const [providerName, setProviderName] = useState("");
    const [providerFacility, setProviderFacility] = useState("");
    const [providerRegistration, setProviderRegistration] = useState("");

    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [createdSession, setCreatedSession] = useState(null);

    const loadData = useCallback(async () => {
        if (!user?.id) {
            return;
        }

        try {
            setLoading(true);
            setError("");

            const profileResponse = await api.get(
                `/health-profile/user/${user.id}`
            );

            const profile = profileResponse.data;
            setHealthProfile(profile);

            const recordsResponse = await api.get(
                `/medical-records/profile/${profile.id}`
            );

            setRecords(recordsResponse.data);

            const sessionsResponse = await api.get(
                `/sharing-sessions/profile/${profile.id}`
            );

            setSessions(sessionsResponse.data);
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to load your medical records and sharing sessions."
            );
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const toggleRecord = (recordId) => {
        setSelectedRecordIds((current) =>
            current.includes(recordId)
                ? current.filter((id) => id !== recordId)
                : [...current, recordId]
        );
    };

    const createSharingSession = async (event) => {
        event.preventDefault();

        setMessage("");
        setError("");
        setCreatedSession(null);

        if (selectedRecordIds.length === 0) {
            setError("Please select at least one medical record.");
            return;
        }

        if (!providerName.trim()) {
            setError("Please enter the provider name.");
            return;
        }

        try {
            setCreating(true);

            const response = await api.post("/sharing-sessions", {
                healthProfileId: healthProfile.id,
                medicalRecordIds: selectedRecordIds,
                durationHours: Number(durationHours),
                providerName: providerName.trim(),
                providerFacility: providerFacility.trim(),
                providerRegistration: providerRegistration.trim(),
            });

            setCreatedSession(response.data);

            setMessage(
                "Temporary record-sharing session created successfully."
            );

            setSelectedRecordIds([]);
            setProviderName("");
            setProviderFacility("");
            setProviderRegistration("");

            await loadData();
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to create the sharing session."
            );
        } finally {
            setCreating(false);
        }
    };

    const revokeSession = async (sessionId) => {
        try {
            setError("");
            setMessage("");

            await api.delete(`/sharing-sessions/${sessionId}`);

            setMessage("Sharing session revoked successfully.");

            await loadData();
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to revoke the sharing session."
            );
        }
    };

    const formatDate = (value) => {
        if (!value) {
            return "—";
        }

        return new Date(value).toLocaleString();
    };

    const isActive = (session) => {
        if (session.revoked) {
            return false;
        }

        if (!session.expiresAt) {
            return false;
        }

        return new Date(session.expiresAt) > new Date();
    };

    if (loading) {
        return (
            <div style={styles.page}>
                <div style={styles.container}>
                    <p>Loading your sharing information...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.title}>Share My Records</h1>

                        <p style={styles.subtitle}>
                            Choose which medical records you want to share with a
                            healthcare provider.
                        </p>
                    </div>

                    <button
                        style={styles.backButton}
                        onClick={() => window.history.back()}
                    >
                        Back
                    </button>
                </div>

                {message && (
                    <div style={styles.success}>
                        {message}
                    </div>
                )}

                {error && (
                    <div style={styles.error}>
                        {error}
                    </div>
                )}

                <section style={styles.card}>
                    <h2 style={styles.sectionTitle}>
                        Select Medical Records
                    </h2>

                    {records.length === 0 ? (
                        <p>No medical records are currently available.</p>
                    ) : (
                        <div style={styles.recordList}>
                            {records.map((record) => (
                                <label
                                    key={record.id}
                                    style={styles.recordItem}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedRecordIds.includes(record.id)}
                                        onChange={() => toggleRecord(record.id)}
                                    />

                                    <div>
                                        <strong>
                                            {record.recordType || "Medical Record"}
                                        </strong>

                                        <div style={styles.recordDetails}>
                                            Date: {record.recordDate || "—"}
                                        </div>

                                        <div style={styles.recordDetails}>
                                            Provider: {record.providerName || "—"}
                                        </div>

                                        <div style={styles.recordDetails}>
                                            Facility: {record.providerFacility || "—"}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </section>

                <section style={styles.card}>
                    <h2 style={styles.sectionTitle}>
                        Provider Information
                    </h2>

                    <form onSubmit={createSharingSession}>
                        <label style={styles.label}>
                            Provider Name

                            <input
                                style={styles.input}
                                type="text"
                                value={providerName}
                                onChange={(event) =>
                                    setProviderName(event.target.value)
                                }
                                placeholder="e.g. Dr. HealthBridge Demo"
                            />
                        </label>

                        <label style={styles.label}>
                            Facility

                            <input
                                style={styles.input}
                                type="text"
                                value={providerFacility}
                                onChange={(event) =>
                                    setProviderFacility(event.target.value)
                                }
                                placeholder="e.g. HealthBridge Demo Clinic"
                            />
                        </label>

                        <label style={styles.label}>
                            Registration / Professional ID

                            <input
                                style={styles.input}
                                type="text"
                                value={providerRegistration}
                                onChange={(event) =>
                                    setProviderRegistration(event.target.value)
                                }
                                placeholder="Optional"
                            />
                        </label>

                        <label style={styles.label}>
                            Access Duration

                            <select
                                style={styles.input}
                                value={durationHours}
                                onChange={(event) =>
                                    setDurationHours(Number(event.target.value))
                                }
                            >
                                <option value={1}>
                                    1 hour
                                </option>

                                <option value={24}>
                                    24 hours
                                </option>

                                <option value={168}>
                                    7 days
                                </option>
                            </select>
                        </label>

                        <button
                            type="submit"
                            style={styles.primaryButton}
                            disabled={
                                creating ||
                                selectedRecordIds.length === 0
                            }
                        >
                            {creating
                                ? "Creating..."
                                : "Create Temporary Access"}
                        </button>
                    </form>
                </section>

                {createdSession && (
                    <section style={styles.card}>
                        <h2 style={styles.sectionTitle}>
                            Temporary Access Created
                        </h2>

                        <p style={styles.warning}>
                            Keep this access code private. Anyone who has the
                            temporary access code may be able to access the
                            records during the active sharing period.
                        </p>

                        <div style={styles.accessBox}>
                            <div>
                                <strong>Access Code</strong>
                            </div>

                            <div style={styles.token}>
                                {createdSession.accessToken}
                            </div>

                            <div style={styles.recordDetails}>
                                Expires:{" "}
                                {formatDate(createdSession.expiresAt)}
                            </div>
                        </div>
                    </section>
                )}

                <section style={styles.card}>
                    <h2 style={styles.sectionTitle}>
                        Sharing History
                    </h2>

                    {sessions.length === 0 ? (
                        <p>No sharing sessions yet.</p>
                    ) : (
                        <div style={styles.sessionList}>
                            {[...sessions]
                                .sort(
                                    (a, b) =>
                                        new Date(b.createdAt).getTime() -
                                        new Date(a.createdAt).getTime()
                                )
                                .map((session) => (
                                    <div
                                        key={session.id}
                                        style={styles.sessionItem}
                                    >
                                        <div style={styles.sessionContent}>
                                            <strong>
                                                {session.providerName ||
                                                    "Healthcare Provider"}
                                            </strong>

                                            <div style={styles.recordDetails}>
                                                Session ID: {session.id}
                                            </div>

                                            <div style={styles.recordDetails}>
                                                Facility:{" "}
                                                {session.providerFacility || "—"}
                                            </div>

                                            <div style={styles.recordDetails}>
                                                Created:{" "}
                                                {formatDate(session.createdAt)}
                                            </div>

                                            <div style={styles.recordDetails}>
                                                Expires:{" "}
                                                {formatDate(session.expiresAt)}
                                            </div>

                                            {isActive(session) && (
                                                <div style={styles.accessBox}>
                                                    <strong>Access Code</strong>

                                                    <div style={styles.token}>
                                                        {session.accessToken}
                                                    </div>
                                                </div>
                                            )}

                                            <div style={styles.status}>
                                                Status:{" "}
                                                {session.revoked
                                                    ? "Revoked"
                                                    : isActive(session)
                                                        ? "Active"
                                                        : "Expired"}
                                            </div>
                                        </div>

                                        {!session.revoked &&
                                            isActive(session) && (
                                                <button
                                                    style={styles.revokeButton}
                                                    onClick={() =>
                                                        revokeSession(session.id)
                                                    }
                                                >
                                                    Revoke Access
                                                </button>
                                            )}
                                    </div>
                                ))}
                        </div>
                    )}
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

    recordList: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },

    recordItem: {
        display: "flex",
        gap: "14px",
        padding: "16px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        cursor: "pointer",
    },

    recordDetails: {
        marginTop: "5px",
        color: "#666",
        fontSize: "14px",
    },

    label: {
        display: "block",
        marginBottom: "16px",
        fontWeight: "600",
    },

    input: {
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        marginTop: "7px",
        padding: "11px",
        border: "1px solid #ccc",
        borderRadius: "7px",
        fontSize: "15px",
    },

    primaryButton: {
        padding: "12px 20px",
        border: "none",
        borderRadius: "7px",
        cursor: "pointer",
        fontWeight: "600",
    },

    backButton: {
        padding: "10px 18px",
        border: "1px solid #ccc",
        borderRadius: "7px",
        background: "#fff",
        cursor: "pointer",
    },

    success: {
        background: "#e8f7ee",
        padding: "12px",
        borderRadius: "7px",
        marginBottom: "20px",
    },

    error: {
        background: "#fdecec",
        padding: "12px",
        borderRadius: "7px",
        marginBottom: "20px",
    },

    warning: {
        background: "#fff7df",
        padding: "12px",
        borderRadius: "7px",
    },

    accessBox: {
        marginTop: "12px",
        padding: "14px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        background: "#fafafa",
    },

    token: {
        marginTop: "10px",
        padding: "12px",
        background: "#f4f4f4",
        borderRadius: "6px",
        fontFamily: "monospace",
        wordBreak: "break-all",
    },

    sessionList: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },

    sessionItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "20px",
        padding: "16px",
        border: "1px solid #ddd",
        borderRadius: "8px",
    },

    sessionContent: {
        flex: 1,
    },

    status: {
        marginTop: "10px",
        fontWeight: "600",
    },

    revokeButton: {
        padding: "10px 15px",
        border: "none",
        borderRadius: "7px",
        cursor: "pointer",
    },
};

export default ShareRecordsPage;