import { createBrowserRouter } from "react-router";

import { GuestOnly, RequireAuth, Root, ShellIfSignedIn } from "@app/guards";
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
  InvitedPage,
  SubscriptionPage,
  UnsubscribePage,
  LegalPage,
  DebugPage,
} from "@app/lazy-pages";
import { RouteErrorPage } from "@pages/route-error/RouteErrorPage";
import { AppShell } from "@widgets/app-shell/AppShell";

export const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteErrorPage />,
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
      {
        path: "/legal",
        element: <ShellIfSignedIn />,
        children: [
          { index: true, element: <LegalPage /> },
          { path: ":kind", element: <LegalPage /> },
        ],
      },
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
          { path: "invite", element: <ReferralPage /> },
          { path: "invite/friends", element: <InvitedPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "profile/payments", element: <PaymentsPage /> },
          ...(DebugPage ? [{ path: "debug", element: <DebugPage /> }] : []),
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
