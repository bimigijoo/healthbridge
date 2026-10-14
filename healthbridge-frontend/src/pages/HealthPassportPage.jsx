import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";
import PageStatus from "../components/PageStatus";
import PassportQr from "../components/PassportQr";
import { Printer } from "lucide-react";

const clinicalSections = [
    { key: "allergies", endpoint: "allergies", title: "Allergies", name: "allergen", details: ["reaction"], empty: "No allergies recorded." },
    { key: "conditions", endpoint: "existing-conditions", title: "Chronic & Existing Conditions", name: "conditionName", details: ["diagnosedDate", "notes"], empty: "No conditions recorded." },
    { key: "medications", endpoint: "current-medications", title: "Current Medications", name: "medicationName", details: ["dosage", "frequency", "notes"], empty: "No current medications recorded." },
];

function HealthPassportPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [healthProfile, setHealthProfile] = useState(null);
    const [clinicalData, setClinicalData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!user?.id) {
            return;
        }
        const controller = new AbortController();

        const loadPassport = async () => {
            try {
                const profileResponse = await api.get(
                    `/health-profile/user/${user.id}`, { signal: controller.signal }
                );

                const profile = profileResponse.data;
                const results = await Promise.allSettled(clinicalSections.map(section =>
                    api.get(`/${section.endpoint}/profile/${profile.id}`, { signal: controller.signal })));
                if (controller.signal.aborted) return;
                setHealthProfile(profile);
                setClinicalData(Object.fromEntries(clinicalSections.map((section, index) => [section.key,
                    results[index].status === "fulfilled" ? results[index].value.data : null])));
            } catch (error) {
                if (controller.signal.aborted) return;
                setError(
                    error.response?.status === 404 ? "" : error.response?.data?.message ||
                    "Unable to load your digital health passport."
                );
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        void loadPassport();
        return () => controller.abort();
    }, [user]);

    if (loading) {
        return <PageStatus loading title="Loading health passport" />;
    }

    if (error) {
        return <PageStatus error title="Passport could not be loaded" description={error}
            onRetry={() => window.location.reload()} />;
    }

    if (!healthProfile) {
        return <PageStatus title="Create your health profile" createProfile
            description="Your health passport will be available after you create a profile." />;
    }

    return (
        <div className="ui-page">
            <div className="ui-container">
                <div className="ui-header">
                    <div>
                        <h1 className="ui-title">
                            Digital Health Passport
                        </h1>

                        <p className="ui-subtitle">
                            Your portable HealthBridge identity and emergency
                            health information.
                        </p>
                    </div>

                    <button type="button" className="secondary-button passport-controls" onClick={() => window.print()}>
                        <Printer size={16} aria-hidden="true" /> Print Passport
                    </button>
                    <button
                        className="secondary-button"
                        onClick={() => navigate("/dashboard")}
                    >
                        Back
                    </button>
                </div>

                <section className="ui-section">
                    <div className="ui-profileSection">
                        <div className="ui-profileInfo">
                            <h2 className="ui-sectionTitle">
                                Health Profile
                            </h2>

                            <div className="ui-infoRow">
                                <strong>Health ID</strong>
                                <span>
                  {healthProfile.healthId || "—"}
                </span>
                            </div>

                            <div className="ui-infoRow">
                                <strong>Name</strong>
                                <span>
                  {user?.name || "—"}
                </span>
                            </div>

                            <div className="ui-infoRow">
                                <strong>Date of Birth</strong>
                                <span>
                  {healthProfile.dateOfBirth || "—"}
                </span>
                            </div>

                            <div className="ui-infoRow">
                                <strong>Gender</strong>
                                <span>
                  {healthProfile.gender || "—"}
                </span>
                            </div>

                            <div className="ui-infoRow">
                                <strong>Blood Group</strong>
                                <span>
                  {healthProfile.bloodGroup || "—"}
                </span>
                            </div>

                            <div className="ui-infoRow">
                                <strong>Preferred Language</strong>
                                <span>
                  {healthProfile.preferredLanguage || "—"}
                </span>
                            </div>

                            <div className="ui-infoRow">
                                <strong>Emergency Contact</strong>
                                <span>
                  {healthProfile.emergencyContact || "—"}
                </span>
                            </div>
                        </div>

                        <PassportQr key={healthProfile.id} profileId={healthProfile.id} />
                    </div>
                </section>

                {clinicalSections.map(section => <section className="ui-section passport-clinical" key={section.key}>
                    <h2 className="ui-sectionTitle">{section.title}</h2>
                    {clinicalData[section.key] === null ? <div className="error-message" role="alert">
                        {section.title} could not be loaded.
                        <button type="button" className="link-button" onClick={() => window.location.reload()}>Retry</button>
                    </div> : clinicalData[section.key]?.length ? <ul className="ui-recordList">
                        {clinicalData[section.key].map(item => <li className="ui-recordItem" key={item.id}>
                            <strong>{item[section.name] || "Not recorded"}</strong>
                            {section.details.map(field => item[field] ? <p key={field}>{item[field]}</p> : null)}
                        </li>)}
                    </ul> : <p>{section.empty}</p>}
                </section>)}

                <section className="ui-section">
                    <h2 className="ui-sectionTitle">
                        Emergency Information
                    </h2>

                    <div className="ui-infoGrid">
                        <div className="ui-infoBox">
                            <strong>Blood Group</strong>
                            <span>
                {healthProfile.bloodGroup || "Not provided"}
              </span>
                        </div>

                        <div className="ui-infoBox">
                            <strong>Emergency Contact</strong>
                            <span>
                {healthProfile.emergencyContact ||
                    "Not provided"}
              </span>
                        </div>

                        <div className="ui-infoBox">
                            <strong>Preferred Language</strong>
                            <span>
                {healthProfile.preferredLanguage ||
                    "Not provided"}
              </span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}



export default HealthPassportPage;
