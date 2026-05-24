import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Plus, Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", photo_url: "" });

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
        photo_url: form.photo_url.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product added");
      setOpen(false);
      setForm({ name: "", photo_url: "" });
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            Catalog · ပစ္စည်းအမျိုးအစား
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Product Catalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Item types used across order books (rings, bracelets, chains…).
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
                <Label>Name · အမည်</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ring / လက်စွပ်" />
              </div>
              <div>
                <Label>Photo URL</Label>
                <Input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
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
            No products yet. Add common items so they auto-suggest while filling orders.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-gold">
              <div className="aspect-square w-full overflow-hidden bg-gold-soft">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-12 w-12 text-gold/40" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between p-4">
                <p className="font-medium">{p.name}</p>
                <button
                  onClick={() => { if (confirm("Delete?")) del.mutate(p.id); }}
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
