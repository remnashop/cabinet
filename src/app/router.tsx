import { createBrowserRouter } from "react-router";

import { GuestOnly, RequireAuth, Root } from "@app/guards";
import {
  BotSignInPage,
  ConnectPage,
  LinkBotPage,
  LoginCallbackPage,
  LoginPage,
  NotFoundPage,
  PaymentResultPage,
  PaymentsPage,
  PlanWizardPage,
  ProfilePage,
  PromoPage,
  PurchasePage,
  ReferralPage,
  SubscriptionPage,
  UnsubscribePage,
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
      { path: "/login/bot", element: <BotSignInPage /> },
      {
        path: "/payment/result",
        element: (
          <RequireAuth>
            <PaymentResultPage />
          </RequireAuth>
        ),
      },
      {
        path: "/link/bot",
        element: (
          <RequireAuth>
            <LinkBotPage />
          </RequireAuth>
        ),
      },
      { path: "/unsubscribe", element: <UnsubscribePage /> },
      {
        element: (
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <SubscriptionPage /> },
          { path: "subscription/:id/connect", element: <ConnectPage /> },
          { path: "purchase", element: <PurchasePage /> },
          { path: "purchase/:planId", element: <PlanWizardPage /> },
          { path: "promo", element: <PromoPage /> },
          { path: "referral", element: <ReferralPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "profile/payments", element: <PaymentsPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
