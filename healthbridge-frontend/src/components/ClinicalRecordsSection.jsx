import { useRef, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import api from "../services/api";

export default function ClinicalRecordsSection({ section, records, profileId, onChange }) {
    const [editing, setEditing] = useState(null);
    const [values, setValues] = useState({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const locked = useRef(false);
    const start = item => {
        setEditing(item?.id || "new");
        setValues(Object.fromEntries([section.name, ...section.details].map(key => [key, item?.[key] || ""])));
        setError("");
    };
    const save = async event => {
        event.preventDefault();
        if (locked.current) return;
        locked.current = true; setBusy(true); setError("");
        try {
            const data = { ...values, healthProfileId: profileId };
            if ("diagnosedDate" in data && !data.diagnosedDate) data.diagnosedDate = null;
            const response = editing === "new" ? await api.post("/" + section.endpoint, data)
                : await api.put("/" + section.endpoint + "/" + editing, data);
            onChange(editing === "new" ? [...records, response.data] : records.map(item => item.id === editing ? response.data : item));
            setEditing(null);
        } catch (err) { setError(err.response?.data?.message || section.title + " could not be saved. Please retry."); }
        finally { locked.current = false; setBusy(false); }
    };
    const remove = async item => {
        if (locked.current || !window.confirm("Delete this " + section.itemLabel.toLowerCase() + "?")) return;
        locked.current = true; setBusy(true); setError("");
        try { await api.delete("/" + section.endpoint + "/" + item.id); onChange(records.filter(value => value.id !== item.id)); if (editing === item.id) setEditing(null); }
        catch { setError("This entry could not be deleted. Please retry."); }
        finally { locked.current = false; setBusy(false); }
    };
    return <section className="ui-section passport-clinical" aria-label={section.title}>
        <div className="ui-header"><h2 className="ui-sectionTitle">{section.title}</h2>
            <button type="button" className="secondary-button passport-controls" disabled={busy || records === null} onClick={() => start(null)}>
                <Plus size={16} aria-hidden="true" /> Add {section.itemLabel}</button></div>
        {error && <p role="alert" className="error-message">{error}</p>}
        {records === null ? <div className="error-message" role="alert">{section.title} could not be loaded.
            <button className="link-button" type="button" onClick={() => window.location.reload()}>Retry</button></div> :
            records?.length ? <ul className="ui-recordList">{records.map(item => <li className="ui-recordItem" key={item.id}>
                <strong>{item[section.name] || "Not recorded"}</strong>
                {section.details.map(field => item[field] ? <p key={field}>{item[field]}</p> : null)}
                <div className="document-actions passport-controls">
                    <button className="icon-button" title={"Edit " + section.itemLabel} aria-label={"Edit " + section.itemLabel} type="button" disabled={busy} onClick={() => start(item)}><Pencil size={16} /></button>
                    <button className="icon-button" title={"Delete " + section.itemLabel} aria-label={"Delete " + section.itemLabel} type="button" disabled={busy} onClick={() => void remove(item)}><Trash2 size={16} /></button>
                </div>
            </li>)}</ul> : <p>{section.empty}</p>}
        {editing && <form className="passport-controls" onSubmit={save}>
            <fieldset disabled={busy}>
                {[section.name, ...section.details].map(field => <label key={field} className="ui-label">
                    {section.labels[field]}<input type={field === "diagnosedDate" ? "date" : "text"} maxLength={255}
                        required={field === section.name} value={values[field]} onChange={event => setValues(value => ({ ...value, [field]: event.target.value }))} />
                </label>)}
                <div className="document-actions">
                    <button className="primary-button" type="submit"><Save size={16} aria-hidden="true" /> Save {section.itemLabel}</button>
                    <button className="secondary-button" type="button" onClick={() => setEditing(null)}><X size={16} aria-hidden="true" /> Cancel</button>
                </div>
            </fieldset>
        </form>}
    </section>;
}
