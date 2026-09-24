import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

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
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
        />

        <Route
            path="*"
            element={<Navigate to="/login" replace />}
        />
      </Routes>
  );
}

export default App;