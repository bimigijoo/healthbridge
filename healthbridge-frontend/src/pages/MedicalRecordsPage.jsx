import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import api from "../services/api";

function MedicalRecordsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [healthProfile, setHealthProfile] = useState(null);
    const [records, setRecords] = useState([]);
    const [documents, setDocuments] = useState({});
    const [loading, setLoading] = useState(true);
    const [uploadingRecordId, setUploadingRecordId] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadDocuments = useCallback(async (recordList) => {
        const documentMap = {};

        await Promise.all(
            recordList.map(async (record) => {
                try {
                    const response = await api.get(
                        `/medical-documents/record/${record.id}`
                    );

                    documentMap[record.id] = response.data;
                } catch (err) {
                    console.error(
                        `Unable to load documents for record ${record.id}`,
                        err
                    );

                    documentMap[record.id] = [];
                }
            })
        );

        return documentMap;
    }, []);

    const loadData = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            setError("");

            const profileResponse = await api.get(
                `/health-profile/user/${user.id}`
            );

            const profile = profileResponse.data;

            const recordsResponse = await api.get(
                `/medical-records/profile/${profile.id}`
            );

            const recordList = recordsResponse.data;

            const documentMap = await loadDocuments(recordList);

            setHealthProfile(profile);
            setRecords(recordList);
            setDocuments(documentMap);
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to load your medical records."
            );
        } finally {
            setLoading(false);
        }
    }, [user, loadDocuments]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadData();
        }, 0);

        return () => {
            window.clearTimeout(timer);
        };
    }, [loadData]);

    const handleDocumentUpload = async (event, recordId) => {
        const file = event.target.files?.[0];

        event.target.value = "";

        if (!file) {
            return;
        }

        setError("");
        setSuccess("");
        setUploadingRecordId(recordId);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await api.post(
                `/medical-documents/upload/${recordId}`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            setDocuments((previous) => ({
                ...previous,
                [recordId]: [
                    ...(previous[recordId] || []),
                    response.data,
                ],
            }));

            setSuccess(
                "Medical document uploaded successfully."
            );
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to upload the medical document."
            );
        } finally {
            setUploadingRecordId(null);
        }
    };

    const handleDownload = async (document) => {
        setError("");
        setSuccess("");

        try {
            const response = await api.get(
                `/medical-documents/${document.id}/download`,
                {
                    responseType: "blob",
                }
            );

            const blobUrl = URL.createObjectURL(response.data);
            const link = window.document.createElement("a");

            link.href = blobUrl;
            link.download =
                document.fileName || "medical-document";

            window.document.body.appendChild(link);
            link.click();
            link.remove();

            window.setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, 1000);
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to download the medical document."
            );
        }
    };

    const handleDeleteDocument = async (document) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${document.fileName}"?`
        );

        if (!confirmed) {
            return;
        }

        setError("");
        setSuccess("");

        try {
            await api.delete(
                `/medical-documents/${document.id}`
            );

            setDocuments((previous) => ({
                ...previous,
                [document.medicalRecordId]:
                    (previous[document.medicalRecordId] || []).filter(
                        (item) => item.id !== document.id
                    ),
            }));

            setSuccess(
                "Medical document deleted successfully."
            );
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to delete the medical document."
            );
        }
    };

    const handleDeleteRecord = async (recordId) => {
        const confirmed = window.confirm(
            "Deleting a medical record may also affect its associated documents. Are you sure you want to continue?"
        );

        if (!confirmed) {
            return;
        }

        setError("");
        setSuccess("");

        try {
            await api.delete(
                `/medical-records/${recordId}`
            );

            setRecords((previous) =>
                previous.filter(
                    (record) => record.id !== recordId
                )
            );

            setDocuments((previous) => {
                const updated = { ...previous };
                delete updated[recordId];
                return updated;
            });

            setSuccess(
                "Medical record deleted successfully."
            );
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Unable to delete the medical record."
            );
        }
    };

    const formatDate = (value) => {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="page-container">
                <p>Loading medical records...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h1>Medical Records</h1>

                    <p>
                        View your digital medical history and
                        manage supporting documents.
                    </p>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={() => navigate("/dashboard")}
                >
                    ← Back to Dashboard
                </button>
            </header>

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

            <section className="profile-card">
                <div className="records-intro">
                    <h2>My Medical Records</h2>

                    <p>
                        Your medical history is organized below.
                        Open a record to review its details and
                        manage related documents.
                    </p>
                </div>

                {records.length === 0 ? (
                    <div className="empty-state">
                        <h3>No medical records found</h3>

                        <p>
                            Your medical history will appear here
                            when records are added through
                            HealthBridge.
                        </p>
                    </div>
                ) : (
                    <div className="records-list">
                        {records.map((record) => {
                            const recordDocuments =
                                documents[record.id] || [];

                            const isUploading =
                                uploadingRecordId === record.id;

                            return (
                                <article
                                    className="record-card"
                                    key={record.id}
                                >
                                    <div className="record-header">
                                        <div>
                                            <h3>
                                                {record.recordType
                                                    ? record.recordType.replace(
                                                        /_/g,
                                                        " "
                                                    )
                                                    : "MEDICAL RECORD"}
                                            </h3>

                                            <p>
                                                Record date:{" "}
                                                {formatDate(
                                                    record.recordDate
                                                )}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            className="danger-button"
                                            onClick={() =>
                                                handleDeleteRecord(
                                                    record.id
                                                )
                                            }
                                        >
                                            Delete Record
                                        </button>
                                    </div>

                                    <div className="record-details">
                                        {record.providerName && (
                                            <p>
                                                <strong>
                                                    Provider:
                                                </strong>{" "}
                                                {record.providerName}
                                            </p>
                                        )}

                                        {record.providerFacility && (
                                            <p>
                                                <strong>
                                                    Facility:
                                                </strong>{" "}
                                                {record.providerFacility}
                                            </p>
                                        )}

                                        {record.reason && (
                                            <p>
                                                <strong>
                                                    Reason:
                                                </strong>{" "}
                                                {record.reason}
                                            </p>
                                        )}

                                        {record.diagnosis && (
                                            <p>
                                                <strong>
                                                    Diagnosis:
                                                </strong>{" "}
                                                {record.diagnosis}
                                            </p>
                                        )}

                                        {record.medication && (
                                            <p>
                                                <strong>
                                                    Medication:
                                                </strong>{" "}
                                                {record.medication}
                                            </p>
                                        )}

                                        {record.notes && (
                                            <p>
                                                <strong>
                                                    Notes:
                                                </strong>{" "}
                                                {record.notes}
                                            </p>
                                        )}
                                    </div>

                                    <div className="documents-section">
                                        <div className="documents-header">
                                            <div>
                                                <h4>
                                                    Supporting Documents
                                                </h4>

                                                <p>
                                                    Upload reports,
                                                    prescriptions, or
                                                    other files related
                                                    to this record.
                                                </p>

                                                <span
                                                    style={
                                                        styles.documentCount
                                                    }
                                                >
                                                    {recordDocuments.length}{" "}
                                                    {recordDocuments.length === 1
                                                        ? "document attached"
                                                        : "documents attached"}
                                                </span>
                                            </div>

                                            <label
                                                style={{
                                                    ...styles.uploadButton,
                                                    opacity: isUploading
                                                        ? 0.65
                                                        : 1,
                                                    cursor: isUploading
                                                        ? "not-allowed"
                                                        : "pointer",
                                                }}
                                            >
                                                {isUploading
                                                    ? "Uploading..."
                                                    : recordDocuments.length > 0
                                                        ? "+ Add Another Document"
                                                        : "+ Upload Document"}

                                                <input
                                                    type="file"
                                                    hidden
                                                    disabled={isUploading}
                                                    onChange={(event) =>
                                                        handleDocumentUpload(
                                                            event,
                                                            record.id
                                                        )
                                                    }
                                                />
                                            </label>
                                        </div>

                                        {recordDocuments.length === 0 ? (
                                            <div
                                                style={
                                                    styles.documentEmptyState
                                                }
                                            >
                                                <p
                                                    style={
                                                        styles.documentEmptyTitle
                                                    }
                                                >
                                                    No documents attached yet
                                                </p>

                                                <p
                                                    style={
                                                        styles.documentEmptyDescription
                                                    }
                                                >
                                                    Upload a medical report,
                                                    prescription, or other
                                                    supporting file using
                                                    the button above.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="document-list">
                                                {recordDocuments.map(
                                                    (document) => (
                                                        <div
                                                            className="document-item"
                                                            key={document.id}
                                                        >
                                                            <div
                                                                style={
                                                                    styles.documentInfo
                                                                }
                                                            >
                                                                <strong>
                                                                    {document.fileName}
                                                                </strong>

                                                                <p>
                                                                    {document.fileType ||
                                                                        "Unknown file type"}
                                                                </p>
                                                            </div>

                                                            <div className="document-actions">
                                                                <button
                                                                    type="button"
                                                                    className="secondary-button"
                                                                    onClick={() =>
                                                                        handleDownload(
                                                                            document
                                                                        )
                                                                    }
                                                                >
                                                                    Download
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="danger-button"
                                                                    onClick={() =>
                                                                        handleDeleteDocument(
                                                                            document
                                                                        )
                                                                    }
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="profile-card">
                <h2>Record Sharing</h2>

                <p>
                    Share selected medical records with healthcare
                    providers through temporary access. You control
                    which records are shared.
                </p>

                {healthProfile?.healthId && (
                    <p>
                        <strong>Health ID:</strong>{" "}
                        {healthProfile.healthId}
                    </p>
                )}

                <button
                    type="button"
                    className="primary-button"
                    onClick={() => navigate("/share-records")}
                >
                    Share Selected Records
                </button>
            </section>
        </div>
    );
}

const styles = {
    uploadButton: {
        display: "inline-block",
        padding: "10px 16px",
        borderRadius: "7px",
        background: "#2563eb",
        color: "#ffffff",
        cursor: "pointer",
        fontWeight: 600,
        border: "none",
        textAlign: "center",
        whiteSpace: "nowrap",
        fontSize: "14px",
    },

    documentCount: {
        display: "inline-block",
        marginTop: "8px",
        color: "#475467",
        fontSize: "13px",
        fontWeight: 600,
    },

    documentEmptyState: {
        padding: "20px",
        marginTop: "12px",
        backgroundColor: "#f8fafc",
        border: "1px dashed #cbd5e1",
        borderRadius: "10px",
        textAlign: "center",
    },

    documentEmptyTitle: {
        margin: 0,
        color: "#344054",
        fontSize: "14px",
        fontWeight: 600,
    },

    documentEmptyDescription: {
        margin: "8px 0 0",
        color: "#667085",
        fontSize: "13px",
        lineHeight: 1.5,
    },

    documentInfo: {
        minWidth: 0,
        overflowWrap: "anywhere",
    },
};

export default MedicalRecordsPage;
