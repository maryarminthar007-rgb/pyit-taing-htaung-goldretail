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
import { computeOrderTotals, computeTotalWastage, recomputeBookTotals, parseIssuedItems, itemsWastageGrams, effectiveQty, type OrderRow } from "@/lib/calc";
import { useAuth } from "@/hooks/use-auth";
import { Grams } from "@/components/figures";
import { depositLimitGrams, outstandingGrams, OverLimitAlert } from "@/lib/risk";
import { CreatableCombobox } from "@/components/creatable-combobox";
import { SamplePhotoUpload, SamplePhotoViewer } from "@/components/sample-photo";
import { DateField } from "@/components/date-field";
import { formatDate, todayIso } from "@/lib/date";

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

type ItemRow = { name: string; qty: string; wpp: string; rqty?: string };
const blankItem = (): ItemRow => ({ name: "", qty: "", wpp: "", rqty: "" });
const toItems = (rows: ItemRow[]) =>
  rows
    .filter((r) => r.name.trim() || r.qty.trim() || r.wpp.trim())
    .map((r) => ({ name: r.name.trim(), qty: Number(r.qty) || 0, wastage_per_piece: Number(r.wpp) || 0, returned_qty: (r.rqty ?? "").trim() === "" ? null : Number(r.rqty) || 0 }));

