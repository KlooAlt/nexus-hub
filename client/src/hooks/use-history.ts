import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CreateHistoryRequest } from "@shared/routes";

export function useHistory() {
  const queryClient = useQueryClient();

  const { data: history, isLoading } = useQuery({
    queryKey: [api.history.list.path],
    queryFn: async () => {
      const res = await fetch(api.history.list.path);
      if (!res.ok) throw new Error("Failed to fetch history");
      return api.history.list.responses[200].parse(await res.json());
    },
  });

  const addEntry = useMutation({
    mutationFn: async (data: CreateHistoryRequest) => {
      const res = await fetch(api.history.create.path, {
        method: api.history.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add history");
      return api.history.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.history.list.path] });
    },
  });

  const clearHistory = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.history.clear.path, {
        method: api.history.clear.method,
      });
      if (!res.ok) throw new Error("Failed to clear history");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.history.list.path] });
    },
  });

  return { history, isLoading, addEntry, clearHistory };
}
