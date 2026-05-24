import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { ArrowLeft, BookPlus, BookOpen, Phone, MapPin, ChevronRight, Pencil, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { recomputeBookTotals, type OrderRow } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/goldsmiths/$id")({
  component: GoldsmithDetail,
});

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function GoldsmithDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [bookOpen, setBookOpen] = useState(false);
  const [bookName, setBookName] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["goldsmith", id],
    queryFn: async () => {
      const [{ data: g }, { data: bs }, { data: os }] = await Promise.all([
        supabase.from("goldsmiths").select("*").eq("id", id).single(),
        supabase.from("books").select("*").eq("goldsmith_id", id).order("created_at"),
        supabase.from("orders").select("*"),
      ]);
      return {
        goldsmith: g!,
        books: bs ?? [],
        orders: (os ?? []) as OrderRow[],
      };
    },
  });

  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "", photo_url: "" });

  const openEdit = () => {
    if (data?.goldsmith) {
      setEditForm({
        name: data.goldsmith.name,
        phone: data.goldsmith.phone ?? "",
        address: data.goldsmith.address ?? "",
        photo_url: data.goldsmith.photo_url ?? "",
      });
      setEditOpen(true);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("goldsmiths").update({
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
        address: editForm.address.trim() || null,
        photo_url: editForm.photo_url.trim() || null,
      }).eq("id", id);
      if (error) throw error;
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
            <h1 className="mt-1 font-display text-3xl font-semibold">{g.name}</h1>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              {g.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {g.phone}
                </span>
              )}
              {g.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {g.address}
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={openEdit}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
          </Button>
        </div>
      </div>

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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Goldsmith</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            </div>
            <div>
              <Label>Photo URL</Label>
              <Input value={editForm.photo_url} onChange={(e) => setEditForm({ ...editForm, photo_url: e.target.value })} />
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
