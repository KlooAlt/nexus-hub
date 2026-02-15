import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

type CreateMessageRequest = z.infer<typeof api.chat.send.input>;

export function useChat() {
  const queryClient = useQueryClient();

  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: [api.chat.list.path],
    queryFn: async () => {
      const res = await fetch(api.chat.list.path);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      return api.chat.list.responses[200].parse(data);
    },
    refetchInterval: 3000, // Poll every 3 seconds for simple real-time feel
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: [api.chat.users.path],
    queryFn: async () => {
      const res = await fetch(api.chat.users.path);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      return api.chat.users.responses[200].parse(data);
    },
    refetchInterval: 10000,
  });

  const sendMessage = useMutation({
    mutationFn: async (
      data: CreateMessageRequest & {
        imageUrl?: string;   // added: image URL or base64 string
        replyToId?: string;  // added: reply support
      }
    ) => {
      const res = await fetch(api.chat.send.path, {
        method: api.chat.send.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          imageUrl: data.imageUrl ?? null,
          replyToId: data.replyToId ?? null,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return api.chat.send.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chat.list.path] });
    },
  });

  return { messages, users, isLoadingMessages, isLoadingUsers, sendMessage };
}
