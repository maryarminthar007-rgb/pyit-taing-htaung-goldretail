import { useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Editable, searchable combobox. The list renders inline (not in a portal) so
 * touch-swipe scrolling works inside dialogs on tablets.
 */
export function CreatableCombobox({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  emptyText = "Type a custom item name",
  heading = "Assigned specialties · သတ်မှတ်ထားသော အမျိုးအစားများ",
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  ariaLabel: string;
  emptyText?: string;
  heading?: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => {
    const q = value.trim().toLocaleLowerCase();
    if (!q || !typed) return options;
    return options.filter((o) => o.toLocaleLowerCase().includes(q));
  }, [options, value, typed]);

  return (
    <div className="relative">
      <div className="flex overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <Input
          ref={inputRef}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setTyped(true);
            setOpen(true);
          }}
          onFocus={() => { setTyped(false); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && open) {
              e.preventDefault();
              if (typed && filtered[0]) onChange(filtered[0]);
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          className="h-10 min-w-0 flex-1 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <button
          type="button"
          aria-label="Show options"
          className="flex h-10 w-10 shrink-0 items-center justify-center border-l"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setTyped(false);
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
        >
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 touch-pan-y overflow-y-auto overscroll-contain rounded-md border bg-popover text-popover-foreground shadow-md [-webkit-overflow-scrolling:touch]"
          onMouseDown={(e) => e.preventDefault()}
        >
          <p className="sticky top-0 bg-popover px-3 py-1.5 text-[11px] font-medium text-muted-foreground">{heading}</p>
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">{emptyText}. Your typed name will be saved.</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o}
                type="button"
                role="option"
                aria-selected={o === value}
                className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm hover:bg-accent active:bg-accent"
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
              >
                <Check className={cn("h-4 w-4 shrink-0", o === value ? "opacity-100" : "opacity-0")} />
                <span className="min-w-0 truncate">{o}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
