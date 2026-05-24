import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Plus, Search, User, Phone, MapPin, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { PhotoUpload } from "@/components/photo-upload";

export const Route = createFileRoute("/_authenticated/goldsmiths/")({
  component: GoldsmithList,
});

const emptyForm = () => ({
  name: "",
  symbol: "",
  phone: "",
  apprentice_phone: "",
  address: "",
  photo_url: "" as string | null,
  specialties: [] as string[],
});

function GoldsmithList() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const { data: goldsmiths = [], isLoading } = useQuery({
    queryKey: ["goldsmiths"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goldsmiths")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      return data ?? [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      const { data: inserted, error } = await supabase.from("goldsmiths").insert({
        name: form.name.trim(),
        symbol: form.symbol.trim() || null,
        phone: form.phone.trim() || null,
        apprentice_phone: form.apprentice_phone.trim() || null,
        address: form.address.trim() || null,
        photo_url: form.photo_url || null,
      } as never).select().single();
      if (error) throw error;
      if (form.specialties.length && inserted) {
        await supabase.from("goldsmith_specialties").insert(
          form.specialties.map((pid) => ({ goldsmith_id: inserted.id, product_id: pid })),
        );
      }
    },
    onSuccess: () => {
      toast.success("Goldsmith added");
      setOpen(false);
      setForm(emptyForm());
      qc.invalidateQueries({ queryKey: ["goldsmiths"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const q = search.toLowerCase();
  const filtered = goldsmiths.filter((g) => {
    const sym = ((g as { symbol?: string | null }).symbol ?? "").toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      (g.phone ?? "").includes(search) ||
      sym.includes(q)
    );
  });

  const toggleSpecialty = (pid: string) => {
    setForm((f) => ({
      ...f,
      specialties: f.specialties.includes(pid)
        ? f.specialties.filter((x) => x !== pid)
        : [...f.specialties, pid],
    }));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            Goldsmiths · ပန်းထိမ်ဆရာ
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">All Goldsmiths</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage profiles and open their order books.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(emptyForm()); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Add Goldsmith
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>New Goldsmith · ပန်းထိမ်ဆရာသစ်</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Photo · ဓာတ်ပုံ</Label>
                <PhotoUpload
                  bucket="goldsmith-photos"
                  value={form.photo_url}
                  onChange={(url) => setForm({ ...form, photo_url: url })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <Label>Name · အမည် *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Maung Maung"
                  />
                </div>
                <div>
                  <Label>Symbol · သင်္ကေတ</Label>
                  <Input
                    value={form.symbol}
                    onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                    placeholder="MM / ⭐ / ရွှေ-၁"
                    className="sm:w-32 font-mono"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Primary Phone · ဖုန်း</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="09-xxx xxx xxx"
                  />
                </div>
                <div>
                  <Label>Apprentice Phone · တပည့်ဖုန်း</Label>
                  <Input
                    value={form.apprentice_phone}
                    onChange={(e) => setForm({ ...form, apprentice_phone: e.target.value })}
                    placeholder="optional"
                  />
                </div>
              </div>
              <div>
                <Label>Address · နေရပ်လိပ်စာ</Label>
                <Textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div>
                <Label>Specialized Categories · ကျွမ်းကျင်ရာ</Label>
                {products.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Add product types in the Products page first.
                  </p>
                ) : (
                  <div className="mt-2 grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-2 sm:grid-cols-3">
                    {products.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.specialties.includes(p.id)}
                          onCheckedChange={() => toggleSpecialty(p.id)}
                        />
                        <span>{p.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Portfolio photos can be uploaded from the goldsmith's profile after saving.
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending}
                className="bg-gradient-gold text-primary-foreground"
              >
                {addMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <User className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No goldsmiths yet. Add the first one to begin.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => (
            <Link
              key={g.id}
              to="/goldsmiths/$id"
              params={{ id: g.id }}
              className="group relative overflow-hidden rounded-2xl border bg-gradient-surface p-5 transition-all hover:border-gold/50 hover:shadow-gold"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gold-soft text-lg font-semibold text-gold">
                  {g.photo_url ? (
                    <img src={g.photo_url} alt={g.name} className="h-full w-full object-cover" />
                  ) : (
                    g.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-semibold truncate">{g.name}</p>
                  {g.phone && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {g.phone}
                    </p>
                  )}
                  {g.address && (
                    <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground line-clamp-2">
                      <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                      {g.address}
                    </p>
                  )}
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all group-hover:text-gold group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
