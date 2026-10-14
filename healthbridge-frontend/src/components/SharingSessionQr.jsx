import { useEffect, useState } from "react";
import api from "../services/api";
import { RefreshCw } from "lucide-react";

export default function SharingSessionQr({ session }) {
    const [imageUrl, setImageUrl] = useState("");
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        let objectUrl;
        api.get(`/sharing-sessions/${session.id}/qr`, { responseType: "blob", signal: controller.signal })
            .then(response => {
                if (controller.signal.aborted) return;
                objectUrl = URL.createObjectURL(response.data);
                setImageUrl(objectUrl);
            }).catch(error => {
                if (controller.signal.aborted) return;
                setError(error.response?.status === 503
                    ? "Sharing QR is unavailable until a public HTTPS frontend address is configured."
                    : "Sharing QR could not be loaded. The manual access code remains available.");
            });
        return () => {
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [session.id, attempt]);

    return <div className="sharing-qr">
        {imageUrl ? <img src={imageUrl} width="320" height="320"
            alt="Temporary provider access QR code" /> : error ?
            <div><p role="alert">{error}</p>
                <button type="button" className="secondary-button" onClick={() => {
                    setImageUrl(""); setError(""); setAttempt(value => value + 1);
                }}><RefreshCw size={16} aria-hidden="true" /> Retry sharing QR</button>
            </div> : <p role="status">Generating sharing QR...</p>}
    </div>;
}
