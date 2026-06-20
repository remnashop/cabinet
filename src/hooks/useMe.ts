import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { authApi } from "@/api/auth";
import { useSessionStore } from "@/store/session";

export function useMe() {
  const setMe = useSessionStore((s) => s.setMe);
  const query = useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
    retry: false,
  });

  useEffect(() => {
    if (query.data) setMe(query.data);
  }, [query.data, setMe]);

  return query;
}
