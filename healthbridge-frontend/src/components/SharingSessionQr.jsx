import { useEffect, useState } from "react";
import api from "../services/api";

export default function SharingSessionQr({ session }) {
    const [imageUrl, setImageUrl] = useState("");
    const [error, setError] = useState("");

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
    }, [session.id]);

    return <div className="sharing-qr">
        {imageUrl ? <img src={imageUrl} width="320" height="320"
            alt="Temporary provider access QR code" /> : error ?
            <p role="alert">{error}</p> : <p role="status">Generating sharing QR...</p>}
    </div>;
}
