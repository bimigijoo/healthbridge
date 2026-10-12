import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("healthbridge_token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !error.config?.url?.startsWith("/auth/")) {
            localStorage.removeItem("healthbridge_token");
            localStorage.removeItem("healthbridge_user");
            window.dispatchEvent(new Event("healthbridge:session-ended"));
        }

        return Promise.reject(error);
    }
);

export default api;
