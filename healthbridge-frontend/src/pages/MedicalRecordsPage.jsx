import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import api from "../services/api";
import PageStatus from "../components/PageStatus";
import { Download, Plus, Trash2, Upload } from "lucide-react";
import CreateMedicalRecordForm from "../components/CreateMedicalRecordForm";

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
    const [creatingRecord, setCreatingRecord] = useState(false);

    const loadDocuments = useCallback(async (recordList) => {
        const documentMap = {};

        await Promise.all(
            recordList.map(async (record) => {
                try {
                    const response = await api.get(
                        `/medical-documents/record/${record.id}`
                    );

                    documentMap[record.id] = response.data;
                } catch {
                    documentMap[record.id] = null;
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
            setError(
                err.response?.status === 404 ? "" : err.response?.data?.message ||
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

        if (file.size > 10 * 1024 * 1024 ||
            !/\.(pdf|jpe?g|png|webp)$/i.test(file.name)) {
            setError("Choose a PDF, JPEG, PNG, or WebP file up to 10 MB.");
            return;
        }
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
            setError(
                err.response?.data?.message ||
                "Unable to delete the medical document."
            );
        }
    };

    const handleDeleteRecord = async (recordId) => {
        const confirmed = window.confirm(
            "Delete this medical record and remove it from shared access? Attached documents must be deleted first."
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
        return <PageStatus loading title="Loading medical records" />;
    }

    if (!healthProfile) {
        return <PageStatus title={error ? "Records could not be loaded" : "Create your health profile"}
            description={error || "A health profile is needed before records can be added."}
            error={!!error} onRetry={error ? () => void loadData() : undefined} createProfile={!error} />;
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

            {creatingRecord ? <CreateMedicalRecordForm profileId={healthProfile.id}
                onCancel={() => setCreatingRecord(false)} onCreated={record => {
                    setRecords(current => [record, ...current].sort((a, b) => b.recordDate.localeCompare(a.recordDate)));
                    setDocuments(current => ({ ...current, [record.id]: [] }));
                    setCreatingRecord(false);
                    setError("");
                    setSuccess("Medical record saved successfully.");
                }} /> : <button type="button" className="primary-button" onClick={() => setCreatingRecord(true)}>
                    <Plus size={16} aria-hidden="true" /> Add Medical Record
                </button>}

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
                            No reports or visits have been added yet.
                        </p>
                    </div>
                ) : (
                    <div className="records-list">
                        {records.map((record) => {
                            const recordDocuments =
                                documents[record.id] || [];
                            const documentsFailed = documents[record.id] === null;

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
                                            <Trash2 size={16} aria-hidden="true" /> Delete Record
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
                                                    className="ui-documentCount"
                                                >
                                                    {recordDocuments.length}{" "}
                                                    {recordDocuments.length === 1
                                                        ? "document attached"
                                                        : "documents attached"}
                                                </span>
                                            </div>

                                            <label
                                                className="upload-button" style={{
  opacity: isUploading ? 0.65 : 1,
  cursor: isUploading ? "not-allowed" : "pointer"
}}
                                            >
                                                <Upload size={16} aria-hidden="true" />
                                                {isUploading
                                                    ? "Uploading..."
                                                    : recordDocuments.length > 0
                                                        ? "+ Add Another Document"
                                                        : "+ Upload Document"}

                                                <input
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
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

                                        {documentsFailed ? (
                                            <p className="error-message" role="alert">
                                                Documents could not be loaded.
                                                <button type="button" className="link-button"
                                                    onClick={() => void loadData()}>Retry</button>
                                            </p>
                                        ) : recordDocuments.length === 0 ? (
                                            <div
                                                className="ui-documentEmptyState"
                                            >
                                                <p
                                                    className="ui-documentEmptyTitle"
                                                >
                                                    No documents attached yet
                                                </p>

                                                <p
                                                    className="ui-documentEmptyDescription"
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
                                                                className="ui-documentInfo"
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
                                                                    <Download size={16} aria-hidden="true" /> Download
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
                                                                    <Trash2 size={16} aria-hidden="true" /> Delete
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



export default MedicalRecordsPage;