type FormState = {
  items: ItemRow[];
  // Stage 1: Issue
  issue_date: string;
  ordered_qty: string;
  issued_item_name: string;
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
  items: [blankItem()],
  issue_date: todayIso(),
  ordered_qty: "",
  issued_item_name: "",
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

const legacyItems = (o: OrderRow): ItemRow[] => {
  const saved = parseIssuedItems(o.issued_items);
  if (saved.length) return saved.map((i) => ({ name: i.name, qty: String(i.qty || ""), wpp: String(i.wastage_per_piece || ""), rqty: i.returned_qty == null ? "" : String(i.returned_qty) }));
  return [{ name: o.issued_item_name ?? "", qty: o.ordered_qty?.toString() ?? "", wpp: o.wastage_per_piece?.toString() ?? "" }];
};

const fromOrder = (o: OrderRow): FormState => ({
  items: legacyItems(o),
  issue_date: o.issue_date ?? todayIso(),
  ordered_qty: o.ordered_qty?.toString() ?? "",
  issued_item_name: o.issued_item_name ?? "",
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
  const [photoUploading, setPhotoUploading] = useState(false);
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
        ((o as { quality_group?: string | null }).quality_group ?? "").toLowerCase().includes(q),
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
    const items = toItems(form.items);
    const wpp = items[0]?.wastage_per_piece ?? 0;
    const hasReturn = !!form.return_date || form.returned_weight.trim() !== "" || items.some((i) => i.returned_qty != null);
    const rqty = items.length ? (hasReturn ? items.reduce((s, i) => s + effectiveQty(i), 0) : null) : num(form.returned_qty);
    const total_wastage = computeTotalWastage({ wastage_per_piece: wpp, returned_qty: rqty, wastage: 0, issued_items: items });
    const orderedQty = items.reduce((s, i) => s + i.qty, 0);
    const itemNames = items.map((i) => i.name).filter(Boolean).join(", ");
    const payload = {
      book_id: bookId,
      issue_date: form.issue_date || null,
      return_due_date: form.return_due_date || null,
      quality_group: form.quality_group || null,
      issued_items: items,
      ordered_qty: items.length ? orderedQty : null,
      issued_item_name: itemNames || null,
      specs: (stage === "return" ? form.returned_specs : form.specs).trim() || null,
      issued_weight: num(form.issued_weight) ?? 0,
      wastage_per_piece: wpp,
      return_date: form.return_date || null,
      returned_qty: rqty,
      returned_item_name: form.returned_item_name.trim() || itemNames || null,
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

  const formItems = toItems(form.items);
  const previewWaste = itemsWastageGrams(formItems);
  const previewOrderedQty = formItems.reduce((s, i) => s + i.qty, 0);
  const previewReturnedQty = formItems.reduce((s, i) => s + effectiveQty(i), 0);
  const previewItemNames = formItems.map((i) => i.name).filter(Boolean).join(", ");
  const setItem = (idx: number, patch: Partial<ItemRow>) =>
    setForm({ ...form, items: form.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });

  const preview = computeOrderTotals({
    issued_weight: Number(form.issued_weight) || 0,
    returned_weight: Number(form.returned_weight) || 0,
    wastage: 0,
    wastage_per_piece: 0,
    returned_qty: formItems.length ? previewReturnedQty : Number(form.returned_qty) || 0,
    issued_items: formItems.length ? formItems : [{ name: "", qty: 0, wastage_per_piece: 0 }],
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
                <SectionLabel title="Schedule & Quality" myanmar="ရက်စွဲနှင့် အရည်အသွေး" />
                <DateField label="Due Date · အပ်ရမည့်ရက်"
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
                <DateField label="Issue Date · ပေးရက်စွဲ"
                  value={form.issue_date} onChange={(v) => setForm({ ...form, issue_date: v })} />
                <SectionLabel title="Items" myanmar="ပေးအထည်များ" />
                <div className="space-y-2 sm:col-span-2">
                  <div className="hidden grid-cols-[minmax(0,1fr)_5.5rem_6.5rem_2rem] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground sm:grid">
                    <span>Issued Item · ပေးအမျိုးအမည်</span><span>Qty · ခုရေ</span><span>Wastage/Pc · ရွေး</span><span />
                  </div>
                  {form.items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-[minmax(0,1fr)_5.5rem_6.5rem_2rem] items-center gap-2">
                      <CreatableCombobox
                        value={it.name}
                        onChange={(value) => setItem(idx, { name: value })}
                        options={issuedItemOptions}
                        ariaLabel={`Issued Item ${idx + 1}`}
                        placeholder="Select or type item"
                        emptyText={issuedItemOptions.length ? "No assigned item matches" : "No specialties assigned; type a custom item name"}
                      />
                      <Input inputMode="decimal" aria-label={`Qty ${idx + 1}`} value={it.qty} placeholder="Qty"
                        onChange={(e) => setItem(idx, { qty: e.target.value })} />
                      <Input inputMode="decimal" aria-label={`Wastage per piece ${idx + 1}`} value={it.wpp} placeholder="e.g. 0.5"
                        onChange={(e) => setItem(idx, { wpp: e.target.value })} />
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Remove item"
                        disabled={form.items.length === 1}
                        onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2">
                    <Button type="button" size="sm" variant="outline"
                      onClick={() => setForm({ ...form, items: [...form.items, blankItem()] })}>
                      <Plus className="mr-1 h-4 w-4" /> Add Item · အထည်ထပ်ထည့်
                    </Button>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      Total Qty · စုစုပေါင်းခုရေ: <span className="font-semibold text-foreground">{previewOrderedQty}</span>
                    </span>
                  </div>
                </div>
                <SectionLabel title="Issued Weights" myanmar="ပေးချိန်များ" />
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
                <SectionLabel title="Classification" myanmar="အထည်အမျိုးအစား" />
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
                <SectionLabel title="Sample Reference" myanmar="နမူနာပုံ" />
                <div className="sm:col-span-2">
                  {form.sample_photo_url && (
                    <div className="mb-2 flex items-center gap-3 rounded-md border bg-muted/20 p-2">
                      <SamplePhotoViewer path={form.sample_photo_url} label={form.issued_item_name || "Sample photo"} showAction />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Attached Sample Photo · နမူနာပုံ</p>
                        <p className="text-xs text-muted-foreground">Tap the photo to view or download.</p>
                      </div>
                    </div>
                  )}
                  <SamplePhotoUpload
                    value={form.sample_photo_url}
                    onChange={(sample_photo_url) => setForm({ ...form, sample_photo_url })}
                    onUploadingChange={setPhotoUploading}
                    compact
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="return" className="space-y-2 pt-2">
              <div className="grid gap-x-3 gap-y-2 sm:grid-cols-2">
                <div className="rounded-md border bg-muted/20 p-2 text-xs sm:col-span-2">
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Assigned in Stage 1 · ပေးထားသောအထည်များ
                  </p>
                  {formItems.length === 0 ? (
                    <p className="text-muted-foreground">No items entered in Stage 1.</p>
                  ) : (
                    <div className="space-y-1 tabular-nums">
                      <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_4rem_5.5rem] gap-2 text-[10px] uppercase text-muted-foreground">
                        <span>Item · အမျိုးအမည်</span><span>Issued</span><span>ရွေး/pc</span><span>Returned Qty · အပ်ခုရေ</span>
                      </div>
                      {formItems.map((i, idx) => {
                        const rowIdx = form.items.findIndex((r) => r.name.trim() === i.name && Number(r.qty) === i.qty);
                        const realIdx = rowIdx >= 0 ? rowIdx : idx;
                        return (
                          <div key={idx} className="grid grid-cols-[minmax(0,1fr)_3.5rem_4rem_5.5rem] items-center gap-2">
                            <span className="truncate">{i.name || "—"}</span>
                            <span>× {i.qty}</span>
                            <span className="text-muted-foreground">{i.wastage_per_piece}</span>
                            <Input type="number" inputMode="decimal" min="0" className="h-8"
                              aria-label={`Returned qty for ${i.name || "item"}`}
                              value={form.items[realIdx]?.rqty ?? ""} placeholder={String(i.qty)}
                              onChange={(e) => setItem(realIdx, { rqty: e.target.value })} />
                          </div>
                        );
                      })}
                      <div className="mt-1 border-t pt-1 font-semibold">
                        Total · စုစုပေါင်း: Issued {previewOrderedQty} · Returned {previewReturnedQty}
                      </div>
                    </div>
                  )}
                </div>
                <SectionLabel title="Return Details" myanmar="အပ်သည့်အချက်အလက်" />
                <DateField label="Return Date · အပ်ရက်စွဲ"
                  value={form.return_date} onChange={(v) => setForm({ ...form, return_date: v })} />
                {formItems.length === 0 && (
                  <Field label="Returned Qty · အပ်ခုရေ" value={form.returned_qty}
                    onChange={(v) => setForm({ ...form, returned_qty: v })} />
                )}
                <Field label="Returned Item · အပ်အမျိုးအမည်" value={form.returned_item_name || previewItemNames}
                  onChange={(v) => setForm({ ...form, returned_item_name: v })}
                  list={data.products.map((p) => p.name)} />
                <Field label="Returned Specs · အပ်အတိုင်းအတာ" value={form.returned_specs || form.specs}
                  onChange={(v) => setForm({ ...form, returned_specs: v })} />
                <SectionLabel title="Returned Weights & Losses" myanmar="အပ်ချိန်နှင့် အလျော့များ" />
                <Field label="Returned Weight (g) · အပ် Gram" value={form.returned_weight}
                  onChange={(v) => setForm({ ...form, returned_weight: v })} placeholder="Finished item weight" />
                <Field label="Scrap Gold · ကျခဲ (g)" value={form.scrap_gold}
                  onChange={(v) => setForm({ ...form, scrap_gold: v })} placeholder="0.00" />
                <p className="-mt-1 text-[10px] leading-relaxed text-muted-foreground sm:col-span-2">
                  Display only · အပ် Gram ထဲတွင် ပါဝင်ပြီးသားဖြစ်၍ လိုရွှေ/ပိုရွှေ တွက်ချက်မှုတွင် ထပ်မပေါင်းပါ။
                </p>
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
                  Total Wastage · စုစုပေါင်း အလျော့တွက် (returned qty × ရွေး/pc, Rati → g)
                </p>
                <p className="font-display text-lg font-semibold tabular-nums">
                  Σ({formItems.map((i) => `${effectiveQty(i)}×${i.wastage_per_piece}`).join(" + ") || "0"}) ÷ 128 × 16.6 ={" "}
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
            <Button onClick={() => saveOrder.mutate()} disabled={saveOrder.isPending || photoUploading}
              className="bg-gradient-gold text-primary-foreground">
              {photoUploading ? "Uploading photo…" : saveOrder.isPending ? "Saving…" : editingId ? "Update Entry" : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 divide-x overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <p className="min-w-0 text-[10px] font-medium leading-tight text-muted-foreground sm:text-xs">
            Total Due Gold <span className="block sm:inline">· စုစုပေါင်းလိုရွှေ</span>
          </p>
          <Grams value={totalDue} size="row" className="shrink-0 text-[color:var(--due)]" />
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <p className="min-w-0 text-[10px] font-medium leading-tight text-muted-foreground sm:text-xs">
            Total Excess Gold <span className="block sm:inline">· စုစုပေါင်းပိုရွှေ</span>
          </p>
          <Grams value={totalExcess} size="row" className="shrink-0 text-[color:var(--excess)]" />
        </div>
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
          <table className="w-full table-fixed text-[11px] xl:text-xs">
            <thead>
              <tr className="border-b bg-muted/50 text-left tracking-wider text-muted-foreground">
                <Th className="w-[14%]">Date<br /><span className="font-normal">ပေး / အပ်ရမည့်</span></Th>
                <Th className="w-[18%]">Item Name<br /><span className="font-normal">အမျိုးအမည်</span></Th>
                <Th className="w-[7%] text-right">Qty<br /><span className="font-normal">ခိုင်းခုရေ</span></Th>
                <Th className="w-[10%] text-right">Issued Gold<br /><span className="font-normal">ပေးရွှေ</span></Th>
                <Th className="w-[10%] text-right">Returned Gold<br /><span className="font-normal">အပ် Gram</span></Th>
                <Th className="w-[8%] text-center">Purity<br /><span className="font-normal">အဆင့်</span></Th>
                <Th className="w-[12%]">Status<br /><span className="font-normal">အခြေအနေ</span></Th>
                <Th className="w-[12%] text-right">Balance<br /><span className="font-normal">လို / ပို</span></Th>
                <Th className="w-[70px] border-r-0 text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    No entries yet. Click "New Entry" to add the first one.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const isReturned = o.return_date && o.returned_qty != null;
                  const qualityGroup = (o as { quality_group?: string | null }).quality_group;
                  const balance = Number(o.total_due_gold ?? 0) > 0
                    ? { label: `${fmt(o.total_due_gold)}g Due`, className: "text-[color:var(--due)]" }
                    : Number(o.total_excess_gold ?? 0) > 0
                      ? { label: `${fmt(o.total_excess_gold)}g Excess`, className: "text-[color:var(--excess)]" }
                      : { label: "Balanced", className: "text-muted-foreground" };
                  return (
                    <tr key={o.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                      <Td>
                        <span className="block whitespace-nowrap">{formatDate(o.issue_date)}</span>
                        <span className="mt-0.5 block whitespace-nowrap text-[9px] text-muted-foreground">Due {formatDate(o.return_due_date)}</span>
                      </Td>
                      <Td className="font-medium">
                        <span className="block truncate" title={o.issued_item_name ?? undefined}>{o.issued_item_name ?? "—"}</span>
                      </Td>
                      <Td className="text-right font-medium tabular-nums">{fmt(o.ordered_qty)}</Td>
                      <Td className="text-right"><Grams value={Number(o.issued_weight ?? 0)} size="micro" /></Td>
                      <Td className="text-right"><Grams value={Number(o.returned_weight ?? 0)} size="micro" /></Td>
                      <Td className="text-center">
                        {qualityGroup ? <span className="inline-flex rounded border border-gold/40 bg-gold-soft px-1.5 py-0.5 font-semibold text-gold">{qualityGroup}</span> : "—"}
                      </Td>
                      <Td>
                        <span className={`inline-flex items-center gap-1 font-medium ${isReturned ? "text-[color:var(--excess)]" : "text-gold"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isReturned ? "bg-[color:var(--excess)]" : "bg-gold"}`} />
                          {isReturned ? "Returned" : "In Progress"}
                        </span>
                      </Td>
                      <Td className={`text-right text-[10px] font-semibold tabular-nums ${balance.className}`}>{balance.label}</Td>
                      <Td className="border-r-0">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(o)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {canDelete ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("Delete this entry?")) deleteOrder.mutate(o.id);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled
                              title="Super Admin permission required to delete"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground/40" />
                            </Button>
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
  );
}

function SectionLabel({ title, myanmar }: { title: string; myanmar: string }) {
  return (
    <div className="col-span-full mt-1 border-b pb-1 first:mt-0">
      <p className="text-[11px] font-semibold uppercase text-gold">{title} · {myanmar}</p>
    </div>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`border-r border-border/40 px-1.5 py-2 align-middle text-[9px] font-semibold leading-tight xl:px-2 xl:text-[10px] ${className}`}>{children}</th>;
}
function Td({ children, className = "", title }: { children?: React.ReactNode; className?: string; title?: string }) {
  return <td className={`border-r border-border/30 px-1.5 py-2 align-middle xl:px-2 ${className}`} title={title}>{children}</td>;
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
