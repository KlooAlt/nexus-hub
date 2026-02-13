import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { CyberInput } from "@/components/CyberInput";
import { CyberButton } from "@/components/CyberButton";
import { CyberCard } from "@/components/CyberCard";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { 
  Send, Users, Hash, Lock, Phone, Plus, MessageSquare, 
  Volume2, Monitor, Shield, Zap, Search, Settings, 
  ChevronRight, Terminal, Activity, FileText, Image as ImageIcon,
  Play, Pause, Mic, MicOff, Video, X, Download, AlertTriangle,
  Radio, Globe, Cpu, Ghost, Forward, Trash2, Reply, Maximize2,
  Share2, Music, Camera, MonitorUp, PhoneOff, Signal, HardDrive,
  Eye, RefreshCw, Layers, Wind, Wifi, Database, Binary, ShieldCheck,
  UserPlus, Command, Disc, Box, Info, TerminalSquare, Bug
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ============================================================================
 * CORE SYSTEM ASSETS
 * ============================================================================
 */
const SYSTEM_BUILD = "v6.2.0-ULTRA";
const SESSION_CRYPT = "X-256-CHA-CHA-POLY";

const SOUNDBOARD_DATA = [
  { id: 'S1', name: 'NEURAL_PING', url: 'https://www.soundjay.com/buttons/sounds/button-20.mp3' },
  { id: 'S2', name: 'GLITCH_PULSE', url: 'https://www.soundjay.com/buttons/sounds/button-3.mp3' },
  { id: 'S3', name: 'DATA_EXTRACT', url: 'https://www.soundjay.com/buttons/sounds/button-10.mp3' },
  { id: 'S4', name: 'SYS_ALARM', url: 'https://www.soundjay.com/buttons/sounds/button-4.mp3' },
  { id: 'S5', name: 'STATIC_BURST', url: 'https://www.soundjay.com/communication/sounds/static-01.mp3' },
  { id: 'S6', name: 'VOID_BEEP', url: 'https://www.soundjay.com/communication/sounds/beep-07.mp3' },
  { id: 'S7', name: 'PROTOCOL_INIT', url: 'https://www.soundjay.com/buttons/sounds/button-30.mp3' },
  { id: 'S8', name: 'TERMINATE', url: 'https://www.soundjay.com/buttons/sounds/button-11.mp3' },
  { id: 'S9', name: 'ENCRYPT', url: 'https://www.soundjay.com/buttons/sounds/button-21.mp3' },
  { id: 'S10', name: 'GHOST_PULSE', url: 'https://www.soundjay.com/communication/sounds/static-02.mp3' },
  { id: 'S11', name: 'BEEP_LOW', url: 'https://www.soundjay.com/communication/sounds/beep-01.mp3' },
  { id: 'S12', name: 'BEEP_HIGH', url: 'https://www.soundjay.com/communication/sounds/beep-05.mp3' },
];

/**
 * ============================================================================
 * INTERFACES
 * ============================================================================
 */
interface MediaPayload {
  url: string;
  type: 'image' | 'video' | 'audio' | 'file';
  name: string;
}

interface ForwardState {
  message: any;
  isOpen: boolean;
}

interface SystemLogEntry {
  id: string;
  time: string;
  type: 'info' | 'warn' | 'crit';
  msg: string;
}

/**
 * ============================================================================
 * SUB-COMPONENT: CYBER_SIDEBAR_NODE
 * Mapped to the exact visual style of the user-provided screenshot.
 * ============================================================================
 */
const CyberSidebarNode = ({ 
  label, 
  isActive, 
  onClick, 
  isOnline = true 
}: { 
  label: string, 
  isActive: boolean, 
  onClick: () => void,
  isOnline?: boolean 
}) => (
  <motion.button
    whileHover={{ x: 4, backgroundColor: "rgba(0, 255, 0, 0.05)" }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "w-full text-left px-4 py-3 border transition-all duration-200 flex items-center justify-between group mb-1.5",
      isActive 
        ? "bg-primary/20 border-primary shadow-[0_0_12px_rgba(0,255,0,0.15)]" 
        : "bg-transparent border-primary/20 opacity-70 hover:opacity-100"
    )}
  >
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-2 h-2 rounded-full",
        isOnline ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-red-500/50",
        isActive && "animate-pulse"
      )} />
      <span className={cn(
        "font-mono text-[12px] tracking-[0.05em] uppercase",
        isActive ? "text-primary font-bold text-glow" : "text-primary/70"
      )}>
        {label}
      </span>
    </div>
    <ChevronRight className={cn(
      "w-3 h-3 transition-all",
      isActive ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-40"
    )} />
  </motion.button>
);

