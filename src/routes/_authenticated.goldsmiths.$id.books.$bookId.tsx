import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { ArrowLeft, Plus, Trash2, Search, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { computeOrderTotals, computeTotalWastage, recomputeBookTotals, type OrderRow } from "@/lib/calc";
import { StatCard } from "@/components/stat-card";
import { TrendingDown, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/goldsmiths/$id/books/$bookId")({
  component: BookLedger,
});

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

const todayStr = () => new Date().toISOString().slice(0, 10);

type FormState = {
  // Stage 1: Issue
  issue_date: string;
  ordered_qty: string;
  issued_item_name: string;
  gold_quality: string;
  wastage_per_piece: string;
  issued_weight: string;
  specs: string;
  // Stage 2: Return
  return_date: string;
  returned_qty: string;
  returned_item_name: string;
  returned_specs: string;
  returned_weight: string;
  fire_loss: string;
  water_loss: string;
};

const blankForm = (): FormState => ({
  issue_date: todayStr(),
  ordered_qty: "",
  issued_item_name: "",
  gold_quality: "",
  wastage_per_piece: "",
  issued_weight: "",
  specs: "",
  return_date: "",
  returned_qty: "",
  returned_item_name: "",
  returned_specs: "",
  returned_weight: "",
  fire_loss: "",
  water_loss: "",
});

const fromOrder = (o: OrderRow): FormState => ({
  issue_date: o.issue_date ?? todayStr(),
  ordered_qty: o.ordered_qty?.toString() ?? "",
  issued_item_name: o.issued_item_name ?? "",
  gold_quality: o.gold_quality ?? "",
  wastage_per_piece: o.wastage_per_piece?.toString() ?? "",
  issued_weight: o.issued_weight?.toString() ?? "",
  specs: o.specs ?? "",
  return_date: o.return_date ?? "",
  returned_qty: o.returned_qty?.toString() ?? "",
  returned_item_name: o.returned_item_name ?? o.issued_item_name ?? "",
  returned_specs: o.specs ?? "",
  returned_weight: o.returned_weight?.toString() ?? "",
  fire_loss: o.fire_loss?.toString() ?? "",
  water_loss: o.water_loss?.toString() ?? "",
});

