import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const recordTypes = [
    "CONSULTATION",
    "DIAGNOSIS",
    "MEDICATION",
    "VACCINATION",
    "PRESCRIPTION",
    "LAB_REPORT",
    "OTHER",
];

function MedicalRecordsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [healthProfile, setHealthProfile] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [formData, setFormData] = useState({
        recordType: "CONSULTATION",
        recordDate: "",
        providerName: "",
        providerFacility: "",
        reason: "",
        diagnosis: "",
        medication: "",
        notes: "",
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const profileResponse = await api.get(
                    `/health-profile/user/${user.id}`
                );

                const profile = profileResponse.data;

                setHealthProfile(profile);

                const recordsResponse = await api.get(
                    `/medical-records/profile/${profile.id}`
                );

                setRecords(recordsResponse.data);
            } catch {
                setError(
                    "Unable to load your medical records."
                );
            } finally {
                setLoading(false);
            }
        };

        if (user?.id) {
            void loadData();
        }
    }, [user]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!healthProfile) {
            setError(
                "A health profile is required before adding a medical record."
            );
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await api.post(
                "/medical-records",
                {
                    healthProfileId: healthProfile.id,
                    ...formData,
                }
            );

            setRecords((previous) => [
                response.data,
                ...previous,
            ]);

            setFormData({
                recordType: "CONSULTATION",
                recordDate: "",
                providerName: "",
                providerFacility: "",
                reason: "",
                diagnosis: "",
                medication: "",
                notes: "",
            });

            setSuccess(
                "Medical record added successfully."
            );
        } catch {
            setError(
                "Unable to add the medical record."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (recordId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this medical record?"
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

            setSuccess(
                "Medical record deleted successfully."
            );
        } catch {
            setError(
                "Unable to delete the medical record."
            );
        }
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
                        View and manage your digital medical history.
                    </p>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={() => navigate("/dashboard")}
                >
                    Back to Dashboard
                </button>
            </header>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {success && (
                <div className="success-message">
                    {success}
                </div>
            )}

            <section className="profile-card">

                <h2>Add Medical Record</h2>

                <form
                    className="profile-form"
                    onSubmit={handleSubmit}
                >

                    <div className="form-group">
                        <label htmlFor="recordType">
                            Record Type
                        </label>

                        <select
                            id="recordType"
                            name="recordType"
                            value={formData.recordType}
                            onChange={handleChange}
                            required
                        >
                            {recordTypes.map((type) => (
                                <option
                                    key={type}
                                    value={type}
                                >
                                    {type.replace("_", " ")}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="recordDate">
                            Record Date
                        </label>

                        <input
                            id="recordDate"
                            name="recordDate"
                            type="date"
                            value={formData.recordDate}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="providerName">
                            Provider Name
                        </label>

                        <input
                            id="providerName"
                            name="providerName"
                            value={formData.providerName}
                            onChange={handleChange}
                            placeholder="Doctor or healthcare provider"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="providerFacility">
                            Provider Facility
                        </label>

                        <input
                            id="providerFacility"
                            name="providerFacility"
                            value={formData.providerFacility}
                            onChange={handleChange}
                            placeholder="Hospital, clinic or laboratory"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="reason">
                            Reason
                        </label>

                        <textarea
                            id="reason"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            placeholder="Reason for the visit"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="diagnosis">
                            Diagnosis
                        </label>

                        <textarea
                            id="diagnosis"
                            name="diagnosis"
                            value={formData.diagnosis}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="medication">
                            Medication
                        </label>

                        <textarea
                            id="medication"
                            name="medication"
                            value={formData.medication}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="notes">
                            Notes
                        </label>

                        <textarea
                            id="notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                        />
                    </div>

                    <button
                        type="submit"
                        className="primary-button"
                        disabled={saving}
                    >
                        {saving
                            ? "Saving..."
                            : "Add Medical Record"}
                    </button>

                </form>

            </section>

            <section className="profile-card">

                <h2>My Medical Records</h2>

                {records.length === 0 ? (
                    <p>
                        No medical records found.
                    </p>
                ) : (
                    <div className="records-list">

                        {records.map((record) => (
                            <article
                                className="record-card"
                                key={record.id}
                            >
                                <div className="record-header">
                                    <div>
                                        <h3>
                                            {record.recordType.replace(
                                                "_",
                                                " "
                                            )}
                                        </h3>

                                        <p>
                                            {record.recordDate}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        className="danger-button"
                                        onClick={() =>
                                            handleDelete(
                                                record.id
                                            )
                                        }
                                    >
                                        Delete
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
                            </article>
                        ))}

                    </div>
                )}

            </section>

        </div>
    );
}

export default MedicalRecordsPage;