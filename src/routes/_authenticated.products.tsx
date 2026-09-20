import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useEffect } from "react";
import { Plus, Package, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PhotoUpload } from "@/components/photo-upload";
import { useAuth } from "@/hooks/use-auth";
import { useCategories, mergeCategories, UNCATEGORIZED, type QualityGroup } from "@/lib/categories";

export const Route = createFileRoute("/_authenticated/products")({
  component: ProductsPage,
  head: () => ({
    meta: [
      { title: "Product Catalog | Pyit Taing Htaung Gold Smith" },
      { name: "description", content: "Browse gold products by quality group and category, and open each item to view its specialist goldsmiths." },
      { property: "og:title", content: "Product Catalog | Pyit Taing Htaung Gold Smith" },
      { property: "og:description", content: "Browse gold products by quality group and category." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const LAST_CAT_KEY = "pth:last-product-category";

function ProductsPage() {
  const qc = useQueryClient();
  const { canDelete } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", photo_url: null as string | null });
  const [activeCat, setActiveCat] = useState<string>("all");
  const [openCats, setOpenCats] = useState<string[]>([]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: registered = [] } = useCategories();

  // Restore the last used category for the Add Product form (sticky selection).
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(LAST_CAT_KEY) : null;
    if (saved) setForm((f) => (f.category ? f : { ...f, category: saved }));
  }, []);

  const add = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name required");
      if (!form.category.trim()) throw new Error("Category required");
      const { error } = await supabase.from("products").insert({
        name: form.name.trim(),
        category: form.category.trim(),
        photo_url: form.photo_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product added");
      localStorage.setItem(LAST_CAT_KEY, form.category);
      setOpen(false);
      // keep the category sticky for the next entry
      setForm((f) => ({ name: "", category: f.category, photo_url: null }));
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (pid: string) => {
      const { error } = await supabase.from("products").delete().eq("id", pid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const categories = useMemo(() => {
    const merged = mergeCategories(registered, products.map((p) => (p as { category?: string | null }).category));
    const hasUncat = products.some((p) => !((p as { category?: string | null }).category ?? "").trim());
    return hasUncat ? [...merged, { name: UNCATEGORIZED, group: "C" as QualityGroup }] : merged;
  }, [registered, products]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof products>();
    for (const c of categories) m.set(c.name, [] as unknown as typeof products);
    for (const p of products) {
      const k = ((p as { category?: string | null }).category ?? "").trim() || UNCATEGORIZED;
      if (!m.has(k)) m.set(k, [] as unknown as typeof products);
      m.get(k)!.push(p);
    }
    return categories
      .map((c) => ({ ...c, items: m.get(c.name) ?? [] }))
      .filter((c) => c.items.length > 0);
  }, [categories, products]);

  const visible = activeCat === "all" ? grouped : grouped.filter((g) => g.name === activeCat);
  const isOpen = (name: string) => activeCat !== "all" || openCats.includes(name);
  const toggleOpen = (name: string) =>
    setOpenCats((o) => (o.includes(name) ? o.filter((x) => x !== name) : [...o, name]));

  const selectableCategories = categories.filter((c) => c.name !== UNCATEGORIZED);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            Catalog · ပစ္စည်းအမျိုးအစား
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Product Catalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Grouped by quality group and category. Tap a name to see the goldsmiths who specialise in it.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Photo</Label>
                <PhotoUpload
                  bucket="product-photos"
                  value={form.photo_url}
                  onChange={(url) => setForm({ ...form, photo_url: url })}
                />
              </div>
              <div>
                <Label>Name · အမည်</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="MC Chain" />
              </div>
              <div>
                <Label>Category · အုပ်စု</Label>
                <Select
                  value={form.category || undefined}
                  onValueChange={(v) => {
                    setForm((f) => ({ ...f, category: v }));
                    localStorage.setItem(LAST_CAT_KEY, v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(["A", "B", "C"] as QualityGroup[]).map((g) => {
                      const items = selectableCategories.filter((c) => c.group === g);
                      if (!items.length) return null;
                      return (
                        <SelectGroup key={g}>
                          <SelectLabel>Group {g}</SelectLabel>
                          {items.map((c) => (
                            <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => add.mutate()} disabled={add.isPending} className="bg-gradient-gold text-primary-foreground">
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No products yet. Add common items so they can be linked to goldsmiths.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={activeCat === "all" ? "default" : "outline"}
              className={activeCat === "all" ? "bg-gradient-gold text-primary-foreground" : ""}
              onClick={() => {
                setActiveCat("all");
                setOpenCats(grouped.map((g) => g.name));
              }}
            >
              All · အားလုံး
            </Button>
            {(["A", "B", "C"] as QualityGroup[]).map((g) => {
              const cats = grouped.filter((c) => c.group === g);
              if (!cats.length) return null;
              return (
                <div key={g} className="flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gold">Group {g}</span>
                  {cats.map((c) => (
                    <Button
                      key={c.name}
                      type="button"
                      size="sm"
                      variant={activeCat === c.name ? "secondary" : "ghost"}
                      onClick={() => setActiveCat(c.name)}
                    >
                      {c.name}
                      <span className="ml-1.5 text-[10px] text-muted-foreground">{c.items.length}</span>
                    </Button>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            {visible.map((cat) => {
              const expanded = isOpen(cat.name);
              return (
                <section key={cat.name} className="overflow-hidden rounded-lg border bg-card">
                  <button
                    type="button"
                    onClick={() => toggleOpen(cat.name)}
                    className="flex w-full items-center justify-between gap-3 border-b bg-muted/35 px-4 py-3 text-left transition-colors hover:bg-muted/60 sm:px-5"
                  >
                    <span className="flex items-center gap-2">
                      {expanded ? <ChevronDown className="h-4 w-4 text-gold" /> : <ChevronRight className="h-4 w-4 text-gold" />}
                      <span className="font-display text-lg font-semibold">{cat.name}</span>
                      <span className="rounded border border-gold/40 bg-gold-soft px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                        {cat.group}
                      </span>
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">{cat.items.length}</span>
                  </button>
                  {expanded && (
                    <div className="divide-y">
                      {cat.items.map((p) => (
                        <div key={p.id} className="group flex min-h-14 items-center gap-2 px-2 transition-colors hover:bg-gold-soft/50 sm:px-3">
                          <Link
                            to="/products/$pid"
                            params={{ pid: p.id }}
                            className="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-md px-2 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span className="truncate font-medium group-hover:text-gold">{p.name}</span>
                            <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                              <span className="hidden sm:inline">View specialists</span>
                              <ChevronRight className="h-4 w-4 group-hover:text-gold" />
                            </span>
                          </Link>
                          {canDelete && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${p.name}`}
                              title="Delete product"
                              onClick={() => { if (confirm("Delete?")) del.mutate(p.id); }}
                              className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
