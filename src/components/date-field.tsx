import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { enGB } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dateFromIso, formatDate, isoFromDate, parseDateInput } from "@/lib/date";

type DateFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
};

export function DateField({ label, value, onChange, required, className }: DateFieldProps) {
  const [text, setText] = React.useState(() => formatDate(value, ""));
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => setText(formatDate(value, "")), [value]);

  const commit = (next: string) => {
    setText(next);
    if (!next.trim()) {
      onChange("");
      return;
    }
    const parsed = parseDateInput(next);
    if (parsed) onChange(parsed);
  };

  return (
    <div className={className}>
      {label && <Label className="text-xs">{label}</Label>}
      <div className="mt-1 flex">
        <Input type="text" inputMode="numeric" autoComplete="off" aria-label={label}
          aria-invalid={Boolean(text && !parseDateInput(text))} placeholder="dd/mm/yyyy"
          value={text} required={required} maxLength={10} onChange={(event) => commit(event.target.value)}
          onBlur={() => setText(formatDate(value, ""))} className="rounded-r-none tabular-nums" />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label={`Choose ${label ?? "date"}`}
              className="shrink-0 rounded-l-none border-l-0">
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="single" locale={enGB} selected={dateFromIso(value)} defaultMonth={dateFromIso(value)}
              onSelect={(date) => { onChange(date ? isoFromDate(date) : ""); setOpen(false); }}
              className="pointer-events-auto p-3" />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}