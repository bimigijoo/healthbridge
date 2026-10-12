import { Link } from "react-router-dom";
import { AlertCircle, LoaderCircle, HeartPulse, RefreshCw } from "lucide-react";

export default function PageStatus({ title, description, loading = false, error = false, onRetry, createProfile = false }) {
    const Icon = loading ? LoaderCircle : error ? AlertCircle : HeartPulse;
    return <div className="page-status" role={error ? "alert" : "status"} aria-busy={loading}>
        <Icon className={loading ? "spin" : ""} size={28} aria-hidden="true" />
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {onRetry && <button type="button" className="secondary-button" onClick={onRetry}>
            <RefreshCw size={16} aria-hidden="true" /> Retry
        </button>}
        {createProfile && <Link className="primary-button" to="/health-profile">Create health profile</Link>}
    </div>;
}
