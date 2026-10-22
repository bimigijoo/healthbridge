import { useEffect, useState } from "react";
import { Download, RefreshCw, Share2 } from "lucide-react";
import api from "../services/api";

export default function PassportQr({ profileId }) {
    const [image, setImage] = useState("");
    const [link, setLink] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        let objectUrl;
        const load = async () => {
            try {
                const options = { signal: controller.signal };
                const [qr, reference] = await Promise.all([
                    api.get(`/emergency-passport/profile/${profileId}/qr`, { ...options, responseType: "blob" }),
                    api.get(`/emergency-passport/profile/${profileId}/link`, options),
                ]);
                if (controller.signal.aborted) return;
                objectUrl = URL.createObjectURL(qr.data);
                setImage(objectUrl);
                setLink(reference.data.url);
                setError("");
            } catch (err) {
                if (!controller.signal.aborted) setError(err.response?.status === 503
                    ? "Passport QR requires a configured public HTTPS address. Your private health information remains available."
                    : "Passport QR could not be loaded.");
            }
        };
        void load();
        return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [profileId, attempt]);

    const share = async () => {
        setMessage("");
        try {
            if (navigator.share) await navigator.share({ title: "HealthBridge emergency passport", url: link });
            else {
                await navigator.clipboard.writeText(link);
                setMessage("Passport reference link copied.");
            }
        } catch (err) { if (err.name !== "AbortError") setMessage("The link could not be shared. Please try again."); }
    };

    return <div className="ui-qrSection">
        <h2 className="ui-sectionTitle">Permanent Passport QR</h2>
        {image ? <img src={image} alt="HealthBridge permanent passport reference QR" className="ui-qrImage" width="400" height="400" />
            : error ? <p role="alert">{error}</p> : <p role="status">Loading passport QR...</p>}
        <p className="ui-qrDescription">Only saved Emergency Passport Settings control public emergency information. Full records and consultations still require a separate temporary consent QR.</p>
        <div className="passport-controls document-actions">
            <a className="secondary-button" href={image || undefined} download="healthbridge-passport-qr.png"
                aria-disabled={!image} onClick={event => { if (!image) event.preventDefault(); }}>
                <Download size={16} aria-hidden="true" /> Download QR</a>
            <button type="button" className="secondary-button" disabled={!link} onClick={() => void share()}>
                <Share2 size={16} aria-hidden="true" /> Share Link</button>
            {error && <button type="button" className="icon-button" title="Retry passport QR" aria-label="Retry passport QR"
                onClick={() => { setError(""); setAttempt(value => value + 1); }}><RefreshCw size={16} aria-hidden="true" /></button>}
        </div>
        {message && <p role="status">{message}</p>}
    </div>;
}
