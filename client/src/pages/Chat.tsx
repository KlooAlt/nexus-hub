import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { CyberInput } from "@/components/CyberInput";
import { CyberButton } from "@/components/CyberButton";
import { CyberCard } from "@/components/CyberCard";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Send, Users, Hash, Lock, Phone, Plus, MessageSquare, Volume2, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const { user: currentUser } = useAuth();
  const { messages, users, sendMessage } = useChat();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<number[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const ringtoneAudio = useRef<HTMLAudioElement | null>(null);
  const soundboardAudio = useRef<HTMLAudioElement | null>(null);

  const { data: groups = [] } = useQuery({ queryKey: ['/api/chat/groups'] });
  const { data: userSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      return res.json();
    }
  });

  const updateSettings = useMutation({
    mutationFn: async (settings: any) => {
      await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    },
    onSuccess: () => refetchSettings(),
  });

  const createGroup = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/chat/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      return res.json();
    },
    onSuccess: () => {
      setGroupName("");
      queryClient.invalidateQueries({ queryKey: ['/api/chat/groups'] });
      toast({ title: "GROUP_CREATED", description: "Private GC initialized." });
    },
  });

  const joinGroup = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch('/api/chat/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code }),
      });
      if (!res.ok) throw new Error("Invalid code");
      return res.json();
    },
    onSuccess: () => {
      setInviteCode("");
      queryClient.invalidateQueries({ queryKey: ['/api/chat/groups'] });
      toast({ title: "JOIN_SUCCESS", description: "Infiltrated private group." });
    },
  });

  // Signaling logic
  useEffect(() => {
    const pollSignals = setInterval(async () => {
      try {
        const res = await fetch('/api/chat/voice/poll');
        const signals = await res.json();
        for (const signal of signals) {
          if (signal.type === 'offer') {
            if (window.confirm(`INCOMING_VOICE_CALL FROM USER_${signal.from}. ACCEPT?`)) {
              setIsCalling(true);
              const pcObj = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
              pc.current = pcObj;
              localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
              localStream.current.getTracks().forEach(t => pcObj.addTrack(t, localStream.current!));
              pcObj.onicecandidate = (e) => e.candidate && fetch('/api/chat/voice/ice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipientId: signal.from, candidate: e.candidate }),
              });
              pcObj.ontrack = (e) => { if (remoteAudio.current) remoteAudio.current.srcObject = e.streams[0]; };
              await pcObj.setRemoteDescription(new RTCSessionDescription(signal.offer));
              const answer = await pcObj.createAnswer();
              await pcObj.setLocalDescription(answer);
              await fetch('/api/chat/voice/answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipientId: signal.from, answer }),
              });
            }
          } else if (signal.type === 'answer') {
            await pc.current?.setRemoteDescription(new RTCSessionDescription(signal.answer));
          } else if (signal.type === 'ice') {
            await pc.current?.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      } catch (e) {}
    }, 3000);
    return () => clearInterval(pollSignals);
  }, []);

  const startCall = async (recipientId: number) => {
    setIsCalling(true);
    const pcObj = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.current = pcObj;
    localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.current.getTracks().forEach(t => pcObj.addTrack(t, localStream.current!));
    pcObj.onicecandidate = (e) => e.candidate && fetch('/api/chat/voice/ice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId, candidate: e.candidate }),
    });
    pcObj.ontrack = (e) => { if (remoteAudio.current) remoteAudio.current.srcObject = e.streams[0]; };
    const offer = await pcObj.createOffer();
    await pcObj.setLocalDescription(offer);
    await fetch('/api/chat/voice/offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId, offer }),
    });
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    toast({ title: "DISABLED", description: "Screen sharing is restricted on this terminal." });
  };

  const playSound = (url: string) => {
    soundboardAudio.current = new Audio(url);
    soundboardAudio.current.play().catch(() => {});
  };

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
      recipientId: selectedRecipientId || undefined,
      groupId: selectedGroupId || undefined
    } as any);
    setContent("");
  };

  const displayedMessages = messages?.filter(msg => {
    if (selectedGroupId) return msg.groupId === selectedGroupId;
    if (selectedRecipientId === null) return !msg.recipientId && !msg.groupId;
    return (
      (msg.senderId === currentUser?.id && msg.recipientId === selectedRecipientId) ||
      (msg.senderId === selectedRecipientId && msg.recipientId === currentUser?.id)
    );
  });

  return (
    <Layout>
      <div className="flex flex-col md:flex-row gap-6 h-full">
        <div className="w-full md:w-64 flex flex-col gap-4">
          <div className="cyber-box flex-1 flex flex-col p-0 overflow-hidden min-h-[200px]">
            <div className="p-4 border-b border-primary/20 bg-primary/5 flex items-center justify-between">
              <h3 className="font-display tracking-widest text-sm text-glow">COMM_LINKS</h3>
              <Users className="w-4 h-4 text-primary" />
            </div>
            
            <div className="p-2 space-y-1 overflow-y-auto flex-1">
              <button
                onClick={() => { setSelectedRecipientId(null); setSelectedGroupId(null); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs font-mono uppercase transition-colors flex items-center gap-2 border border-transparent",
                  selectedRecipientId === null && selectedGroupId === null
                    ? "bg-primary/20 text-primary border-primary/50" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                <Hash className="w-3 h-3" />
                BROADCAST_HUB
              </button>

              <div className="my-2 px-3 text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-4">PRIVATE_GC</div>
              <div className="px-2 space-y-2 mb-2">
                <CyberInput value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="GROUP_NAME" className="h-8 text-[10px]" />
                <CyberButton onClick={() => createGroup.mutate(groupName)} className="w-full h-8 text-[10px]">INITIALIZE_GC</CyberButton>
                <CyberInput value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="GC_CODE" className="h-8 text-[10px]" />
                <CyberButton onClick={() => joinGroup.mutate(inviteCode)} className="w-full h-8 text-[10px]">JOIN_BY_CODE</CyberButton>
              </div>

              {Array.isArray(groups) && groups.map((g: any) => (
                <button
                  key={g.id}
                  onClick={() => { setSelectedGroupId(g.id); setSelectedRecipientId(null); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs font-mono uppercase transition-colors flex items-center gap-2 border border-transparent",
                    selectedGroupId === g.id 
                      ? "bg-primary/20 text-primary border-primary/50" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  )}
                >
                  <MessageSquare className="w-3 h-3" />
                  {g.name} <span className="text-[8px] opacity-40 ml-auto">[{g.inviteCode}]</span>
                </button>
              ))}

              <div className="my-2 px-3 text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-4">SECURE_NODES</div>
              {users?.filter(u => u.id !== currentUser?.id).map(user => (
                <div key={user.id} className="flex gap-1">
                  <button
                    onClick={() => { setSelectedRecipientId(user.id); setSelectedGroupId(null); }}
                    className={cn(
                      "flex-1 text-left px-3 py-2 text-xs font-mono uppercase transition-colors flex items-center gap-2 border border-transparent",
                      selectedRecipientId === user.id 
                        ? "bg-accent/20 text-accent border-accent/50" 
                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_currentColor]" />
                    {user.username}
                  </button>
                  <button onClick={() => startCall(user.id)} className="p-2 border border-primary/20 hover:bg-primary/10 transition-colors">
                    <Phone className="w-3 h-3 text-primary" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 cyber-box p-0 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-primary/20 bg-black/50 backdrop-blur flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary" />
              <span className="font-display tracking-widest text-glow uppercase">
                {selectedGroupId ? (Array.isArray(groups) ? groups : []).find((g: any) => g.id === selectedGroupId)?.name : 
                 selectedRecipientId ? users?.find(u => u.id === selectedRecipientId)?.username : 
                 "BROADCAST_HUB"}
              </span>
            </div>
            {selectedGroupId && (
              <CyberButton onClick={() => startCall(selectedGroupId)} className="h-8">
                <Phone className="w-3 h-3 mr-2" />
                JOIN_VOICE
              </CyberButton>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {displayedMessages?.map((msg) => {
              const isMe = msg.senderId === currentUser?.id;
              return (
                <div key={msg.id} className={cn("flex flex-col max-w-[80%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-[10px] font-bold", isMe ? "text-primary" : "text-accent")}>{isMe ? 'YOU' : msg.senderName}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(msg.createdAt || Date.now()), "HH:mm")}</span>
                  </div>
                  <div className={cn("px-4 py-2 text-sm font-mono border", isMe ? "bg-primary/10 border-primary/50" : "bg-accent/10 border-accent/50")}>
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-black/50 border-t border-primary/20">
            <form onSubmit={handleSend} className="flex gap-2">
              <CyberInput value={content} onChange={(e) => setContent(e.target.value)} placeholder="INPUT_SIGNAL..." />
              <CyberButton type="submit" disabled={!content.trim()}>TRANSMIT</CyberButton>
            </form>
          </div>
        </div>
      </div>
      <audio ref={remoteAudio} autoPlay />
      {isCalling && (
        <div className="fixed bottom-8 right-8 cyber-box p-6 bg-black/90 border-primary shadow-[0_0_20px_rgba(0,255,0,0.2)] z-50 min-w-[300px]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="font-display text-sm tracking-widest text-glow">VOICE_LINK_ESTABLISHED</span>
              </div>
              <div className="text-[10px] opacity-50 uppercase">Secured_Line</div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <CyberButton 
                variant={isMuted ? "destructive" : "secondary"} 
                onClick={toggleMute}
                className="h-12"
              >
                {isMuted ? <Volume2 className="w-4 h-4 opacity-50" /> : <Volume2 className="w-4 h-4" />}
              </CyberButton>
              <CyberButton 
                variant={isScreenSharing ? "primary" : "secondary"} 
                onClick={toggleScreenShare}
                className="h-12 opacity-50 cursor-not-allowed"
                disabled
              >
                <Monitor className="w-4 h-4" />
              </CyberButton>
              <CyberButton 
                variant="secondary" 
                onClick={() => playSound('https://www.myinstants.com/media/sounds/discord-notification.mp3')}
                className="h-12"
              >
                <Hash className="w-4 h-4" />
              </CyberButton>
              <CyberButton 
                variant="destructive" 
                onClick={() => { pc.current?.close(); setIsCalling(false); }}
                className="h-12"
              >
                OFF
              </CyberButton>
            </div>

            <div className="border-t border-primary/20 pt-2">
              <div className="text-[10px] uppercase mb-2 opacity-50 font-bold">In_Session:</div>
              <div className="flex flex-wrap gap-2">
                <div className="text-[10px] px-2 py-1 border border-primary/30 bg-primary/5">USER_ME</div>
                {participants.map(p => (
                  <div key={p} className="text-[10px] px-2 py-1 border border-primary/30 bg-primary/5">NODE_{p}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="fixed top-20 right-8 z-40">
        <CyberCard className="p-4 w-64 bg-black/80 backdrop-blur">
          <div className="text-xs font-display mb-3 text-glow">COMMS_CONFIG</div>
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-[10px] opacity-50 uppercase">Ringtone_URL</div>
              <CyberInput 
                value={userSettings?.ringtoneUrl || ""} 
                onChange={e => updateSettings.mutate({ ringtoneUrl: e.target.value })}
                className="h-8 text-[10px]"
                placeholder="YouTube/Audio URL"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-[10px] opacity-50 uppercase">Mute_Alerts</div>
              <input 
                type="checkbox" 
                checked={userSettings?.muteNotifications}
                onChange={e => updateSettings.mutate({ muteNotifications: e.target.checked })}
                className="accent-primary"
              />
            </div>
          </div>
        </CyberCard>
      </div>
    </Layout>
  );
}
