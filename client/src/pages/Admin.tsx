import { useState } from "react";
import { Layout } from "@/components/Layout";
import { CyberInput } from "@/components/CyberInput";
import { CyberButton } from "@/components/CyberButton";
import { CyberCard } from "@/components/CyberCard";
import { useAdminKeys } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";
import { ShieldAlert, Plus, Trash2, Key } from "lucide-react";
import { format } from "date-fns";

export default function Admin() {
  const { user } = useAuth();
  const { keys, generateKey, deleteKey } = useAdminKeys();
  const [duration, setDuration] = useState("60");
  const [type, setType] = useState<"limited" | "permanent">("limited");

  if (user?.role !== "owner") {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center space-y-4">
            <ShieldAlert className="w-24 h-24 text-destructive mx-auto animate-pulse" />
            <h1 className="text-4xl font-display text-destructive">ACCESS DENIED</h1>
            <p className="font-mono text-muted-foreground">INSUFFICIENT CLEARANCE LEVEL</p>
          </div>
        </div>
      </Layout>
    );
  }

  const handleGenerate = () => {
    generateKey.mutate({
      type,
      durationMinutes: type === "limited" ? parseInt(duration) : undefined,
    });
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Generator Panel */}
        <div className="lg:col-span-1 space-y-6">
          <CyberCard title="KEY_GENERATOR" className="h-full">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-mono uppercase">Access Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setType("limited")}
                    className={`flex-1 py-2 border text-xs font-mono uppercase transition-all ${
                      type === "limited" 
                        ? "border-primary bg-primary/20 text-primary" 
                        : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    Temporary
                  </button>
                  <button
                    onClick={() => setType("permanent")}
                    className={`flex-1 py-2 border text-xs font-mono uppercase transition-all ${
                      type === "permanent" 
                        ? "border-accent bg-accent/20 text-accent" 
                        : "border-muted-foreground/30 text-muted-foreground hover:border-accent/50"
                    }`}
                  >
                    Permanent
                  </button>
                </div>
              </div>

              {type === "limited" && (
                <CyberInput
                  label="DURATION (MINUTES)"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              )}

              <CyberButton 
                onClick={handleGenerate} 
                className="w-full"
                isLoading={generateKey.isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                MINT_KEY
              </CyberButton>

              <div className="p-4 border border-yellow-500/30 bg-yellow-500/5 mt-4">
                <div className="text-yellow-500 text-xs font-bold mb-1 flex items-center gap-2">
                  <ShieldAlert className="w-3 h-3" />
                  SECURITY WARNING
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Generated keys grant full system access for the specified duration. 
                  Distribution should be limited to trusted operatives only.
                </p>
              </div>
            </div>
          </CyberCard>
        </div>

        {/* Keys List */}
        <div className="lg:col-span-2">
          <CyberCard title="ACTIVE_VECTORS" className="h-full min-h-[500px] flex flex-col">
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-primary/20 text-xs font-mono uppercase text-muted-foreground">
                    <th className="p-4 font-normal">Key String</th>
                    <th className="p-4 font-normal">Type</th>
                    <th className="p-4 font-normal">Status</th>
                    <th className="p-4 font-normal">Created</th>
                    <th className="p-4 font-normal text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {keys?.map((key) => (
                    <tr key={key.id} className="group hover:bg-white/5 transition-colors font-mono text-sm">
                      <td className="p-4 text-primary font-bold tracking-widest flex items-center gap-2">
                        <Key className="w-3 h-3 opacity-50" />
                        {key.key}
                      </td>
                      <td className="p-4 uppercase">
                        <span className={`px-2 py-1 text-[10px] border ${
                          key.type === 'permanent' 
                            ? 'border-accent text-accent bg-accent/10' 
                            : 'border-blue-500 text-blue-500 bg-blue-500/10'
                        }`}>
                          {key.type}
                          {key.durationMinutes ? ` (${key.durationMinutes}m)` : ''}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`flex items-center gap-2 ${key.isUsed ? 'text-red-500' : 'text-green-500'}`}>
                          <div className={`w-2 h-2 rounded-full ${key.isUsed ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
                          {key.isUsed ? 'DEPLETED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {key.createdAt && format(new Date(key.createdAt), "MM/dd HH:mm")}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => deleteKey.mutate(key.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-2"
                          title="Revoke Key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!keys?.length && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                        NO ACTIVE KEYS FOUND
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CyberCard>
        </div>
      </div>
    </Layout>
  );
}
