import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useMe } from "@/hooks/useMe";
import { useSessionStore } from "@/store/session";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const me = useSessionStore((s) => s.me);
  const { isLoading, isError } = useMe();

  if (me) return <>{children}</>;
  if (isLoading) return <div className="p-6">…</div>;
  if (isError) return <Navigate to="/login" replace />;
  return <div className="p-6">…</div>;
}
