import { api } from "@/api/client";
import type { components } from "@/api-types";

export type Devices = components["schemas"]["DevicesResponse"];
export type Device = components["schemas"]["DeviceResponse"];

export const devicesApi = {
  async list(): Promise<Devices> {
    const { data } = await api.get<Devices>("/subscription/devices");
    return data;
  },
  async deleteOne(hwid: string): Promise<void> {
    await api.delete(`/subscription/devices/${encodeURIComponent(hwid)}`);
  },
  async deleteAll(): Promise<void> {
    await api.delete("/subscription/devices");
  },
  async reissue(): Promise<void> {
    await api.post("/subscription/reissue");
  },
};
