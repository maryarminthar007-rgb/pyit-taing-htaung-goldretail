import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function CreatableCombobox({
  value,
  onChange,
  options,
  placeholder,
  emptyText = "Type a custom item name",
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const filteredOptions = useMemo(() => {
    const query = value.trim().toLocaleLowerCase();
    if (!query) return options;
    return options.filter((option) => option.toLocaleLowerCase().includes(query));
  }, [options, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <Input
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="min-w-0 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Show assigned items"
            className="h-9 w-9 shrink-0 rounded-none border-l"
            onClick={() => setOpen((current) => !current)}
          >
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="w-[var(--radix-popover-anchor-width)] p-0"
      >
        <Command shouldFilter={false}>
          <CommandList className="max-h-52">
            <CommandEmpty className="px-3 py-4 text-left text-xs text-muted-foreground">
              {emptyText}. Your typed name will be saved.
            </CommandEmpty>
            <CommandGroup heading="Assigned specialties · သတ်မှတ်ထားသော အမျိုးအစားများ">
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      option === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 truncate">{option}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}