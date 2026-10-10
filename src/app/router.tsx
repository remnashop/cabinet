import { createBrowserRouter } from "react-router";

import { GuestOnly, RequireAuth, Root } from "@app/guards";
import {
  LoginCallbackPage,
  LoginPage,
  NotFoundPage,
  PaymentResultPage,
  PaymentsPage,
  ProfilePage,
  PurchasePage,
  ReferralPage,
  SubscriptionPage,
} from "@app/lazy-pages";
import { AppShell } from "@widgets/app-shell/AppShell";

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        path: "/login",
        element: (
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        ),
      },
      { path: "/login/callback/:provider", element: <LoginCallbackPage /> },
      { path: "/payment/result", element: <PaymentResultPage /> },
      {
        element: (
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <SubscriptionPage /> },
          { path: "purchase", element: <PurchasePage /> },
          { path: "referral", element: <ReferralPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "profile/payments", element: <PaymentsPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