function BookLedger() {
  const { id, bookId } = Route.useParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());
  const [stage, setStage] = useState<"issue" | "return">("issue");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["book", bookId],
    queryFn: async () => {
      const [{ data: book }, { data: goldsmith }, { data: orders }, { data: products }] =
        await Promise.all([
          supabase.from("books").select("*").eq("id", bookId).single(),
          supabase.from("goldsmiths").select("*").eq("id", id).single(),
          supabase.from("orders").select("*").eq("book_id", bookId).order("sort_index"),
          supabase.from("products").select("*").order("name"),
        ]);
      return {
        book: book!,
        goldsmith: goldsmith!,
        orders: (orders ?? []) as OrderRow[],
        products: products ?? [],
      };
    },
  });

  const recomputed = useMemo(
    () => (data ? recomputeBookTotals(data.orders) : []),
    [data],
  );

  const filtered = useMemo(() => {
    if (!search) return recomputed;
    const q = search.toLowerCase();
    return recomputed.filter(
      (o) =>
        (o.issued_item_name ?? "").toLowerCase().includes(q) ||
        (o.returned_item_name ?? "").toLowerCase().includes(q) ||
        (o.gold_quality ?? "").toLowerCase().includes(q),
    );
  }, [recomputed, search]);

  const last = recomputed[recomputed.length - 1];
  const totalDue = last?.total_due_gold ?? 0;
  const totalExcess = last?.total_excess_gold ?? 0;

  const openNew = () => {
    setEditingId(null);
    setForm(blankForm());
    setStage("issue");
    setOpen(true);
  };

  const openEdit = (o: OrderRow) => {
    setEditingId(o.id);
    setForm(fromOrder(o));
    setStage(o.return_date || o.returned_qty != null ? "return" : "issue");
    setOpen(true);
  };

  const num = (v: string): number | null => (v.trim() === "" ? null : Number(v));

  const buildPayload = () => {
    const wpp = num(form.wastage_per_piece) ?? 0;
    const rqty = num(form.returned_qty);
    const total_wastage = computeTotalWastage({ wastage_per_piece: wpp, returned_qty: rqty, wastage: 0 });
    const payload = {
      book_id: bookId,
      issue_date: form.issue_date || null,
      ordered_qty: num(form.ordered_qty),
      issued_item_name: form.issued_item_name.trim() || null,
      gold_quality: form.gold_quality.trim() || null,
      specs: (stage === "return" ? form.returned_specs : form.specs).trim() || null,
      issued_weight: num(form.issued_weight) ?? 0,
      wastage_per_piece: wpp,
      return_date: form.return_date || null,
      returned_qty: rqty,
      returned_item_name: form.returned_item_name.trim() || null,
      returned_weight: num(form.returned_weight) ?? 0,
      wastage: total_wastage,
      fire_loss: num(form.fire_loss) ?? 0,
      water_loss: num(form.water_loss) ?? 0,
    };
    const { due_gold, excess_gold } = computeOrderTotals(payload);
    return { ...payload, due_gold, excess_gold };
  };

  const saveOrder = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      if (editingId) {
        const { error } = await supabase.from("orders").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("orders").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Entry updated" : "Entry added");
      setOpen(false);
      setEditingId(null);
      setForm(blankForm());
      qc.invalidateQueries({ queryKey: ["book", bookId] });
      qc.invalidateQueries({ queryKey: ["goldsmith", id] });
      qc.invalidateQueries({ queryKey: ["goldsmiths"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["work-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteOrder = useMutation({
    mutationFn: async (oid: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", oid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry deleted");
      qc.invalidateQueries({ queryKey: ["book", bookId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["work-status"] });
    },
  });

  const previewWaste = computeTotalWastage({
    wastage_per_piece: Number(form.wastage_per_piece) || 0,
    returned_qty: Number(form.returned_qty) || 0,
    wastage: 0,
  });

  const preview = computeOrderTotals({
    issued_weight: Number(form.issued_weight) || 0,
    returned_weight: Number(form.returned_weight) || 0,
    wastage: 0,
    wastage_per_piece: Number(form.wastage_per_piece) || 0,
    returned_qty: Number(form.returned_qty) || 0,
    fire_loss: Number(form.fire_loss) || 0,
    water_loss: Number(form.water_loss) || 0,
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <Link
        to="/goldsmiths/$id"
        params={{ id }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {data.goldsmith.name}
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            Order Book · အော်ဒါစာအုပ်
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">{data.book.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.goldsmith.name} · {recomputed.length} entries
          </p>
        </div>
        <Button
          onClick={openNew}
          className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90"
        >
          <Plus className="mr-2 h-4 w-4" /> New Entry · အသစ်ထည့်ရန်
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditingId(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Order Entry" : "New Order Entry"}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={stage} onValueChange={(v) => setStage(v as "issue" | "return")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="issue">Stage 1 · Issue (အထည်ပေး)</TabsTrigger>
              <TabsTrigger value="return">Stage 2 · Return (အပ်)</TabsTrigger>
            </TabsList>

            <TabsContent value="issue" className="space-y-3 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Issue Date · ပေးရက်စွဲ" type="date"
                  value={form.issue_date} onChange={(v) => setForm({ ...form, issue_date: v })} />
                <Field label="Ordered Qty · ခိုင်းခုရေ" value={form.ordered_qty}
                  onChange={(v) => setForm({ ...form, ordered_qty: v })} />
                <Field label="Issued Item · ပေးအမျိုးအမည်" value={form.issued_item_name}
                  onChange={(v) => setForm({ ...form, issued_item_name: v })}
                  list={data.products.map((p) => p.name)} />
                <Field label="Gold Quality · ပဲရည်" placeholder="e.g. 15 ပဲရည်"
                  value={form.gold_quality} onChange={(v) => setForm({ ...form, gold_quality: v })} />
                <Field label="Wastage / Piece · တစ်ခုစီ အလျော့" value={form.wastage_per_piece}
                  onChange={(v) => setForm({ ...form, wastage_per_piece: v })} placeholder="e.g. 0.5" />
                <Field label="Issued Weight (g) · ပေး Gram" value={form.issued_weight}
                  onChange={(v) => setForm({ ...form, issued_weight: v })} />
                <div className="md:col-span-2">
                  <Field label="Measurements / Specs · အတိုင်းအတာ" value={form.specs}
                    onChange={(v) => setForm({ ...form, specs: v })} placeholder="e.g. လက်တိုင်း 18 မှ 25" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="return" className="space-y-3 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Return Date · အပ်ရက်စွဲ" type="date"
                  value={form.return_date} onChange={(v) => setForm({ ...form, return_date: v })} />
                <Field label="Returned Qty · အပ်ခုရေ" value={form.returned_qty}
                  onChange={(v) => setForm({ ...form, returned_qty: v })} />
                <Field label="Returned Item · အပ်အမျိုးအမည်" value={form.returned_item_name || form.issued_item_name}
                  onChange={(v) => setForm({ ...form, returned_item_name: v })}
                  list={data.products.map((p) => p.name)} />
                <Field label="Returned Specs · အပ်အတိုင်းအတာ" value={form.returned_specs || form.specs}
                  onChange={(v) => setForm({ ...form, returned_specs: v })} />
                <Field label="Returned Weight (g) · အပ် Gram" value={form.returned_weight}
                  onChange={(v) => setForm({ ...form, returned_weight: v })} />
                <Field label="Thread Loss - အပ်ချည်လျော့" value={form.fire_loss}
                  onChange={(v) => setForm({ ...form, fire_loss: v })} />
                <Field label="Water Loss - ရေကင်လျော့" value={form.water_loss}
                  onChange={(v) => setForm({ ...form, water_loss: v })} />
              </div>

              <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total Wastage · စုစုပေါင်း အလျော့တွက် (Rati → g)
                </p>
                <p className="font-display text-lg font-semibold tabular-nums">
                  {(Number(form.wastage_per_piece) || 0)} × {(Number(form.returned_qty) || 0)} ={" "}
                  <span className="text-gold">{previewWaste.toFixed(2)}g</span>
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/30 p-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Due (လိုရွှေ)</p>
              <p className="font-display text-lg font-semibold tabular-nums text-[color:var(--due)]">
                {fmt(preview.due_gold)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Excess (ပိုရွှေ)</p>
              <p className="font-display text-lg font-semibold tabular-nums text-[color:var(--excess)]">
                {fmt(preview.excess_gold)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              <X className="mr-1 h-4 w-4" /> Cancel
            </Button>
            <Button onClick={() => saveOrder.mutate()} disabled={saveOrder.isPending}
              className="bg-gradient-gold text-primary-foreground">
              {saveOrder.isPending ? "Saving…" : editingId ? "Update Entry" : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total Due Gold" myanmar="စုစုပေါင်း လိုရွှေ (g)"
          value={fmt(totalDue)} tone="due" icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Total Excess Gold" myanmar="စုစုပေါင်း ပိုရွှေ (g)"
          value={fmt(totalExcess)} tone="excess" icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search items, quality…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-left uppercase tracking-wider text-muted-foreground">
                <Th>စုစုပေါင်းပိုရွှေ</Th>
                <Th>Qty</Th>
                <Th>Item</Th>
                <Th>Quality</Th>
                <Th className="text-right">Issued (g)</Th>
                <Th>Return / အပ်</Th>
                <Th>Qty</Th>
                <Th>Item</Th>
                <Th className="text-right">Ret (g)</Th>
                <Th className="text-right">Wastage</Th>
                <Th className="text-right">Thread</Th>
                <Th className="text-right">Water</Th>
                <Th className="text-right">Due</Th>
                <Th className="text-right">Excess</Th>
                <Th className="text-right bg-[color:var(--due)]/10">Total Due</Th>
                <Th className="text-right bg-[color:var(--excess)]/10">Total Excess</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={17} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    No entries yet. Click "New Entry" to add the first one.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const wpp = Number(o.wastage_per_piece ?? 0);
                  const rq = Number(o.returned_qty ?? 0);
                  const wasteG = computeTotalWastage(o);
                  const wasteText = wpp > 0 && rq > 0 ? `${wpp} × ${rq} = ${wasteG.toFixed(2)}g` : `${Number(o.wastage ?? 0).toFixed(2)}g`;
                  const isReturned = o.return_date && o.returned_qty != null;
                  return (
                    <tr key={o.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                      <Td>{o.issue_date ?? "—"}</Td>
                      <Td>{fmt(o.ordered_qty)}</Td>
                      <Td className="font-medium">{o.issued_item_name ?? "—"}</Td>
                      <Td>{o.gold_quality ?? "—"}</Td>
                      <Td className="text-right tabular-nums">{fmt(o.issued_weight)}</Td>
                      <Td className={isReturned ? "" : "text-muted-foreground"}>
                        {o.return_date ?? <span className="italic">pending</span>}
                      </Td>
                      <Td>{fmt(o.returned_qty)}</Td>
                      <Td className="font-medium">{o.returned_item_name ?? "—"}</Td>
                      <Td className="text-right tabular-nums">{fmt(o.returned_weight)}</Td>
                      <Td className="text-right tabular-nums" title={wasteText}>{wasteText}</Td>
                      <Td className="text-right tabular-nums">{fmt(o.fire_loss)}</Td>
                      <Td className="text-right tabular-nums">{fmt(o.water_loss)}</Td>
                      <Td className="text-right tabular-nums text-[color:var(--due)]">{fmt(o.due_gold)}</Td>
                      <Td className="text-right tabular-nums text-[color:var(--excess)]">{fmt(o.excess_gold)}</Td>
                      <Td className="text-right font-semibold tabular-nums text-[color:var(--due)] bg-[color:var(--due)]/5">
                        {fmt(o.total_due_gold)}
                      </Td>
                      <Td className="text-right font-semibold tabular-nums text-[color:var(--excess)] bg-[color:var(--excess)]/5">
                        {fmt(o.total_excess_gold)}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(o)}
                            className="text-muted-foreground hover:text-gold"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Delete this entry?")) deleteOrder.mutate(o.id);
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2.5 tabular-nums text-center ${className}`}>{children}</th>;
}
function Td({ children, className = "", title }: { children?: React.ReactNode; className?: string; title?: string }) {
  return <td className={`px-3 py-2.5 ${className}`} title={title}>{children}</td>;
}

function Field({
  label, value, onChange, type = "text", placeholder, list,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  list?: string[];
}) {
  const listId = list ? `list-${label.replace(/\s+/g, "-")}` : undefined;
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
      />
      {list && (
        <datalist id={listId}>
          {list.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      )}
    </div>
  );
}
