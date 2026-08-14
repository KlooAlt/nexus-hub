import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

interface ChatChannel {
  recipientId?: number | null;
  groupId?: number | null;
}

export function useChat({ recipientId = null, groupId = null }: ChatChannel = {}) {
  const queryClient = useQueryClient();
  const channelParams = new URLSearchParams();
  if (recipientId) channelParams.set("recipientId", String(recipientId));
  if (groupId) channelParams.set("groupId", String(groupId));
  const messagesUrl = channelParams.toString()
    ? `${api.chat.list.path}?${channelParams.toString()}`
    : api.chat.list.path;
  const messagesKey = [api.chat.list.path, recipientId ?? null, groupId ?? null] as const;

  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: messagesKey,
    queryFn: async () => {
      const res = await fetch(messagesUrl);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: 4000,
    staleTime: 1500,
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
    onSuccess: (message) => {
      // Render our own message immediately without waiting for the next poll.
      queryClient.setQueryData<any[]>(messagesKey, (current = []) => {
        if (current.some(existing => existing.id === message.id)) return current;
        return [...current, message];
      });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/chat/messages/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesKey });
    }
  });

  return { messages, users, isLoadingMessages, isLoadingUsers, sendMessage, deleteMessage };
}
