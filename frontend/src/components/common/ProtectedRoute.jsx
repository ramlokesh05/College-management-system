import { Navigate } from "react-router-dom";
import PageLoader from "./PageLoader";
import { useAuth } from "../../hooks/useAuth";

const roleHomePath = {
  student: "/student",
  teacher: "/teacher",
  admin: "/admin",
};

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { token, user, loading } = useAuth();

  if (loading) {
    return <PageLoader label="Checking access..." />;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleHomePath[user.role] || "/"} replace />;
  }

  return children;
};

export default ProtectedRoute;

