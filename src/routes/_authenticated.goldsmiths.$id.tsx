import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { ArrowLeft, BookPlus, BookOpen, Phone, MapPin, ChevronRight, Pencil, CircleDot, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { PhotoUpload } from "@/components/photo-upload";
import { PortfolioUploader } from "@/components/portfolio-uploader";
import { recomputeBookTotals, type OrderRow } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/goldsmiths/$id")({
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
  const { canEdit } = useAuth();
  const [bookOpen, setBookOpen] = useState(false);
  const [bookName, setBookName] = useState("");
  const [editOpen, setEditOpen] = useState(false);

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
    phone: "",
    apprentice_phone: "",
    address: "",
    photo_url: "" as string | null,
    specialties: [] as string[],
  });

  useEffect(() => {
    if (data?.goldsmith && editOpen) {
      setEditForm({
        name: data.goldsmith.name,
        phone: data.goldsmith.phone ?? "",
        apprentice_phone: (data.goldsmith as { apprentice_phone?: string | null }).apprentice_phone ?? "",
        address: data.goldsmith.address ?? "",
        photo_url: data.goldsmith.photo_url ?? null,
        specialties: data.specialtyIds,
      });
    }
  }, [editOpen, data]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("goldsmiths").update({
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
        apprentice_phone: editForm.apprentice_phone.trim() || null,
        address: editForm.address.trim() || null,
        photo_url: editForm.photo_url || null,
      }).eq("id", id);
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

  const path = useRouterState({ select: (r) => r.location.pathname });
  const onChildRoute = path.includes("/books/");
  if (onChildRoute) return <Outlet />;

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const g = data.goldsmith;
  const apprentice = (g as { apprentice_phone?: string | null }).apprentice_phone;
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
              <WorkStatusBadge status={g.work_status} />
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
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
            </Button>
          )}
        </div>
      </div>

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
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Due (g)</p>
                    <p className="font-medium tabular-nums text-[color:var(--due)]">{fmt(due)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Excess</p>
                    <p className="font-medium tabular-nums text-[color:var(--excess)]">{fmt(excess)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-gold" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

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
            <div>
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
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
              <Label>Specialized Categories</Label>
              {data.products.length === 0 ? (
                <p className="text-xs text-muted-foreground">Add products first.</p>
              ) : (
                <div className="mt-2 grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-2 sm:grid-cols-3">
                  {data.products.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={editForm.specialties.includes(p.id)}
                        onCheckedChange={() => toggleSpec(p.id)}
                      />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
              )}
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
