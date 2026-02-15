import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type User, type AccessKey } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type LoginRequest = z.infer<typeof api.auth.login.input>;

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading, error } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path);
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      const data = await res.json();
      return api.auth.me.responses[200].parse(data);
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid Serial Key");
        throw new Error("Login failed");
      }
      const data = await res.json();
      return api.auth.login.responses[200].parse(data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.auth.me.path], data);
      toast({
        title: "ACCESS GRANTED",
        description: `Welcome back, ${data.username}`,
        className: "border-primary text-primary bg-black font-mono",
      });
    },
    onError: (error) => {
      toast({
        title: "ACCESS DENIED",
        description: error.message,
        variant: "destructive",
        className: "border-destructive text-destructive bg-black font-mono",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch(api.auth.logout.path, { method: api.auth.logout.method });
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      queryClient.clear();
      toast({
        title: "SESSION TERMINATED",
        description: "Disconnecting...",
        className: "border-primary text-primary bg-black font-mono",
      });
    },
  });

  return {
    user,
    isLoading,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
  };
}
