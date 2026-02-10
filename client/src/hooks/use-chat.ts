import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { MessageWithUser, User } from "@shared/schema";

export function useChat() {
  const { data: messages = [], ...messagesQuery } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 3000,
  });

  const { data: users = [], ...usersQuery } = useQuery<User[]>({
    queryKey: ["/api/chat/users"],
  });

  const sendMessage = useMutation({
    mutationFn: async (data: {
      content: string;
      recipientId?: number;
      groupId?: number;
      mediaUrl?: string | null;
      mediaType?: string | null;
    }) => {
      const res = await apiRequest("POST", "/api/messages", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  return {
    messages,
    users,
    sendMessage,
    isLoading: messagesQuery.isLoading || usersQuery.isLoading,
  };
}
