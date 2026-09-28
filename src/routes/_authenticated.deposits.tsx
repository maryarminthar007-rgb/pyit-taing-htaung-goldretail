import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Coins, Banknote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { KPY, Cash, Grams } from "@/components/figures";
import { type OrderRow } from "@/lib/calc";
import { depositLimitGrams, outstandingGrams, OverLimitAlert } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/deposits")({
  head: () => ({
    meta: [
      { title: "Goldsmith Deposits · Pyit Taing Htaung" },
      { name: "description", content: "Shop-wide gold and cash deposit overview by quality group." },
      { property: "og:title", content: "Goldsmith Deposits · Pyit Taing Htaung" },
      { property: "og:description", content: "Shop-wide gold and cash deposit overview by quality group." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DepositsPage,
});

type G = {
  id: string; name: string; symbol: string | null; quality_groups: string[] | null;
  deposit_type: string | null; deposit_gold_g: number | null; deposit_cash: number | null; deposit_gold_rate: number | null;
};
type Grp = "all" | "A" | "B" | "C";
const TABS: [Grp, string][] = [
  ["all", "All - အားလုံး"], ["A", "Group A (15 ပဲရည်)"], ["B", "Group B (14 ပဲ 2 ပြား)"], ["C", "Group C (14 ပဲရည်)"],
];

function DepositsPage() {
  const [grp, setGrp] = useState<Grp>("all");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["deposits"],
    queryFn: async () => {
      const [{ data: goldsmiths }, { data: books }, { data: orders }] = await Promise.all([
        supabase.from("goldsmiths").select("*").order("name"),
        supabase.from("books").select("id, goldsmith_id"),
        supabase.from("orders").select("*"),
      ]);
      return { goldsmiths: (goldsmiths ?? []) as unknown as G[], books: books ?? [], orders: (orders ?? []) as OrderRow[] };
    },
  });
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const gold = (g: G) => (g.deposit_type === "gold" ? Number(g.deposit_gold_g ?? 0) : 0);
  const cash = (g: G) => (g.deposit_type === "cash" ? Number(g.deposit_cash ?? 0) : 0);
  const inGrp = (g: G, k: Grp) => k === "all" || (g.quality_groups ?? []).includes(k);
  const ordersFor = (gid: string) => {
    const ids = new Set(data.books.filter((b) => b.goldsmith_id === gid).map((b) => b.id));
    return data.orders.filter((o) => ids.has(o.book_id));
  };

  const all = data.goldsmiths;
  const totalGold = all.reduce((s, g) => s + gold(g), 0);
  const totalCash = all.reduce((s, g) => s + cash(g), 0);
  const inTab = all.filter((g) => inGrp(g, grp));
  const subGold = inTab.reduce((s, g) => s + gold(g), 0);
  const subCash = inTab.reduce((s, g) => s + cash(g), 0);
  const q = search.toLowerCase();
  const rows = inTab.filter((g) => g.name.toLowerCase().includes(q) || (g.symbol ?? "").toLowerCase().includes(q));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">Deposits · စပေါ်ငွေ/ရွှေ စုစုပေါင်း အချုပ်ဇယား</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Goldsmith Deposits Overview</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total Gold Deposit" myanmar="ရွှေစပေါ် စုစုပေါင်း" tone="gold" icon={<Coins className="h-4 w-4" />}
          value={<KPY g={totalGold} size="hero" />} valueClassName="mt-3" hint={`${totalGold.toFixed(2)} g · shop-wide`} />
        <StatCard label="Total Cash Deposit" myanmar="ငွေစပေါ် စုစုပေါင်း" tone="gold" icon={<Banknote className="h-4 w-4" />}
          value={<Cash value={totalCash} size="hero" />} valueClassName="mt-3" hint="shop-wide" />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(([v, l]) => (
          <Button key={v} size="sm" variant={grp === v ? "default" : "outline"}
            className={grp === v ? "bg-gradient-gold text-primary-foreground" : ""} onClick={() => setGrp(v)}>
            {l}<span className="ml-1.5 text-[10px] opacity-70">{all.filter((g) => inGrp(g, v)).length}</span>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{TABS.find((t) => t[0] === grp)![1]} · Gold subtotal · ရွှေ</p>
          <div className="mt-2 text-gold"><KPY g={subGold} size="card" /></div>
          <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">{subGold.toFixed(2)} g</p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{TABS.find((t) => t[0] === grp)![1]} · Cash subtotal · ငွေ</p>
          <div className="mt-2 text-gold"><Cash value={subCash} size="card" /></div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search goldsmith name or symbol…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 text-left">Goldsmith · ပန်းထိမ်ဆရာ</th>
              <th className="border-l px-3 py-2.5 text-left">Group</th>
              <th className="border-l px-3 py-2.5 text-right">Gold Deposit · ရွှေစပေါ်</th>
              <th className="border-l px-3 py-2.5 text-right">Cash Deposit · ငွေစပေါ်</th>
              <th className="border-l px-3 py-2.5 text-right">Outstanding · ပေးထားဆဲရွှေ</th>
              <th className="border-l px-3 py-2.5 text-left">Safety · အခြေအနေ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => {
              const out = outstandingGrams(ordersFor(g.id));
              const limit = depositLimitGrams(g);
              const over = limit !== null && out > limit;
              return (
                <tr key={g.id} className={`border-t align-middle ${over ? "bg-destructive/5" : ""}`}>
                  <td className="px-3 py-3">
                    <Link to="/goldsmiths/$id" params={{ id: g.id }} className="text-base font-medium hover:text-gold">{g.name}</Link>
                    {g.symbol && <span className="ml-2 rounded-md border border-gold/40 bg-gold-soft px-1.5 py-0.5 font-mono text-[10px] text-gold">{g.symbol}</span>}
                  </td>
                  <td className="border-l px-3 py-3">
                    <div className="flex gap-1">
                      {(g.quality_groups ?? []).length === 0 ? <span className="text-xs text-muted-foreground">—</span> :
                        (g.quality_groups ?? []).map((x) => (
                          <span key={x} className="rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-semibold text-gold">{x}</span>
                        ))}
                    </div>
                  </td>
                  <td className="border-l px-3 py-3 text-right whitespace-nowrap">
                    {gold(g) > 0 ? <>
                      <KPY g={gold(g)} size="row" className="text-gold" />
                      <div className="mt-1"><Grams value={gold(g)} size="micro" className="text-muted-foreground" /></div>
                    </> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="border-l px-3 py-3 text-right whitespace-nowrap">
                    {cash(g) > 0 ? <Cash value={cash(g)} size="row" className="text-gold" /> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="border-l px-3 py-3 text-right whitespace-nowrap">
                    <Grams value={out} size="row" />
                    <div className="mt-1"><KPY g={out} size="micro" className="text-muted-foreground" /></div>
                  </td>
                  <td className="border-l px-3 py-3">
                    {over ? <OverLimitAlert compact outstanding={out} limit={limit!} /> :
                      limit === null ? <span className="text-xs text-muted-foreground">No deposit · စပေါ်မရှိ</span> :
                      <span className="text-xs text-[color:var(--excess)]">Safe · လုံခြုံ</span>}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-xs text-muted-foreground">No goldsmiths found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
