import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import {
  useCategories,
  mergeCategories,
  UNCATEGORIZED,
  type QualityGroup,
} from "@/lib/categories";

type Product = { id: string; name: string; category?: string | null };

/**
 * Cascading specialty picker: Quality Group → Category → Products (checkboxes).
 */
export function SpecialtyPicker({
  products,
  selected,
  onToggle,
}: {
  products: Product[];
  selected: string[];
  onToggle: (productId: string) => void;
}) {
  const { data: registered = [] } = useCategories();
  const [group, setGroup] = useState<QualityGroup | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const merged = mergeCategories(
      registered,
      products.map((p) => p.category ?? null),
    );
    const hasUncat = products.some((p) => !(p.category ?? "").trim());
    return hasUncat
      ? [...merged, { name: UNCATEGORIZED, group: "C" as QualityGroup }]
      : merged;
  }, [registered, products]);

  const groups = useMemo(
    () => Array.from(new Set(categories.map((c) => c.group))).sort(),
    [categories],
  );

  const countFor = (catName: string) =>
    products.filter(
      (p) => ((p.category ?? "").trim() || UNCATEGORIZED) === catName,
    ).length;

  const selectedCountFor = (catName: string) =>
    products.filter(
      (p) =>
        ((p.category ?? "").trim() || UNCATEGORIZED) === catName &&
        selected.includes(p.id),
    ).length;

  const visibleCategories = categories.filter(
    (c) => c.group === group && countFor(c.name) > 0,
  );

  const items = products.filter(
    (p) => ((p.category ?? "").trim() || UNCATEGORIZED) === category,
  );

  if (products.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Add product types in the Products page first.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-3 rounded-md border p-3">
      {/* Level 1 */}
      <div>
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Quality Group
        </p>
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <Button
              key={g}
              type="button"
              size="sm"
              variant={group === g ? "default" : "outline"}
              className={group === g ? "bg-gradient-gold text-primary-foreground" : ""}
              onClick={() => {
                setGroup(g);
                setCategory(null);
              }}
            >
              Group {g}
            </Button>
          ))}
        </div>
      </div>

      {/* Level 2 */}
      {group && (
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <ChevronRight className="h-3 w-3" /> Category
          </p>
          <div className="flex flex-wrap gap-2">
            {visibleCategories.map((c) => {
              const sel = selectedCountFor(c.name);
              return (
                <Button
                  key={c.name}
                  type="button"
                  size="sm"
                  variant={category === c.name ? "secondary" : "ghost"}
                  className="border"
                  onClick={() => setCategory(c.name)}
                >
                  {c.name}
                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                    {sel > 0 ? `${sel}/${countFor(c.name)}` : countFor(c.name)}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Level 3 */}
      {category && (
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <ChevronRight className="h-3 w-3" /> Items · {category}
          </p>
          <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
            {items.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={selected.includes(p.id)}
                  onCheckedChange={() => onToggle(p.id)}
                />
                <span className="truncate">{p.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {selected.length} item{selected.length === 1 ? "" : "s"} selected
      </p>
    </div>
  );
}
