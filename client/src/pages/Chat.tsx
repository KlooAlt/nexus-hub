import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { CyberInput } from "@/components/CyberInput";
import { CyberButton } from "@/components/CyberButton";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Send, Users, Hash, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Chat() {
  const { user: currentUser } = useAuth();
  const { messages, users, sendMessage } = useChat();
  const [content, setContent] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null); // null = public
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    sendMessage.mutate({ 
      content, 
      recipientId: selectedRecipientId || undefined 
    });
    setContent("");
  };

  // Filter messages based on selection
  const displayedMessages = messages?.filter(msg => {
    if (selectedRecipientId === null) {
      return !msg.recipientId; // Public messages only
    }
    // Private messages between me and selected user
    return (
      (msg.senderId === currentUser?.id && msg.recipientId === selectedRecipientId) ||
      (msg.senderId === selectedRecipientId && msg.recipientId === currentUser?.id)
    );
  });

  return (
    <Layout>
      <div className="flex flex-col md:flex-row gap-6 h-full">
        {/* User List Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-4">
          <div className="cyber-box flex-1 flex flex-col p-0 overflow-hidden min-h-[200px]">
            <div className="p-4 border-b border-primary/20 bg-primary/5 flex items-center justify-between">
              <h3 className="font-display tracking-widest text-sm">CHANNELS</h3>
              <Users className="w-4 h-4 text-primary" />
            </div>
            
            <div className="p-2 space-y-1 overflow-y-auto flex-1">
              <button
                onClick={() => setSelectedRecipientId(null)}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs font-mono uppercase transition-colors flex items-center gap-2 border border-transparent",
                  selectedRecipientId === null 
                    ? "bg-primary/20 text-primary border-primary/50" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                <Hash className="w-3 h-3" />
                PUBLIC_CHANNEL
              </button>

              <div className="my-2 px-3 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Active Operatives
              </div>

              {users?.filter(u => u.id !== currentUser?.id).map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedRecipientId(user.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs font-mono uppercase transition-colors flex items-center gap-2 border border-transparent",
                    selectedRecipientId === user.id 
                      ? "bg-accent/20 text-accent border-accent/50" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    "bg-green-500 shadow-[0_0_5px_currentColor]"
                  )} />
                  {user.username}
                  {user.role === 'owner' && <span className="text-[10px] text-yellow-500 ml-auto">[ADMIN]</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 cyber-box p-0 flex flex-col overflow-hidden h-[500px] md:h-auto">
          {/* Chat Header */}
          <div className="p-4 border-b border-primary/20 bg-black/50 backdrop-blur flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              {selectedRecipientId ? (
                <>
                  <Lock className="w-4 h-4 text-accent" />
                  <span className="font-display text-accent tracking-widest">
                    ENCRYPTED_LINK :: {users?.find(u => u.id === selectedRecipientId)?.username}
                  </span>
                </>
              ) : (
                <>
                  <Hash className="w-4 h-4 text-primary" />
                  <span className="font-display text-primary tracking-widest">PUBLIC_CHANNEL</span>
                </>
              )}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              {displayedMessages?.length || 0} MESSAGES
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            {displayedMessages?.map((msg) => {
              const isMe = msg.senderId === currentUser?.id;
              return (
                <div key={msg.id} className={cn("flex flex-col max-w-[80%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-[10px] font-bold uppercase",
                      isMe ? "text-primary" : "text-accent"
                    )}>
                      {isMe ? 'YOU' : msg.senderName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(msg.createdAt || Date.now()), "HH:mm")}
                    </span>
                  </div>
                  <div className={cn(
                    "px-4 py-2 text-sm font-mono border",
                    isMe 
                      ? "bg-primary/10 border-primary/50 text-foreground" 
                      : "bg-accent/10 border-accent/50 text-foreground"
                  )}>
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-black/50 border-t border-primary/20">
            <form onSubmit={handleSend} className="flex gap-2">
              <CyberInput 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="TRANSMIT_DATA..."
                className="bg-black border-primary/20"
              />
              <CyberButton type="submit" disabled={!content.trim()}>
                <Send className="w-4 h-4" />
              </CyberButton>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
