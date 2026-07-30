import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Smile, Search } from "lucide-react";

// ─── Standard emoji categories ───────────────────────────────────
const STANDARD_EMOJIS: Record<string, string[]> = {
  "😀 Smileys": [
    "😀","😃","😄","😁","😆","😅","😂","🤣","🥲","😊","😇","🙂","🙃",
    "😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪",
    "🤨","🧐","🤓","😎","🥸","🤩","🥳","😏","😒","😞","😔","😟","😕",
    "🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬",
    "🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🫣","🤭",
    "🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱",
    "😴","🤤","😪","😵","🫠","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕",
  ],
  "👍 Hands": [
    "👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👌","🤌","🤏","✌️",
    "🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍",
    "👎","✊","👊","🤛","🤜","🫶","👏","🙌","🫙","🤲","🙏","✍️","💅",
    "💪","🦾","🦿","🦵","🦶",
  ],
  "❤️ Hearts": [
    "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","❣️","💕","💞","💓",
    "💗","💖","💘","💝","💟","💔","❤️‍🔥","❤️‍🩹",
  ],
  "🎉 Fun": [
    "🎉","🎊","🎈","🎀","🎁","🥂","🍾","🎆","🎇","🧨","✨","🌟","💫",
    "⭐","🌈","🔥","💥","💢","💦","💨","🌪️","⚡","❄️","🌊","🎵","🎶",
    "🎮","🕹️","🎯","🎲","♟️","🃏","🎭","🎪","🎠","🎡","🎢","🏆","🥇",
    "🎓","🎤","🎧","🎸","🎹","🥁","🎺","🎷","🎻",
  ],
  "💻 Tech": [
    "💻","🖥️","🖨️","⌨️","🖱️","💾","💿","📀","📱","☎️","📞","📟","📠",
    "📺","📻","🎙️","📸","📷","🎥","📡","🔋","🔌","💡","🔦","🕯️","🔭",
    "🔬","🧪","🧫","🧬","⚗️","🛰️","🚀","💣","🔑","🗝️","🔒","🔓","⚙️",
    "🛠️","🔧","🔨","⚒️","🗜️","🔩","🗡️","⚔️","🛡️","🏹",
  ],
  "🐱 Animals": [
    "🐱","🐶","🦊","🐭","🐹","🐰","🐻","🐼","🐨","🐯","🦁","🐮","🐷",
    "🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🦆","🦅","🦉","🦋","🐛",
    "🐌","🐞","🐜","🦗","🕷️","🦂","🐢","🐍","🦎","🦕","🦖","🐙","🦑",
    "🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🦈","🐊","🦄","🐲","🐉",
  ],
  "🍕 Food": [
    "🍕","🍔","🌮","🌯","🥙","🧆","🥚","🍳","🥘","🍲","🫕","🥣","🥗",
    "🍿","🧂","🥫","🍱","🍘","🍙","🍚","🍛","🍜","🍝","🍠","🍢","🍣",
    "🍤","🍥","🥮","🍡","🥟","🥠","🥡","🦪","🍦","🍧","🍨","🍩","🍪",
    "🎂","🍰","🧁","🥧","🍫","🍬","🍭","🍮","🍯","🍷","🥂","🍺","🧋",
    "☕","🍵","🧃","🥤","🧉","🍶","🍾","🥃",
  ],
};

// ─── Types ────────────────────────────────────────────────────────
interface CustomEmoji { id: number; name: string; url: string; }

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

// ─── Emoji Picker Popover ─────────────────────────────────────────
function EmojiPickerPanel({ onSelect }: EmojiPickerProps) {
  const [tab, setTab] = useState<string>(Object.keys(STANDARD_EMOJIS)[0]);
  const [search, setSearch] = useState("");

  const { data: customEmojis = [] } = useQuery<CustomEmoji[]>({
    queryKey: ["/api/emojis"],
    queryFn: async () => {
      const r = await fetch("/api/emojis");
      if (!r.ok) return [];
      return r.json();
    },
  });

  const TABS = [...Object.keys(STANDARD_EMOJIS), ...(customEmojis.length ? ["⭐ Custom"] : [])];
  const currentTab = TABS.includes(tab) ? tab : TABS[0];

  // Build display emojis
  let displayEmojis: Array<{ type: "unicode"; char: string } | { type: "custom"; emoji: CustomEmoji }> = [];

  if (search.trim()) {
    // Search across all standard emojis
    const q = search.toLowerCase();
    for (const [cat, emojis] of Object.entries(STANDARD_EMOJIS)) {
      emojis.forEach(e => displayEmojis.push({ type: "unicode", char: e }));
    }
    // Filter custom emojis by name
    customEmojis.filter(e => e.name.includes(q)).forEach(e => displayEmojis.push({ type: "custom", emoji: e }));
    // Limit
    displayEmojis = displayEmojis.slice(0, 80);
  } else if (currentTab === "⭐ Custom") {
    customEmojis.forEach(e => displayEmojis.push({ type: "custom", emoji: e }));
  } else {
    (STANDARD_EMOJIS[currentTab] || []).forEach(e => displayEmojis.push({ type: "unicode", char: e }));
  }

  return (
    <div className="w-80 bg-[hsl(225_7%_15%)] border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col"
      style={{ maxHeight: 360 }}>
      {/* Search */}
      <div className="p-2 border-b border-border">
        <div className="flex items-center gap-2 bg-input rounded px-2 py-1">
          <Search className="w-3 h-3 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search emoji..."
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* Category tabs (scrollable) */}
      {!search && (
        <div className="flex gap-1 px-2 py-1.5 overflow-x-auto border-b border-border">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "text-base shrink-0 p-1 rounded hover:bg-secondary transition-colors",
                currentTab === t && "bg-primary/20 ring-1 ring-primary/40"
              )}
              title={t}
            >
              {t.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {displayEmojis.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-6">No emojis found</div>
        )}
        <div className="emoji-grid">
          {displayEmojis.map((item, i) => {
            if (item.type === "unicode") {
              return (
                <button
                  key={i}
                  onClick={() => onSelect(item.char)}
                  className="flex items-center justify-center text-xl p-1 rounded hover:bg-secondary transition-colors aspect-square"
                  title={item.char}
                >
                  {item.char}
                </button>
              );
            } else {
              return (
                <button
                  key={`c-${item.emoji.id}`}
                  onClick={() => onSelect(`:${item.emoji.name}:`)}
                  className="flex items-center justify-center p-1 rounded hover:bg-secondary transition-colors aspect-square"
                  title={`:${item.emoji.name}:`}
                >
                  <img src={item.emoji.url} alt={item.emoji.name} className="w-6 h-6 object-contain" />
                </button>
              );
            }
          })}
        </div>
      </div>

      {/* Current tab label */}
      {!search && (
        <div className="px-3 py-1.5 text-[9px] font-medium text-muted-foreground uppercase tracking-widest border-t border-border bg-secondary/30">
          {currentTab}
        </div>
      )}
    </div>
  );
}

// ─── EmojiButton (toggle wrapper) ─────────────────────────────────
export function EmojiButton({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          "w-10 h-10 flex items-center justify-center rounded transition-colors",
          open ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
        title="Emoji"
      >
        <Smile className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute bottom-12 right-0 z-50">
          <EmojiPickerPanel onSelect={e => { onSelect(e); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}