/**
 * ============================================================================
 * SUB-COMPONENT: TERMINAL_MESSAGE
 * Unified message rendering for all channels.
 * ============================================================================
 */
const TerminalMessage = ({ 
  msg, 
  isMe, 
  onReply, 
  onForward, 
  onPurge, 
  onMediaPreview 
}: { 
  msg: any, 
  isMe: boolean, 
  onReply: (m: any) => void,
  onForward: (m: any) => void,
  onPurge: (id: number) => void,
  onMediaPreview: (m: MediaPayload) => void 
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className={cn("flex flex-col mb-6 group", isMe ? "items-end" : "items-start")}>

      {/* REPLY BANNER */}
      {msg.replyTo && (
        <div className={cn(
          "flex items-center gap-2 mb-1 px-3 py-0.5 bg-white/5 border-l border-primary/40 text-[9px] font-mono italic opacity-50",
          isMe ? "flex-row-reverse" : "flex-row"
        )}>
          <Reply className="w-3 h-3" />
          <span>REPLYING_TO: @{msg.replyTo.senderName}</span>
          <span className="truncate max-w-[100px]">"{msg.replyTo.content}"</span>
        </div>
      )}

      {/* SENDER INFO */}
      <div className={cn("flex items-center gap-2 mb-1 px-1", isMe ? "flex-row-reverse" : "flex-row")}>
        <span className={cn("text-[9px] font-bold uppercase", isMe ? "text-primary" : "text-accent")}>
          {isMe ? "LOCAL_TERMINAL" : msg.senderName}
        </span>
        <span className="text-[8px] font-mono text-white/20">{format(new Date(msg.createdAt || Date.now()), "HH:mm:ss:SS")}</span>
      </div>

      {/* MESSAGE BODY */}
      <motion.div 
        onDoubleClick={() => setShowActions(true)}
        onContextMenu={(e) => { e.preventDefault(); setShowActions(true); }}
        className={cn(
          "relative p-3.5 border text-[13px] font-mono transition-all cursor-help",
          isMe 
            ? "bg-primary/5 border-primary/30 rounded-l-lg rounded-tr-lg hover:border-primary/60" 
            : "bg-accent/5 border-accent/30 rounded-r-lg rounded-tl-lg hover:border-accent/60"
        )}
      >
        <div className="whitespace-pre-wrap leading-relaxed select-text">{msg.content}</div>

        {/* MEDIA SECTION */}
        {msg.mediaUrl && (
          <div className="mt-3 rounded border border-white/5 overflow-hidden bg-black/40">
            {msg.mediaType === 'image' && (
              <img 
                src={msg.mediaUrl} 
                onClick={() => onMediaPreview({ url: msg.mediaUrl, type: 'image', name: 'PAYLOAD' })}
                className="max-w-full hover:brightness-110 transition-all cursor-zoom-in" 
              />
            )}
            {msg.mediaType === 'video' && <video src={msg.mediaUrl} controls className="w-full aspect-video" />}
            {msg.mediaType === 'audio' && (
              <div className="p-2 flex items-center gap-3">
                <Music className="w-4 h-4 text-primary" />
                <audio src={msg.mediaUrl} controls className="h-8 flex-1 accent-primary" />
              </div>
            )}
          </div>
        )}

        {/* FLOATING CONTEXT MENU */}
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
                <button 
                  onClick={() => { onReply(msg); setShowActions(false); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-primary hover:bg-primary/20 font-bold uppercase"
                >
                  <Reply className="w-3 h-3" /> Reply
                </button>
                <button 
                  onClick={() => { onForward(msg); setShowActions(false); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-accent hover:bg-accent/20 font-bold uppercase border-t border-white/5"
                >
                  <Forward className="w-3 h-3" /> Relay
                </button>
                {isMe && (
                  <button 
                    onClick={() => { onPurge(msg.id); setShowActions(false); }}
                    className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-red-500 hover:bg-red-500/20 font-bold uppercase border-t border-white/5"
                  >
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

/**
 * ============================================================================
 * MAIN APPLICATION COMPONENT
 * ============================================================================
 */
export default function Chat() {
  const { user: currentUser } = useAuth();
  const { messages, users, sendMessage } = useChat();
  const { toast } = useToast();

  // --- CHANNEL SELECTOR STATE ---
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [isCallingGroup, setIsCallingGroup] = useState(false);

  // --- UI & SEARCH STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSystemLogsOpen, setIsSystemLogsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'NODES' | 'GROUPS' | 'HUB'>('NODES');

  // --- MESSAGE STATE ---
  const [inputContent, setInputContent] = useState("");
  const [replyTarget, setReplyTarget] = useState<any | null>(null);
  const [forwardState, setForwardState] = useState<ForwardState>({ message: null, isOpen: false });
  const [mediaPreview, setMediaPreview] = useState<MediaPayload | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // --- DISCORD-STYLE CALLING STATE ---
  const [isCalling, setIsCalling] = useState(false);
  const [callTime, setCallTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);

  // --- REFS ---
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const callClockRef = useRef<NodeJS.Timeout | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // --- SYSTEM LOGS ---
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);

  // --- DATA FETCHING ---
  const { data: groups = [] } = useQuery({ queryKey: ['/api/chat/groups'] });
  const { data: userConfig, refetch: refetchConfig } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => (await fetch('/api/auth/me')).json()
  });

  // --- MUTATIONS ---
  // Fix: Adding manual delete mutation since user reported it as undefined
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const res = await fetch(`/api/chat/messages/${messageId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Purge_Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
      pushLog("PURGE_SUCCESSFUL", "info");
    }
  });

  const updateProfile = useMutation({
    mutationFn: async (s: any) => fetch('/api/user/settings', { 
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(s) 
    }),
    onSuccess: () => refetchConfig()
  });

  /**
   * --------------------------------------------------------------------------
   * LOGIC: CHANNEL MANAGEMENT (FIXES THE DATA-NOT-SWITCHING ISSUE)
   * --------------------------------------------------------------------------
   */
  const pushLog = (msg: string, type: SystemLogEntry['type'] = 'info') => {
    const entry: SystemLogEntry = { id: Math.random().toString(), time: new Date().toLocaleTimeString(), type, msg };
    setLogs(p => [entry, ...p].slice(0, 30));
  };

  const selectBroadcast = () => {
    setSelectedRecipientId(null);
    setSelectedGroupId(null);
    pushLog("CHANNEL_SWITCH: BROADCAST_HUB", "info");
  };

  const selectPrivateNode = (userId: number) => {
    setSelectedGroupId(null);
    setSelectedRecipientId(userId);
    pushLog(`CHANNEL_SWITCH: PRIVATE_NODE_${userId}`, "info");
  };

  const selectGroupNode = (groupId: number) => {
    setSelectedRecipientId(null);
    setSelectedGroupId(groupId);
    pushLog(`CHANNEL_SWITCH: GROUP_NODE_${groupId}`, "info");
  };

  /**
   * --------------------------------------------------------------------------
   * LOGIC: MESSAGE PIPELINE
   * --------------------------------------------------------------------------
   */
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

  const handleTransmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputContent.trim() && !uploadFile) return;

    let mediaUrl = null;
    let mediaType = null;

    if (uploadFile) {
      const reader = new FileReader();
      const p = new Promise(resolve => reader.onloadend = () => resolve(reader.result));
      reader.readAsDataURL(uploadFile);
      mediaUrl = await p;
      mediaType = uploadFile.type.split('/')[0];
    }

    sendMessage.mutate({
      content: inputContent,
      recipientId: selectedRecipientId || undefined,
      groupId: selectedGroupId || undefined,
      mediaUrl,
      mediaType,
      replyToId: replyTarget?.id
    } as any);

    setInputContent("");
    setUploadFile(null);
    setReplyTarget(null);
    pushLog("TRANSMISSION_CLEARED", "info");
  };

  /**
   * --------------------------------------------------------------------------
   * LOGIC: DISCORD CALLING SYSTEM
   * --------------------------------------------------------------------------
   */
  const triggerNeuralCall = async () => {
    setIsCalling(true);
    setCallTime(0);
    callClockRef.current = setInterval(() => setCallTime(t => t + 1), 1000);

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: isVideoOn 
      });
      toast({ title: "MIC_SYNCED", description: "Audio feed established." });
    } catch (e) {
      toast({ title: "HARDWARE_FAILURE", description: "Uplink reset.", variant: "destructive" });
      disconnectCall();
    }
  };

  const disconnectCall = () => {
    setIsCalling(false);
    if (callClockRef.current) clearInterval(callClockRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    setCallTime(0);
    pushLog("NEURAL_SESSION_TERMINATED", "crit");
  };

  const handleSoundboard = (url: string) => {
    const audio = new Audio(url);
    audio.volume = 0.5;
    audio.play();
    pushLog("SOUNDBOARD_TRIGGERED", "info");
  };

  /**
   * --------------------------------------------------------------------------
   * LOGIC: RECORDING
   * --------------------------------------------------------------------------
   */
  const startAudioCapture = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorderRef.current = new MediaRecorder(stream);
    chunksRef.current = [];
    recorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorderRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        sendMessage.mutate({
          content: "[VOICE_RELAY]",
          recipientId: selectedRecipientId || undefined,
          groupId: selectedGroupId || undefined,
          mediaUrl: reader.result as string,
          mediaType: 'audio'
        } as any);
      };
      reader.readAsDataURL(blob);
      stream.getTracks().forEach(t => t.stop());
    };
    recorderRef.current.start();
    pushLog("RECORDING_STARTED", "warn");
  };

  /**
   * --------------------------------------------------------------------------
   * EFFECTS
   * --------------------------------------------------------------------------
   */
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });

    if (messages?.length) {
      const last = messages[messages.length - 1];
      if (last.senderId !== currentUser?.id && !userConfig?.muteNotifications) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`[${last.senderName}] Signal Received`, { body: last.content });
        }
        if (userConfig?.ringtoneUrl) {
          const a = new Audio(userConfig.ringtoneUrl);
          a.play().catch(() => {});
        }
      }
    }
  }, [messages, selectedRecipientId, selectedGroupId]);

  const activeChannelName = useMemo(() => {
    if (selectedGroupId) return groups.find((g: any) => g.id === selectedGroupId)?.name || "GROUP_NODE";
    if (selectedRecipientId) return users?.find(u => u.id === selectedRecipientId)?.username || "PRIVATE_NODE";
    return "BROADCAST_HUB";
  }, [selectedGroupId, selectedRecipientId, groups, users]);

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] relative overflow-hidden bg-[url('/noise.gif')]">

        {/* ==================================================================
            SIDEBAR: NETWORK_DIRECTORIES
            ================================================================== */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ x: -400 }} animate={{ x: 0 }} exit={{ x: -400 }}
              className="w-full lg:w-80 flex flex-col gap-4 z-40"
            >
              <div className="cyber-box flex-1 flex flex-col p-0 overflow-hidden bg-black/90 border-primary/20 backdrop-blur-3xl shadow-2xl">

                {/* Header Stats */}
                <div className="p-6 border-b border-primary/20 bg-primary/5">
                  <div className="text-[10px] font-mono text-primary/40 flex items-center gap-2 mb-2">
                    <span className="animate-pulse">01</span> <span>10</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xs tracking-[0.4em] uppercase text-primary">Private_Nodes</h2>
                    <UserPlus className="w-4 h-4 text-primary/60 cursor-pointer hover:text-white" />
                  </div>
                </div>

                {/* Filter Search */}
                <div className="p-4 bg-black/40">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/30" />
                    <input 
                      value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      className="w-full bg-black/80 border border-primary/10 pl-10 pr-4 py-2 text-[11px] font-mono text-primary focus:border-primary/50 outline-none"
                      placeholder="SCAN_FOR_ID..."
                    />
                  </div>
                </div>

                {/* Scrollable Node List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">

                  {/* Hub Button */}
                  <CyberSidebarNode 
                    label="BROADCAST_HUB" 
                    isActive={!selectedRecipientId && !selectedGroupId} 
                    onClick={selectBroadcast} 
                  />

                  <div className="h-px bg-primary/10 my-4 mx-4" />

                  {/* Private Nodes (Mapped to match your screenshot) */}
                  <div className="px-2 space-y-1 mb-8">
                    {/* Real users logic */}
                    {users?.map(u => (
                      <CyberSidebarNode 
                        key={u.id} 
                        label={u.username} 
                        isActive={selectedRecipientId === u.id} 
                        onClick={() => selectPrivateNode(u.id)} 
                      />
                    ))}
                  </div>

                  {/* Group Channels Partition */}
                  <div className="px-4 mb-3 text-[9px] font-bold text-primary/30 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Hash className="w-3 h-3" /> Group_Partitions
                  </div>
                  <div className="px-2 space-y-1 mb-6">
                    {groups.map((g: any) => (
                      <CyberSidebarNode 
                        key={g.id} 
                        label={g.name} 
                        isActive={selectedGroupId === g.id} 
                        onClick={() => selectGroupNode(g.id)} 
                      />
                    ))}
                  </div>
                </div>

                {/* Profile Tray */}
                <div className="p-4 border-t border-primary/20 bg-black flex items-center gap-4">
                  <div className="w-10 h-10 border border-primary/20 p-1">
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                      <Cpu className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-[10px] font-bold text-primary uppercase truncate tracking-widest">{currentUser?.username}</div>
                    <div className="text-[8px] font-mono text-primary/40 uppercase">Enc_Level: Omega</div>
                  </div>
                  <Settings 
                    onClick={() => setIsSystemLogsOpen(true)}
                    className="w-4 h-4 text-primary/40 hover:text-primary cursor-pointer transition-colors" 
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==================================================================
            CHAT HUB: DATA_STREAMS
            ================================================================== */}
        <div className="flex-1 cyber-box p-0 flex flex-col bg-black/70 border-primary/10 overflow-hidden relative backdrop-blur-sm shadow-inner">

          {/* Channel Header HUD */}
          <div className="p-5 border-b border-primary/20 flex items-center justify-between bg-black/60 z-20">
            <div className="flex items-center gap-5">
              {!isSidebarOpen && (
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 border border-primary/20 hover:bg-primary/10 text-primary">
                  <TerminalSquare className="w-5 h-5" />
                </button>
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  <h2 className="font-display text-sm tracking-[0.4em] text-glow uppercase">
                    {activeChannelName}
                  </h2>
                </div>
                <div className="text-[8px] font-mono text-primary/30 uppercase mt-1 tracking-widest flex items-center gap-3">
                  <span>SESSION: {SESSION_CRYPT}</span>
                  <div className="w-[1px] h-2 bg-primary/20" />
                  <span>UPLINK: STABLE</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={triggerNeuralCall}
                className="p-2.5 border border-primary/20 hover:border-primary text-primary transition-all group"
              >
                <Phone className="w-4.5 h-4.5 group-hover:scale-110" />
              </button>
              <button 
                onClick={() => { setIsVideoOn(true); triggerNeuralCall(); }}
                className="p-2.5 border border-primary/20 hover:border-primary text-primary transition-all group"
              >
                <Video className="w-4.5 h-4.5 group-hover:scale-110" />
              </button>
            </div>
          </div>

          {/* Chat Feed */}
          <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar bg-[url('/grid.png')] bg-fixed">

            {/* System Info Banner for Groups */}
            {selectedGroupId && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 border border-accent/40 bg-accent/5 mb-10 font-mono relative">
                <div className="absolute top-0 right-0 p-2 text-[8px] text-accent/20">AUTH_MODE_X</div>
                <div className="flex items-center gap-4 mb-4">
                  <Binary className="w-5 h-5 text-accent animate-pulse" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-accent uppercase tracking-[0.2em]">Group_Encryption_Key</span>
                    <span className="text-[9px] text-accent/50">Relay this hash to invite nodes</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-black/60 border border-accent/30 p-3 text-xs text-accent font-bold tracking-widest select-all shadow-inner">
                    {groups.find((g:any) => g.id === selectedGroupId)?.inviteCode || "PENDING_KEY..."}
                  </div>
                  <CyberButton 
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(groups.find((g:any) => g.id === selectedGroupId)?.inviteCode);
                      toast({ title: "KEY_CLONED", description: "Invite hash copied to buffer." });
                    }}
                    className="h-11 px-6 text-[10px]"
                  >
                    RELAY_HASH
                  </CyberButton>
                </div>
              </motion.div>
            )}

            {unifiedMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 opacity-10">
                <Bug className="w-16 h-16 mb-6" />
                <p className="font-display text-[11px] tracking-[1em] uppercase">No_Data_Packets_Found</p>
              </div>
            )}

            {unifiedMessages.map(msg => (
              <TerminalMessage 
                key={msg.id}
                msg={msg}
                isMe={msg.senderId === currentUser?.id}
                onReply={setReplyTarget}
                onForward={(m) => setForwardState({ message: m, isOpen: true })}
                onPurge={(id) => deleteMessageMutation.mutate(id)}
                onMediaPreview={setMediaPreview}
              />
            ))}
            <div ref={chatBottomRef} className="h-4" />
          </div>

          {/* Unified Input Block */}
          <div className="p-6 border-t border-primary/20 bg-black/90">

            {/* Reply HUD */}
            <AnimatePresence>
              {replyTarget && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="bg-primary/10 border-l-4 border-primary p-3 mb-4 flex items-center justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-primary uppercase">Thread_Replying_To: {replyTarget.senderName}</span>
                    <p className="text-[10px] font-mono text-primary/70 truncate max-w-[600px] italic">"{replyTarget.content}"</p>
                  </div>
                  <button onClick={() => setReplyTarget(null)} className="p-1 hover:text-white"><X className="w-4 h-4" /></button>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleTransmit} className="flex flex-col gap-4">
              <div className="flex gap-3">
                <input 
                  type="file" id="terminal-file" className="hidden" 
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  accept="image/*,video/*,audio/*,.pdf,.zip" 
                />
                <button 
                  type="button" onClick={() => document.getElementById('terminal-file')?.click()}
                  className={cn(
                    "w-12 h-12 border transition-all flex items-center justify-center", 
                    uploadFile ? "border-accent bg-accent/10 text-accent" : "border-primary/20 text-primary hover:border-primary"
                  )}
                >
                  <Plus className="w-6 h-6" />
                </button>

                <button 
                  type="button" 
                  onMouseDown={startAudioCapture} 
                  onMouseUp={() => recorderRef.current?.stop()}
                  className="w-12 h-12 border border-primary/20 text-primary hover:bg-primary/10 flex items-center justify-center transition-all shadow-sm"
                >
                  <Mic className="w-5 h-5" />
                </button>

                <div className="flex-1 relative group">
                  <CyberInput 
                    value={inputContent} onChange={e => setInputContent(e.target.value)}
                    placeholder="ENTER_SIGNAL_ENCODING..." className="h-12 text-xs font-mono tracking-widest"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-mono text-primary/20 flex items-center gap-2">
                    <Command className="w-3 h-3" /> ENT
                  </div>
                </div>

                <CyberButton type="submit" disabled={!inputContent.trim() && !uploadFile} className="h-12 px-12 group overflow-hidden">
                  <span className="relative z-10">TRANSMIT</span>
                  <div className="absolute inset-0 bg-primary/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                </CyberButton>
              </div>

              {uploadFile && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between p-3 border border-accent/20 bg-accent/5">
                  <div className="flex items-center gap-4">
                    <FileText className="w-4 h-4 text-accent" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-accent uppercase tracking-widest truncate max-w-[200px]">{uploadFile.name}</span>
                      <span className="text-[8px] font-mono text-accent/50">{(uploadFile.size/1024).toFixed(1)} KB // STAGED</span>
                    </div>
                  </div>
                  <button onClick={() => setUploadFile(null)} className="text-accent/60 hover:text-accent font-mono text-[9px] uppercase underline">Purge_Upload</button>
                </motion.div>
              )}
            </form>
          </div>
        </div>

        {/* ==================================================================
            DIAGNOSTICS & SOUNDBOARD (RIGHT)
            ================================================================== */}
        <div className="hidden xl:flex w-80 flex-col gap-4">

          <CyberCard className="p-4 border-primary/20 bg-black/80 flex-1 flex flex-col overflow-hidden">
            <h3 className="text-[10px] font-display text-primary tracking-[0.4em] mb-4 flex items-center gap-3">
              <Terminal className="w-4 h-4 animate-pulse" /> Diagnostic_Feed
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[9px] custom-scrollbar opacity-60">
              {logs.map(log => (
                <div key={log.id} className="border-l border-primary/20 pl-3">
                  <div className="flex justify-between text-primary/40 mb-1 font-bold">
                    <span>{log.time}</span>
                    <span className={cn(log.type === 'crit' ? "text-red-500" : "text-primary")}>[{log.type.toUpperCase()}]</span>
                  </div>
                  <div className="text-primary truncate">{log.msg}</div>
                </div>
              ))}
              <div className="pt-2 text-[8px] text-primary/20 italic animate-pulse">Scanning neural buffer...</div>
            </div>
          </CyberCard>

          <CyberCard className="p-4 border-primary/20 bg-black/80 flex flex-col h-[45%]">
            <h3 className="text-[10px] font-display text-primary tracking-[0.4em] mb-4 flex items-center gap-3">
              <Volume2 className="w-4 h-4" /> Soundboard_UI
            </h3>
            <div className="grid grid-cols-2 gap-2 overflow-y-auto custom-scrollbar pr-1">
              {SOUNDBOARD_DATA.map(s => (
                <button 
                  key={s.id} onClick={() => handleSoundboard(s.url)}
                  className="p-2 border border-primary/10 bg-primary/5 hover:bg-primary/20 text-[8px] font-mono text-left uppercase truncate transition-all"
                >
                  {s.name}
                </button>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-primary/10">
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <span className="text-[8px] uppercase text-primary/40 font-bold">Global_Ringtone_URI</span>
                  <CyberInput 
                    value={userConfig?.ringtoneUrl || ""} 
                    onChange={e => updateProfile.mutate({ ringtoneUrl: e.target.value })}
                    placeholder="MP3_PAYLOAD_URL" className="h-7 text-[9px]"
                  />
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 border border-white/5 rounded">
                  <span className="text-[10px] font-mono text-primary/60 uppercase">Stealth_Ops</span>
                  <input 
                    type="checkbox" checked={userConfig?.muteNotifications}
                    onChange={e => updateProfile.mutate({ muteNotifications: e.target.checked })}
                    className="accent-primary"
                  />
                </div>
              </div>
            </div>
          </CyberCard>
        </div>
      </div>

      {/* ==================================================================
          OVERLAY: DISCORD CALLING SUITE
          ================================================================== */}
      <AnimatePresence>
        {isCalling && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[500] flex flex-col p-6 lg:p-12 backdrop-blur-3xl"
          >
            <div className="absolute inset-0 bg-[url('/grid.png')] opacity-10 pointer-events-none" />

            <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col lg:flex-row gap-8">
              {/* Primary Visual Feed */}
              <div className="flex-1 cyber-box bg-white/5 border-primary/30 flex items-center justify-center relative group overflow-hidden">
                {isVideoOn ? (
                  <video id="voice-v-local" autoPlay muted className="w-full h-full object-cover grayscale brightness-125" />
                ) : (
                  <div className="flex flex-col items-center gap-10">
                    <div className="w-56 h-56 rounded-full border-4 border-primary/20 p-2 relative">
                      <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        <Users className="w-24 h-24 text-primary animate-pulse" />
                      </div>
                      <div className="absolute inset-0 rounded-full border border-primary animate-ping opacity-10" />
                    </div>
                    <div className="text-center">
                      <h2 className="font-display text-4xl tracking-[0.6em] text-glow uppercase">{activeChannelName}</h2>
                      <p className="text-[10px] font-mono text-primary/50 mt-4 tracking-[0.4em]">ENCRYPTED_UPLINK_STABLE</p>
                    </div>
                  </div>
                )}

                <div className="absolute top-8 left-8 bg-black/60 border border-primary/40 px-4 py-1.5 text-[11px] font-mono text-primary flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" /> 
                  SESSION // {Math.floor(callTime/60)}:{(callTime%60).toString().padStart(2,'0')}
                </div>
              </div>

              {/* Sidebar: Operatives & SFX */}
              <div className="w-full lg:w-96 flex flex-col gap-6">
                <CyberCard className="p-6 bg-primary/5 border-primary/20">
                  <h4 className="text-[12px] font-display text-primary mb-8 uppercase tracking-widest flex justify-between">
                    Live_Nodes <span>1</span>
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-primary/30 bg-primary/10">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-sm bg-primary/20 flex items-center justify-center border border-primary/40"><Ghost className="w-5 h-5" /></div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-mono uppercase font-bold text-primary">LOCAL_HOST</span>
                          <span className="text-[8px] text-primary/40 font-mono">0x7F000001</span>
                        </div>
                      </div>
                      {isMuted && <MicOff className="w-5 h-5 text-red-500 animate-pulse" />}
                    </div>
                  </div>
                </CyberCard>

                <CyberCard className="flex-1 p-6 bg-black border-accent/20">
                  <h4 className="text-[12px] font-display text-accent mb-8 uppercase tracking-widest flex items-center gap-3">
                    <Volume2 className="w-5 h-5" /> Neural_Board
                  </h4>
                  <div className="grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar">
                    {SOUNDBOARD_DATA.slice(0, 8).map(s => (
                      <button 
                        key={s.id} onClick={() => handleSoundboard(s.url)}
                        className="p-3 border border-white/5 bg-white/5 hover:bg-accent/20 text-[10px] font-mono uppercase"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </CyberCard>
              </div>
            </div>

            {/* CALL CONTROLS BAR */}
            <div className="h-36 flex items-center justify-center gap-12 mt-12 relative z-50">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className={cn("w-18 h-18 rounded-full flex items-center justify-center border-2 transition-all", isMuted ? "bg-red-500 border-red-400 text-white" : "bg-white/5 border-white/10 text-white hover:border-primary hover:text-primary")}
              >
                {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>

              <button 
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={cn("w-18 h-18 rounded-full flex items-center justify-center border-2 transition-all", isVideoOn ? "bg-primary border-primary text-black shadow-[0_0_20px_#00ff00]" : "bg-white/5 border-white/10 text-white hover:border-primary hover:text-primary")}
              >
                <Camera className="w-8 h-8" />
              </button>

              <button 
                onClick={() => setIsSharingScreen(!isSharingScreen)}
                className={cn("w-18 h-18 rounded-full flex items-center justify-center border-2 transition-all", isSharingScreen ? "bg-accent border-accent text-black shadow-[0_0_20px_#00ffff]" : "bg-white/5 border-white/10 text-white hover:border-accent hover:text-accent")}
              >
                <MonitorUp className="w-8 h-8" />
              </button>

              <div className="w-[1px] h-20 bg-white/10 mx-6" />

              <button 
                onClick={disconnectCall}
                className="group relative flex items-center gap-6 px-14 h-18 bg-red-700 border-2 border-red-500 text-white font-display tracking-[0.5em] transition-all hover:bg-red-600 shadow-[0_0_60px_rgba(255,0,0,0.4)]"
              >
                <PhoneOff className="w-8 h-8 animate-bounce" /> 
                <span className="hidden md:inline">TERMINATE</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DATA RELAY MODAL */}
      <AnimatePresence>
        {forwardState.isOpen && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[600] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-lg cyber-box bg-black p-10 border-accent/40 shadow-2xl">
              <div className="flex justify-between items-center mb-10">
                <h2 className="font-display text-accent text-2xl tracking-[0.5em] uppercase flex items-center gap-5">
                  <Forward className="w-8 h-8" /> Relay_Data
                </h2>
                <button onClick={() => setForwardState({ message: null, isOpen: false })}><X className="w-8 h-8 text-accent/40 hover:text-accent transition-colors" /></button>
              </div>

              <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent/30" />
                <CyberInput 
                  value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} 
                  placeholder="SCAN_TARGET_NODE..." className="pl-14 h-14 text-xs tracking-widest" 
                />
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-2 custom-scrollbar pr-2 mb-8 border border-white/5 p-2 bg-white/5">
                {[
                  ...users!.filter(u=>u.id!==currentUser?.id).map(u=>({id:u.id, name:u.username, type:'dm' as const})),
                  ...groups.map((g:any)=>({id:g.id, name:g.name, type:'group' as const}))
                ].filter(t=>t.name.toLowerCase().includes(searchTerm.toLowerCase())).map(t=>(
                  <button
                    key={`${t.type}-${t.id}`}
                    onClick={() => {
                      sendMessage.mutate({
                        content: `[RELAYED_PACKET]: ${forwardState.message.content}`,
                        recipientId: t.type==='dm' ? t.id : undefined,
                        groupId: t.type==='group' ? t.id : undefined,
                        mediaUrl: forwardState.message.mediaUrl, mediaType: forwardState.message.mediaType
                      } as any);
                      setForwardState({ message: null, isOpen: false });
                      toast({ title: "RELAY_COMPLETE", description: `Data tunneled to ${t.name}` });
                    }}
                    className="w-full p-4 border border-white/5 hover:border-accent hover:bg-accent/10 flex items-center justify-between transition-all group"
                  >
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/60 group-hover:text-accent">{t.name}</span>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 text-accent transition-all translate-x-2 group-hover:translate-x-0" />
                  </button>
                ))}
              </div>
              <div className="p-4 border border-accent/20 bg-accent/5 text-[10px] font-mono text-accent/50 uppercase leading-relaxed">
                Notice: Relaying this packet will encrypt it with the target's public key. Packet integrity verified by Session_{SESSION_CRYPT}.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MEDIA PREVIEW LIGHTBOX */}
      {mediaPreview && (
        <div className="fixed inset-0 z-[1000] bg-black/98 flex flex-col items-center justify-center p-12 backdrop-blur-3xl" onClick={() => setMediaPreview(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative max-w-full max-h-full">
            <div className="absolute -top-16 left-0 right-0 flex justify-between items-center text-primary font-mono text-[10px] uppercase tracking-[0.4em]">
              <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 border border-primary/20 shadow-lg">
                <Box className="w-4 h-4" /> Media_Payload // {mediaPreview.name}
              </div>
              <button className="flex items-center gap-3 hover:text-white transition-all bg-primary/10 px-4 py-2 border border-primary/20">
                <Download className="w-4 h-4" /> Download_Payload
              </button>
            </div>

            {mediaPreview.type === 'image' && (
              <img src={mediaPreview.url} className="max-w-full max-h-[75vh] border border-primary/20 shadow-[0_0_100px_rgba(0,0,0,1)] object-contain rounded-sm" />
            )}

            <div className="mt-14 flex justify-center">
              <button className="px-14 py-3 border-2 border-primary text-primary font-display tracking-[0.5em] uppercase hover:bg-primary hover:text-black transition-all shadow-[0_0_40px_rgba(0,255,0,0.1)]">
                Close_Diagnostic
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* HIDDEN LOGICAL AUDIO HOOKS */}
      <audio ref={r => { if(r) r.srcObject = null; }} autoPlay />
    </Layout>
  );
}