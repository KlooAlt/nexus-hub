import { useState } from "react";
import { Layout } from "@/components/Layout";
import { CyberInput } from "@/components/CyberInput";
import { CyberButton } from "@/components/CyberButton";
import { Search, Globe, Shield, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useHistory } from "@/hooks/use-history";

export default function Proxy() {
  const [url, setUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const { addEntry } = useHistory();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    // Basic URL validation/fix
    let target = url;
    if (!target.startsWith('http')) {
      target = `https://${target}`;
    }
    
    setActiveUrl(target);
    addEntry.mutate({ url: target, query: "Direct Navigation" });
  };

  return (
    <Layout>
      <div className="flex flex-col h-full space-y-6">
        {/* Search Bar */}
        <div className="cyber-box p-4">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <CyberInput 
                label="TARGET_URL"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
              />
            </div>
            <CyberButton type="submit" className="h-[50px] md:w-32">
              <Search className="w-4 h-4 mr-2 inline" />
              GO
            </CyberButton>
          </form>
        </div>

        {/* Browser Area */}
        <div className="flex-1 cyber-box p-0 overflow-hidden relative flex flex-col">
          <div className="h-8 bg-black/50 border-b border-primary/20 flex items-center px-4 gap-4">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            <div className="flex-1 bg-black/30 h-5 rounded text-xs font-mono text-muted-foreground flex items-center px-2 truncate">
              {activeUrl || "NO_TARGET_SELECTED"}
            </div>
          </div>

          <div className="flex-1 relative bg-white">
            {activeUrl ? (
              <iframe 
                src={activeUrl} // Note: This will likely be blocked by X-Frame-Options on many major sites without a complex backend proxy
                className="w-full h-full border-none bg-white"
                title="Proxy View"
                sandbox="allow-same-origin allow-scripts allow-forms"
              />
            ) : (
              <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-primary space-y-6">
                <Globe className="w-24 h-24 opacity-50 animate-pulse" />
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-display tracking-widest">SECURE_BROWSER_READY</h2>
                  <p className="text-muted-foreground font-mono">ENTER URL TO BEGIN ENCRYPTED SESSION</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full px-8 mt-8">
                  <div className="border border-primary/20 p-4 bg-primary/5 text-center">
                    <Shield className="w-8 h-8 mx-auto mb-2 text-primary/70" />
                    <div className="text-xs font-bold mb-1">IP MASKED</div>
                    <div className="text-[10px] text-muted-foreground">Origin concealed via multi-hop routing</div>
                  </div>
                  <div className="border border-primary/20 p-4 bg-primary/5 text-center">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-primary/70" />
                    <div className="text-xs font-bold mb-1">NO LOGS</div>
                    <div className="text-[10px] text-muted-foreground">Session data wiped on termination</div>
                  </div>
                  <div className="border border-primary/20 p-4 bg-primary/5 text-center">
                    <Globe className="w-8 h-8 mx-auto mb-2 text-primary/70" />
                    <div className="text-xs font-bold mb-1">ANY SITE</div>
                    <div className="text-[10px] text-muted-foreground">Bypass regional restrictions</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Scanline overlay for aesthetic */}
            <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
