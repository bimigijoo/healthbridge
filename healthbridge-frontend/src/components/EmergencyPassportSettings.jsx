import { useEffect, useRef, useState } from "react";
import { RefreshCw, Save, ShieldOff } from "lucide-react";
import api from "../services/api";

const fields = [
    ["bloodGroup", "Blood group"], ["emergencyContact", "Emergency contact"],
    ["allergies", "Allergies and reactions"], ["conditions", "Chronic & existing conditions"],
    ["medications", "Current medications, dosage and frequency"], ["preferredLanguage", "Preferred language"],
];

export default function EmergencyPassportSettings({ profileId, onReferenceChange }) {
    const [settings, setSettings] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const locked = useRef(false);
    const endpoint = "/emergency-passport/profile/" + profileId;
    useEffect(() => {
        const controller = new AbortController();
        api.get(endpoint, { signal: controller.signal })
            .then(response => { if (!controller.signal.aborted) { setSettings(response.data); setError(""); } })
            .catch(() => { if (!controller.signal.aborted) setError("Emergency sharing preferences could not be loaded."); });
        return () => controller.abort();
    }, [endpoint, attempt]);

    const save = async (next, regenerate = false) => {
        if (locked.current) return;
        if (regenerate && !window.confirm("Replace the permanent QR reference? All previously printed or copied emergency links will stop working.")) return;
        locked.current = true; setBusy(true); setError(""); setMessage("");
        try {
            const response = regenerate ? await api.post(endpoint + "/regenerate") : await api.put(endpoint, next);
            setSettings(response.data);
            setMessage(regenerate ? "Public reference replaced. Use the new QR." : response.data.enabled
                ? "Emergency sharing preferences saved." : "Public emergency sharing is disabled.");
            if (regenerate) onReferenceChange();
        } catch (err) {
            setError(err.response?.data?.message || "Emergency sharing preferences could not be saved. Your previous permissions remain in effect.");
        } finally { locked.current = false; setBusy(false); }
    };
    return <section className="ui-section passport-controls" aria-labelledby="emergency-settings-title">
        <h2 id="emergency-settings-title" className="ui-sectionTitle">Emergency Passport Settings</h2>
        <p>Anyone possessing this permanent QR or its link can view the emergency fields you enable, without further consent.
            Selected categories include future changes and new entries. Names, dates of birth, private notes, medical records and consultations are never included.</p>
        <p>Disabling stops future disclosure. Re-enabling restores access through the same reference; replace the reference to invalidate old copies permanently.
            Previously viewed information and screenshots cannot be recalled.</p>
        {error && <p className="error-message" role="alert">{error}</p>}
        {message && <p className="success-message" role="status">{message}</p>}
        {!settings ? error ? <button className="secondary-button" type="button" onClick={() => setAttempt(value => value + 1)}>
            <RefreshCw size={16} aria-hidden="true" /> Retry emergency settings</button> : <p role="status">Loading emergency preferences...</p> :
            <form onSubmit={event => { event.preventDefault(); void save(settings); }}>
                <fieldset disabled={busy}>
                    <label className="emergency-option"><input type="checkbox" checked={settings.enabled}
                        onChange={event => setSettings(value => ({ ...value, enabled: event.target.checked }))} />
                        Enable public emergency sharing</label>
                    <div className="emergency-options">{fields.map(([key, label]) => <label key={key} className="emergency-option">
                        <input type="checkbox" checked={settings[key]} onChange={event => setSettings(value => ({ ...value, [key]: event.target.checked }))} />
                        {label}</label>)}</div>
                    <div className="document-actions">
                        <button className="primary-button" type="submit" disabled={settings.enabled && !fields.some(([key]) => settings[key])}>
                            <Save size={16} aria-hidden="true" /> {busy ? "Saving..." : "Save Emergency Preferences"}</button>
                        <button className="danger-button" type="button" onClick={() => void save({ ...settings, enabled: false })}>
                            <ShieldOff size={16} aria-hidden="true" /> Revoke Public Access</button>
                        <button className="secondary-button" type="button" onClick={() => void save(null, true)}>
                            <RefreshCw size={16} aria-hidden="true" /> Replace Permanent Reference</button>
                    </div>
                </fieldset>
            </form>}
    </section>;
}
