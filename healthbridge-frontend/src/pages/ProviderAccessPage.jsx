import { useCallback, useEffect, useRef, useState } from "react";
import providerApi from "../services/providerApi";
import PageStatus from "../components/PageStatus";

function localDate() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function ProviderAccessPage() {
    const [initialCode] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("access") || "");
    const [accessToken, setAccessToken] = useState(initialCode);
    const [accessData, setAccessData] = useState(null);

    const [loading, setLoading] = useState(!!initialCode);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const busy = useRef(false);
    const submission = useRef(null);
    const accessGeneration = useRef(0);

    const [consultation, setConsultation] = useState({
        recordDate: localDate(),
        providerName: "",
        providerFacility: "",
        reason: "",
        diagnosis: "",
        medication: "",
        notes: "",
    });

    const loadAccess = useCallback(async (code, signal) => {
        const generation = ++accessGeneration.current;
        setError("");
        setMessage("");
        setAccessData(null);
        setSubmitted(false);
        submission.current = null;

        if (!code.trim()) {
            setError("Please enter the temporary access code.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const response = await providerApi.get("/provider-access", {
                headers: { "X-HealthBridge-Access-Code": code.trim() }, signal,
            });
            if (signal?.aborted || generation !== accessGeneration.current) return;

            setAccessToken(code.trim());
            setAccessData(response.data);

            setConsultation({
                recordDate: localDate(), reason: "", diagnosis: "", medication: "", notes: "",
                providerName: response.data.providerName || "",
                providerFacility: response.data.providerFacility || "",
            });

            setMessage("Authorized medical records loaded successfully.");
        } catch (err) {
            if (signal?.aborted || generation !== accessGeneration.current) return;
            setError(
                err.response?.data?.message ||
                "Unable to access the shared medical records."
            );
        } finally {
            if (!signal?.aborted && generation === accessGeneration.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        let controller;
        let timer;
        const processLink = code => {
            if (!code) return;
            controller?.abort();
            window.clearTimeout(timer);
            const cleanUrl = new URL(window.location.href);
            cleanUrl.hash = "";
            window.history.replaceState(window.history.state, "", cleanUrl.pathname + cleanUrl.search);
            controller = new AbortController();
            timer = window.setTimeout(() => void loadAccess(code, controller.signal), 0);
        };
        const onHashChange = () => processLink(new URLSearchParams(window.location.hash.slice(1)).get("access"));
        processLink(initialCode);
        window.addEventListener("hashchange", onHashChange);
        return () => {
            window.removeEventListener("hashchange", onHashChange);
            window.clearTimeout(timer);
            controller?.abort();
        };
    }, [initialCode, loadAccess]);

    const accessRecords = event => {
        event.preventDefault();
        submission.current = null;
        setSubmitted(false);
        void loadAccess(accessToken);
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
        if (busy.current || submitted) return;

        setError("");
        setMessage("");

        if (!accessToken.trim()) {
            setError("The temporary access code is missing.");
            return;
        }

        const generation = accessGeneration.current;
        try {
            busy.current = true;
            setLoading(true);
            const body = JSON.stringify(consultation);
            if (!submission.current || submission.current.body !== body) {
                submission.current = { id: crypto.randomUUID(), body };
            }
            await providerApi.post("/provider-access/consultation", consultation, {
                headers: { "X-HealthBridge-Access-Code": accessToken.trim(), "Idempotency-Key": submission.current.id },
            });
            if (generation !== accessGeneration.current) return;
            setSubmitted(true);

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
            if (generation !== accessGeneration.current) return;
            if (err.response?.status === 403) {
                setAccessData(null);
                setAccessToken("");
            }
            setError(
                err.response?.data?.message ||
                "Unable to add the consultation."
            );
        } finally {
            busy.current = false;
            if (generation === accessGeneration.current) setLoading(false);
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

                {!accessData && loading && <PageStatus loading title="Validating temporary access" />}
                {!accessData && !loading && (
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
                                    type="password"
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

                            {accessData.medicalRecords?.length === 0 ? (
                                <p>
                                    No medical records were included in this
                                    sharing session.
                                </p>
                            ) : (
                                <div className="ui-recordList">
                                    {accessData.medicalRecords?.map((record) => (
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

                            {submitted ? <button type="button" className="secondary-button" onClick={() => {
                                submission.current = null;
                                setSubmitted(false);
                                setMessage("");
                            }}>Add Another Consultation</button> : <form onSubmit={addConsultation}>
                                <fieldset disabled={loading}>
                                <label className="ui-label">
                                    Consultation Date

                                    <input
                                        type="date"
                                        max={localDate()}
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
                                        maxLength={255}
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
                                        maxLength={255}
                                        value={consultation.providerFacility}
                                        onChange={handleConsultationChange}
                                        className="ui-input"
                                    />
                                </label>

                                <label className="ui-label">
                                    Reason for Consultation

                                    <textarea
                                        name="reason"
                                        maxLength={255}
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
                                        maxLength={255}
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
                                        maxLength={255}
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
                                        maxLength={255}
                                        value={consultation.notes}
                                        onChange={handleConsultationChange}
                                        className="ui-textarea"
                                        placeholder="Additional consultation notes"
                                    />
                                </label>

                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={loading || ![consultation.reason, consultation.diagnosis, consultation.medication, consultation.notes].some(value => value.trim())}
                                >
                                    {loading
                                        ? "Saving..."
                                        : "Add Consultation"}
                                </button>
                                </fieldset>
                            </form>}
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}



export default ProviderAccessPage;
