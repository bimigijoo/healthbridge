import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setSubmitting(true);

        try {
            await login(
                formData.email,
                formData.password
            );

            const loggedInUser = JSON.parse(
                localStorage.getItem("healthbridge_user")
            );

            if (loggedInUser?.role === "ADMIN") {
                navigate("/admin");
            } else {
                navigate("/dashboard");
            }
        } catch (err) {
            const status = err.response?.status;
            const backendMessage = err.response?.data?.message;

            if (status === 403 && backendMessage) {
                setError(backendMessage);
            } else if (status === 401) {
                setError(
                    backendMessage ||
                    "Invalid email or password. Please try again."
                );
            } else if (!err.response) {
                setError(
                    "Unable to connect to HealthBridge. " +
                    "Please check your connection and try again."
                );
            } else {
                setError(
                    "We couldn't sign you in right now. " +
                    "Please try again later."
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">

                <div className="auth-header">
                    <h1>HealthBridge</h1>
                    <p>
                        Digital Health Record Management
                    </p>
                </div>

                {location.state?.message && (
                    <div className="success-message" role="status">
                        {location.state.message}
                    </div>
                )}

                <form
                    className="auth-form"
                    onSubmit={handleSubmit}
                >
                    <div className="form-group">
                        <label htmlFor="email">
                            Email
                        </label>

                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            autoComplete="username"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">
                            Password
                        </label>

                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    {error && (
                        <div
                            className="error-message"
                            role="alert"
                            aria-live="polite"
                        >
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="primary-button"
                        disabled={submitting}
                    >
                        {submitting
                            ? "Signing in..."
                            : "Sign In"}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Don't have an account?
                    </p>

                    <button
                        type="button"
                        className="link-button"
                        onClick={() =>
                            navigate("/register")
                        }
                    >
                        Create an account
                    </button>
                </div>

            </div>
        </div>
    );
}

export default LoginPage;
