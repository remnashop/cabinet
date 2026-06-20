import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router";
import { useEffect } from "react";
import { setUnauthorizedHandler } from "@/api/client";
import { useSessionStore } from "@/store/session";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import SubscriptionPage from "@/pages/SubscriptionPage";
import DevicesPage from "@/pages/DevicesPage";
import PurchasePage from "@/pages/PurchasePage";
import ReferralPage from "@/pages/ReferralPage";
import ProfilePage from "@/pages/ProfilePage";
import PaymentResultPage from "@/pages/PaymentResultPage";

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
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/payment/success" element={<PaymentResultPage success />} />
          <Route path="/payment/failed" element={<PaymentResultPage success={false} />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<SubscriptionPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/buy" element={<PurchasePage />} />
            <Route path="/referral" element={<ReferralPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
