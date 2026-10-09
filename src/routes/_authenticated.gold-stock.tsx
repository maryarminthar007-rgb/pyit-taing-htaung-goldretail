import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Coins, Pencil, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Grams } from "@/components/figures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STOCK_GROUPS, parseStockGrams, nextStockGrams, type StockGroup, type StockMode } from "@/lib/gold-stock";

export const Route = createFileRoute("/_authenticated/gold-stock")({
  head: () => ({ meta: [
    { title: "Gold Stock · Pyit Taing Htaung" },
    { name: "description", content: "Available office gold stock in grams for quality groups A, B and C." },
    { property: "og:title", content: "Gold Stock · Pyit Taing Htaung" },
    { property: "og:description", content: "Available office gold stock in grams for quality groups A, B and C." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: GoldStockGate,
});

function GoldStockGate() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <p className="text-sm text-muted-foreground">Admin access required · စီမံခန့်ခွဲသူသာ ဝင်ရောက်နိုင်သည်</p>;
  return <GoldStockPage />;
}

function GoldStockPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<{ group: StockGroup; mode: StockMode } | null>(null);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const stock = useQuery({
    queryKey: ["office-gold-stock"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from("office_gold_stock").select("quality_group, available_grams");
      if (error) throw error;
      return data;
    },
  });
  const current = (group: StockGroup) => Number(stock.data?.find((x) => x.quality_group === group)?.available_grams ?? 0);
  const amount = parseStockGrams(input);
  const open = (group: StockGroup, mode: StockMode) => {
    setInput(mode === "set" ? String(current(group)) : "");
    setError("");
    setSelection({ group, mode });
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selection || amount === null || saving) return;
    setSaving(true);
    setError("");
    try {
      const { error } = await supabase.rpc("update_office_gold_stock", { p_group: selection.group, p_grams: amount, p_mode: selection.mode });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["office-gold-stock"] });
      setSelection(null);
      toast.success("Stock saved · ရွှေစာရင်း သိမ်းပြီးပါပြီ");
    } catch {
      setError("Could not save stock. Please try again. · ပြန်လည်ကြိုးစားပါ။");
    } finally { setSaving(false); }
  };

  return <div className="mx-auto max-w-5xl space-y-5 font-sans">
    <header>
      <h1 className="text-2xl font-semibold">Gold Stock · ရွှေပေး</h1>
      <p className="mt-1 text-sm text-muted-foreground">Available office gold · ရုံးရှိ လက်ကျန်ရွှေ</p>
    </header>
    {stock.isPending ? <p className="text-sm text-muted-foreground">Loading… · ခေတ္တစောင့်ပါ</p> : stock.isError ?
      <div className="space-y-3"><p className="text-sm text-destructive">Could not load stock · စာရင်း မရရှိပါ</p><Button variant="outline" onClick={() => stock.refetch()}>Retry · ပြန်ကြိုးစားရန်</Button></div> :
      <div className="grid gap-4 md:grid-cols-3">
        {STOCK_GROUPS.map(({ group, purity }) => <section key={group} aria-label={`Group ${group} stock`} className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div><h2 className="font-semibold">Group {group} · အဆင့် {group}</h2><p className="mt-1 text-sm text-muted-foreground">{purity}</p></div>
            <Coins className="h-5 w-5 text-gold" />
          </div>
          <div className="my-6 text-gold"><Grams value={current(group)} size="hero" /></div>
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button size="sm" onClick={() => open(group, "add")}><Plus className="mr-1.5 h-4 w-4" />Add · ထပ်ထည့်</Button>
            <Button size="sm" variant="outline" onClick={() => open(group, "set")}><Pencil className="mr-1.5 h-4 w-4" />Update · ပြင်ရန်</Button>
          </div>
        </section>)}
      </div>}
    <Dialog open={selection !== null} onOpenChange={(value) => { if (!value && !saving) setSelection(null); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-sans">Group {selection?.group} · {selection?.mode === "add" ? "Add Gold / ရွှေထပ်ထည့်" : "Update Stock / လက်ကျန်ပြင်ရန်"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="text-muted-foreground"><p className="mb-1 text-xs">Current stock · လက်ကျန်ရွှေ</p><Grams value={selection ? current(selection.group) : 0} /></div>
          <div className="space-y-2"><Label htmlFor="stock-grams">{selection?.mode === "add" ? "Incoming gold · ဝင်လာသောရွှေ (g)" : "Available stock · လက်ကျန်ရွှေ (g)"}</Label>
            <Input id="stock-grams" type="number" inputMode="decimal" min="0" step="any" required value={input} onChange={(e) => setInput(e.target.value)} disabled={saving} autoFocus />
          </div>
          {selection && amount !== null && <div className="flex flex-wrap items-baseline justify-between gap-2 border-t pt-3 text-sm"><span>New balance · လက်ကျန်အသစ်</span><Grams value={nextStockGrams(current(selection.group), amount, selection.mode)} /></div>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => setSelection(null)}>Cancel · မလုပ်တော့ပါ</Button><Button type="submit" disabled={saving || amount === null}><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save · သိမ်းရန်"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}