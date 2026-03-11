import { useState, useRef, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { CyberInput } from "@/components/CyberInput";
import { CyberButton } from "@/components/CyberButton";
import { CyberCard } from "@/components/CyberCard";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import {
  Send, Users, Hash, Phone, Plus, Volume2, Search, Settings,
  ChevronRight, Terminal, Mic, MicOff, Video, VideoOff, X,
  Download, Cpu, Ghost, Forward, Trash2, Reply, Music,
  Camera, MonitorUp, PhoneOff, Binary, UserPlus, Command,
  Box, TerminalSquare, Bug, Upload, Play, ImageIcon, Film
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================
// CONSTANTS
// ============================================================
const SESSION_CRYPT = "X-256-CHA-CHA-POLY";

const DEFAULT_SOUNDS = [
  { id: 'S1', name: 'NEURAL_PING', url: 'https://www.soundjay.com/buttons/sounds/button-20.mp3' },
  { id: 'S2', name: 'GLITCH_PULSE', url: 'https://www.soundjay.com/buttons/sounds/button-3.mp3' },
  { id: 'S3', name: 'DATA_EXTRACT', url: 'https://www.soundjay.com/buttons/sounds/button-10.mp3' },
  { id: 'S4', name: 'SYS_ALARM', url: 'https://www.soundjay.com/buttons/sounds/button-4.mp3' },
  { id: 'S5', name: 'STATIC_BURST', url: 'https://www.soundjay.com/communication/sounds/static-01.mp3' },
  { id: 'S6', name: 'VOID_BEEP', url: 'https://www.soundjay.com/communication/sounds/beep-07.mp3' },
  { id: 'S7', name: 'PROTOCOL_INIT', url: 'https://www.soundjay.com/buttons/sounds/button-30.mp3' },
  { id: 'S8', name: 'TERMINATE', url: 'https://www.soundjay.com/buttons/sounds/button-11.mp3' },
];

// ============================================================
// TYPES
// ============================================================
interface SoundEntry { id: string; name: string; url: string; }
interface MediaPreview { url: string; type: 'image' | 'video' | 'audio'; name: string; }
interface ForwardTarget { message: any; isOpen: boolean; }
interface IncomingCall { fromId: number; fromName: string; offer: RTCSessionDescriptionInit; }
type CallState = 'idle' | 'requesting' | 'incoming' | 'connected';
interface LogEntry { id: string; time: string; type: 'info' | 'warn' | 'crit'; msg: string; }

// ============================================================
// SIDEBAR NODE
// ============================================================
const CyberSidebarNode = ({
  label, isActive, onClick, isOnline = true
}: { label: string; isActive: boolean; onClick: () => void; isOnline?: boolean }) => (
  <motion.button
    whileHover={{ x: 4 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "w-full text-left px-4 py-3 border transition-all duration-200 flex items-center justify-between group mb-1.5",
      isActive
        ? "bg-primary/20 border-primary shadow-[0_0_12px_rgba(0,255,0,0.15)]"
        : "bg-transparent border-primary/20 opacity-70 hover:opacity-100 hover:bg-primary/5"
    )}
  >
    <div className="flex items-center gap-3">
      <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-red-500/50", isActive && "animate-pulse")} />
      <span className={cn("font-mono text-[12px] tracking-[0.05em] uppercase", isActive ? "text-primary font-bold" : "text-primary/70")}>
        {label}
      </span>
    </div>
    <ChevronRight className={cn("w-3 h-3 transition-all", isActive ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-40")} />
  </motion.button>
);

// ============================================================
// TERMINAL MESSAGE
// ============================================================
const TerminalMessage = ({
  msg, isMe, onReply, onForward, onPurge, onMediaPreview
}: {
  msg: any; isMe: boolean;
  onReply: (m: any) => void;
  onForward: (m: any) => void;
  onPurge: (id: number) => void;
  onMediaPreview: (m: MediaPreview) => void;
}) => {
  const [showActions, setShowActions] = useState(false);

  if (msg.mediaType === 'sfx') {
    return (
      <div className={cn("flex mb-3", isMe ? "justify-end" : "justify-start")}>
        <div className="flex items-center gap-2 px-3 py-1.5 border border-primary/20 bg-primary/5 text-[9px] font-mono text-primary/50">
          <Volume2 className="w-3 h-3" />
          <span>{isMe ? "You" : msg.senderName} played {msg.content.replace('[SFX:', '').replace(']', '')}</span>
        </div>
      </div>
    );
  }

  const getMediaSection = () => {
    if (!msg.mediaUrl) return null;
    const type = msg.mediaType || '';
    return (
      <div className="mt-3 rounded border border-white/5 overflow-hidden bg-black/40 max-w-xs">
        {type === 'image' && (
          <img
            src={msg.mediaUrl}
            alt="media"
            onClick={() => onMediaPreview({ url: msg.mediaUrl, type: 'image', name: 'IMAGE' })}
            className="max-w-full max-h-60 object-contain cursor-zoom-in hover:brightness-110 transition-all"
          />
        )}
        {type === 'video' && (
          <video src={msg.mediaUrl} controls className="max-w-full max-h-60 w-full" preload="metadata" />
        )}
        {type === 'audio' && (
          <div className="p-3 flex items-center gap-3">
            <Music className="w-4 h-4 text-primary flex-shrink-0" />
            <audio src={msg.mediaUrl} controls className="h-8 flex-1 accent-primary" />
          </div>
        )}
        {(type !== 'image' && type !== 'video' && type !== 'audio') && (
          <div className="p-3 flex items-center gap-3">
            <Box className="w-4 h-4 text-primary" />
            <a href={msg.mediaUrl} download className="text-[10px] font-mono text-primary underline">Download File</a>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col mb-5 group", isMe ? "items-end" : "items-start")}>
      <div className={cn("flex items-center gap-2 mb-1 px-1", isMe ? "flex-row-reverse" : "flex-row")}>
        <span className={cn("text-[9px] font-bold uppercase", isMe ? "text-primary" : "text-accent")}>
          {isMe ? "YOU" : msg.senderName}
        </span>
        <span className="text-[8px] font-mono text-white/20">
          {format(new Date(msg.createdAt || Date.now()), "HH:mm:ss")}
        </span>
      </div>

      <motion.div
        onDoubleClick={() => setShowActions(true)}
        onContextMenu={e => { e.preventDefault(); setShowActions(true); }}
        className={cn(
          "relative p-3 border text-[13px] font-mono transition-all cursor-help max-w-md",
          isMe
            ? "bg-primary/5 border-primary/30 rounded-l-lg rounded-tr-lg hover:border-primary/60"
            : "bg-accent/5 border-accent/30 rounded-r-lg rounded-tl-lg hover:border-accent/60"
        )}
      >
        {msg.content && <div className="whitespace-pre-wrap leading-relaxed select-text break-words">{msg.content}</div>}
        {getMediaSection()}

        <AnimatePresence>
          {showActions && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
              <motion.div
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                className={cn(
                  "absolute z-50 bottom-full mb-2 flex flex-col bg-black border border-primary/40 p-1 shadow-2xl min-w-[110px]",
                  isMe ? "right-0" : "left-0"
                )}
              >
                <button onClick={() => { onReply(msg); setShowActions(false); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-primary hover:bg-primary/20 font-bold uppercase">
                  <Reply className="w-3 h-3" /> Reply
                </button>
                <button onClick={() => { onForward(msg); setShowActions(false); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-accent hover:bg-accent/20 font-bold uppercase border-t border-white/5">
                  <Forward className="w-3 h-3" /> Relay
                </button>
                {isMe && (
                  <button onClick={() => { onPurge(msg.id); setShowActions(false); }}
                    className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-red-500 hover:bg-red-500/20 font-bold uppercase border-t border-white/5">
                    <Trash2 className="w-3 h-3" /> Purge
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// ============================================================
// MAIN CHAT COMPONENT
// ============================================================
export default function Chat() {
  const { user: currentUser } = useAuth();
  const { messages, users, sendMessage } = useChat();
  const { toast } = useToast();

  // --- CHANNEL STATE ---
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  // --- MODAL STATE ---
  const [showEveryoneList, setShowEveryoneList] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinGroupCode, setJoinGroupCode] = useState("");

  // --- MESSAGE STATE ---
  const [inputContent, setInputContent] = useState("");
  const [replyTarget, setReplyTarget] = useState<any>(null);
  const [forwardState, setForwardState] = useState<ForwardTarget>({ message: null, isOpen: false });
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // --- CALL STATE ---
  const [callState, setCallState] = useState<CallState>('idle');
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callTime, setCallTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [callTargetName, setCallTargetName] = useState("");

  // --- SOUNDBOARD STATE ---
  const [customSounds, setCustomSounds] = useState<SoundEntry[]>([]);
  const [sounds, setSounds] = useState<SoundEntry[]>(DEFAULT_SOUNDS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- LOGS ---
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const pushLog = (msg: string, type: LogEntry['type'] = 'info') => {
    setLogs(p => [{ id: Math.random().toString(), time: new Date().toLocaleTimeString(), type, msg }, ...p].slice(0, 30));
  };

  // --- REFS ---
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callClockRef = useRef<NodeJS.Timeout | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const soundFileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- DATA FETCHING ---
  const { data: groups = [] } = useQuery<any[]>({ queryKey: ['/api/chat/groups'] });
  const { data: userConfig, refetch: refetchConfig } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => (await fetch('/api/auth/me')).json()
  });

  const updateProfile = useMutation({
    mutationFn: async (s: any) => fetch('/api/user/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s)
    }),
    onSuccess: () => refetchConfig()
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/chat/messages/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chat.list.path] });
    }
  });

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/chat/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (g) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/groups'] });
      setShowCreateGroupModal(false);
      setNewGroupName("");
      selectGroupNode(g.id);
      toast({ title: "CLUSTER_ONLINE", description: `${g.name} initialized.` });
    }
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch('/api/chat/groups/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inviteCode: code }) });
      if (!res.ok) throw new Error("Invalid code");
      return res.json();
    },
    onSuccess: (g) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/groups'] });
      setShowJoinGroupModal(false);
      setJoinGroupCode("");
      selectGroupNode(g.id);
      toast({ title: "CLUSTER_ACCESSED", description: `Joined ${g.name}` });
    },
    onError: () => toast({ title: "INVALID_CODE", variant: "destructive" })
  });

  // ============================================================
  // CHANNEL SELECTION
  // ============================================================
  const selectBroadcast = () => { setSelectedRecipientId(null); setSelectedGroupId(null); pushLog("CHANNEL: BROADCAST_HUB"); };
  const selectPrivateNode = (id: number) => { setSelectedGroupId(null); setSelectedRecipientId(id); pushLog(`CHANNEL: DM_${id}`); };
  const selectGroupNode = (id: number) => { setSelectedRecipientId(null); setSelectedGroupId(id); pushLog(`CHANNEL: GROUP_${id}`); };

  // ============================================================
  // MESSAGE FILTERING
  // ============================================================
  const unifiedMessages = useMemo(() => {
    if (!messages) return [];
    return messages.filter(m => {
      if (selectedGroupId) return m.groupId === selectedGroupId;
      if (selectedRecipientId) {
        return (m.senderId === currentUser?.id && m.recipientId === selectedRecipientId) ||
          (m.senderId === selectedRecipientId && m.recipientId === currentUser?.id);
      }
      return !m.groupId && !m.recipientId;
    }).sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }, [messages, selectedGroupId, selectedRecipientId, currentUser?.id]);

  // ============================================================
  // AUTO-PLAY SFX FROM OTHER USERS
  // ============================================================
  const lastSfxIdRef = useRef<number>(0);
  useEffect(() => {
    if (!unifiedMessages.length) return;
    const sfxMsgs = unifiedMessages.filter(m => m.mediaType === 'sfx' && m.senderId !== currentUser?.id);
    const newest = sfxMsgs[sfxMsgs.length - 1];
    if (newest && newest.id > lastSfxIdRef.current) {
      lastSfxIdRef.current = newest.id;
      if (newest.mediaUrl) {
        const a = new Audio(newest.mediaUrl);
        a.volume = 0.7;
        a.play().catch(() => {});
        pushLog(`SFX_RECEIVED: ${newest.content}`, 'info');
      }
    }
  }, [unifiedMessages]);

  // ============================================================
  // FILE UPLOAD HANDLER
  // ============================================================
  const handleFileSelect = (file: File | null) => {
    if (!file) { setUploadFile(null); setUploadPreview(null); return; }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "FILE_TOO_LARGE", description: "Max 20MB allowed.", variant: "destructive" });
      return;
    }
    setUploadFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setUploadPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ============================================================
  // SEND MESSAGE
  // ============================================================
  const handleTransmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputContent.trim() && !uploadFile) return;

    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    if (uploadFile) {
      mediaUrl = uploadPreview;
      const t = uploadFile.type;
      if (t.startsWith('image/')) mediaType = 'image';
      else if (t.startsWith('video/')) mediaType = 'video';
      else if (t.startsWith('audio/')) mediaType = 'audio';
      else mediaType = 'file';
    }

    sendMessage.mutate({
      content: inputContent || (uploadFile ? '' : ''),
      recipientId: selectedRecipientId ?? undefined,
      groupId: selectedGroupId ?? undefined,
      mediaUrl,
      mediaType,
    } as any);

    setInputContent("");
    setUploadFile(null);
    setUploadPreview(null);
    setReplyTarget(null);
  };

  // ============================================================
  // SOUNDBOARD
  // ============================================================
  const handlePlaySound = async (sound: SoundEntry) => {
    const a = new Audio(sound.url);
    a.volume = 0.7;
    a.play().catch(() => {});
    pushLog(`SFX_LOCAL: ${sound.name}`);

    await fetch('/api/chat/soundboard/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        soundUrl: sound.url,
        soundName: sound.name,
        recipientId: selectedRecipientId ?? null,
        groupId: selectedGroupId ?? null,
      })
    });
    queryClient.invalidateQueries({ queryKey: [api.chat.list.path] });
  };

  const handleImportSound = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const newSound: SoundEntry = {
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, "").toUpperCase().slice(0, 16),
        url: reader.result as string
      };
      setSounds(prev => [...prev, newSound]);
      toast({ title: "SOUND_IMPORTED", description: newSound.name });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ============================================================
  // CALLING SYSTEM
  // ============================================================
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] });
    pcRef.current = pc;
    return pc;
  };

  const stopAllCallMedia = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (callClockRef.current) clearInterval(callClockRef.current);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setCallTime(0);
    setIsMuted(false);
    setIsVideoOn(false);
    setIsSharingScreen(false);
  };

  const startCall = async (targetId: number, targetName: string, withVideo: boolean) => {
    setCallTargetName(targetName);
    setCallState('requesting');
    setIsVideoOn(withVideo);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          await fetch('/api/chat/voice/ice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipientId: targetId, candidate: e.candidate })
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await fetch('/api/chat/voice/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: targetId, offer })
      });

      pushLog(`CALL_REQUESTING: ${targetName}`, 'warn');
      callClockRef.current = setInterval(() => setCallTime(t => t + 1), 1000);

      pollIntervalRef.current = setInterval(async () => {
        const res = await fetch('/api/chat/voice/poll');
        const signals: any[] = await res.json();
        for (const sig of signals) {
          if (sig.type === 'answer') {
            await pc.setRemoteDescription(sig.answer);
            setCallState('connected');
            pushLog(`CALL_CONNECTED: ${targetName}`, 'info');
          } else if (sig.type === 'ice' && sig.candidate) {
            await pc.addIceCandidate(sig.candidate).catch(() => {});
          }
        }
      }, 2000);

    } catch (err) {
      toast({ title: "HARDWARE_FAILURE", description: "Could not access mic/camera.", variant: "destructive" });
      endCall();
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    setCallState('connected');
    setCallTargetName(incomingCall.fromName);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          await fetch('/api/chat/voice/ice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipientId: incomingCall.fromId, candidate: e.candidate })
          });
        }
      };

      await pc.setRemoteDescription(incomingCall.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await fetch('/api/chat/voice/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: incomingCall.fromId, answer })
      });

      callClockRef.current = setInterval(() => setCallTime(t => t + 1), 1000);
      setIncomingCall(null);
      pushLog(`CALL_ACCEPTED: ${incomingCall.fromName}`, 'info');

    } catch (err) {
      toast({ title: "HARDWARE_FAILURE", variant: "destructive" });
      endCall();
    }
  };

  const endCall = () => {
    stopAllCallMedia();
    setCallState('idle');
    setIncomingCall(null);
    setCallTargetName("");
    pushLog("CALL_TERMINATED", 'crit');
  };

  const toggleCamera = async () => {
    if (!localStreamRef.current) return;
    if (isVideoOn) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = false; });
      setIsVideoOn(false);
    } else {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        localStreamRef.current.addTrack(videoTrack);
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
        setIsVideoOn(true);
      } catch {
        toast({ title: "CAMERA_DENIED", variant: "destructive" });
      }
    }
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(!isMuted);
  };

  const shareScreen = async () => {
    if (isSharingScreen) {
      localStreamRef.current?.getVideoTracks().forEach(t => t.stop());
      setIsSharingScreen(false);
      return;
    }
    try {
      const screen = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
      const track = screen.getVideoTracks()[0];
      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(track);
      }
      setIsSharingScreen(true);
      track.onended = () => setIsSharingScreen(false);
    } catch {
      toast({ title: "SCREEN_SHARE_DENIED", variant: "destructive" });
    }
  };

  // ============================================================
  // AUDIO RECORDING (VOICE MESSAGE)
  // ============================================================
  const startVoiceRecord = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorderRef.current = new MediaRecorder(stream);
    chunksRef.current = [];
    recorderRef.current.ondataavailable = e => chunksRef.current.push(e.data);
    recorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        sendMessage.mutate({
          content: '[VOICE_MESSAGE]',
          recipientId: selectedRecipientId ?? undefined,
          groupId: selectedGroupId ?? undefined,
          mediaUrl: reader.result as string,
          mediaType: 'audio',
        } as any);
      };
      reader.readAsDataURL(blob);
      stream.getTracks().forEach(t => t.stop());
    };
    recorderRef.current.start();
    pushLog("VOICE_RECORDING_STARTED", 'warn');
  };

  // ============================================================
  // POLL FOR INCOMING CALLS
  // ============================================================
  useEffect(() => {
    if (callState !== 'idle') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/chat/voice/poll');
        const signals: any[] = await res.json();
        for (const sig of signals) {
          if (sig.type === 'offer') {
            const callerName = users?.find(u => u.id === sig.from)?.username || `User_${sig.from}`;
            setIncomingCall({ fromId: sig.from, fromName: callerName, offer: sig.offer });
            setCallState('incoming');
            pushLog(`INCOMING_CALL: ${callerName}`, 'warn');
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [callState, users]);

  // ============================================================
  // AUTO-SCROLL
  // ============================================================
  useEffect(() => {
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
  }, [unifiedMessages.length, selectedRecipientId, selectedGroupId]);

  // ============================================================
  // COMPUTED
  // ============================================================
  const activeChannelName = useMemo(() => {
    if (selectedGroupId) return (groups as any[]).find((g: any) => g.id === selectedGroupId)?.name || "GROUP";
    if (selectedRecipientId) return users?.find((u: any) => u.id === selectedRecipientId)?.username || "PRIVATE";
    return "BROADCAST_HUB";
  }, [selectedGroupId, selectedRecipientId, groups, users]);

  const filteredUsers = users?.filter(u => u.id !== currentUser?.id && u.username.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredGroups = (groups as any[]).filter((g: any) => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <Layout>
      <div className="flex h-[calc(100vh-140px)] gap-4 overflow-hidden">

        {/* ======================================================
            INCOMING CALL OVERLAY
            ====================================================== */}
        <AnimatePresence>
          {callState === 'incoming' && incomingCall && (
            <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/90 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="cyber-box w-full max-w-sm bg-black border-primary p-10 text-center"
              >
                <div className="w-20 h-20 mx-auto mb-6 border-2 border-primary rounded-full flex items-center justify-center animate-pulse">
                  <Phone className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display text-2xl text-primary tracking-widest mb-2 uppercase">Incoming Call</h3>
                <p className="font-mono text-primary/60 mb-8 text-sm">{incomingCall.fromName}</p>
                <div className="flex gap-4">
                  <button onClick={acceptCall} className="flex-1 py-3 bg-green-600 border border-green-400 text-white font-display tracking-widest uppercase hover:bg-green-500 transition-colors flex items-center justify-center gap-2">
                    <Phone className="w-5 h-5" /> Accept
                  </button>
                  <button onClick={endCall} className="flex-1 py-3 bg-red-700 border border-red-500 text-white font-display tracking-widest uppercase hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                    <PhoneOff className="w-5 h-5" /> Decline
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ======================================================
            ACTIVE CALL OVERLAY
            ====================================================== */}
        <AnimatePresence>
          {(callState === 'requesting' || callState === 'connected') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[800] flex flex-col"
            >
              <div className="flex-1 flex">
                {/* Local video feed */}
                <div className="flex-1 relative bg-black flex items-center justify-center">
                  {isVideoOn ? (
                    <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-36 h-36 rounded-full border-2 border-primary/30 bg-primary/5 flex items-center justify-center">
                        <Ghost className="w-16 h-16 text-primary animate-pulse" />
                      </div>
                      <div className="text-center">
                        <div className="font-display text-3xl text-primary tracking-[0.6em] uppercase">{callTargetName}</div>
                        <div className="text-[10px] font-mono text-primary/40 mt-3 tracking-widest uppercase">
                          {callState === 'requesting' ? '◌ REQUESTING CONNECTION...' : `◉ CONNECTED — ${Math.floor(callTime / 60)}:${(callTime % 60).toString().padStart(2, '0')}`}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 border border-primary/30 px-3 py-1 text-[10px] font-mono text-primary">
                    {callState === 'requesting' ? (
                      <><span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />REQUESTING...</>
                    ) : (
                      <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />LIVE {Math.floor(callTime / 60)}:{(callTime % 60).toString().padStart(2, '0')}</>
                    )}
                  </div>
                </div>
              </div>

              {/* Call controls */}
              <div className="h-32 bg-black border-t border-primary/20 flex items-center justify-center gap-8">
                <button
                  onClick={toggleMute}
                  className={cn("w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all", isMuted ? "bg-red-600 border-red-400" : "border-white/20 hover:border-primary")}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button
                  onClick={toggleCamera}
                  className={cn("w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all", isVideoOn ? "bg-primary border-primary text-black" : "border-white/20 hover:border-primary")}
                >
                  {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </button>
                <button
                  onClick={shareScreen}
                  className={cn("w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all", isSharingScreen ? "bg-accent border-accent text-black" : "border-white/20 hover:border-accent")}
                >
                  <MonitorUp className="w-6 h-6" />
                </button>
                <button
                  onClick={endCall}
                  className="px-10 h-14 bg-red-700 border-2 border-red-500 flex items-center gap-3 font-display tracking-widest uppercase hover:bg-red-600 transition-colors"
                >
                  <PhoneOff className="w-6 h-6" /> End
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ======================================================
            MODALS
            ====================================================== */}
        <AnimatePresence>
          {showEveryoneList && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="cyber-box w-full max-w-md bg-black border-primary p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display text-primary uppercase tracking-widest">Global_Directory</h2>
                  <button onClick={() => setShowEveryoneList(false)}><X className="w-5 h-5 text-primary/60 hover:text-primary" /></button>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {users?.filter(u => u.id !== currentUser?.id).map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 border border-primary/20 bg-primary/5">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />
                        <span className="font-mono text-primary text-sm">{u.username}</span>
                      </div>
                      <div className="flex gap-2">
                        <CyberButton variant="primary" onClick={() => { selectPrivateNode(u.id); setShowEveryoneList(false); }} className="px-2 py-1 text-[10px]">MSG</CyberButton>
                        <CyberButton variant="primary" onClick={() => { selectPrivateNode(u.id); setShowEveryoneList(false); startCall(u.id, u.username, false); }} className="px-2 py-1 text-[10px]">CALL</CyberButton>
                        <CyberButton variant="secondary" onClick={() => { selectPrivateNode(u.id); setShowEveryoneList(false); startCall(u.id, u.username, true); }} className="px-2 py-1 text-[10px]">VIDEO</CyberButton>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCreateGroupModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="cyber-box w-full max-w-sm bg-black border-primary p-6">
                <h2 className="font-display text-primary uppercase tracking-widest mb-5">Create Cluster</h2>
                <CyberInput value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Cluster name..." className="mb-4" onKeyDown={e => e.key === 'Enter' && createGroupMutation.mutate(newGroupName)} />
                <div className="flex gap-2">
                  <CyberButton variant="primary" onClick={() => createGroupMutation.mutate(newGroupName)} disabled={!newGroupName.trim()} className="flex-1">CREATE</CyberButton>
                  <CyberButton variant="secondary" onClick={() => setShowCreateGroupModal(false)} className="flex-1">CANCEL</CyberButton>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showJoinGroupModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="cyber-box w-full max-w-sm bg-black border-primary p-6">
                <h2 className="font-display text-primary uppercase tracking-widest mb-5">Join Cluster</h2>
                <CyberInput value={joinGroupCode} onChange={e => setJoinGroupCode(e.target.value)} placeholder="Cluster invite code..." className="mb-4" onKeyDown={e => e.key === 'Enter' && joinGroupMutation.mutate(joinGroupCode)} />
                <div className="flex gap-2">
                  <CyberButton variant="primary" onClick={() => joinGroupMutation.mutate(joinGroupCode)} disabled={!joinGroupCode.trim()} className="flex-1">JOIN</CyberButton>
                  <CyberButton variant="secondary" onClick={() => setShowJoinGroupModal(false)} className="flex-1">CANCEL</CyberButton>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Forward Modal */}
        <AnimatePresence>
          {forwardState.isOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="cyber-box w-full max-w-md bg-black border-accent/40 p-6">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="font-display text-accent uppercase tracking-widest">Relay Data</h2>
                  <button onClick={() => setForwardState({ message: null, isOpen: false })}><X className="w-5 h-5" /></button>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-1">
                  {[
                    ...users!.filter(u => u.id !== currentUser?.id).map(u => ({ id: u.id, name: u.username, type: 'dm' as const })),
                    ...(groups as any[]).map((g: any) => ({ id: g.id, name: g.name, type: 'group' as const }))
                  ].map(t => (
                    <button key={`${t.type}-${t.id}`}
                      onClick={() => {
                        sendMessage.mutate({ content: `[RELAY] ${forwardState.message.content}`, recipientId: t.type === 'dm' ? t.id : undefined, groupId: t.type === 'group' ? t.id : undefined, mediaUrl: forwardState.message.mediaUrl, mediaType: forwardState.message.mediaType } as any);
                        setForwardState({ message: null, isOpen: false });
                        toast({ title: "RELAY_SENT" });
                      }}
                      className="w-full p-3 border border-white/5 hover:border-accent hover:bg-accent/10 text-left font-mono text-sm text-white/60 hover:text-accent transition-all"
                    >
                      {t.name} <span className="text-[9px] opacity-40">({t.type})</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Media Lightbox */}
        {mediaPreview && (
          <div className="fixed inset-0 z-[1000] bg-black/98 flex items-center justify-center p-8" onClick={() => setMediaPreview(null)}>
            <button className="absolute top-6 right-6 text-white/50 hover:text-white"><X className="w-8 h-8" /></button>
            {mediaPreview.type === 'image' && <img src={mediaPreview.url} className="max-w-full max-h-[85vh] object-contain" />}
            {mediaPreview.type === 'video' && <video src={mediaPreview.url} controls autoPlay className="max-w-full max-h-[85vh]" />}
          </div>
        )}

        {/* Hidden inputs */}
        <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*,.pdf,.zip,.txt" className="hidden" onChange={e => handleFileSelect(e.target.files?.[0] || null)} />
        <input ref={soundFileInputRef} type="file" accept="audio/*,video/*" className="hidden" onChange={handleImportSound} />

        {/* ======================================================
            SIDEBAR
            ====================================================== */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
              className="w-72 flex-shrink-0 flex flex-col bg-black border border-primary/20 overflow-hidden">
              <div className="p-4 border-b border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-[11px] tracking-[0.4em] uppercase text-primary">Network_Dirs</h2>
                  <div className="flex gap-1">
                    <button onClick={() => setShowCreateGroupModal(true)} className="p-1 hover:text-accent text-primary/40 transition-colors" title="Create Group"><Plus className="w-4 h-4" /></button>
                    <button onClick={() => setShowJoinGroupModal(true)} className="p-1 hover:text-accent text-primary/40 transition-colors" title="Join Group"><UserPlus className="w-4 h-4" /></button>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:text-white text-primary/20 transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              <div className="p-3 border-b border-primary/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-primary/30" />
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-black border border-primary/10 pl-8 pr-3 py-1.5 text-[10px] font-mono text-primary outline-none focus:border-primary/40"
                    placeholder="Filter nodes..." />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <CyberSidebarNode label="BROADCAST_HUB" isActive={!selectedRecipientId && !selectedGroupId} onClick={selectBroadcast} />
                <div className="pt-2 pb-1 px-3 text-[8px] font-bold text-primary/30 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-px bg-primary/20 flex-1" /> DMs <span className="w-2 h-px bg-primary/20 flex-1" />
                </div>
                {filteredUsers?.map(u => (
                  <CyberSidebarNode key={u.id} label={u.username} isActive={selectedRecipientId === u.id} onClick={() => selectPrivateNode(u.id)} />
                ))}
                <div className="pt-2 pb-1 px-3 text-[8px] font-bold text-primary/30 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-px bg-primary/20 flex-1" /> GROUPS <span className="w-2 h-px bg-primary/20 flex-1" />
                </div>
                {filteredGroups.map((g: any) => (
                  <CyberSidebarNode key={g.id} label={g.name} isActive={selectedGroupId === g.id} onClick={() => selectGroupNode(g.id)} />
                ))}
                {filteredGroups.length === 0 && !searchTerm && (
                  <div className="px-4 py-2 text-[9px] font-mono text-primary/20 italic">No groups yet. Create or join one.</div>
                )}
              </div>

              <div className="p-3 border-t border-primary/20 bg-black flex items-center gap-3">
                <div className="w-8 h-8 border border-primary/20 flex items-center justify-center bg-primary/5">
                  <Cpu className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-primary uppercase truncate">{currentUser?.username}</div>
                  <div className="text-[8px] text-primary/30 font-mono">ONLINE</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ======================================================
            MAIN CHAT AREA
            ====================================================== */}
        <div className="flex-1 flex flex-col border border-primary/10 bg-black/70 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-primary/20 bg-black/60 flex-shrink-0">
            <div className="flex items-center gap-3">
              {!isSidebarOpen && (
                <button onClick={() => setIsSidebarOpen(true)} className="p-1 border border-primary/20 hover:bg-primary/10 text-primary">
                  <TerminalSquare className="w-5 h-5" />
                </button>
              )}
              <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <h2 className="font-display text-sm tracking-[0.4em] text-primary uppercase">{activeChannelName}</h2>
              {selectedGroupId && (
                <span className="text-[8px] font-mono text-primary/30 border border-primary/20 px-2 py-0.5">
                  CODE: {(groups as any[]).find((g: any) => g.id === selectedGroupId)?.inviteCode || '...'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CyberButton onClick={() => setShowEveryoneList(true)} variant="primary" className="px-3 py-1.5 text-[10px] hidden sm:flex">
                <Users className="w-3.5 h-3.5 mr-1.5" /> DIR
              </CyberButton>
              {selectedRecipientId && (
                <>
                  <button onClick={() => startCall(selectedRecipientId, activeChannelName, false)}
                    className="p-2 border border-primary/20 hover:border-primary text-primary transition-all" title="Voice Call">
                    <Phone className="w-4 h-4" />
                  </button>
                  <button onClick={() => startCall(selectedRecipientId, activeChannelName, true)}
                    className="p-2 border border-primary/20 hover:border-primary text-primary transition-all" title="Video Call">
                    <Video className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Group invite code banner */}
          {selectedGroupId && (
            <div className="px-5 py-2 border-b border-accent/20 bg-accent/5 flex items-center gap-3 flex-shrink-0">
              <Binary className="w-3.5 h-3.5 text-accent" />
              <span className="text-[9px] font-mono text-accent/60">Invite Code:</span>
              <span className="text-[9px] font-mono text-accent font-bold select-all">
                {(groups as any[]).find((g: any) => g.id === selectedGroupId)?.inviteCode}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText((groups as any[]).find((g: any) => g.id === selectedGroupId)?.inviteCode);
                  toast({ title: "CODE_COPIED" });
                }}
                className="text-[8px] font-mono text-accent/60 hover:text-accent underline">Copy</button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-1">
            {unifiedMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full opacity-10">
                <Bug className="w-12 h-12 mb-4" />
                <p className="font-mono text-[11px] tracking-[1em] uppercase">No_Transmissions</p>
              </div>
            )}
            {unifiedMessages.map(msg => (
              <TerminalMessage
                key={msg.id}
                msg={msg}
                isMe={msg.senderId === currentUser?.id}
                onReply={setReplyTarget}
                onForward={m => setForwardState({ message: m, isOpen: true })}
                onPurge={id => deleteMessageMutation.mutate(id)}
                onMediaPreview={setMediaPreview}
              />
            ))}
            <div ref={chatBottomRef} className="h-2" />
          </div>

          {/* Reply banner */}
          <AnimatePresence>
            {replyTarget && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                className="border-t border-primary/20 px-5 py-2 bg-primary/5 flex items-center justify-between overflow-hidden flex-shrink-0">
                <span className="text-[9px] font-mono text-primary/60">Replying to <strong>{replyTarget.senderName}</strong>: {replyTarget.content?.slice(0, 50)}</span>
                <button onClick={() => setReplyTarget(null)}><X className="w-3.5 h-3.5 text-primary/40 hover:text-primary" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* File preview */}
          <AnimatePresence>
            {uploadFile && uploadPreview && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                className="border-t border-accent/20 px-5 py-2 bg-accent/5 flex items-center gap-4 overflow-hidden flex-shrink-0">
                {uploadFile.type.startsWith('image/') && <img src={uploadPreview} className="w-12 h-12 object-cover border border-accent/30" />}
                {uploadFile.type.startsWith('video/') && <Film className="w-5 h-5 text-accent" />}
                {uploadFile.type.startsWith('audio/') && <Music className="w-5 h-5 text-accent" />}
                <div className="flex-1">
                  <div className="text-[10px] font-mono text-accent truncate">{uploadFile.name}</div>
                  <div className="text-[8px] text-accent/40">{(uploadFile.size / 1024).toFixed(0)} KB</div>
                </div>
                <button onClick={() => { setUploadFile(null); setUploadPreview(null); }}>
                  <X className="w-4 h-4 text-accent/40 hover:text-accent" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input */}
          <div className="border-t border-primary/20 p-4 bg-black/90 flex-shrink-0">
            <form onSubmit={handleTransmit} className="flex items-center gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className={cn("w-10 h-10 border flex items-center justify-center transition-all flex-shrink-0", uploadFile ? "border-accent bg-accent/10 text-accent" : "border-primary/20 text-primary hover:border-primary")}>
                <Plus className="w-5 h-5" />
              </button>

              <button type="button" onMouseDown={startVoiceRecord} onMouseUp={() => recorderRef.current?.stop()}
                className="w-10 h-10 border border-primary/20 text-primary hover:bg-primary/10 flex items-center justify-center flex-shrink-0 transition-all"
                title="Hold to record voice message">
                <Mic className="w-4 h-4" />
              </button>

              <CyberInput
                value={inputContent}
                onChange={e => setInputContent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTransmit(); } }}
                placeholder="TRANSMIT_SIGNAL..."
                className="flex-1 h-10 text-xs font-mono"
              />

              <CyberButton type="submit" disabled={!inputContent.trim() && !uploadFile} className="h-10 px-6 flex-shrink-0">
                <Send className="w-4 h-4" />
              </CyberButton>
            </form>
          </div>
        </div>

        {/* ======================================================
            RIGHT PANEL - DIAGNOSTICS + SOUNDBOARD
            ====================================================== */}
        <div className="hidden xl:flex w-72 flex-col gap-4 flex-shrink-0">
          {/* Diagnostic log */}
          <CyberCard className="p-4 border-primary/20 bg-black/80 flex flex-col" style={{ height: '45%' }}>
            <h3 className="text-[9px] font-display text-primary tracking-[0.4em] mb-3 flex items-center gap-2">
              <Terminal className="w-3 h-3 animate-pulse" /> DIAGNOSTIC_LOG
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[8px]">
              {logs.map(log => (
                <div key={log.id} className="border-l-2 border-primary/20 pl-2">
                  <div className={cn("font-bold", log.type === 'crit' ? "text-red-400" : log.type === 'warn' ? "text-yellow-400" : "text-primary/50")}>{log.time}</div>
                  <div className="text-primary/60 truncate">{log.msg}</div>
                </div>
              ))}
              {!logs.length && <div className="text-primary/20 italic animate-pulse">Scanning...</div>}
            </div>
          </CyberCard>

          {/* Soundboard */}
          <CyberCard className="p-4 border-primary/20 bg-black/80 flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[9px] font-display text-primary tracking-[0.4em] flex items-center gap-2">
                <Volume2 className="w-3 h-3" /> SOUNDBOARD
              </h3>
              <button onClick={() => soundFileInputRef.current?.click()}
                className="text-[8px] font-mono text-primary/40 hover:text-accent border border-primary/20 hover:border-accent px-2 py-0.5 transition-colors flex items-center gap-1">
                <Upload className="w-2.5 h-2.5" /> IMPORT
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-1.5 pr-1">
                {sounds.map(s => (
                  <button key={s.id} onClick={() => handlePlaySound(s)}
                    className="p-2 border border-primary/10 bg-primary/5 hover:bg-primary/20 hover:border-primary/40 text-[8px] font-mono text-left uppercase transition-all truncate group">
                    <Play className="w-2.5 h-2.5 inline mr-1 opacity-0 group-hover:opacity-100" />{s.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-primary/10">
              <div className="text-[8px] font-mono text-primary/30 mb-2 uppercase">Custom Ringtone URL</div>
              <CyberInput
                value={userConfig?.ringtoneUrl || ""}
                onChange={e => updateProfile.mutate({ ringtoneUrl: e.target.value })}
                placeholder="https://...mp3"
                className="h-7 text-[9px]"
              />
            </div>
          </CyberCard>
        </div>
      </div>
    </Layout>
  );
}
