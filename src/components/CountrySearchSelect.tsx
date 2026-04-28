import { useState, useMemo, useRef, useEffect } from "react";
import { WORLD_COUNTRIES } from "@/lib/world-countries";
import { ChevronDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (countryName: string) => void;
  placeholder?: string;
  className?: string;
}

const CountrySearchSelect = ({ value, onChange, placeholder = "Select country", className }: Props) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => WORLD_COUNTRIES.find((c) => c.name.toLowerCase() === (value || "").toLowerCase()),
    [value]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return WORLD_COUNTRIES;
    return WORLD_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term)
    );
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-11 rounded-xl border border-input bg-background px-3 flex items-center justify-between text-left text-sm hover:bg-accent/30 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <span className="text-lg leading-none">{selected.flag}</span>
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-[120] mt-1 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border bg-popover sticky top-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search 196 countries..."
                className="w-full h-9 pl-8 pr-3 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground text-center">No countries found</li>
            )}
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c.name);
                    setOpen(false);
                    setQ("");
                  }}
                  className={cn(
                    "w-full px-3 py-2 flex items-center gap-2.5 text-sm hover:bg-accent/40 transition-colors",
                    value === c.name && "bg-accent/30 font-semibold"
                  )}
                >
                  <span className="text-lg leading-none">{c.flag}</span>
                  <span className="truncate flex-1 text-left">{c.name}</span>
                  {c.dial && <span className="text-[11px] text-muted-foreground">{c.dial}</span>}
                  {value === c.name && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CountrySearchSelect;
