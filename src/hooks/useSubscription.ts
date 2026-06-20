import { useQuery } from "@tanstack/react-query";
import { subscriptionApi } from "@/api/subscription";

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription", "current"],
    queryFn: subscriptionApi.current,
    retry: false,
  });
}
