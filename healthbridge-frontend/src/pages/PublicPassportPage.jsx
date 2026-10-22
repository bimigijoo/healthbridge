import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, RefreshCw } from "lucide-react";
import providerApi from "../services/providerApi";

function fragment() {
    const values = new URLSearchParams(window.location.hash.slice(1));
    const reference = values.get("reference") || "";
    const legacy = values.get("healthId") || "";
    return { reference: /^[A-Za-z0-9_-]{43}$/.test(reference) ? reference : "", legacy: legacy.length <= 255 ? legacy : "" };
}
export default function PublicPassportPage() {
    const [identity, setIdentity] = useState(fragment);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(!!identity.reference);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const clear = () => window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
        clear();
        const changed = () => {
            const next = fragment(); clear(); setData(null); setError(""); setLoading(!!next.reference);
            setIdentity(next); setAttempt(value => value + 1);
        };
        window.addEventListener("hashchange", changed);
        return () => window.removeEventListener("hashchange", changed);
    }, []);
    useEffect(() => {
        if (!identity.reference) return;
        let controller;
        let generation = 0;
        const load = async () => {
            const current = ++generation;
            controller?.abort();
            controller = new AbortController();
            setLoading(true); setData(null); setError("");
            try {
                const response = await providerApi.get("/public/emergency-passport", {
                    headers: { "X-HealthBridge-Passport-Reference": identity.reference }, signal: controller.signal, timeout: 10000,
                });
                if (current === generation && !controller.signal.aborted) setData(response.data);
            } catch (err) {
                if (current === generation && !controller.signal.aborted && err.response?.status !== 404)
                    setError("Emergency information could not be verified. Please retry.");
            } finally { if (current === generation && !controller.signal.aborted) setLoading(false); }
        };
        const start = window.setTimeout(() => void load(), 0);
        const interval = window.setInterval(() => void load(), 30000);
        const focus = () => { if (document.visibilityState === "visible") void load(); };
        window.addEventListener("focus", focus);
        document.addEventListener("visibilitychange", focus);
        return () => { generation++; controller?.abort(); window.clearTimeout(start); window.clearInterval(interval);
            window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", focus); };
    }, [identity.reference, attempt]);
    return <div className="ui-page"><div className="ui-container">
        <header className="ui-header"><div><h1 className="ui-title">HealthBridge Passport Reference</h1>
            <p className="ui-subtitle">Worker-controlled emergency information</p></div></header>
        {loading ? <p role="status">Checking emergency permissions...</p> : error ? <section className="ui-section">
            <p className="error-message" role="alert">{error}</p>
            <button type="button" className="secondary-button" onClick={() => setAttempt(value => value + 1)}>
                <RefreshCw size={16} aria-hidden="true" /> Retry Emergency Information</button></section> : data ? <>
            <section className="ui-section"><ShieldCheck size={32} aria-hidden="true" />
                <h2 className="ui-sectionTitle">Emergency Health Passport</h2>
                <p>Only the emergency fields selected by the worker are shown. This link does not permit medical-record access or consultations.</p></section>
            {Object.hasOwn(data, "bloodGroup") && <section className="ui-section"><h2 className="ui-sectionTitle">Blood Group</h2><p>{data.bloodGroup || "Not recorded."}</p></section>}
            {Object.hasOwn(data, "emergencyContact") && <section className="ui-section"><h2 className="ui-sectionTitle">Emergency Contact</h2><p>{data.emergencyContact || "Not recorded."}</p></section>}
            {Object.hasOwn(data, "preferredLanguage") && <section className="ui-section"><h2 className="ui-sectionTitle">Preferred Language</h2><p>{data.preferredLanguage || "Not recorded."}</p></section>}
            {data.allergies && <section className="ui-section"><h2 className="ui-sectionTitle">Allergies</h2>
                {data.allergies.length ? <ul>{data.allergies.map((item, index) => <li key={index}>{item.allergen}{item.reaction ? ": " + item.reaction : ""}</li>)}</ul> : <p>No allergies recorded.</p>}</section>}
            {data.conditions && <section className="ui-section"><h2 className="ui-sectionTitle">Chronic & Existing Conditions</h2>
                {data.conditions.length ? <ul>{data.conditions.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>No conditions recorded.</p>}</section>}
            {data.medications && <section className="ui-section"><h2 className="ui-sectionTitle">Current Medications</h2>
                {data.medications.length ? <ul>{data.medications.map((item, index) => <li key={index}>{item.medicationName} {[item.dosage, item.frequency].filter(Boolean).join(", ")}</li>)}</ul> : <p>No current medications recorded.</p>}</section>}
        </> : <section className="ui-section"><ShieldCheck size={32} aria-hidden="true" />
            <h2 className="ui-sectionTitle">Health information is private</h2>
            <p>Emergency information is unavailable or public sharing is disabled.</p>
            {identity.legacy && <p className="public-passport-reference"><strong>Unverified Health ID reference:</strong> {identity.legacy}</p>}
            <p>Identity is not verified by this QR. No private health information is available on this public page.</p>
            <p>Legacy identity references do not authorize any medical access.</p>
        </section>}
        <section className="ui-section"><Link to="/provider-access" className="secondary-button">Provider Access</Link></section>
    </div></div>;
}
