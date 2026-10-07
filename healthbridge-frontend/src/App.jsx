import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import HealthProfilePage from "./pages/HealthProfilePage";
import HealthPassportPage from "./pages/HealthPassportPage";
import MedicalRecordsPage from "./pages/MedicalRecordsPage";
import ShareRecordsPage from "./pages/ShareRecordsPage.jsx";
import ProviderAccessPage from "./pages/ProviderAccessPage";
import HealthTimelinePage from "./pages/HealthTimelinePage";
import RegisterPage from "./pages/RegisterPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function App() {
    return (
        <Routes>
            <Route
                path="/"
                element={<Navigate to="/login" replace />}
            />

            <Route
                path="/login"
                element={<LoginPage />}
            />

            <Route
                path="/register"
                element={<RegisterPage />}
            />

            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/health-profile"
                element={
                    <ProtectedRoute>
                        <HealthProfilePage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/health-passport"
                element={
                    <ProtectedRoute>
                        <HealthPassportPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/medical-records"
                element={
                    <ProtectedRoute>
                        <MedicalRecordsPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/share-records"
                element={
                    <ProtectedRoute>
                        <ShareRecordsPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/health-timeline"
                element={
                    <ProtectedRoute>
                        <HealthTimelinePage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/provider-access"
                element={<ProviderAccessPage />}
            />

            <Route
                path="*"
                element={<Navigate to="/login" replace />}
            />

            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin"
                element={
                    <ProtectedRoute>
                        <AdminDashboardPage />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

export default App;