import { Navigate, type Location } from "react-router-dom";
import { useAuth } from "./useAuth";

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { configured, loading, user } = useAuth();
  if (!configured) return children;
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function RequireTeacher({
  children,
  location,
}: {
  children: JSX.Element;
  location?: Location;
}) {
  const { configured, loading, profile, user } = useAuth();
  if (!configured) return children;
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (profile?.role !== "teacher") return <Navigate to="/account" replace />;
  return children;
}
