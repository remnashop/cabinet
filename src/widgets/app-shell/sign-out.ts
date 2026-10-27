import { createContext, useContext } from "react";

import { logout } from "@features/auth/logout";

// AppShell fades out before the token goes, as the panel's DashboardLayout; outside the shell it's at once
export const SignOutContext = createContext<() => void>(() => void logout());
export const useSignOut = () => useContext(SignOutContext);
