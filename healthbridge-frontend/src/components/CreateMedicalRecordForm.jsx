import { useRef, useState } from "react";
import { Save, X } from "lucide-react";
import api from "../services/api";

const recordTypes = ["LAB_REPORT", "PRESCRIPTION", "VACCINATION", "DIAGNOSIS", "MEDICATION", "CONSULTATION", "OTHER"];
const fields = { providerName: "Provider Name", providerFacility: "Facility", reason: "Reason / Report Title",
    diagnosis: "Diagnosis", medication: "Medication", notes: "Notes" };

export default function CreateMedicalRecordForm({ profileId, onCreated, onCancel }) {
    const today = new Date();
    const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const [form, setForm] = useState({ recordType: "LAB_REPORT", recordDate: localToday,
        providerName: "", providerFacility: "", reason: "", diagnosis: "", medication: "", notes: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const busy = useRef(false);
    const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));

    const save = async event => {
        event.preventDefault();
        if (busy.current) return;
        busy.current = true;
        setSaving(true);
        setError("");
        try {
            const response = await api.post("/medical-records", { healthProfileId: profileId, ...form });
            onCreated(response.data);
        } catch (err) {
            setError(err.response?.data?.message || "The record could not be saved. Your details are still available to retry.");
        } finally {
            busy.current = false;
            setSaving(false);
        }
    };

    return <section className="ui-section" aria-labelledby="new-record-heading">
        <div className="record-header">
            <h2 id="new-record-heading">Add Medical Record</h2>
            <button type="button" className="secondary-button" aria-label="Cancel new record" title="Cancel new record"
                disabled={saving} onClick={onCancel}><X size={18} aria-hidden="true" /></button>
        </div>
        {error && <p className="error-message" role="alert">{error}</p>}
        <form onSubmit={save}>
            <fieldset disabled={saving} className="record-entry-grid">
                <label className="ui-label">Record Type
                    <select className="ui-input" name="recordType" value={form.recordType} onChange={change}>
                        {recordTypes.map(type => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
                    </select>
                </label>
                <label className="ui-label">Record Date
                    <input className="ui-input" type="date" name="recordDate" value={form.recordDate}
                        max={localToday} onChange={change} required />
                </label>
                {Object.entries(fields).map(([name, label]) => <label className="ui-label" key={name}>{label}
                    <input className="ui-input" name={name} value={form[name]} maxLength={255} onChange={change} />
                </label>)}
                <button type="submit" className="primary-button"><Save size={16} aria-hidden="true" />
                    {saving ? "Saving..." : "Save Medical Record"}</button>
            </fieldset>
        </form>
    </section>;
}
