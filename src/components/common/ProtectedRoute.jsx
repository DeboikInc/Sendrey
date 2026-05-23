// components/common/ProtectedRoute.jsx
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { isCapacitor } from "../../utils/api";

export default function ProtectedRoute({ children, requireRunner = false }) {
  const user = useSelector(s => s.auth.user);
  const token = useSelector(s => s.auth.token);
  const runner = useSelector(s => s.auth.runner);
  const runnerToken = useSelector(s => s.auth.runnerToken);

  const isUserAuthenticated = isCapacitor
    ? !!(user && token)
    : !!user;

  const isRunnerAuthenticated = isCapacitor
    ? !!(runner && runnerToken)
    : !!runner;

  // If route requires runner but user is logged in as user
  if (requireRunner && isUserAuthenticated && !isRunnerAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // If route requires user but runner is logged in
  if (!requireRunner && isRunnerAuthenticated && !isUserAuthenticated) {
    return <Navigate to="/raw" replace />;
  }

  // If not authenticated at all
  if (!isUserAuthenticated && !isRunnerAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}