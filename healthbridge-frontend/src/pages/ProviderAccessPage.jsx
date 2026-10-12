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
                `/provider-access/${encodeURIComponent(accessToken.trim())}`
            );

            setAccessData(response.data);

            setConsultation((current) => ({
                ...current,
                providerName: response.data.providerName || "",
                providerFacility: response.data.providerFacility || "",
            }));

            setMessage("Authorized medical records loaded successfully.");
        } catch (err) {
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
                `/provider-access/${encodeURIComponent(accessToken.trim())}/consultation`,
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
        <div className="ui-page">
            <div className="ui-container">
                <div className="ui-header">
                    <div>
                        <h1 className="ui-title">
                            HealthBridge Provider Access
                        </h1>

                        <p className="ui-subtitle">
                            Temporary access to records shared by a worker.
                        </p>
                    </div>
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

                {!accessData && (
                    <section className="ui-section">
                        <h2 className="ui-sectionTitle">
                            Enter Temporary Access Code
                        </h2>

                        <p className="ui-description">
                            Enter the temporary access code provided by the
                            worker. No permanent HealthBridge provider account
                            is required.
                        </p>

                        <form onSubmit={accessRecords}>
                            <label className="ui-label">
                                Temporary Access Code

                                <input
                                    type="text"
                                    autoComplete="off"
                                    required
                                    value={accessToken}
                                    onChange={(event) =>
                                        setAccessToken(event.target.value)
                                    }
                                    placeholder="Enter access code"
                                    className="ui-input"
                                />
                            </label>

                            <button
                                type="submit"
                                className="primary-button"
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
                        <section className="ui-section">
                            <h2 className="ui-sectionTitle">
                                Authorized Access
                            </h2>

                            <div className="ui-infoGrid">
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

                        <section className="ui-section">
                            <h2 className="ui-sectionTitle">
                                Shared Medical Records
                            </h2>

                            {accessData.records?.length === 0 ? (
                                <p>
                                    No medical records were included in this
                                    sharing session.
                                </p>
                            ) : (
                                <div className="ui-recordList">
                                    {accessData.records?.map((record) => (
                                        <div
                                            key={record.id}
                                            className="ui-recordItem"
                                        >
                                            <h3 className="ui-recordTitle">
                                                {record.recordType ||
                                                    "Medical Record"}
                                            </h3>

                                            <div className="ui-recordDetails">
                                                <strong>Date:</strong>{" "}
                                                {record.recordDate || "—"}
                                            </div>

                                            <div className="ui-recordDetails">
                                                <strong>Provider:</strong>{" "}
                                                {record.providerName || "—"}
                                            </div>

                                            <div className="ui-recordDetails">
                                                <strong>Facility:</strong>{" "}
                                                {record.providerFacility || "—"}
                                            </div>

                                            <div className="ui-recordDetails">
                                                <strong>Reason:</strong>{" "}
                                                {record.reason || "—"}
                                            </div>

                                            <div className="ui-recordDetails">
                                                <strong>Diagnosis:</strong>{" "}
                                                {record.diagnosis || "—"}
                                            </div>

                                            <div className="ui-recordDetails">
                                                <strong>Medication:</strong>{" "}
                                                {record.medication || "—"}
                                            </div>

                                            <div className="ui-recordDetails">
                                                <strong>Notes:</strong>{" "}
                                                {record.notes || "—"}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="ui-section">
                            <h2 className="ui-sectionTitle">
                                Add Consultation
                            </h2>

                            <p className="ui-description">
                                Add the consultation from this temporary
                                provider session. The consultation will become
                                part of the worker's medical history.
                            </p>

                            <form onSubmit={addConsultation}>
                                <label className="ui-label">
                                    Consultation Date

                                    <input
                                        type="date"
                                        name="recordDate"
                                        value={consultation.recordDate}
                                        onChange={handleConsultationChange}
                                        className="ui-input"
                                        required
                                    />
                                </label>

                                <label className="ui-label">
                                    Provider Name

                                    <input
                                        type="text"
                                        name="providerName"
                                        value={consultation.providerName}
                                        onChange={handleConsultationChange}
                                        className="ui-input"
                                        required
                                    />
                                </label>

                                <label className="ui-label">
                                    Facility

                                    <input
                                        type="text"
                                        name="providerFacility"
                                        value={consultation.providerFacility}
                                        onChange={handleConsultationChange}
                                        className="ui-input"
                                    />
                                </label>

                                <label className="ui-label">
                                    Reason for Consultation

                                    <textarea
                                        name="reason"
                                        value={consultation.reason}
                                        onChange={handleConsultationChange}
                                        className="ui-textarea"
                                        placeholder="Reason for the visit"
                                    />
                                </label>

                                <label className="ui-label">
                                    Diagnosis

                                    <textarea
                                        name="diagnosis"
                                        value={consultation.diagnosis}
                                        onChange={handleConsultationChange}
                                        className="ui-textarea"
                                        placeholder="Provider's diagnosis"
                                    />
                                </label>

                                <label className="ui-label">
                                    Medication

                                    <textarea
                                        name="medication"
                                        value={consultation.medication}
                                        onChange={handleConsultationChange}
                                        className="ui-textarea"
                                        placeholder="Medication prescribed, if any"
                                    />
                                </label>

                                <label className="ui-label">
                                    Notes

                                    <textarea
                                        name="notes"
                                        value={consultation.notes}
                                        onChange={handleConsultationChange}
                                        className="ui-textarea"
                                        placeholder="Additional consultation notes"
                                    />
                                </label>

                                <button
                                    type="submit"
                                    className="primary-button"
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



export default ProviderAccessPage;
