import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type QualityGroup = "A" | "B" | "C";

export type ProductCategory = {
  id: string;
  name: string;
  quality_group: QualityGroup;
  sort_order: number;
};

export const QUALITY_GROUPS: QualityGroup[] = ["A", "B", "C"];

export const UNCATEGORIZED = "Uncategorised · အခြား";

/** Fallback for categories that are not registered yet (future-proofing). */
export function inferGroup(name: string): QualityGroup {
  const n = name.trim().toUpperCase();
  if (n.startsWith("B")) return "B";
  if (n.startsWith("C")) return "C";
  return "A";
}

export function useCategories() {
  return useQuery({
    queryKey: ["product_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("quality_group")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []) as ProductCategory[];
    },
  });
}

/** Build the ordered category list, merging registered categories with any
 *  category names that only exist on products (so nothing ever disappears). */
export function mergeCategories(
  registered: ProductCategory[],
  usedNames: (string | null | undefined)[],
): { name: string; group: QualityGroup }[] {
  const map = new Map<string, QualityGroup>();
  for (const c of registered) map.set(c.name, c.quality_group);
  for (const raw of usedNames) {
    const name = (raw ?? "").trim();
    if (!name || map.has(name)) continue;
    map.set(name, inferGroup(name));
  }
  const order = new Map(registered.map((c, i) => [c.name, i]));
  return Array.from(map.entries())
    .map(([name, group]) => ({ name, group }))
    .sort((a, b) => {
      if (a.group !== b.group) return a.group.localeCompare(b.group);
      const ai = order.get(a.name) ?? 9999;
      const bi = order.get(b.name) ?? 9999;
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name);
    });
}
