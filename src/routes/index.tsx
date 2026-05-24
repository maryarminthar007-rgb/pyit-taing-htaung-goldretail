import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/stat-card";
import { Coins, Users, BookOpen, ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { recomputeBookTotals, type OrderRow } from "@/lib/calc";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [{ data: gs }, { data: bs }, { data: os }] = await Promise.all([
        supabase.from("goldsmiths").select("*").order("created_at", { ascending: false }),
        supabase.from("books").select("*"),
        supabase.from("orders").select("*"),
      ]);
      return {
        goldsmiths: gs ?? [],
        books: bs ?? [],
        orders: (os ?? []) as OrderRow[],
      };
    },
  });

  // Per-book latest totals
  const perBook = new Map<string, { due: number; excess: number }>();
  if (data) {
    const byBook = new Map<string, OrderRow[]>();
    for (const o of data.orders) {
      if (!byBook.has(o.book_id)) byBook.set(o.book_id, []);
      byBook.get(o.book_id)!.push(o);
    }
    for (const [bookId, rows] of byBook) {
      const recomputed = recomputeBookTotals(rows);
      const last = recomputed[recomputed.length - 1];
      perBook.set(bookId, {
        due: last?.total_due_gold ?? 0,
        excess: last?.total_excess_gold ?? 0,
      });
    }
  }

  const totalDue = Array.from(perBook.values()).reduce((s, v) => s + v.due, 0);
  const totalExcess = Array.from(perBook.values()).reduce((s, v) => s + v.excess, 0);

  // Top goldsmiths by outstanding
  const goldsmithTotals = (data?.goldsmiths ?? []).map((g) => {
    const ids = (data?.books ?? []).filter((b) => b.goldsmith_id === g.id).map((b) => b.id);
    let due = 0;
    let excess = 0;
    for (const id of ids) {
      const t = perBook.get(id);
      if (t) {
        due += t.due;
        excess += t.excess;
      }
    }
    return { ...g, due, excess, bookCount: ids.length };
  });
  goldsmithTotals.sort((a, b) => b.due - a.due);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
          Dashboard · ပင်မစာမျက်နှာ
        </p>
        <h1 className="mt-1 font-display text-4xl font-semibold">
          Pyit Taing Htaung Gold
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ပိုင်တိုင်ထောင် ရွှေဆိုင် · Live overview of goldsmith balances and books.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Due Gold"
          myanmar="စုစုပေါင်း လိုရွှေ (g)"
          value={fmt(totalDue)}
          tone="due"
          icon={<TrendingDown className="h-4 w-4" />}
          hint="Owed by goldsmiths"
        />
        <StatCard
          label="Total Excess Gold"
          myanmar="စုစုပေါင်း ပိုရွှေ (g)"
          value={fmt(totalExcess)}
          tone="excess"
          icon={<TrendingUp className="h-4 w-4" />}
          hint="Returned beyond issued"
        />
        <StatCard
          label="Goldsmiths"
          myanmar="ပန်းထိမ်ဆရာ"
          value={data?.goldsmiths.length ?? 0}
          tone="gold"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Active Books"
          myanmar="အလုပ်လုပ်နေသော စာအုပ်"
          value={data?.books.length ?? 0}
          tone="gold"
          icon={<BookOpen className="h-4 w-4" />}
        />
      </div>

      <section className="rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Goldsmith Balances</h2>
            <p className="text-xs text-muted-foreground">
              ပန်းထိမ်ဆရာ လက်ကျန်စာရင်း
            </p>
          </div>
          <Link
            to="/goldsmiths"
            className="inline-flex items-center gap-1 text-sm font-medium text-gold hover:underline"
          >
            View all <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : goldsmithTotals.length === 0 ? (
          <div className="p-8 text-center">
            <Coins className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No goldsmiths yet. Add your first to begin tracking.
            </p>
            <Link
              to="/goldsmiths"
              className="mt-4 inline-flex items-center justify-center rounded-md bg-gradient-gold px-4 py-2 text-sm font-medium text-primary-foreground shadow-gold"
            >
              Add Goldsmith
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Goldsmith</th>
                  <th className="px-6 py-3 font-medium">Phone</th>
                  <th className="px-6 py-3 font-medium">Books</th>
                  <th className="px-6 py-3 text-right font-medium">Due (g)</th>
                  <th className="px-6 py-3 text-right font-medium">Excess (g)</th>
                  <th className="w-10 px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {goldsmithTotals.map((g) => (
                  <tr
                    key={g.id}
                    className="border-b last:border-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gold-soft text-sm font-medium text-gold">
                          {g.photo_url ? (
                            <img src={g.photo_url} alt={g.name} className="h-full w-full object-cover" />
                          ) : (
                            g.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{g.name}</p>
                          <p className="text-xs text-muted-foreground">{g.address || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{g.phone || "—"}</td>
                    <td className="px-6 py-3">{g.bookCount}</td>
                    <td className="px-6 py-3 text-right font-medium tabular-nums text-[color:var(--due)]">
                      {fmt(g.due)}
                    </td>
                    <td className="px-6 py-3 text-right font-medium tabular-nums text-[color:var(--excess)]">
                      {fmt(g.excess)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        to="/goldsmiths/$id"
                        params={{ id: g.id }}
                        className="text-gold hover:underline"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
