import { api } from "@/api/client";
import type { components } from "@/api-types";

export type Me = components["schemas"]["MeResponse"];
type AuthResponse = components["schemas"]["AuthResponse"];
type LoginRequest = components["schemas"]["LoginRequest"];
type RegisterRequest = components["schemas"]["RegisterRequest"];
type TelegramAuthRequest = components["schemas"]["TelegramAuthRequest"];

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const body: LoginRequest = { email, password };
    const { data } = await api.post<AuthResponse>("/auth/login", body);
    return data;
  },
  async register(body: RegisterRequest): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/register", body);
    return data;
  },
  async loginTelegram(body: TelegramAuthRequest): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/telegram", body);
    return data;
  },
  async loginTelegramWebApp(initData: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/telegram/webapp", {
      init_data: initData,
    });
    return data;
  },
  async me(): Promise<Me> {
    const { data } = await api.get<Me>("/auth/me");
    return data;
  },
  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },
};
