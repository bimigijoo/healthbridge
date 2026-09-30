import { useState } from "react";
import api from "../services/api";

function ProviderAccessPage() {
    const [accessToken, setAccessToken] = useState("");
    const [accessData, setAccessData] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [consultation, setConsultation] = useState({
        recordDate: new Date().toISOString().split("T")[0],
        providerName: "",
        providerFacility: "",
        reason: "",
        diagnosis: "",
        medication: "",
        notes: "",
    });

    const accessRecords = async (event) => {
        event.preventDefault();

        setError("");
        setMessage("");
        setAccessData(null);

        if (!accessToken.trim()) {
            setError("Please enter the temporary access code.");
            return;
        }

        try {
            setLoading(true);

            const response = await api.get(
                `/provider-access/${accessToken.trim()}`
            );

            setAccessData(response.data);

            setConsultation((current) => ({
                ...current,
                providerName: response.data.providerName || "",
                providerFacility: response.data.providerFacility || "",
            }));

            setMessage("Authorized medical records loaded successfully.");
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to access the shared medical records."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleConsultationChange = (event) => {
        const { name, value } = event.target;

        setConsultation((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const addConsultation = async (event) => {
        event.preventDefault();

        setError("");
        setMessage("");

        if (!accessToken.trim()) {
            setError("The temporary access code is missing.");
            return;
        }

        try {
            setLoading(true);

            await api.post(
                `/provider-access/${accessToken.trim()}/consultation`,
                consultation
            );

            setMessage(
                "Consultation added successfully to the worker's medical record."
            );

            setConsultation((current) => ({
                ...current,
                reason: "",
                diagnosis: "",
                medication: "",
                notes: "",
            }));
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to add the consultation."
            );
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (value) => {
        if (!value) {
            return "—";
        }

        return new Date(value).toLocaleString();
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.title}>
                            HealthBridge Provider Access
                        </h1>

                        <p style={styles.subtitle}>
                            Temporary access to records shared by a worker.
                        </p>
                    </div>
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

                {!accessData && (
                    <section style={styles.card}>
                        <h2 style={styles.sectionTitle}>
                            Enter Temporary Access Code
                        </h2>

                        <p style={styles.description}>
                            Enter the temporary access code provided by the
                            worker. No permanent HealthBridge provider account
                            is required.
                        </p>

                        <form onSubmit={accessRecords}>
                            <label style={styles.label}>
                                Temporary Access Code

                                <input
                                    type="text"
                                    value={accessToken}
                                    onChange={(event) =>
                                        setAccessToken(event.target.value)
                                    }
                                    placeholder="Enter access code"
                                    style={styles.input}
                                />
                            </label>

                            <button
                                type="submit"
                                style={styles.primaryButton}
                                disabled={loading}
                            >
                                {loading
                                    ? "Checking Access..."
                                    : "Access Shared Records"}
                            </button>
                        </form>
                    </section>
                )}

                {accessData && (
                    <>
                        <section style={styles.card}>
                            <h2 style={styles.sectionTitle}>
                                Authorized Access
                            </h2>

                            <div style={styles.infoGrid}>
                                <div>
                                    <strong>Provider</strong>
                                    <p>
                                        {accessData.providerName || "—"}
                                    </p>
                                </div>

                                <div>
                                    <strong>Facility</strong>
                                    <p>
                                        {accessData.providerFacility || "—"}
                                    </p>
                                </div>

                                <div>
                                    <strong>Expires</strong>
                                    <p>
                                        {formatDate(accessData.expiresAt)}
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section style={styles.card}>
                            <h2 style={styles.sectionTitle}>
                                Shared Medical Records
                            </h2>

                            {accessData.records?.length === 0 ? (
                                <p>
                                    No medical records were included in this
                                    sharing session.
                                </p>
                            ) : (
                                <div style={styles.recordList}>
                                    {accessData.records?.map((record) => (
                                        <div
                                            key={record.id}
                                            style={styles.recordItem}
                                        >
                                            <h3 style={styles.recordTitle}>
                                                {record.recordType ||
                                                    "Medical Record"}
                                            </h3>

                                            <div style={styles.recordDetails}>
                                                <strong>Date:</strong>{" "}
                                                {record.recordDate || "—"}
                                            </div>

                                            <div style={styles.recordDetails}>
                                                <strong>Provider:</strong>{" "}
                                                {record.providerName || "—"}
                                            </div>

                                            <div style={styles.recordDetails}>
                                                <strong>Facility:</strong>{" "}
                                                {record.providerFacility || "—"}
                                            </div>

                                            <div style={styles.recordDetails}>
                                                <strong>Reason:</strong>{" "}
                                                {record.reason || "—"}
                                            </div>

                                            <div style={styles.recordDetails}>
                                                <strong>Diagnosis:</strong>{" "}
                                                {record.diagnosis || "—"}
                                            </div>

                                            <div style={styles.recordDetails}>
                                                <strong>Medication:</strong>{" "}
                                                {record.medication || "—"}
                                            </div>

                                            <div style={styles.recordDetails}>
                                                <strong>Notes:</strong>{" "}
                                                {record.notes || "—"}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section style={styles.card}>
                            <h2 style={styles.sectionTitle}>
                                Add Consultation
                            </h2>

                            <p style={styles.description}>
                                Add the consultation from this temporary
                                provider session. The consultation will become
                                part of the worker's medical history.
                            </p>

                            <form onSubmit={addConsultation}>
                                <label style={styles.label}>
                                    Consultation Date

                                    <input
                                        type="date"
                                        name="recordDate"
                                        value={consultation.recordDate}
                                        onChange={handleConsultationChange}
                                        style={styles.input}
                                        required
                                    />
                                </label>

                                <label style={styles.label}>
                                    Provider Name

                                    <input
                                        type="text"
                                        name="providerName"
                                        value={consultation.providerName}
                                        onChange={handleConsultationChange}
                                        style={styles.input}
                                        required
                                    />
                                </label>

                                <label style={styles.label}>
                                    Facility

                                    <input
                                        type="text"
                                        name="providerFacility"
                                        value={consultation.providerFacility}
                                        onChange={handleConsultationChange}
                                        style={styles.input}
                                    />
                                </label>

                                <label style={styles.label}>
                                    Reason for Consultation

                                    <textarea
                                        name="reason"
                                        value={consultation.reason}
                                        onChange={handleConsultationChange}
                                        style={styles.textarea}
                                        placeholder="Reason for the visit"
                                    />
                                </label>

                                <label style={styles.label}>
                                    Diagnosis

                                    <textarea
                                        name="diagnosis"
                                        value={consultation.diagnosis}
                                        onChange={handleConsultationChange}
                                        style={styles.textarea}
                                        placeholder="Provider's diagnosis"
                                    />
                                </label>

                                <label style={styles.label}>
                                    Medication

                                    <textarea
                                        name="medication"
                                        value={consultation.medication}
                                        onChange={handleConsultationChange}
                                        style={styles.textarea}
                                        placeholder="Medication prescribed, if any"
                                    />
                                </label>

                                <label style={styles.label}>
                                    Notes

                                    <textarea
                                        name="notes"
                                        value={consultation.notes}
                                        onChange={handleConsultationChange}
                                        style={styles.textarea}
                                        placeholder="Additional consultation notes"
                                    />
                                </label>

                                <button
                                    type="submit"
                                    style={styles.primaryButton}
                                    disabled={loading}
                                >
                                    {loading
                                        ? "Saving..."
                                        : "Add Consultation"}
                                </button>
                            </form>
                        </section>
                    </>
                )}
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
        marginBottom: "15px",
    },

    description: {
        color: "#555",
        lineHeight: "1.6",
        marginBottom: "20px",
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

    textarea: {
        display: "block",
        width: "100%",
        minHeight: "90px",
        boxSizing: "border-box",
        marginTop: "7px",
        padding: "11px",
        border: "1px solid #ccc",
        borderRadius: "7px",
        fontSize: "15px",
        resize: "vertical",
        fontFamily: "inherit",
    },

    primaryButton: {
        padding: "12px 20px",
        border: "none",
        borderRadius: "7px",
        cursor: "pointer",
        fontWeight: "600",
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

    infoGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "20px",
    },

    recordList: {
        display: "flex",
        flexDirection: "column",
        gap: "15px",
    },

    recordItem: {
        padding: "18px",
        border: "1px solid #ddd",
        borderRadius: "8px",
    },

    recordTitle: {
        marginTop: 0,
        marginBottom: "12px",
    },

    recordDetails: {
        marginTop: "7px",
        color: "#555",
        lineHeight: "1.5",
    },
};

export default ProviderAccessPage;