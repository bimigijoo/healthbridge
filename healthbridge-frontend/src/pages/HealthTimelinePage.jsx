import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import api from "../services/api";
import PageStatus from "../components/PageStatus";
import { Check, Trash2 } from "lucide-react";

function HealthTimelinePage() {
    const navigate = useNavigate();
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
            setLoading(false);
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
            setError(
                err.response?.status === 404 ? "" : err.response?.data?.message ||
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
            setError(
                "Please enter a follow-up description and due date."
            );
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
        return <PageStatus loading title="Loading health timeline" />;
    }

    if (!profile) {
        return <PageStatus title={error ? "Timeline could not be loaded" : "Create your health profile"}
            description={error || "A health profile is needed to track your care."}
            error={!!error} onRetry={error ? () => void loadData() : undefined} createProfile={!error} />;
    }

    return (
        <div className="ui-page">
            <div className="ui-container">

                <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="secondary-button"
                >
                    ← Back to Dashboard
                </button>

                <div className="ui-header">
                    <div>
                        <h1 className="ui-title">
                            Health Timeline & Follow-ups
                        </h1>

                        <p className="ui-subtitle">
                            View your medical history chronologically and
                            manage upcoming follow-ups.
                        </p>
                    </div>

                    {profile?.healthId && (
                        <div className="ui-healthIdCard">
                            <span className="ui-healthIdLabel">
                                Health ID
                            </span>

                            <strong className="ui-healthId">
                                {profile.healthId}
                            </strong>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="error-message" role="alert">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="success-message" role="status">
                        {success}
                    </div>
                )}

                {/* Health Timeline */}
                <section className="ui-section">
                    <div className="ui-sectionHeader">
                        <div>
                            <h2 className="ui-sectionTitle">
                                Health Timeline
                            </h2>

                            <p className="ui-sectionSubtitle">
                                Your medical records and follow-ups in
                                chronological order.
                            </p>
                        </div>
                    </div>

                    {timeline.length === 0 ? (
                        <div className="ui-emptyCard">
                            <h3 className="ui-emptyTitle">
                                No timeline events yet
                            </h3>

                            <p className="ui-emptyText">
                                Medical records and follow-ups will appear
                                here as they are added.
                            </p>
                        </div>
                    ) : (
                        <div className="ui-timeline">
                            {timeline.map((item) => (
                                <div
                                    key={`${item.type}-${item.id}`}
                                    className="ui-timelineItem"
                                >
                                    <div className="ui-timelineMarker">
                                        <div
                                            className="ui-timelineMarkerDot"
                                        />
                                    </div>

                                    <div className="ui-timelineCard">
                                        <div className="ui-timelineTopRow">
                                            <div>
                                                <span
                                                    className="ui-timelineType"
                                                >
                                                    {getTimelineTypeLabel(
                                                        item
                                                    )}
                                                </span>

                                                <h3
                                                    className="ui-timelineTitle"
                                                >
                                                    {getTimelineTitle(item)}
                                                </h3>
                                            </div>

                                            <span
                                                className="ui-timelineDate"
                                            >
                                                {formatDate(item.eventDate)}
                                            </span>
                                        </div>

                                        {item.description && (
                                            <p
                                                className="ui-timelineDescription"
                                            >
                                                {item.description}
                                            </p>
                                        )}

                                        {item.status && (
                                            <span
                                                className="ui-statusBadge" style={{
  ...getStatusStyle(item.status)
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

                {/* Add Follow-up */}
                <section className="ui-section">
                    <div className="ui-sectionHeader">
                        <div>
                            <h2 className="ui-sectionTitle">
                                Add Follow-up
                            </h2>

                            <p className="ui-sectionSubtitle">
                                Record a future health-related action or
                                appointment.
                            </p>
                        </div>
                    </div>

                    <form
                        onSubmit={handleCreateFollowUp}
                        className="follow-up-form"
                    >
                        <div className="ui-formGroup">
                            <label
                                htmlFor="followUpDescription"
                                className="ui-label"
                            >
                                Follow-up description
                            </label>

                            <input
                                id="followUpDescription"
                                type="text"
                                value={description}
                                onChange={(event) =>
                                    setDescription(event.target.value)
                                }
                                placeholder="Example: Blood sugar test"
                                className="ui-input"
                                required
                            />
                        </div>

                        <div className="ui-formGroup">
                            <label
                                htmlFor="followUpDueDate"
                                className="ui-label"
                            >
                                Due date
                            </label>

                            <input
                                id="followUpDueDate"
                                type="date"
                                value={dueDate}
                                onChange={(event) =>
                                    setDueDate(event.target.value)
                                }
                                className="ui-input"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving || !profile}
                            className="primary-button" style={{
  opacity: saving || !profile ? 0.7 : 1
}}
                        >
                            {saving ? "Saving..." : "Add Follow-up"}
                        </button>
                    </form>
                </section>

                {/* Pending Follow-ups */}
                <section className="ui-section">
                    <div className="ui-sectionHeader">
                        <div>
                            <h2 className="ui-sectionTitle">
                                Pending Follow-ups
                            </h2>

                            <p className="ui-sectionSubtitle">
                                Follow-ups that still need attention.
                            </p>
                        </div>

                        <span className="ui-countBadge">
                            {pendingFollowUps.length}
                        </span>
                    </div>

                    {pendingFollowUps.length === 0 ? (
                        <div className="ui-emptyCard">
                            <h3 className="ui-emptyTitle">
                                No pending follow-ups
                            </h3>

                            <p className="ui-emptyText">
                                You currently have no pending follow-ups.
                            </p>
                        </div>
                    ) : (
                        <div className="ui-followUpList">
                            {pendingFollowUps.map((followUp) => (
                                <div
                                    key={followUp.id}
                                    className="ui-followUpCard"
                                >
                                    <div className="ui-followUpContent">
                                        <h3 className="ui-followUpTitle">
                                            {followUp.description}
                                        </h3>

                                        <p className="ui-followUpDate">
                                            Due:{" "}
                                            {formatDate(followUp.dueDate)}
                                        </p>

                                        <span
                                            className="ui-statusBadge" style={{
  ...getStatusStyle(followUp.status)
}}
                                        >
                                            {followUp.status}
                                        </span>
                                    </div>

                                    <div className="ui-actionGroup">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleCompleteFollowUp(
                                                    followUp.id
                                                )
                                            }
                                            className="success-button"
                                        >
                                            <Check size={16} aria-hidden="true" /> Mark Complete
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDeleteFollowUp(
                                                    followUp.id
                                                )
                                            }
                                            className="danger-button"
                                        >
                                            <Trash2 size={16} aria-hidden="true" /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Completed Follow-ups */}
                <section className="ui-section">
                    <div className="ui-sectionHeader">
                        <div>
                            <h2 className="ui-sectionTitle">
                                Completed Follow-ups
                            </h2>

                            <p className="ui-sectionSubtitle">
                                Follow-ups that have already been completed.
                            </p>
                        </div>

                        <span className="ui-countBadge">
                            {completedFollowUps.length}
                        </span>
                    </div>

                    {completedFollowUps.length === 0 ? (
                        <div className="ui-emptyCard">
                            <h3 className="ui-emptyTitle">
                                No completed follow-ups
                            </h3>

                            <p className="ui-emptyText">
                                Completed follow-ups will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="ui-followUpList">
                            {completedFollowUps.map((followUp) => (
                                <div
                                    key={followUp.id}
                                    className="ui-followUpCard"
                                >
                                    <div className="ui-followUpContent">
                                        <h3 className="ui-followUpTitle">
                                            {followUp.description}
                                        </h3>

                                        <p className="ui-followUpDate">
                                            Due:{" "}
                                            {formatDate(followUp.dueDate)}
                                        </p>

                                        {followUp.completedAt && (
                                            <p className="ui-completedDate">
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
                                            className="ui-statusBadge" style={{
  ...getStatusStyle(followUp.status)
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
                                        className="danger-button"
                                    >
                                        <Trash2 size={16} aria-hidden="true" /> Delete
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



export default HealthTimelinePage;
