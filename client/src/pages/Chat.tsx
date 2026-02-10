import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { CyberInput } from "@/components/CyberInput";
import { CyberButton } from "@/components/CyberButton";
import { CyberCard } from "@/components/CyberCard";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Send, Users, Hash, Lock, Phone, Plus, MessageSquare, Volume2, Monitor, Reply, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const { user: currentUser } = useAuth();
  const { messages: rawMessages, users, sendMessage } = useChat();
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
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (messages && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId !== currentUser?.id && !userSettings?.muteNotifications) {
        if (userSettings?.ringtoneUrl) {
          const audio = new Audio(userSettings.ringtoneUrl);
          audio.play().catch(e => console.error("Ringtone failed:", e));
        }

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`NEW_SIGNAL: ${lastMsg.senderName}`, {
            body: lastMsg.content,
            icon: "/favicon.ico"
          });
        }
      }
    }
  }, [messages, currentUser?.id, userSettings?.muteNotifications, userSettings?.ringtoneUrl]);

  const [replyingTo, setReplyingTo] = useState<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
        });
        reader.readAsDataURL(audioBlob);
        const base64Data = await base64Promise;

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: `audio-${Date.now()}.webm`,
            fileData: base64Data,
            fileType: 'audio/webm'
          })
        });
        const data = await res.json();

        sendMessage.mutate({
          content: "Audio Message",
          recipientId: selectedRecipientId || undefined,
          groupId: selectedGroupId || undefined,
          mediaUrl: data.url,
          mediaType: 'audio',
          replyToId: replyingTo?.id
        } as any);
        
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      toast({ title: "MIC_ERROR", description: "Could not access microphone." });
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !selectedFile) return;

    let mediaUrl = null;
    let mediaType = null;

    if (selectedFile) {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(selectedFile);
      const base64Data = await base64Promise;

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileData: base64Data,
          fileType: selectedFile.type
        })
      });
      const data = await res.json();
      mediaUrl = data.url;
      mediaType = selectedFile.type.startsWith('image/') ? 'image' : 
                  selectedFile.type.startsWith('video/') ? 'video' : 
                  selectedFile.type.startsWith('audio/') ? 'audio' : null;
    }

    sendMessage.mutate({ 
      content: content || (selectedFile ? `Shared ${mediaType}` : ""), 
      recipientId: selectedRecipientId || undefined,
      groupId: selectedGroupId || undefined,
      mediaUrl,
      mediaType,
      replyToId: replyingTo?.id
    } as any);
    setContent("");
    setSelectedFile(null);
    setReplyingTo(null);
  };

  const deleteMessage = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/chat/messages/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chat.list.path] });
    }
  });

  const messages = rawMessages?.map(msg => ({
    ...msg,
    replyTo: rawMessages.find(m => m.id === msg.replyToId)
  }));

  const displayedMessages = messages?.filter(msg => {
    if (msg.isDeleted) return false;
    if (selectedGroupId) return msg.groupId === selectedGroupId;
    if (selectedRecipientId === null) return !msg.recipientId && !msg.groupId;
    return (
      (msg.senderId === currentUser?.id && msg.recipientId === selectedRecipientId) ||
      (msg.senderId === selectedRecipientId && msg.recipientId === currentUser?.id)
    );
  }).sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());

  return (
    <Layout>
      <div className="flex flex-col md:flex-row gap-6 h-full">
        <div className="w-full md:w-64 flex flex-col gap-4">
          <CyberCard className="p-4 flex flex-col gap-4 bg-black/40 border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="font-display text-xs tracking-widest uppercase text-glow">Operatives</h3>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
              <button
                onClick={() => { setSelectedRecipientId(null); setSelectedGroupId(null); }}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded transition-all border border-transparent",
                  !selectedRecipientId && !selectedGroupId ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_10px_rgba(0,255,0,0.2)]" : "hover:bg-primary/10 text-primary/60"
                )}
              >
                <div className="p-1.5 rounded bg-primary/10">
                  <Hash className="w-3.5 h-3.5" />
                </div>
                <span className="font-mono text-[10px] tracking-tighter uppercase">Broadcast_Hub</span>
              </button>
              {users?.filter(u => u.id !== currentUser?.id).map(user => (
                <button
                  key={user.id}
                  onClick={() => { setSelectedRecipientId(user.id); setSelectedGroupId(null); }}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded transition-all border border-transparent",
                    selectedRecipientId === user.id ? "bg-accent/20 border-accent/40 text-accent shadow-[0_0_10px_rgba(255,0,255,0.2)]" : "hover:bg-accent/10 text-accent/60"
                  )}
                >
                  <div className="p-1.5 rounded bg-accent/10">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-mono text-[10px] tracking-tighter uppercase truncate">{user.username}</span>
                </button>
              ))}
            </div>
          </CyberCard>

          <CyberCard className="p-4 flex flex-col gap-4 bg-black/40 border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-primary" />
              <h3 className="font-display text-xs tracking-widest uppercase text-glow">Private GCs</h3>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
              {groups.map((group: any) => (
                <button
                  key={group.id}
                  onClick={() => { setSelectedGroupId(group.id); setSelectedRecipientId(null); }}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded transition-all border border-transparent",
                    selectedGroupId === group.id ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_10px_rgba(0,255,0,0.2)]" : "hover:bg-primary/10 text-primary/60"
                  )}
                >
                  <div className="p-1.5 rounded bg-primary/10">
                    <Hash className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-mono text-[10px] tracking-tighter uppercase truncate">{group.name}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-primary/10">
              <div className="flex gap-2">
                <CyberInput 
                  placeholder="NEW_GC_NAME" 
                  value={groupName} 
                  onChange={e => setGroupName(e.target.value)}
                  className="h-8 text-[10px]"
                />
                <CyberButton 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => groupName && createGroup.mutate(groupName)}
                  disabled={createGroup.isPending}
                >
                  <Plus className="w-4 h-4" />
                </CyberButton>
              </div>
              <div className="flex gap-2">
                <CyberInput 
                  placeholder="INVITE_CODE" 
                  value={inviteCode} 
                  onChange={e => setInviteCode(e.target.value)}
                  className="h-8 text-[10px]"
                />
                <CyberButton 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => inviteCode && joinGroup.mutate(inviteCode)}
                  disabled={joinGroup.isPending}
                >
                  <Plus className="w-4 h-4 text-accent" />
                </CyberButton>
              </div>
            </div>
          </CyberCard>
        </div>

        <div className="flex-1 cyber-box p-0 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-primary/20 bg-black/50 backdrop-blur flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 cyber-box border-primary/40 bg-primary/10">
                {selectedGroupId ? <Hash className="w-5 h-5 text-primary" /> : selectedRecipientId ? <Lock className="w-5 h-5 text-accent" /> : <Users className="w-5 h-5 text-primary" />}
              </div>
              <div>
                <h2 className="font-display text-sm tracking-widest text-glow">
                  {selectedGroupId ? groups.find((g: any) => g.id === selectedGroupId)?.name : 
                   selectedRecipientId ? users?.find((u: any) => u.id === selectedRecipientId)?.username : 
                   "BROADCAST_HUB"}
                </h2>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-primary/60 font-mono">
                    {selectedGroupId ? `SECURE_GC_PROTOCOL - INVITE: ${groups.find((g: any) => g.id === selectedGroupId)?.inviteCode}` : "ENCRYPTED_CHANNEL"}
                  </span>
                </div>
              </div>
            </div>
            {selectedRecipientId && (
              <CyberButton variant="secondary" onClick={() => startCall(selectedRecipientId)} className="h-8 px-4">
                <Phone className="w-4 h-4 mr-2" />
                INITIATE_VOICE
              </CyberButton>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {displayedMessages?.map((msg) => {
              const isMe = msg.senderId === currentUser?.id;
              return (
                <div key={msg.id} className={cn("flex flex-col max-w-[80%] group", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                  {msg.replyTo && (
                    <div className="text-[8px] text-muted-foreground mb-1 border-l-2 border-primary/20 pl-2 opacity-60">
                      Replying to: {msg.replyTo.content.substring(0, 20)}...
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-[10px] font-bold uppercase", isMe ? "text-primary" : "text-accent")}>{isMe ? 'YOU' : msg.senderName}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(msg.createdAt || Date.now()), "HH:mm")}</span>
                    <div className="hidden group-hover:flex items-center gap-1 ml-2">
                      <button onClick={() => setReplyingTo(msg)} className="text-muted-foreground hover:text-primary transition-colors">
                        <Reply className="w-3 h-3" />
                      </button>
                      {(isMe || currentUser?.role === 'owner') && (
                        <button onClick={() => deleteMessage.mutate(msg.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={cn("px-4 py-2 text-sm font-mono border relative", isMe ? "bg-primary/10 border-primary/50" : "bg-accent/10 border-accent/50")}>
                    {msg.content}
                    {msg.mediaUrl && (
                      <div className="mt-2 border-t border-white/10 pt-2 min-h-[100px] flex items-center justify-center bg-black/20 overflow-hidden">
                        {msg.mediaType === 'image' && <img src={msg.mediaUrl} alt="uploaded" className="max-w-full rounded border border-primary/20 block cursor-pointer" onClick={() => window.open(msg.mediaUrl!, '_blank')} />}
                        {msg.mediaType === 'video' && <video src={msg.mediaUrl} controls className="max-w-full rounded border border-primary/20" />}
                        {msg.mediaType === 'audio' && <audio src={msg.mediaUrl} controls className="w-full" />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-black/50 border-t border-primary/20">
            {replyingTo && (
              <div className="text-[10px] text-primary mb-2 flex items-center justify-between bg-primary/5 p-2 border border-primary/20 rounded">
                <span>REPLYING_TO: {replyingTo.senderName} - {replyingTo.content.substring(0, 30)}...</span>
                <button onClick={() => setReplyingTo(null)} className="text-destructive hover:underline">CANCEL</button>
              </div>
            )}
            <form onSubmit={handleSend} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <CyberInput
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={isRecording ? "RECORDING..." : "TYPE_MESSAGE..."}
                  className="flex-1"
                  disabled={isRecording}
                />
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept="image/*,video/*,audio/*"
                />
                <CyberButton
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className={cn(selectedFile && "text-primary border-primary")}
                >
                  <Plus className="w-4 h-4" />
                </CyberButton>
                <CyberButton
                  type="button"
                  variant={isRecording ? "destructive" : "outline"}
                  size="icon"
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                >
                  <Volume2 className="w-4 h-4" />
                </CyberButton>
                <CyberButton type="submit" disabled={sendMessage.isPending || (!content.trim() && !selectedFile)}>
                  <Send className="w-4 h-4" />
                </CyberButton>
              </div>
              {selectedFile && (
                <div className="text-[10px] text-primary flex items-center justify-between bg-primary/5 p-1 border border-primary/10 rounded">
                  <span className="truncate">ATTACHED: {selectedFile.name}</span>
                  <button onClick={() => setSelectedFile(null)} className="text-destructive ml-2">REMOVE</button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
      <audio ref={remoteAudio} autoPlay />
      {isCalling && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-xl">
          <div className="max-w-4xl w-full cyber-box border-primary/40 bg-primary/5 p-12 flex flex-col gap-8 shadow-[0_0_50px_rgba(0,255,0,0.1)]">
            <div className="flex items-center justify-between border-b border-primary/20 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse shadow-[0_0_15px_#00ff00]" />
                <h2 className="font-display text-2xl tracking-[0.2em] text-glow uppercase">Secure_Voice_Session</h2>
              </div>
              <div className="font-mono text-sm text-primary opacity-50">ENCRYPTION: AES-256-TERMINAL</div>
            </div>

            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <div className="flex flex-col items-center gap-3 p-4 border border-primary/20 bg-primary/5 rounded">
                <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <span className="font-mono text-xs text-primary">YOU (LOCAL)</span>
                <div className="text-[10px] text-green-500 uppercase tracking-tighter">Connected</div>
              </div>
              {participants.map(p => (
                <div key={p} className="flex flex-col items-center gap-3 p-4 border border-primary/20 bg-primary/5 rounded animate-in fade-in">
                  <div className="w-16 h-16 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
                    <Users className="w-8 h-8 text-accent" />
                  </div>
                  <span className="font-mono text-xs text-accent">OPERATIVE_{p}</span>
                  <div className="text-[10px] text-accent uppercase tracking-tighter">In_Session</div>
                </div>
              ))}
            </div>

            <div className="flex justify-center items-center gap-6 pt-8 border-t border-primary/20">
              <CyberButton 
                variant={isMuted ? "destructive" : "secondary"} 
                onClick={toggleMute}
                className="w-16 h-16 rounded-full"
              >
                <Volume2 className={cn("w-6 h-6", isMuted && "opacity-50")} />
              </CyberButton>
              
              <CyberButton 
                variant="secondary" 
                onClick={() => {
                  const msg = "[SYSTEM] VOICE_CALL_PING";
                  sendMessage.mutate({
                    content: msg,
                    groupId: selectedGroupId || undefined,
                    recipientId: selectedRecipientId || undefined
                  } as any);
                }}
                className="w-16 h-16 rounded-full"
              >
                <MessageSquare className="w-6 h-6" />
              </CyberButton>

              <CyberButton 
                variant="destructive" 
                onClick={() => { pc.current?.close(); setIsCalling(false); }}
                className="w-24 h-16 px-8"
              >
                DISCONNECT
              </CyberButton>
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
