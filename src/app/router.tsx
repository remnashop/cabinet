import { createBrowserRouter } from "react-router";

import { GuestOnly, RequireAuth, Root } from "@app/guards";
import {
  BotSignInPage,
  ConnectPage,
  LinkBotPage,
  LoginCallbackPage,
  LoginPage,
  NotFoundPage,
  OpenInAppPage,
  PaymentResultPage,
  PaymentsPage,
  PlanWizardPage,
  ProfilePage,
  PurchasePage,
  ReferralPage,
  SubscriptionPage,
  UnsubscribePage,
  LegalPage,
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
      { path: "/connect/open", element: <OpenInAppPage /> },
      { path: "/legal", element: <LegalPage /> },
      { path: "/legal/:kind", element: <LegalPage /> },
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
          { path: "referral", element: <ReferralPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "profile/payments", element: <PaymentsPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
