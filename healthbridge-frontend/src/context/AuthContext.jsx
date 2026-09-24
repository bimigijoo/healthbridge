import { createContext, useContext, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

function getStoredUser() {
    const storedToken = localStorage.getItem("healthbridge_token");
    const storedUser = localStorage.getItem("healthbridge_user");

    if (!storedToken || !storedUser) {
        return null;
    }

    try {
        return JSON.parse(storedUser);
    } catch {
        localStorage.removeItem("healthbridge_token");
        localStorage.removeItem("healthbridge_user");
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(getStoredUser);

    const login = async (email, password) => {
        const response = await api.post("/auth/login", {
            email,
            password,
        });

        const authData = response.data;

        localStorage.setItem(
            "healthbridge_token",
            authData.token
        );

        const userData = {
            id: authData.userId,
            name: authData.name,
            email: authData.email,
            role: authData.role,
        };

        localStorage.setItem(
            "healthbridge_user",
            JSON.stringify(userData)
        );

        setUser(userData);

        return userData;
    };

    const register = async (name, email, password) => {
        const response = await api.post("/auth/register", {
            name,
            email,
            password,
        });

        return response.data;
    };

    const logout = () => {
        localStorage.removeItem("healthbridge_token");
        localStorage.removeItem("healthbridge_user");

        setUser(null);
    };

    const value = {
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside an AuthProvider"
        );
    }

    return context;
}