import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Terminal, Globe, MessageSquare, History, ShieldAlert, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CyberButton } from "./CyberButton";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/proxy", label: "NET_PROXY", icon: Globe },
    { href: "/chat", label: "SECURE_COMMS", icon: MessageSquare },
    { href: "/history", label: "ACCESS_LOGS", icon: History },
  ];

  if (user?.role === "owner") {
    navItems.push({ href: "/admin", label: "SYS_ADMIN", icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden border-b border-border p-4 flex justify-between items-center bg-black/80 backdrop-blur">
        <div className="flex items-center gap-2 text-primary">
          <Terminal className="w-6 h-6" />
          <span className="font-display font-bold">CYBER_PROXY</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-primary">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-black/90 border-r border-border transform transition-transform duration-300 md:relative md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Terminal className="w-8 h-8" />
            <span className="font-display font-bold text-xl tracking-widest">NEXUS</span>
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            v2.0.45 [SECURE]
          </div>
        </div>

        <div className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-none border border-transparent transition-all duration-200 uppercase text-sm tracking-wider font-bold",
                isActive 
                  ? "border-primary bg-primary/10 text-primary shadow-[0_0_10px_rgba(0,255,0,0.2)]" 
                  : "text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5"
              )}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
              </Link>
            );
          })}
        </div>

        <div className="absolute bottom-0 w-full p-4 border-t border-border bg-black/50">
          <div className="mb-4 px-2">
            <div className="text-xs text-muted-foreground mb-1">LOGGED IN AS:</div>
            <div className="font-mono text-primary truncate">{user?.username}</div>
            <div className="text-[10px] text-accent mt-1 uppercase">
              [{user?.role === 'owner' ? 'ROOT ACCESS' : 'USER LEVEL'}]
            </div>
          </div>
          <CyberButton 
            variant="destructive" 
            className="w-full flex items-center justify-center gap-2"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4" />
            DISCONNECT
          </CyberButton>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative flex flex-col h-[calc(100vh-65px)] md:h-screen">
        {/* Header Bar */}
        <header className="h-16 border-b border-border bg-black/40 backdrop-blur flex items-center px-6 justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-mono text-primary/80 uppercase">System Status: ONLINE</span>
          </div>
          <div className="font-mono text-xs text-muted-foreground hidden md:block">
            ENCRYPTION: AES-256 // NODE: US-EAST-1
          </div>
        </header>

        {/* Page Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {children}
        </div>
      </main>
      
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
