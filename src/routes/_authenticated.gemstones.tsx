import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Plus, Trash2, Search, Gem, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/gemstones")({
  component: GemstonesPage,
});

type Unit = "carat" | "rati" | "gram";
type Form = {
  entry_date: string;
  job_reference: string;
  order_id: string | null;
  gemstone_name: string;
  gemstone_type: string;
  weight: string;
  weight_unit: Unit;
  quantity: string;
  unit_cost: string;
  setting_fee: string;
  supplier: string;
  notes: string;
};

const blank = (): Form => ({
  entry_date: new Date().toISOString().slice(0, 10),
  job_reference: "",
  order_id: null,
  gemstone_name: "",
  gemstone_type: "",
  weight: "",
  weight_unit: "carat",
  quantity: "1",
  unit_cost: "",
  setting_fee: "",
  supplier: "",
  notes: "",
});

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function GemstonesPage() {
  const qc = useQueryClient();
  const { canEdit, canDelete } = useAuth();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(blank());
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["gemstones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gemstones")
        .select("*")
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      [r.gemstone_name, r.gemstone_type, r.supplier, r.job_reference]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const totalCost = filtered.reduce((s, r) => s + Number(r.total_cost ?? 0), 0);
  const totalQty = filtered.reduce((s, r) => s + Number(r.quantity ?? 0), 0);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.gemstone_name.trim()) throw new Error("Gemstone name required");
      const num = (v: string) => (v.trim() === "" ? 0 : Number(v));
      const payload = {
        entry_date: form.entry_date,
        job_reference: form.job_reference.trim() || null,
        order_id: form.order_id || null,
        gemstone_name: form.gemstone_name.trim(),
        gemstone_type: form.gemstone_type.trim() || null,
        weight: num(form.weight),
        weight_unit: form.weight_unit,
        quantity: num(form.quantity) || 1,
        unit_cost: num(form.unit_cost),
        setting_fee: num(form.setting_fee),
        supplier: form.supplier.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editId) {
        const { error } = await supabase.from("gemstones").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gemstones").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Updated" : "Added");
      setOpen(false);
      setEditId(null);
      setForm(blank());
      qc.invalidateQueries({ queryKey: ["gemstones"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gemstones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["gemstones"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (r: typeof rows[number]) => {
    setEditId(r.id);
    setForm({
      entry_date: r.entry_date,
      job_reference: r.job_reference ?? "",
      order_id: r.order_id ?? null,
      gemstone_name: r.gemstone_name,
      gemstone_type: r.gemstone_type ?? "",
      weight: String(r.weight ?? ""),
      weight_unit: (r.weight_unit as Unit) ?? "carat",
      quantity: String(r.quantity ?? "1"),
      unit_cost: String(r.unit_cost ?? ""),
      setting_fee: String(r.setting_fee ?? ""),
      supplier: r.supplier ?? "",
      notes: r.notes ?? "",
    });
    setOpen(true);
  };

  const preview = (Number(form.quantity) || 0) * (Number(form.unit_cost) || 0) + (Number(form.setting_fee) || 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            Gemstones · ကျောက်ဖိုး ကျောက်ချိန်
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Gemstone Ledger</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ကျောက်မျက်ရတနာများ စာရင်း — date, job, weight, cost, supplier.
          </p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(blank()); } }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
                <Plus className="mr-2 h-4 w-4" /> New Gemstone Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit" : "New"} Gemstone Entry</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Date · ရက်စွဲ" type="date" value={form.entry_date}
                  onChange={(v) => setForm({ ...form, entry_date: v })} />
                <Field label="Job / Order Ref · ဘယ်အထည်" value={form.job_reference}
                  onChange={(v) => setForm({ ...form, job_reference: v })} placeholder="e.g. Maung Maung Book 1 #3" />
                <Field label="Gemstone Name · ကျောက်အမည် *" value={form.gemstone_name}
                  onChange={(v) => setForm({ ...form, gemstone_name: v })} placeholder="ပတ္တမြား / Ruby" />
                <Field label="Type · အမျိုးအစား" value={form.gemstone_type}
                  onChange={(v) => setForm({ ...form, gemstone_type: v })} placeholder="Natural, Heat-treated…" />
                <Field label="Weight · ကျောက်ချိန်" value={form.weight}
                  onChange={(v) => setForm({ ...form, weight: v })} type="number" />
                <div>
                  <Label className="text-xs">Unit</Label>
                  <Select value={form.weight_unit} onValueChange={(v) => setForm({ ...form, weight_unit: v as Unit })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carat">Carat (ကရက်)</SelectItem>
                      <SelectItem value="rati">Rati (ရတီ)</SelectItem>
                      <SelectItem value="gram">Gram (ဂရမ်)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Field label="Quantity · အရေအတွက်" value={form.quantity}
                  onChange={(v) => setForm({ ...form, quantity: v })} type="number" />
                <Field label="Unit Cost · ကျောက်ဖိုး/တစ်လုံး" value={form.unit_cost}
                  onChange={(v) => setForm({ ...form, unit_cost: v })} type="number" />
                <Field label="Setting Fee · ကျောက်တင်ခ" value={form.setting_fee}
                  onChange={(v) => setForm({ ...form, setting_fee: v })} type="number" />
                <Field label="Supplier · ဝယ်သည့်နေရာ" value={form.supplier}
                  onChange={(v) => setForm({ ...form, supplier: v })} />
                <div className="md:col-span-2">
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total Cost (quantity × unit + setting fee)
                </p>
                <p className="font-display text-xl font-semibold tabular-nums text-gold">
                  {fmt(preview)}
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => save.mutate()} disabled={save.isPending}
                  className="bg-gradient-gold text-primary-foreground">
                  {save.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search gemstone, supplier, job…" value={search}
          onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-left uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Job Ref</th>
                <th className="px-3 py-2.5 font-medium">Gemstone</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 text-right font-medium">Weight</th>
                <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                <th className="px-3 py-2.5 text-right font-medium">Unit Cost</th>
                <th className="px-3 py-2.5 text-right font-medium">Setting</th>
                <th className="px-3 py-2.5 text-right font-medium bg-gold-soft/30">Total</th>
                <th className="px-3 py-2.5 font-medium">Supplier</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={11} className="px-6 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-6 py-12 text-center">
                  <Gem className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">No gemstone entries yet.</p>
                </td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2.5">{r.entry_date}</td>
                    <td className="px-3 py-2.5">{r.job_reference ?? "—"}</td>
                    <td className="px-3 py-2.5 font-medium">{r.gemstone_name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.gemstone_type ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {fmt(r.weight)} <span className="text-[10px] text-muted-foreground">{r.weight_unit}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt(r.quantity)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt(r.unit_cost)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt(r.setting_fee)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-gold bg-gold-soft/20">
                      {fmt(r.total_cost)}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.supplier ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <button onClick={() => startEdit(r)} className="text-muted-foreground hover:text-gold">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => { if (confirm("Delete this entry?")) remove.mutate(r.id); }}
                            className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t bg-muted/40 font-semibold">
                  <td colSpan={5} className="px-3 py-3 text-right text-xs uppercase tracking-wider text-muted-foreground">
                    Totals · စုစုပေါင်း
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmt(totalQty)}</td>
                  <td colSpan={2}></td>
                  <td className="px-3 py-3 text-right tabular-nums text-gold bg-gold-soft/30">{fmt(totalCost)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
