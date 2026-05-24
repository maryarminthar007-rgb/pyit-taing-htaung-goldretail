import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Package, Megaphone, Search, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/marketing")({
  component: MarketingCatalog,
});

const todayStr = () => new Date().toISOString().slice(0, 10);

type Product = { id: string; name: string; photo_url: string | null; category: string | null };

function MarketingCatalog() {
  const { isAdmin, isMarketing, loading, session } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Product | null>(null);
  const [form, setForm] = useState({
    team_name: "",
    qty: "",
    specs: "",
    order_date: todayStr(),
    item_classification: "shop" as "shop" | "order",
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: isAdmin || isMarketing,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["marketing_teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("marketing_teams").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin || isMarketing,
  });

  const { data: myRecent = [] } = useQuery({
    queryKey: ["marketing_orders_recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin || isMarketing,
  });

  const place = useMutation({
    mutationFn: async () => {
      if (!picked) throw new Error("Pick a product");
      if (!form.team_id) throw new Error("Select team");
      const qty = Number(form.qty);
      if (!qty || qty <= 0) throw new Error("Quantity required");
      const team = teams.find((t) => t.id === form.team_id);
      const { error } = await supabase.from("marketing_orders").insert({
        team_id: form.team_id,
        team_name: team?.name ?? "Unknown",
        product_id: picked.id,
        product_name: picked.name,
        product_photo_url: picked.photo_url,
        qty,
        specs: form.specs.trim() || null,
        order_date: form.order_date || todayStr(),
        status: "pending",
        created_by: session?.user.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order placed · အမှာစာတင်ပြီးပါပြီ");
      setPicked(null);
      setForm({ team_id: "", qty: "", specs: "", order_date: todayStr() });
      qc.invalidateQueries({ queryKey: ["marketing_orders_recent"] });
      qc.invalidateQueries({ queryKey: ["marketing_orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!isAdmin && !isMarketing) return <Navigate to="/" />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-gold shadow-gold">
            <Megaphone className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
              Marketing · လမ်းကြောင်းမှာစာ Panel
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold">Place a Re-order</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              ပစ္စည်းကုန်ပါက ဤနေရာတွင် အရေးပေါ်အမှာစာတင်နိုင်ပါသည်။
            </p>
          </div>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products · ပစ္စည်းရှာရန်"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading products…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No products available.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="group overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-gold"
            >
              <div className="aspect-square w-full overflow-hidden bg-gold-soft">
                {p.photo_url ? (
                  <img
                    src={p.photo_url}
                    alt={p.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-14 w-14 text-gold/40" />
                  </div>
                )}
              </div>
              <div className="space-y-2 p-4">
                <div>
                  <p className="font-medium leading-tight">{p.name}</p>
                  {p.category && (
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {p.category}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90"
                  onClick={() => setPicked(p)}
                >
                  Order More · ထပ်မံမှာယူရန်
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {myRecent.length > 0 && (
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-gold" />
            <h2 className="font-display text-lg font-semibold">Recent Orders · မှာစာများ</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2">Date</th>
                  <th className="py-2">Team</th>
                  <th className="py-2">Product</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {myRecent.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 text-muted-foreground">{o.order_date}</td>
                    <td className="py-2">{o.team_name}</td>
                    <td className="py-2">{o.product_name}</td>
                    <td className="py-2 text-right tabular-nums">{Number(o.qty)}</td>
                    <td className="py-2">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Dialog open={!!picked} onOpenChange={(v) => !v && setPicked(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Order More · ထပ်မံထုတ်လုပ်ရန်မှာယူမည်
            </DialogTitle>
          </DialogHeader>
          {picked && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="h-14 w-14 overflow-hidden rounded-md bg-gold-soft">
                  {picked.photo_url ? (
                    <img src={picked.photo_url} alt={picked.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-6 w-6 text-gold/50" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium">{picked.name}</p>
                  {picked.category && (
                    <p className="text-[11px] text-muted-foreground">{picked.category}</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Marketing Team · အဖွဲ့အမည်</Label>
                <Select value={form.team_id} onValueChange={(v) => setForm({ ...form, team_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantity · လိုချင်သည့်ခုရေ</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: e.target.value })}
                    placeholder="e.g. 5"
                  />
                </div>
                <div>
                  <Label>Order Date · ရက်စွဲ</Label>
                  <Input
                    type="date"
                    value={form.order_date}
                    onChange={(e) => setForm({ ...form, order_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Specifications / Remarks · မှတ်ချက်</Label>
                <Textarea
                  value={form.specs}
                  onChange={(e) => setForm({ ...form, specs: e.target.value })}
                  placeholder="ဥပမာ - ခေါင်းဆွဲ အဝိုင်းပုံစံ"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPicked(null)}>Cancel</Button>
            <Button
              onClick={() => place.mutate()}
              disabled={place.isPending}
              className="bg-gradient-gold text-primary-foreground"
            >
              {place.isPending ? "Saving…" : "Place Order · မှာစာတင်ရန်"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending · ရုံးပိုင်စီစစ်ဆဲ", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
    assigned: { label: "Assigned · အပ်နှံပြီး", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
    completed: { label: "Completed · ပြီးဆုံး", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
    cancelled: { label: "Cancelled · ပယ်ဖျက်", cls: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
