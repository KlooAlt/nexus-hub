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

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    audioChunks.current = [];
    mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
    mediaRecorder.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        sendMessage.mutate({
          content: "Audio Message",
          recipientId: selectedRecipientId || undefined,
          groupId: selectedGroupId || undefined,
          mediaUrl: reader.result as string,
          mediaType: 'audio'
        } as any);
      };
      reader.readAsDataURL(audioBlob);
      stream.getTracks().forEach(t => t.stop());
    };
    mediaRecorder.current.start();
    setIsRecording(true);
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
      const filePromise = new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
      });
      reader.readAsDataURL(selectedFile);
      mediaUrl = await filePromise;
      mediaType = selectedFile.type.startsWith('image/') ? 'image' : 
                  selectedFile.type.startsWith('video/') ? 'video' : 
                  selectedFile.type.startsWith('audio/') ? 'audio' : null;
    }

    sendMessage.mutate({ 
      content: content || (selectedFile ? `Shared ${mediaType}` : ""), 
      recipientId: selectedRecipientId || undefined,
      groupId: selectedGroupId || undefined,
      mediaUrl,
      mediaType
    } as any);
    setContent("");
    setSelectedFile(null);
  };

  const displayedMessages = messages?.filter(msg => {
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

              <div className="my-2 px-3 text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-4 opacity-50">Private_Channels</div>
              <div className="px-2 space-y-2 mb-2">
                <div className="flex gap-1">
                  <CyberInput value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="NEW_GC_NAME" className="h-7 text-[10px]" />
                  <CyberButton onClick={() => createGroup.mutate(groupName)} className="h-7 px-2 text-[10px] whitespace-nowrap">INIT</CyberButton>
                </div>
                <div className="flex gap-1">
                  <CyberInput value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="GC_INVITE_CODE" className="h-7 text-[10px]" />
                  <CyberButton onClick={() => joinGroup.mutate(inviteCode)} className="h-7 px-2 text-[10px] whitespace-nowrap">JOIN</CyberButton>
                </div>
              </div>

              {Array.isArray(groups) && groups.map((g: any) => (
                <button
                  key={g.id}
                  onClick={() => { setSelectedGroupId(g.id); setSelectedRecipientId(null); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs font-mono uppercase transition-colors flex items-center gap-2 border border-transparent",
                    selectedGroupId === g.id 
                      ? "bg-primary/20 text-primary border-primary/50 shadow-[0_0_10px_rgba(0,255,0,0.1)]" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Hash className="w-3 h-3" />
                  {g.name}
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
                    {msg.mediaUrl && (
                      <div className="mt-2 border-t border-white/10 pt-2 min-h-[100px] flex items-center justify-center bg-black/20">
                        {msg.mediaType === 'image' && <img src={msg.mediaUrl} alt="uploaded" className="max-w-full rounded border border-primary/20 block" style={{ display: 'block' }} />}
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
            <form onSubmit={handleSend} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
  