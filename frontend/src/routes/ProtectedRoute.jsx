import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LoadingState } from "../components/common/LoadingState";

/**
 * Returns the default landing page for each role.
 */
function getDefaultRoute(role) {
  if (role === "ADMIN") return "/admin";
  if (role === "STAFF") return "/picker";
  return "/home";
}

export function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, isReady, user } = useAuth();

  if (!isReady) {
    return <LoadingState label="Restoring your session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles?.length && !roles.includes(user?.role)) {
    return <Navigate to={getDefaultRoute(user?.role)} replace />;
  }

  return children;
}
