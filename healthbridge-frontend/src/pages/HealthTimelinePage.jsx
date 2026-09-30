import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function HealthTimelinePage() {
    const { user } = useAuth();

    const [profile, setProfile] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [followUps, setFollowUps] = useState([]);

    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

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

            const healthProfile = profileResponse.data;
            setProfile(healthProfile);

            const [timelineResponse, followUpsResponse] =
                await Promise.all([
                    api.get(
                        `/health-timeline/profile/${healthProfile.id}`
                    ),
                    api.get(
                        `/follow-ups/profile/${healthProfile.id}`
                    ),
                ]);

            setTimeline(timelineResponse.data);
            setFollowUps(followUpsResponse.data);
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to load your health timeline."
            );
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadData();
        }, 0);

        return () => {
            window.clearTimeout(timer);
        };
    }, [loadData]);

    const handleCreateFollowUp = async (event) => {
        event.preventDefault();

        if (!profile) {
            return;
        }

        if (!description.trim() || !dueDate) {
            setError("Please enter a follow-up description and due date.");
            return;
        }

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            await api.post("/follow-ups", {
                healthProfileId: profile.id,
                description: description.trim(),
                dueDate,
            });

            setDescription("");
            setDueDate("");

            setSuccess("Follow-up created successfully.");

            await loadData();
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to create the follow-up."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleCompleteFollowUp = async (followUpId) => {
        try {
            setError("");
            setSuccess("");

            await api.put(`/follow-ups/${followUpId}/complete`);

            setSuccess("Follow-up marked as completed.");

            await loadData();
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to complete the follow-up."
            );
        }
    };

    const handleDeleteFollowUp = async (followUpId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this follow-up?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");
            setSuccess("");

            await api.delete(`/follow-ups/${followUpId}`);

            setSuccess("Follow-up deleted successfully.");

            await loadData();
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to delete the follow-up."
            );
        }
    };

    const formatDate = (dateValue) => {
        if (!dateValue) {
            return "—";
        }

        const date = new Date(`${dateValue}T00:00:00`);

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const getTimelineTitle = (item) => {
        if (item.type === "FOLLOW_UP") {
            return "Follow-up";
        }

        return item.title || "Medical Record";
    };

    const getTimelineTypeLabel = (item) => {
        if (item.type === "FOLLOW_UP") {
            return "FOLLOW-UP";
        }

        return item.title || "MEDICAL RECORD";
    };

    const getStatusStyle = (status) => {
        if (status === "COMPLETED") {
            return {
                backgroundColor: "#dcfce7",
                color: "#166534",
            };
        }

        return {
            backgroundColor: "#fef3c7",
            color: "#92400e",
        };
    };

    const pendingFollowUps = followUps.filter(
        (followUp) => followUp.status === "PENDING"
    );

    const completedFollowUps = followUps.filter(
        (followUp) => followUp.status === "COMPLETED"
    );

    if (loading) {
        return (
            <div style={styles.page}>
                <div style={styles.container}>
                    <p>Loading your health timeline...</p>
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
                            Health Timeline & Follow-ups
                        </h1>

                        <p style={styles.subtitle}>
                            View your medical history chronologically and
                            manage upcoming follow-ups.
                        </p>
                    </div>

                    {profile?.healthId && (
                        <div style={styles.healthIdCard}>
                            <span style={styles.healthIdLabel}>
                                Health ID
                            </span>

                            <strong style={styles.healthId}>
                                {profile.healthId}
                            </strong>
                        </div>
                    )}
                </div>

                {error && (
                    <div style={styles.errorBox}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={styles.successBox}>
                        {success}
                    </div>
                )}

                <section style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <div>
                            <h2 style={styles.sectionTitle}>
                                Health Timeline
                            </h2>

                            <p style={styles.sectionSubtitle}>
                                Your medical records and follow-ups in
                                chronological order.
                            </p>
                        </div>
                    </div>

                    {timeline.length === 0 ? (
                        <div style={styles.emptyCard}>
                            <h3 style={styles.emptyTitle}>
                                No timeline events yet
                            </h3>

                            <p style={styles.emptyText}>
                                Medical records and follow-ups will appear
                                here as they are added.
                            </p>
                        </div>
                    ) : (
                        <div style={styles.timeline}>
                            {timeline.map((item) => (
                                <div
                                    key={`${item.type}-${item.id}`}
                                    style={styles.timelineItem}
                                >
                                    <div style={styles.timelineMarker}>
                                        <div
                                            style={
                                                styles.timelineMarkerDot
                                            }
                                        />
                                    </div>

                                    <div style={styles.timelineCard}>
                                        <div style={styles.timelineTopRow}>
                                            <div>
                                                <span
                                                    style={
                                                        styles.timelineType
                                                    }
                                                >
                                                    {getTimelineTypeLabel(
                                                        item
                                                    )}
                                                </span>

                                                <h3
                                                    style={
                                                        styles.timelineTitle
                                                    }
                                                >
                                                    {getTimelineTitle(item)}
                                                </h3>
                                            </div>

                                            <span
                                                style={
                                                    styles.timelineDate
                                                }
                                            >
                                                {formatDate(
                                                    item.eventDate
                                                )}
                                            </span>
                                        </div>

                                        {item.description && (
                                            <p
                                                style={
                                                    styles.timelineDescription
                                                }
                                            >
                                                {item.description}
                                            </p>
                                        )}

                                        {item.status && (
                                            <span
                                                style={{
                                                    ...styles.statusBadge,
                                                    ...getStatusStyle(
                                                        item.status
                                                    ),
                                                }}
                                            >
                                                {item.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <div>
                            <h2 style={styles.sectionTitle}>
                                Add Follow-up
                            </h2>

                            <p style={styles.sectionSubtitle}>
                                Record a future health-related action or
                                appointment.
                            </p>
                        </div>
                    </div>

                    <form
                        onSubmit={handleCreateFollowUp}
                        style={styles.form}
                    >
                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                Follow-up description
                            </label>

                            <input
                                type="text"
                                value={description}
                                onChange={(event) =>
                                    setDescription(event.target.value)
                                }
                                placeholder="Example: Blood sugar test"
                                style={styles.input}
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                Due date
                            </label>

                            <input
                                type="date"
                                value={dueDate}
                                onChange={(event) =>
                                    setDueDate(event.target.value)
                                }
                                style={styles.input}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            style={styles.primaryButton}
                        >
                            {saving
                                ? "Saving..."
                                : "Add Follow-up"}
                        </button>
                    </form>
                </section>

                <section style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <div>
                            <h2 style={styles.sectionTitle}>
                                Pending Follow-ups
                            </h2>

                            <p style={styles.sectionSubtitle}>
                                Follow-ups that still need attention.
                            </p>
                        </div>

                        <span style={styles.countBadge}>
                            {pendingFollowUps.length}
                        </span>
                    </div>

                    {pendingFollowUps.length === 0 ? (
                        <div style={styles.emptyCard}>
                            <h3 style={styles.emptyTitle}>
                                No pending follow-ups
                            </h3>

                            <p style={styles.emptyText}>
                                You currently have no pending follow-ups.
                            </p>
                        </div>
                    ) : (
                        <div style={styles.followUpList}>
                            {pendingFollowUps.map((followUp) => (
                                <div
                                    key={followUp.id}
                                    style={styles.followUpCard}
                                >
                                    <div style={styles.followUpContent}>
                                        <h3 style={styles.followUpTitle}>
                                            {followUp.description}
                                        </h3>

                                        <p style={styles.followUpDate}>
                                            Due:{" "}
                                            {formatDate(
                                                followUp.dueDate
                                            )}
                                        </p>

                                        <span
                                            style={{
                                                ...styles.statusBadge,
                                                ...getStatusStyle(
                                                    followUp.status
                                                ),
                                            }}
                                        >
                                            {followUp.status}
                                        </span>
                                    </div>

                                    <div style={styles.actionGroup}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleCompleteFollowUp(
                                                    followUp.id
                                                )
                                            }
                                            style={styles.completeButton}
                                        >
                                            Mark Complete
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDeleteFollowUp(
                                                    followUp.id
                                                )
                                            }
                                            style={styles.deleteButton}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <div>
                            <h2 style={styles.sectionTitle}>
                                Completed Follow-ups
                            </h2>

                            <p style={styles.sectionSubtitle}>
                                Follow-ups that have already been completed.
                            </p>
                        </div>

                        <span style={styles.countBadge}>
                            {completedFollowUps.length}
                        </span>
                    </div>

                    {completedFollowUps.length === 0 ? (
                        <div style={styles.emptyCard}>
                            <h3 style={styles.emptyTitle}>
                                No completed follow-ups
                            </h3>

                            <p style={styles.emptyText}>
                                Completed follow-ups will appear here.
                            </p>
                        </div>
                    ) : (
                        <div style={styles.followUpList}>
                            {completedFollowUps.map((followUp) => (
                                <div
                                    key={followUp.id}
                                    style={styles.followUpCard}
                                >
                                    <div style={styles.followUpContent}>
                                        <h3 style={styles.followUpTitle}>
                                            {followUp.description}
                                        </h3>

                                        <p style={styles.followUpDate}>
                                            Due:{" "}
                                            {formatDate(
                                                followUp.dueDate
                                            )}
                                        </p>

                                        {followUp.completedAt && (
                                            <p style={styles.completedDate}>
                                                Completed:{" "}
                                                {new Date(
                                                    followUp.completedAt
                                                ).toLocaleDateString(
                                                    "en-IN",
                                                    {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                    }
                                                )}
                                            </p>
                                        )}

                                        <span
                                            style={{
                                                ...styles.statusBadge,
                                                ...getStatusStyle(
                                                    followUp.status
                                                ),
                                            }}
                                        >
                                            {followUp.status}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDeleteFollowUp(
                                                followUp.id
                                            )
                                        }
                                        style={styles.deleteButton}
                                    >
                                        Delete
                                    </button>
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
        backgroundColor: "#f5f7fb",
        padding: "32px 20px",
    },

    container: {
        maxWidth: "1100px",
        margin: "0 auto",
    },

    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "20px",
        marginBottom: "28px",
    },

    title: {
        margin: 0,
        fontSize: "30px",
        color: "#172033",
    },

    subtitle: {
        marginTop: "8px",
        marginBottom: 0,
        color: "#667085",
        lineHeight: 1.5,
    },

    healthIdCard: {
        backgroundColor: "#ffffff",
        border: "1px solid #e4e7ec",
        borderRadius: "12px",
        padding: "14px 18px",
        minWidth: "180px",
    },

    healthIdLabel: {
        display: "block",
        fontSize: "12px",
        color: "#667085",
        marginBottom: "4px",
    },

    healthId: {
        color: "#1d4ed8",
        fontSize: "16px",
    },

    errorBox: {
        backgroundColor: "#fee4e2",
        color: "#b42318",
        border: "1px solid #fecdca",
        borderRadius: "8px",
        padding: "12px 14px",
        marginBottom: "18px",
    },

    successBox: {
        backgroundColor: "#dcfae6",
        color: "#027a48",
        border: "1px solid #abefc6",
        borderRadius: "8px",
        padding: "12px 14px",
        marginBottom: "18px",
    },

    section: {
        backgroundColor: "#ffffff",
        border: "1px solid #e4e7ec",
        borderRadius: "14px",
        padding: "24px",
        marginBottom: "24px",
    },

    sectionHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "16px",
        marginBottom: "20px",
    },

    sectionTitle: {
        margin: 0,
        color: "#172033",
        fontSize: "22px",
    },

    sectionSubtitle: {
        marginTop: "6px",
        marginBottom: 0,
        color: "#667085",
        fontSize: "14px",
    },

    countBadge: {
        minWidth: "32px",
        height: "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#eef2ff",
        color: "#3730a3",
        borderRadius: "999px",
        fontWeight: 700,
    },

    timeline: {
        position: "relative",
    },

    timelineItem: {
        display: "flex",
        gap: "16px",
        position: "relative",
        paddingBottom: "20px",
    },

    timelineMarker: {
        width: "24px",
        minWidth: "24px",
        display: "flex",
        justifyContent: "center",
        position: "relative",
    },

    timelineMarkerDot: {
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        backgroundColor: "#2563eb",
        marginTop: "8px",
        position: "relative",
        zIndex: 2,
    },

    timelineCard: {
        flex: 1,
        border: "1px solid #e4e7ec",
        borderRadius: "12px",
        padding: "16px",
        backgroundColor: "#fcfcfd",
    },

    timelineTopRow: {
        display: "flex",
        justifyContent: "space-between",
        gap: "16px",
    },

    timelineType: {
        fontSize: "11px",
        fontWeight: 700,
        color: "#667085",
        letterSpacing: "0.06em",
    },

    timelineTitle: {
        margin: "5px 0 0",
        fontSize: "17px",
        color: "#172033",
    },

    timelineDate: {
        color: "#475467",
        fontSize: "13px",
        whiteSpace: "nowrap",
    },

    timelineDescription: {
        margin: "12px 0 0",
        color: "#475467",
        lineHeight: 1.6,
        fontSize: "14px",
    },

    statusBadge: {
        display: "inline-block",
        marginTop: "12px",
        padding: "4px 9px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
    },

    form: {
        display: "grid",
        gridTemplateColumns: "1fr 220px auto",
        gap: "16px",
        alignItems: "end",
    },

    formGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "7px",
    },

    label: {
        fontSize: "13px",
        fontWeight: 600,
        color: "#344054",
    },

    input: {
        width: "100%",
        boxSizing: "border-box",
        border: "1px solid #d0d5dd",
        borderRadius: "8px",
        padding: "11px 12px",
        fontSize: "14px",
        outline: "none",
    },

    primaryButton: {
        border: "none",
        borderRadius: "8px",
        padding: "11px 18px",
        backgroundColor: "#2563eb",
        color: "#ffffff",
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
    },

    followUpList: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },

    followUpCard: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "20px",
        border: "1px solid #e4e7ec",
        borderRadius: "12px",
        padding: "16px",
        backgroundColor: "#fcfcfd",
    },

    followUpContent: {
        minWidth: 0,
    },

    followUpTitle: {
        margin: 0,
        color: "#172033",
        fontSize: "16px",
    },

    followUpDate: {
        margin: "7px 0 0",
        color: "#667085",
        fontSize: "14px",
    },

    completedDate: {
        margin: "6px 0 0",
        color: "#027a48",
        fontSize: "13px",
    },

    actionGroup: {
        display: "flex",
        gap: "8px",
        flexShrink: 0,
    },

    completeButton: {
        border: "1px solid #12b76a",
        borderRadius: "8px",
        padding: "9px 12px",
        backgroundColor: "#ecfdf3",
        color: "#027a48",
        fontWeight: 600,
        cursor: "pointer",
    },

    deleteButton: {
        border: "1px solid #f04438",
        borderRadius: "8px",
        padding: "9px 12px",
        backgroundColor: "#ffffff",
        color: "#b42318",
        fontWeight: 600,
        cursor: "pointer",
    },

    emptyCard: {
        border: "1px dashed #d0d5dd",
        borderRadius: "12px",
        padding: "28px",
        textAlign: "center",
        backgroundColor: "#fcfcfd",
    },

    emptyTitle: {
        margin: 0,
        color: "#344054",
        fontSize: "16px",
    },

    emptyText: {
        margin: "7px 0 0",
        color: "#667085",
        fontSize: "14px",
    },
};

export default HealthTimelinePage;