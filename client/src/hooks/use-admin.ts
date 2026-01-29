import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateKeyRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useAdminKeys() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: keys, isLoading } = useQuery({
    queryKey: [api.admin.listKeys.path],
    queryFn: async () => {
      const res = await fetch(api.admin.listKeys.path);
      if (!res.ok) throw new Error("Failed to fetch keys");
      return api.admin.listKeys.responses[200].parse(await res.json());
    },
  });

  const generateKey = useMutation({
    mutationFn: async (data: CreateKeyRequest) => {
      const res = await fetch(api.admin.generateKey.path, {
        method: api.admin.generateKey.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to generate key");
      return api.admin.generateKey.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.listKeys.path] });
      toast({
        title: "KEY GENERATED",
        description: "New access vector created.",
        className: "border-primary text-primary bg-black font-mono",
      });
    },
  });

  const deleteKey = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.admin.deleteKey.path, { id });
      const res = await fetch(url, { method: api.admin.deleteKey.method });
      if (!res.ok) throw new Error("Failed to delete key");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.listKeys.path] });
      toast({
        title: "KEY REVOKED",
        description: "Access vector destroyed.",
        className: "border-destructive text-destructive bg-black font-mono",
      });
    },
  });

  return { keys, isLoading, generateKey, deleteKey };
}
