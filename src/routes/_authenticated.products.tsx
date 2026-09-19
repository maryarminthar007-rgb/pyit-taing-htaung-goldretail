import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Plus, Package, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PhotoUpload } from "@/components/photo-upload";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/products")({
  component: ProductsPage,
  head: () => ({
    meta: [
      { title: "Product Catalog | Pyit Taing Htaung Gold Smith" },
      { name: "description", content: "Browse gold products by category and open each item to view its specialist goldsmiths." },
      { property: "og:title", content: "Product Catalog | Pyit Taing Htaung Gold Smith" },
      { property: "og:description", content: "Browse gold products by category and view their specialist goldsmiths." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ProductsPage() {
  const qc = useQueryClient();
  const { canDelete } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", photo_url: null as string | null });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name required");
      const { error } = await supabase.from("products").insert({
        name: form.name.trim(),
        category: form.category.trim() || null,
        photo_url: form.photo_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product added");
      setOpen(false);
      setForm({ name: "", category: "", photo_url: null });
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

  const grouped = useMemo(() => {
    const m = new Map<string, typeof products>();
    for (const p of products) {
      const k = (p as { category?: string | null }).category || "Uncategorised";
      if (!m.has(k)) m.set(k, []);
      const group = m.get(k);
      if (group) group.push(p);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [products]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            Catalog · ပစ္စည်းအမျိုးအစား
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Product Catalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Item types grouped by category. Tap a card to see the goldsmiths who specialise in it.
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
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Chains / Rings / Bangles…" />
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
        <div className="space-y-5">
          {grouped.map(([cat, items]) => (
            <section key={cat} className="overflow-hidden rounded-lg border bg-card">
              <div className="flex items-center justify-between gap-3 border-b bg-muted/35 px-4 py-3 sm:px-5">
                <h2 className="font-display text-lg font-semibold">{cat}</h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {items.length}
                </span>
              </div>
              <div className="divide-y">
                {items.map((p) => (
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
