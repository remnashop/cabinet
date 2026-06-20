import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { devicesApi } from "@/api/devices";

const DEVICES_KEY = ["subscription", "devices"];

export function useDevices() {
  return useQuery({
    queryKey: DEVICES_KEY,
    queryFn: devicesApi.list,
    retry: false,
  });
}

export function useDeviceMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: DEVICES_KEY });

  const deleteOne = useMutation({
    mutationFn: (hwid: string) => devicesApi.deleteOne(hwid),
    onSuccess: invalidate,
  });
  const deleteAll = useMutation({
    mutationFn: () => devicesApi.deleteAll(),
    onSuccess: invalidate,
  });
  const reissue = useMutation({
    mutationFn: () => devicesApi.reissue(),
    onSuccess: invalidate,
  });

  return { deleteOne, deleteAll, reissue };
}
