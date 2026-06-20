import { create } from "zustand";
import type { Me } from "@/api/auth";

interface SessionState {
  me: Me | null;
  setMe: (me: Me | null) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  me: null,
  setMe: (me) => set({ me }),
  clear: () => set({ me: null }),
}));
