import { useNavigate } from "react-router";
import { authApi } from "@/api/auth";
import { useSessionStore } from "@/store/session";

/** Loads the current user into the session store and routes into the cabinet. */
export function useAfterAuth(): () => Promise<void> {
  const navigate = useNavigate();
  const setMe = useSessionStore((s) => s.setMe);
  return async () => {
    setMe(await authApi.me());
    navigate("/", { replace: true });
  };
}
