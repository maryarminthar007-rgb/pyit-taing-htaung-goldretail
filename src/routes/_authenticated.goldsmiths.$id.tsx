import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { ArrowLeft, BookPlus, BookOpen, Phone, MapPin, ChevronRight, Pencil, CircleDot, UserCog, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SpecialtyPicker } from "@/components/specialty-picker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { PhotoUpload } from "@/components/photo-upload";
import { PortfolioUploader } from "@/components/portfolio-uploader";
import { recomputeBookTotals, type OrderRow } from "@/lib/calc";
import { depositLimitGrams, depositLabel, outstandingGrams, OverLimitAlert, summarizeByGroup, GroupSummaryTable, GROUP_LABELS, gramsToKPY, kpyToGrams, GRAMS_PER_KYAT } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/goldsmiths/$id")({
  head: () => ({ meta: [
    { title: "Goldsmith Profile · Pyit Taing Htaung" },
    { name: "description", content: "Goldsmith profile, deposits, specialties and order book balances." },
    { property: "og:title", content: "Goldsmith Profile · Pyit Taing Htaung" },
    { property: "og:description", content: "Goldsmith profile, deposits, specialties and order book balances." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: GoldsmithDetail,
});

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function WorkStatusBadge({ status }: { status: string }) {
  const busy = status === "busy";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${busy ? "bg-[color:var(--due)]/15 text-[color:var(--due)]" : "bg-[color:var(--excess)]/15 text-[color:var(--excess)]"}`}>
      <CircleDot className="h-3 w-3" />
      {busy ? "Active Work" : "Available"}
    </span>
  );
}

function GoldsmithDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { canEdit, canDelete } = useAuth();
  const [bookOpen, setBookOpen] = useState(false);
  const [bookName, setBookName] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [renameBook, setRenameBook] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["goldsmith", id],
    queryFn: async () => {
      const [{ data: g }, { data: bs }, { data: os }, { data: specs }, { data: products }] = await Promise.all([
        supabase.from("goldsmiths").select("*").eq("id", id).single(),
        supabase.from("books").select("*").eq("goldsmith_id", id).order("created_at"),
        supabase.from("orders").select("*"),
        supabase.from("goldsmith_specialties").select("product_id").eq("goldsmith_id", id),
        supabase.from("products").select("*").order("name"),
      ]);
      return {
        goldsmith: g!,
        books: bs ?? [],
        orders: (os ?? []) as OrderRow[],
        specialtyIds: (specs ?? []).map((s) => s.product_id as string),
        products: products ?? [],
      };
    },
  });

  const [editForm, setEditForm] = useState({
    name: "",
    symbol: "",
    phone: "",
    apprentice_phone: "",
    address: "",
    photo_url: "" as string | null,
    specialties: [] as string[],
    quality_groups: [] as string[],
    deposit_type: "none",
    dk: "", dp: "", dy: "",
    deposit_cash: "",
    deposit_gold_rate: "",
  });

  useEffect(() => {
    if (data?.goldsmith && editOpen) {
      setEditForm({
        name: data.goldsmith.name,
        symbol: (data.goldsmith as { symbol?: string | null }).symbol ?? "",
        phone: data.goldsmith.phone ?? "",
        apprentice_phone: (data.goldsmith as { apprentice_phone?: string | null }).apprentice_phone ?? "",
        address: data.goldsmith.address ?? "",
        photo_url: data.goldsmith.photo_url ?? null,
        specialties: data.specialtyIds,
        ...(() => {
          const g = data.goldsmith as unknown as { quality_groups?: string[]; deposit_type?: string; deposit_gold_g?: number; deposit_cash?: number; deposit_gold_rate?: number };
          const yw = (Number(g.deposit_gold_g ?? 0) / GRAMS_PER_KYAT) * 128;
          const k = Math.floor(yw / 128), p = Math.floor((yw - k * 128) / 8), y = Math.round((yw - k * 128 - p * 8) * 100) / 100;
          return {
            quality_groups: g.quality_groups ?? [],
            deposit_type: g.deposit_type ?? "none",
            dk: k ? String(k) : "", dp: p ? String(p) : "", dy: y ? String(y) : "",
            deposit_cash: g.deposit_cash ? String(g.deposit_cash) : "",
            deposit_gold_rate: g.deposit_gold_rate ? String(g.deposit_gold_rate) : "",
          };
        })(),
      });
    }
  }, [editOpen, data]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("goldsmiths").update({
        name: editForm.name.trim(),
        symbol: editForm.symbol.trim() || null,
        phone: editForm.phone.trim() || null,
        apprentice_phone: editForm.apprentice_phone.trim() || null,
        address: editForm.address.trim() || null,
        photo_url: editForm.photo_url || null,
        quality_groups: editForm.quality_groups,
        deposit_type: editForm.deposit_type,
        deposit_gold_g: editForm.deposit_type === "gold" ? kpyToGrams(Number(editForm.dk) || 0, Number(editForm.dp) || 0, Number(editForm.dy) || 0) : 0,
        deposit_cash: editForm.deposit_type === "cash" ? Number(editForm.deposit_cash) || 0 : 0,
        deposit_gold_rate: Number(editForm.deposit_gold_rate) || 0,
      } as never).eq("id", id);
      if (error) throw error;
      // Reset specialties
      await supabase.from("goldsmith_specialties").delete().eq("goldsmith_id", id);
      if (editForm.specialties.length) {
        await supabase.from("goldsmith_specialties").insert(
          editForm.specialties.map((pid) => ({ goldsmith_id: id, product_id: pid })),
        );
      }
    },
    onSuccess: () => {
      toast.success("Updated");
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ["goldsmith", id] });
      qc.invalidateQueries({ queryKey: ["goldsmiths"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addBook = useMutation({
    mutationFn: async () => {
      if (!bookName.trim()) throw new Error("Book name required");
      const { error } = await supabase.from("books").insert({
        goldsmith_id: id,
        name: bookName.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Book created");
      setBookOpen(false);
      setBookName("");
      qc.invalidateQueries({ queryKey: ["goldsmith", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameMutation = useMutation({
    mutationFn: async () => {
      if (!renameBook) return;
      const name = renameBook.name.trim();
      if (!name) throw new Error("Book name required");
      const { error } = await supabase.from("books").update({ name }).eq("id", renameBook.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Book renamed");
      setRenameBook(null);
      qc.invalidateQueries({ queryKey: ["goldsmith", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBook = useMutation({
    mutationFn: async (bookId: string) => {
      const { count } = await supabase.from("orders").select("id", { count: "exact", head: true })
        .eq("book_id", bookId).is("return_date", null);
      if ((count ?? 0) > 0) throw new Error("Book has open orders not yet returned");
      const { error: oe } = await supabase.from("orders").delete().eq("book_id", bookId);
      if (oe) throw oe;
      const { error } = await supabase.from("books").delete().eq("id", bookId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Book deleted");
      qc.invalidateQueries({ queryKey: ["goldsmith", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase.from("goldsmiths").update({ is_active: next }).eq("id", id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      toast.success(next ? "Goldsmith reactivated" : "Goldsmith marked inactive");
      qc.invalidateQueries({ queryKey: ["goldsmith", id] });
      qc.invalidateQueries({ queryKey: ["goldsmiths"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["goldsmiths_for_assign"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const path = useRouterState({ select: (r) => r.location.pathname });
  const onChildRoute = path.includes("/books/");
  if (onChildRoute) return <Outlet />;

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const g = data.goldsmith;
  const isActive = (g as { is_active?: boolean }).is_active !== false;
  const apprentice = (g as { apprentice_phone?: string | null }).apprentice_phone;
  const gOrders = data.orders.filter((o) => data.books.some((b) => b.id === o.book_id));
  const limit = depositLimitGrams(g as never);
  const outstanding = outstandingGrams(gOrders);
  const overLimit = limit !== null && outstanding > limit;
  const groups = ((g as { quality_groups?: string[] }).quality_groups ?? []) as ("A" | "B" | "C")[];
  const summary = summarizeByGroup(gOrders, () => groups[0] ?? "A");
  const specialtyProducts = data.products.filter((p) => data.specialtyIds.includes(p.id));

  const toggleSpec = (pid: string) =>
    setEditForm((f) => ({
      ...f,
      specialties: f.specialties.includes(pid)
        ? f.specialties.filter((x) => x !== pid)
        : [...f.specialties, pid],
    }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        to="/goldsmiths"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All Goldsmiths
      </Link>

      {overLimit && <OverLimitAlert outstanding={outstanding} limit={limit!} />}
      <div className="overflow-hidden rounded-2xl border bg-gradient-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-6">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gold-soft text-3xl font-semibold text-gold shadow-gold">
            {g.photo_url ? (
              <img src={g.photo_url} alt={g.name} className="h-full w-full object-cover" />
            ) : (
              g.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
              Goldsmith · ပန်းထိမ်ဆရာ
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-semibold">{g.name}</h1>
              {(g as { symbol?: string | null }).symbol && (
                <span className="rounded-md border border-gold/50 bg-gold-soft px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-gold">
                  {(g as { symbol?: string | null }).symbol}
                </span>
              )}
              <WorkStatusBadge status={g.work_status} />
              {!isActive && (
                <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                  Inactive · အနားပေးထား
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              {g.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {g.phone}
                </span>
              )}
              {apprentice && (
                <span className="flex items-center gap-1.5">
                  <UserCog className="h-3.5 w-3.5" /> {apprentice} <span className="text-[10px]">(apprentice)</span>
                </span>
              )}
              {g.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {g.address}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {groups.map((q) => (
                <span key={q} className="rounded-md border border-gold/40 px-2 py-0.5 font-medium text-gold">{GROUP_LABELS[q]}</span>
              ))}
              <span className="rounded-md bg-muted px-2 py-0.5">စပေါ် · {depositLabel(g as never)}</span>
              <span className="rounded-md bg-muted px-2 py-0.5">Outstanding · {outstanding.toFixed(2)}g ({gramsToKPY(outstanding)})</span>
            </div>
            {specialtyProducts.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {specialtyProducts.map((p) => (
                  <span key={p.id} className="rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-medium text-gold">
                    {p.name}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-3 text-[11px] italic text-muted-foreground">
              Status auto-updates from order activity (busy while any order is issued and not yet returned).
            </p>
          </div>
          {canEdit && (
            <div className="flex flex-col items-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={toggleActive.isPending}
                className={isActive ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : ""}
                onClick={() => {
                  if (isActive && !confirm("Mark this goldsmith inactive? Past ledger history is kept. · ဤပန်းထိမ်ဆရာကို အနားပေးမည်လား?")) return;
                  toggleActive.mutate(!isActive);
                }}
              >
                {isActive ? "Mark Inactive · အနားပေးရန်" : "Reactivate · ပြန်လည်အသုံးပြုရန်"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <section>
        <h2 className="font-display text-xl font-semibold">Quality Group Balance · A/B/C လိုရွှေ/ပိုရွှေ</h2>
        <p className="text-xs text-muted-foreground">Monthly and total net balance, kept separate per purity.</p>
        <div className="mt-3"><GroupSummaryTable {...summary} /></div>
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold">Portfolio · လက်ရာပြ</h2>
        <p className="text-xs text-muted-foreground">Photos of the goldsmith's work and skill set.</p>
        <div className="mt-3">
          <PortfolioUploader goldsmithId={id} canEdit={canEdit} />
        </div>
      </section>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">Order Books</h2>
          <p className="text-xs text-muted-foreground">
            အော်ဒါစာအုပ်များ · Each book tracks its own running balance.
          </p>
        </div>
        <Dialog open={bookOpen} onOpenChange={setBookOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
              <BookPlus className="mr-2 h-4 w-4" /> New Book
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Book</DialogTitle>
            </DialogHeader>
            <div>
              <Label>Book name · စာအုပ်အမည်</Label>
              <Input
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
                placeholder={`${g.name} Book 1`}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => addBook.mutate()}
                disabled={addBook.isPending}
                className="bg-gradient-gold text-primary-foreground"
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {data.books.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No books yet. Create one to start tracking orders.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.books.map((b) => {
            const bookOrders = data.orders.filter((o) => o.book_id === b.id);
            const recomputed = recomputeBookTotals(bookOrders);
            const last = recomputed[recomputed.length - 1];
            const due = last?.total_due_gold ?? 0;
            const excess = last?.total_excess_gold ?? 0;
            return (
              <Link
                key={b.id}
                to="/goldsmiths/$id/books/$bookId"
                params={{ id, bookId: b.id }}
                className="group flex items-center justify-between rounded-2xl border bg-card p-5 transition-all hover:border-gold/50 hover:shadow-gold"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-soft text-gold">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {bookOrders.length} {bookOrders.length === 1 ? "entry" : "entries"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Due (g)</p>
                    <p className="font-medium tabular-nums text-[color:var(--due)]">{fmt(due)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Excess</p>
                    <p className="font-medium tabular-nums text-[color:var(--excess)]">{fmt(excess)}</p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      aria-label={`Rename ${b.name}`}
                      title="Rename · အမည်ပြောင်းရန်"
                      className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-gold"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRenameBook({ id: b.id, name: b.name }); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      aria-label={`Delete ${b.name}`}
                      title="Delete · ဖျက်ရန်"
                      className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        const open = bookOrders.filter((o) => !o.return_date).length;
                        if (open > 0) {
                          toast.error(`This book has ${open} open order(s) not yet returned. Close them before deleting. · မအပ်ရသေးသော အော်ဒါများရှိနေသည်`);
                          return;
                        }
                        if (!confirm("Are you sure you want to delete this order book? · ဤအော်ဒါစာအုပ်ကို ဖျက်မည်မှာ သေချာပါသလား?")) return;
                        deleteBook.mutate(b.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-gold" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={!!renameBook} onOpenChange={(o) => !o && setRenameBook(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Book · စာအုပ်အမည်ပြောင်းရန်</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Book name · စာအုပ်အမည်</Label>
            <Input
              autoFocus
              value={renameBook?.name ?? ""}
              onChange={(e) => setRenameBook((r) => (r ? { ...r, name: e.target.value } : r))}
              onKeyDown={(e) => { if (e.key === "Enter") renameMutation.mutate(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameBook(null)}>Cancel</Button>
            <Button onClick={() => renameMutation.mutate()} disabled={renameMutation.isPending} className="bg-gradient-gold text-primary-foreground">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Goldsmith</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Photo</Label>
              <PhotoUpload
                bucket="goldsmith-photos"
                value={editForm.photo_url}
                onChange={(url) => setEditForm({ ...editForm, photo_url: url })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <Label>Name</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <Label>Symbol · သင်္ကေတ</Label>
                <Input
                  value={editForm.symbol}
                  onChange={(e) => setEditForm({ ...editForm, symbol: e.target.value })}
                  placeholder="MM / ⭐"
                  className="sm:w-32 font-mono"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Primary Phone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div>
                <Label>Apprentice Phone</Label>
                <Input value={editForm.apprentice_phone} onChange={(e) => setEditForm({ ...editForm, apprentice_phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Textarea value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            </div>
            <div>
              <Label>Quality Level · အဆင့် (A/B/C)</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {(["A", "B", "C"] as const).map((q) => {
                  const on = editForm.quality_groups.includes(q);
                  return (
                    <Button key={q} type="button" size="sm" variant={on ? "default" : "outline"}
                      className={on ? "bg-gradient-gold text-primary-foreground" : ""}
                      onClick={() => setEditForm({ ...editForm, quality_groups: on ? editForm.quality_groups.filter((x) => x !== q) : [...editForm.quality_groups, q].sort() })}>
                      {GROUP_LABELS[q]}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2 rounded-xl border p-3">
              <Label>Deposit · စပေါ်</Label>
              <div className="flex gap-2">
                {[["none", "None"], ["gold", "Gold · ရွှေ"], ["cash", "Cash · ငွေ"]].map(([v, l]) => (
                  <Button key={v} type="button" size="sm" variant={editForm.deposit_type === v ? "default" : "outline"}
                    className={editForm.deposit_type === v ? "bg-gradient-gold text-primary-foreground" : ""}
                    onClick={() => setEditForm({ ...editForm, deposit_type: v })}>{l}</Button>
                ))}
              </div>
              {editForm.deposit_type === "gold" && (
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">ကျပ်</Label><Input inputMode="decimal" value={editForm.dk} onChange={(e) => setEditForm({ ...editForm, dk: e.target.value })} /></div>
                  <div><Label className="text-xs">ပဲ</Label><Input inputMode="decimal" value={editForm.dp} onChange={(e) => setEditForm({ ...editForm, dp: e.target.value })} /></div>
                  <div><Label className="text-xs">ရွေး</Label><Input inputMode="decimal" value={editForm.dy} onChange={(e) => setEditForm({ ...editForm, dy: e.target.value })} /></div>
                </div>
              )}
              {editForm.deposit_type === "cash" && (
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Cash amount (MMK)</Label><Input inputMode="decimal" value={editForm.deposit_cash} onChange={(e) => setEditForm({ ...editForm, deposit_cash: e.target.value })} /></div>
                  <div><Label className="text-xs">Gold price per ကျပ်သား (MMK)</Label><Input inputMode="decimal" value={editForm.deposit_gold_rate} onChange={(e) => setEditForm({ ...editForm, deposit_gold_rate: e.target.value })} /></div>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">1 ကျပ် = 16 ပဲ = 128 ရွေး = 16.6g. Cash is converted to gold using the price above.</p>
            </div>
            <div>
              <Label>Specialized Categories · ကျွမ်းကျင်ရာ</Label>
              <SpecialtyPicker
                products={data.products}
                selected={editForm.specialties}
                onToggle={toggleSpec}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="bg-gradient-gold text-primary-foreground">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
