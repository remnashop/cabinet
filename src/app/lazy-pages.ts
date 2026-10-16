import { lazy } from "react";

export const SubscriptionPage = lazy(() =>
  import("@pages/subscription/SubscriptionPage").then((m) => ({ default: m.SubscriptionPage })),
);
export const PurchasePage = lazy(() => import("@pages/purchase/PurchasePage").then((m) => ({ default: m.PurchasePage })));
export const ReferralPage = lazy(() => import("@pages/referral/ReferralPage").then((m) => ({ default: m.ReferralPage })));
export const ProfilePage = lazy(() => import("@pages/profile/ProfilePage").then((m) => ({ default: m.ProfilePage })));
export const PaymentsPage = lazy(() => import("@pages/payments/PaymentsPage").then((m) => ({ default: m.PaymentsPage })));
export const PaymentResultPage = lazy(() =>
  import("@pages/payment-result/PaymentResultPage").then((m) => ({ default: m.PaymentResultPage })),
);
export const NotFoundPage = lazy(() => import("@pages/not-found/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
export const LoginPage = lazy(() => import("@pages/login/LoginPage").then((m) => ({ default: m.LoginPage })));
export const LoginCallbackPage = lazy(() =>
  import("@pages/login/LoginCallbackPage").then((m) => ({ default: m.LoginCallbackPage })),
);
export const BotSignInPage = lazy(() => import("@pages/login/BotSignInPage").then((m) => ({ default: m.BotSignInPage })));
