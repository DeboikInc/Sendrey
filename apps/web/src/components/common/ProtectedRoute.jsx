import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { useAuthBootstrap } from '../../hooks/useAuthBootstrap';

export default function ProtectedRoute({ children, requireRunner = false }) {
  const user = useSelector(s => s.auth.user);
  const runner = useSelector(s => s.auth.runner);
  const isReady = useAuthBootstrap();

  if (!isReady) return null;

  const isUserAuthenticated = !!user;
  const isRunnerAuthenticated = !!runner;

  if (requireRunner && isUserAuthenticated && !isRunnerAuthenticated) return <Navigate to="/auth" replace />;
  if (!requireRunner && isRunnerAuthenticated && !isUserAuthenticated) return <Navigate to="/raw" replace />;
  if (!isUserAuthenticated && !isRunnerAuthenticated) return <Navigate to="/" replace />;

  return children;
}