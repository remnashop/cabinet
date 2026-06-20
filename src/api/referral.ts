import { api } from "@/api/client";
import type { components } from "@/api-types";

export type ReferralProgram = components["schemas"]["ReferralProgramResponse"];

export const referralApi = {
  async program(): Promise<ReferralProgram> {
    const { data } = await api.get<ReferralProgram>("/referral/program");
    return data;
  },
};
