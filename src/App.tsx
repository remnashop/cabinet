import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router";
import { useEffect } from "react";
import { setUnauthorizedHandler } from "@/api/client";
import { useSessionStore } from "@/store/session";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import SubscriptionPage from "@/pages/SubscriptionPage";
import DevicesPage from "@/pages/DevicesPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

function UnauthorizedBridge() {
  const navigate = useNavigate();
  const clear = useSessionStore((s) => s.clear);
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clear();
      navigate("/login", { replace: true });
    });
  }, [navigate, clear]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <UnauthorizedBridge />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<SubscriptionPage />} />
            <Route path="/devices" element={<DevicesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
