import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useChat() {
  const queryClient = useQueryClient();

  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: [api.chat.list.path],
    queryFn: async () => {
      const res = await fetch(api.chat.list.path);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: 3000,
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: [api.chat.users.path],
    queryFn: async () => {
      const res = await fetch(api.chat.users.path);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const sendMessage = useMutation({
    mutationFn: async (data: {
      content: string;
      recipientId?: number;
      groupId?: number;
      mediaUrl?: string | null;
      mediaType?: string | null;
      replyToId?: number | null;
    }) => {
      const res = await fetch(api.chat.send.path, {
        method: api.chat.send.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chat.list.path] });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/chat/messages/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chat.list.path] });
    }
  });

  return { messages, users, isLoadingMessages, isLoadingUsers, sendMessage, deleteMessage };
}
