import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export default function PublicPassportPage() {
    const [reference] = useState(() => {
        const value = new URLSearchParams(window.location.hash.slice(1)).get("healthId") || "";
        return value.length <= 255 ? value : "";
    });
    useEffect(() => {
        window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }, []);
    // Identity references are unverified text, never bearer credentials or a public database lookup.
    return <div className="ui-page"><div className="ui-container">
        <header className="ui-header"><div><h1 className="ui-title">HealthBridge Passport Reference</h1>
            <p className="ui-subtitle">Private, consent-based health records</p></div></header>
        <section className="ui-section">
            <ShieldCheck size={32} aria-hidden="true" />
            <h2 className="ui-sectionTitle">Health information is private</h2>
            {reference && <p className="public-passport-reference"><strong>Unverified Health ID reference:</strong> {reference}</p>}
            <p>This identity link does not authorize access to a worker's profile or medical records.</p>
            <p>Providers need the worker's separate, temporary consent QR to view authorized records or add a consultation.</p>
            <Link to="/provider-access" className="secondary-button">Provider Access</Link>
        </section>
    </div></div>;
}
