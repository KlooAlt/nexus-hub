import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { CyberInput } from "@/components/CyberInput";
import { CyberButton } from "@/components/CyberButton";
import { Lock, Terminal, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function Login() {
  const [key, setKey] = useState("");
  const [username, setUsername] = useState("");
  const { login, isLoggingIn, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) setLocation("/proxy");
  }, [user]);

  if (user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ serialKey: key, username: username || "Anon" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Matrix-like effect */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 text-primary font-mono text-xs">0101010101</div>
        <div className="absolute bottom-20 right-20 text-primary font-mono text-xs">1010101001</div>
        <div className="absolute top-1/2 left-1/4 text-primary font-mono text-xs">SYSTEM_LOCKED</div>
      </div>

      <div className="w-full max-w-md">
        <div className="cyber-box p-8 space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-2">
            <div className="inline-block p-4 border border-primary/50 rounded-full bg-primary/10 mb-4 shadow-[0_0_20px_rgba(0,255,0,0.2)]">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-display text-primary tracking-widest">SECURE_LOGIN</h1>
            <p className="text-muted-foreground font-mono text-sm">ENTER AUTHENTICATION CREDENTIALS</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <CyberInput
              label="IDENTITY_HANDLE (OPTIONAL)"
              placeholder="Enter username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-black/80"
            />
            
            <CyberInput
              label="ACCESS_VECTOR_KEY"
              type="password"
              placeholder="XXXX-XXXX-XXXX"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="bg-black/80 tracking-widest"
              required
            />

            <div className="pt-4">
              <CyberButton 
                type="submit" 
                className="w-full py-4 text-lg"
                isLoading={isLoggingIn}
              >
                <span className="flex items-center justify-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  INITIATE_SESSION
                </span>
              </CyberButton>
            </div>
          </form>

          <div className="border-t border-border pt-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Terminal className="w-4 h-4" />
              <span>SYSTEM: AWAITING INPUT...</span>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center text-xs text-muted-foreground/50 font-mono">
          UNAUTHORIZED ACCESS IS A FELONY UNDER SECTOR 7 JURISDICTION.
        </div>
      </div>
    </div>
  );
}
