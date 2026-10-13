import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";
import PageStatus from "../components/PageStatus";
import SharingSessionQr from "../components/SharingSessionQr";

function ShareRecordsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [healthProfile, setHealthProfile] = useState(null);
    const [records, setRecords] = useState([]);
    const [sessions, setSessions] = useState([]);

    const [selectedRecordIds, setSelectedRecordIds] = useState([]);
    const [durationHours, setDurationHours] = useState(24);
    const [authorizeConsultation, setAuthorizeConsultation] = useState(false);

    const [providerName, setProviderName] = useState("");
    const [providerFacility, setProviderFacility] = useState("");
    const [providerRegistration, setProviderRegistration] = useState("");

    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [createdSession, setCreatedSession] = useState(null);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

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
            setError(
                err.response?.status === 404 ? "" : err.response?.data?.message ||
                "Unable to load your medical records and sharing sessions."
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

        if (!authorizeConsultation) {
            setError("Confirm permission for the provider to add a consultation.");
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
                authorizeConsultation,
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
            setAuthorizeConsultation(false);

            await loadData();
        } catch (err) {
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

            setCreatedSession(current => current?.id === sessionId ? null : current);

            setMessage("Sharing session revoked successfully.");

            await loadData();
        } catch (err) {
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

        return new Date(session.expiresAtUtc || session.expiresAt).getTime() > now;
    };

    if (loading) {
        return <PageStatus loading title="Loading sharing information" />;
    }

    if (!healthProfile) {
        return <PageStatus title={error ? "Sharing could not be loaded" : "Create your health profile"}
            description={error || "A health profile is needed to share records."}
            error={!!error} onRetry={error ? () => void loadData() : undefined} createProfile={!error} />;
    }

    return (
        <div className="ui-page">
            <div className="ui-container">
                <div className="ui-header">
                    <div>
                        <h1 className="ui-title">Share My Records</h1>

                        <p className="ui-subtitle">
                            Choose which medical records you want to share with a
                            healthcare provider.
                        </p>
                    </div>

                    <button
                        className="secondary-button"
                        onClick={() => navigate("/dashboard")}
                    >
                        Back
                    </button>
                </div>

                {message && (
                    <div className="success-message" role="status">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="error-message" role="alert">
                        {error}
                    </div>
                )}

                <section className="ui-section">
                    <h2 className="ui-sectionTitle">
                        Select Medical Records
                    </h2>

                    {records.length === 0 ? (
                        <p>No records yet. A consultation-only session will not disclose any medical records.</p>
                    ) : (
                        <div className="ui-recordList">
                            {records.map((record) => (
                                <label
                                    key={record.id}
                                    className="ui-recordItem"
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

                                        <div className="ui-recordDetails">
                                            Date: {record.recordDate || "—"}
                                        </div>

                                        <div className="ui-recordDetails">
                                            Provider: {record.providerName || "—"}
                                        </div>

                                        <div className="ui-recordDetails">
                                            Facility: {record.providerFacility || "—"}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </section>

                <section className="ui-section">
                    <h2 className="ui-sectionTitle">
                        Provider Information
                    </h2>

                    <form onSubmit={createSharingSession}>
                        <label className="ui-label">
                            Provider Name

                            <input
                                className="ui-input"
                                type="text"
                                value={providerName}
                                onChange={(event) =>
                                    setProviderName(event.target.value)
                                }
                                placeholder="e.g. Dr. HealthBridge Demo"
                            />
                        </label>

                        <label className="ui-label">
                            Facility

                            <input
                                className="ui-input"
                                type="text"
                                value={providerFacility}
                                onChange={(event) =>
                                    setProviderFacility(event.target.value)
                                }
                                placeholder="e.g. HealthBridge Demo Clinic"
                            />
                        </label>

                        <label className="ui-label">
                            Registration / Professional ID

                            <input
                                className="ui-input"
                                type="text"
                                value={providerRegistration}
                                onChange={(event) =>
                                    setProviderRegistration(event.target.value)
                                }
                                placeholder="Optional"
                            />
                        </label>

                        <label className="ui-label">
                            Access Duration

                            <select
                                className="ui-input"
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

                        <label className="ui-label">
                            <input type="checkbox" checked={authorizeConsultation}
                                onChange={event => setAuthorizeConsultation(event.target.checked)} required />
                            Authorize the provider to add a new consultation
                        </label>

                        <button
                            type="submit"
                            className="primary-button"
                            disabled={
                                creating ||
                                !authorizeConsultation
                            }
                        >
                            {creating
                                ? "Creating..."
                                : "Create Temporary Access"}
                        </button>
                    </form>
                </section>

                {createdSession && isActive(createdSession) && (
                    <section className="ui-section">
                        <h2 className="ui-sectionTitle">
                            Temporary Access Created
                        </h2>

                        <p className="ui-warning">
                            Keep this access code private. Anyone who has the
                            temporary access code may be able to access the
                            records during the active sharing period.
                        </p>

                        <SharingSessionQr key={createdSession.id} session={createdSession} />
                        <div className="ui-accessBox">
                            <div>
                                <strong>Access Code</strong>
                            </div>

                            <div className="ui-token">
                                {createdSession.accessToken}
                            </div>

                            <div className="ui-recordDetails">
                                Expires:{" "}
                                {formatDate(createdSession.expiresAtUtc || createdSession.expiresAt)}
                            </div>
                        </div>
                        <button type="button" className="danger-button"
                            onClick={() => void revokeSession(createdSession.id)}>Revoke Access</button>
                    </section>
                )}

                <section className="ui-section">
                    <h2 className="ui-sectionTitle">
                        Sharing History
                    </h2>

                    {sessions.length === 0 ? (
                        <p>No sharing sessions yet.</p>
                    ) : (
                        <div className="ui-sessionList">
                            {[...sessions]
                                .sort(
                                    (a, b) =>
                                        new Date(b.createdAt).getTime() -
                                        new Date(a.createdAt).getTime()
                                )
                                .map((session) => (
                                    <div
                                        key={session.id}
                                        className="ui-sessionItem"
                                    >
                                        <div className="ui-sessionContent">
                                            <strong>
                                                {session.providerName ||
                                                    "Healthcare Provider"}
                                            </strong>

                                            <div className="ui-recordDetails">
                                                Session ID: {session.id}
                                            </div>

                                            <div className="ui-recordDetails">
                                                Facility:{" "}
                                                {session.providerFacility || "—"}
                                            </div>

                                            <div className="ui-recordDetails">
                                                Created:{" "}
                                                {formatDate(session.createdAt)}
                                            </div>

                                            <div className="ui-recordDetails">
                                                Expires:{" "}
                                                {formatDate(session.expiresAtUtc || session.expiresAt)}
                                            </div>

                                            {isActive(session) && (
                                                <div className="ui-accessBox">
                                                    {createdSession?.id !== session.id &&
                                                        <SharingSessionQr key={session.id} session={session} />}
                                                    <strong>Access Code</strong>

                                                    <div className="ui-token">
                                                        {session.accessToken}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="ui-status">
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
                                                    className="danger-button"
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



export default ShareRecordsPage;
