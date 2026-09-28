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
import { useAuth } from "@/hooks/use-auth";
import { depositLimitGrams, outstandingGrams, OverLimitAlert } from "@/lib/risk";
import { CreatableCombobox } from "@/components/creatable-combobox";
import { SamplePhotoUpload, SamplePhotoViewer } from "@/components/sample-photo";

export const Route = createFileRoute("/_authenticated/goldsmiths/$id/books/$bookId")({
  component: BookLedger,
  head: () => ({
    meta: [
      { title: "Order Book — Pyit Taing Htaung Gold" },
      { name: "description", content: "Manage goldsmith issue and return entries, gold weights, and running balances." },
      { property: "og:title", content: "Order Book — Pyit Taing Htaung Gold" },
      { property: "og:description", content: "Manage goldsmith issue and return entries, gold weights, and running balances." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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
  item_classification: "shop" | "order" | "";
  return_due_date: string;
  quality_group: string;
  // Stage 2: Return
  return_date: string;
  returned_qty: string;
  returned_item_name: string;
  returned_specs: string;
  returned_weight: string;
  fire_loss: string;
  water_loss: string;
  gem_weight: string;
  issued_gem_weight: string;
  scrap_gold: string;
  stone_setting_wastage: string;
  broken_gem_note: string;
  sample_photo_url: string | null;
};

const blankForm = (): FormState => ({
  issue_date: todayStr(),
  ordered_qty: "",
  issued_item_name: "",
  gold_quality: "",
  wastage_per_piece: "",
  issued_weight: "",
  specs: "",
  item_classification: "",
  return_due_date: "",
  quality_group: "",
  return_date: "",
  returned_qty: "",
  returned_item_name: "",
  returned_specs: "",
  returned_weight: "",
  fire_loss: "",
  water_loss: "",
  gem_weight: "",
  issued_gem_weight: "",
  scrap_gold: "",
  stone_setting_wastage: "",
  broken_gem_note: "",
  sample_photo_url: null,
});

const fromOrder = (o: OrderRow): FormState => ({
  issue_date: o.issue_date ?? todayStr(),
  ordered_qty: o.ordered_qty?.toString() ?? "",
  issued_item_name: o.issued_item_name ?? "",
  gold_quality: o.gold_quality ?? "",
  wastage_per_piece: o.wastage_per_piece?.toString() ?? "",
  issued_weight: o.issued_weight?.toString() ?? "",
  specs: o.specs ?? "",
  item_classification: ((o as { item_classification?: string }).item_classification as "shop" | "order" | undefined) ?? "",
  return_due_date: o.return_due_date ?? "",
  quality_group: (o as { quality_group?: string | null }).quality_group ?? "",
  return_date: o.return_date ?? "",
  returned_qty: o.returned_qty?.toString() ?? "",
  returned_item_name: o.returned_item_name ?? o.issued_item_name ?? "",
  returned_specs: o.specs ?? "",
  returned_weight: o.returned_weight?.toString() ?? "",
  fire_loss: o.fire_loss?.toString() ?? "",
  water_loss: o.water_loss?.toString() ?? "",
  gem_weight: (o as { gem_weight?: number | null }).gem_weight?.toString() ?? "",
  issued_gem_weight: (o as { issued_gem_weight?: number | null }).issued_gem_weight?.toString() ?? "",
  scrap_gold: (o as { scrap_gold?: number | null }).scrap_gold?.toString() ?? "",
  stone_setting_wastage: (o as { stone_setting_wastage?: number | null }).stone_setting_wastage?.toString() ?? "",
  broken_gem_note: (o as { broken_gem_note?: string | null }).broken_gem_note ?? "",
  sample_photo_url: o.sample_photo_url ?? null,
});


function BookLedger() {
  const { id, bookId } = Route.useParams();
  const qc = useQueryClient();
  const { canDelete } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());
  const [stage, setStage] = useState<"issue" | "return">("issue");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["book", bookId],
    queryFn: async () => {
      const [{ data: book }, { data: goldsmith }, { data: orders }, { data: products }, { data: specialties }] =
        await Promise.all([
          supabase.from("books").select("*").eq("id", bookId).single(),
          supabase.from("goldsmiths").select("*").eq("id", id).single(),
          supabase.from("orders").select("*").eq("book_id", bookId).order("sort_index"),
          supabase.from("products").select("*").order("name"),
          supabase.from("goldsmith_specialties").select("product_id").eq("goldsmith_id", id),
        ]);
      const { data: gBooks } = await supabase.from("books").select("id").eq("goldsmith_id", id);
      const ids = (gBooks ?? []).map((b) => b.id);
      const { data: allOrders } = ids.length ? await supabase.from("orders").select("*").in("book_id", ids) : { data: [] };
      return {
        book: book!,
        goldsmith: goldsmith!,
        orders: (orders ?? []) as OrderRow[],
        products: products ?? [],
        specialtyIds: new Set((specialties ?? []).map((specialty) => specialty.product_id as string)),
        allOrders: (allOrders ?? []) as OrderRow[],
      };
    },
  });

  const recomputed = useMemo(
    () => (data ? recomputeBookTotals(data.orders) : []),
    [data],
  );

  const issuedItemOptions = useMemo(
    () => data?.products
      .filter((product) => data.specialtyIds.has(product.id))
      .map((product) => product.name) ?? [],
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
    const qg = ((data?.goldsmith as { quality_groups?: string[] } | undefined)?.quality_groups ?? [])[0] ?? "";
    setForm({ ...blankForm(), quality_group: qg });
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
      return_due_date: form.return_due_date || null,
      quality_group: form.quality_group || null,
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
      issued_gem_weight: num(form.issued_gem_weight) ?? 0,
      gem_weight: num(form.gem_weight) ?? 0,
      scrap_gold: num(form.scrap_gold) ?? 0,
      stone_setting_wastage: 0,
      broken_gem_note: form.broken_gem_note.trim() || null,
      item_classification: form.item_classification || null,
      sample_photo_url: form.sample_photo_url,
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
    issued_gem_weight: Number(form.issued_gem_weight) || 0,
    gem_weight: Number(form.gem_weight) || 0,
    scrap_gold: Number(form.scrap_gold) || 0,
    stone_setting_wastage: 0,
  });

  const totalIssuedPreview = (Number(form.issued_weight) || 0) + (Number(form.issued_gem_weight) || 0);


  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const limit = depositLimitGrams(data.goldsmith as never);
  const outstanding = outstandingGrams(data.allOrders);
  const overLimit = limit !== null && outstanding > limit;

  return (
    <div className="space-y-4 xl:space-y-5">
      {overLimit && <OverLimitAlert outstanding={outstanding} limit={limit!} />}
      <Link
        to="/goldsmiths/$id"
        params={{ id }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {data.goldsmith.name}
      </Link>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            Order Book · အော်ဒါစာအုပ်
          </p>
          <h1 className="mt-0.5 truncate font-display text-2xl font-semibold lg:text-3xl">{data.book.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.goldsmith.name}
            {(data.goldsmith as { symbol?: string | null }).symbol && (
              <span className="ml-2 rounded border border-gold/40 bg-gold-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-gold">
                {(data.goldsmith as { symbol?: string | null }).symbol}
              </span>
            )}
            <span className="ml-2">· {recomputed.length} entries</span>
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
        <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-4xl gap-3 overflow-y-auto p-4 sm:p-5">
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

            <TabsContent value="issue" className="space-y-2 pt-2">
              {overLimit && <OverLimitAlert outstanding={outstanding} limit={limit!} />}
              <div className="grid gap-x-3 gap-y-2 sm:grid-cols-2">
                <Field label="Due Date · အပ်ရမည့်ရက်" type="date"
                  value={form.return_due_date} onChange={(v) => setForm({ ...form, return_due_date: v })} />
                <div>
                  <Label className="text-xs">Quality Group · အဆင့်</Label>
                  <div className="mt-1 flex gap-2">
                    {(["A", "B", "C"] as const).map((q) => (
                      <Button key={q} type="button" size="sm"
                        variant={form.quality_group === q ? "default" : "outline"}
                        className={form.quality_group === q ? "bg-gradient-gold text-primary-foreground" : ""}
                        onClick={() => setForm({ ...form, quality_group: q })}>
                        {q} · {q === "A" ? "15 ပဲ" : q === "B" ? "14ပဲ2ပြား" : "14 ပဲ"}
                      </Button>
                    ))}
                  </div>
                </div>
                <Field label="Issue Date · ပေးရက်စွဲ" type="date"
                  value={form.issue_date} onChange={(v) => setForm({ ...form, issue_date: v })} />
                <Field label="Ordered Qty · ခိုင်းခုရေ" value={form.ordered_qty}
                  onChange={(v) => setForm({ ...form, ordered_qty: v })} />
                <div>
                  <Label className="text-xs">Issued Item · ပေးအမျိုးအမည်</Label>
                  <CreatableCombobox
                    value={form.issued_item_name}
                    onChange={(value) => setForm({ ...form, issued_item_name: value })}
                    options={issuedItemOptions}
                    ariaLabel="Issued Item · ပေးအမျိုးအမည်"
                    placeholder="Select assigned item or type a custom name"
                    emptyText={issuedItemOptions.length ? "No assigned item matches" : "No specialties assigned; type a custom item name"}
                  />
                </div>
                <Field label="Gold Quality · ပဲရည်" placeholder="e.g. 15 ပဲရည်"
                  value={form.gold_quality} onChange={(v) => setForm({ ...form, gold_quality: v })} />
                <Field label="Wastage / Piece · တစ်ခုစီ အလျော့" value={form.wastage_per_piece}
                  onChange={(v) => setForm({ ...form, wastage_per_piece: v })} placeholder="e.g. 0.5" />
                <Field label="Issued Gold Gram · ပေးရွှေ (g)" value={form.issued_weight}
                  onChange={(v) => setForm({ ...form, issued_weight: v })} />
                <Field label="Issued Gem Weight · ပေးကျောက်ချိန် (g)" value={form.issued_gem_weight}
                  onChange={(v) => setForm({ ...form, issued_gem_weight: v })} placeholder="0.00" />
                <div className="rounded-md border bg-muted/30 p-2 text-sm sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Total Issued Weight · စုစုပေါင်း ပေးချိန် (ရွှေ + ကျောက်)
                  </p>
                  <p className="font-display text-lg font-semibold tabular-nums">
                    {(Number(form.issued_weight) || 0)} + {(Number(form.issued_gem_weight) || 0)} ={" "}
                    <span className="text-gold">{totalIssuedPreview.toFixed(2)}g</span>
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Measurements / Specs · အတိုင်းအတာ" value={form.specs}
                    onChange={(v) => setForm({ ...form, specs: v })} placeholder="e.g. လက်တိုင်း 18 မှ 25" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Item Classification · အထည်အမျိုးအစား</Label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {([
                      { v: "shop", label: "ဆိုင်ထည် · Shop Stock", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700" },
                      { v: "order", label: "Order ထည် · Customer Order", cls: "border-rose-500/40 bg-rose-500/10 text-rose-700" },
                    ] as const).map((opt) => {
                      const active = form.item_classification === opt.v;
                      return (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setForm({ ...form, item_classification: active ? "" : opt.v })}
                          className={`rounded-md border px-3 py-2 text-sm font-medium transition ${active ? opt.cls : "border-border bg-background text-muted-foreground hover:bg-muted/50"}`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  {form.sample_photo_url && (
                    <div className="mb-2 flex items-center gap-3 rounded-md border bg-muted/20 p-2">
                      <SamplePhotoViewer path={form.sample_photo_url} label={form.issued_item_name || "Sample photo"} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Attached Sample Photo · နမူနာပုံ</p>
                        <p className="text-xs text-muted-foreground">Tap the photo to view or download.</p>
                      </div>
                    </div>
                  )}
                  <SamplePhotoUpload
                    value={form.sample_photo_url}
                    onChange={(sample_photo_url) => setForm({ ...form, sample_photo_url })}
                    compact
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="return" className="space-y-2 pt-2">
              <div className="grid gap-x-3 gap-y-2 sm:grid-cols-2">
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
                  onChange={(v) => setForm({ ...form, returned_weight: v })} placeholder="Finished item weight" />
                <Field label="Scrap Gold · ကျခဲ (g)" value={form.scrap_gold}
                  onChange={(v) => setForm({ ...form, scrap_gold: v })} placeholder="0.00" />
                <Field label="Broken Gem Weight · ပျက်ကျောက်ချိန် (g)" value={form.gem_weight}
                  onChange={(v) => setForm({ ...form, gem_weight: v })} placeholder="0.00" />
                <Field label="Broken Gem Note · ပျက်ကျောက်မှတ်ချက်" value={form.broken_gem_note}
                  onChange={(v) => setForm({ ...form, broken_gem_note: v })} placeholder="e.g. 3 stones broken" />
                <Field label="Thread Loss · အပ်ချည်လျော့" value={form.fire_loss}
                  onChange={(v) => setForm({ ...form, fire_loss: v })} />
                <Field label="Water Loss · ရေကင်လျော့" value={form.water_loss}
                  onChange={(v) => setForm({ ...form, water_loss: v })} />

              </div>

              <div className="rounded-md border bg-muted/30 p-2 text-sm">
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

          <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-2 text-sm">
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

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="စုစုပေါင်းလိုရွှေ (g)" myanmar="Total Due Gold"
          value={fmt(totalDue)} tone="due" icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="စုစုပေါင်းပိုရွှေ (g)" myanmar="Total Excess Gold"
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

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-left tracking-wider text-muted-foreground">
                <Th>ပေးDate</Th>
                <Th className="text-right">ပေးခုရေ</Th>
                <Th>အမျိုးအမည်</Th>
                <Th className="text-center">ဆိုင်ထည်</Th>
                <Th className="text-center">Order ထည်</Th>
                <Th>အရည် (Density)</Th>
                <Th className="text-right">ပေး (gram)</Th>
                <Th>အပ်Date</Th>
                <Th className="text-right">အပ်ခုရေ</Th>
                <Th>အမျိုးအမည်</Th>
                <Th className="text-right">အပ် (gram)</Th>
                <Th className="text-right">ပျက်ကျောက်ချိန် (g)</Th>
                <Th className="text-right">ကျခဲ (g)</Th>
                <Th className="text-right">အလျော့တွက်</Th>
                <Th className="text-right">ကြိုးချည်လျော့</Th>
                <Th className="text-right">ရေကင်လျော့</Th>
                <Th className="text-right">လိုရွှေ</Th>
                <Th className="text-right">ပိုရွှေ</Th>
                <Th className="text-right bg-[color:var(--due)]/10">စုစုပေါင်းလိုရွှေ</Th>
                <Th className="text-right bg-[color:var(--excess)]/10">စုစုပေါင်းပိုရွှေ</Th>
                <Th className="border-r-0"></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={21} className="px-6 py-12 text-center text-sm text-muted-foreground">
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
                  const cls = (o as { item_classification?: string | null }).item_classification;
                  return (
                    <tr key={o.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                      <Td>{o.issue_date ?? "—"}</Td>
                      <Td className="text-right tabular-nums">{fmt(o.ordered_qty)}</Td>
                      <Td className="font-medium">{o.issued_item_name ?? "—"}</Td>
                      <Td className="text-center">
                        {cls === "shop" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> ဆိုင်ထည်
                          </span>
                        ) : ""}
                      </Td>
                      <Td className="text-center">
                        {cls === "order" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Order ထည်
                          </span>
                        ) : ""}
                      </Td>
                      <Td>{o.gold_quality ?? "—"}</Td>
                      <Td className="text-right tabular-nums">{fmt(o.issued_weight)}</Td>
                      <Td className={isReturned ? "" : "text-muted-foreground"}>
                        {o.return_date ?? <span className="italic">pending</span>}
                      </Td>
                      <Td className="text-right tabular-nums">{fmt(o.returned_qty)}</Td>
                      <Td className="font-medium">{o.returned_item_name ?? "—"}</Td>
                      <Td className="text-right tabular-nums">{fmt(o.returned_weight)}</Td>
                      <Td className="text-right tabular-nums" title={(o as { broken_gem_note?: string | null }).broken_gem_note ?? undefined}>
                        {fmt((o as { gem_weight?: number | null }).gem_weight)}
                      </Td>
                      <Td className="text-right tabular-nums">{fmt((o as { scrap_gold?: number | null }).scrap_gold) }</Td>
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
                          {canDelete ? (
                            <button
                              onClick={() => {
                                if (confirm("Delete this entry?")) deleteOrder.mutate(o.id);
                              }}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              disabled
                              title="Super Admin permission required to delete"
                              className="cursor-not-allowed text-muted-foreground/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
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
  return <th className={`whitespace-nowrap border-r border-border/40 px-2 py-2 align-middle text-[11px] font-semibold xl:px-3 xl:text-xs ${className}`}>{children}</th>;
}
function Td({ children, className = "", title }: { children?: React.ReactNode; className?: string; title?: string }) {
  return <td className={`whitespace-nowrap border-r border-border/30 px-2 py-2 align-middle xl:px-3 ${className}`} title={title}>{children}</td>;
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
