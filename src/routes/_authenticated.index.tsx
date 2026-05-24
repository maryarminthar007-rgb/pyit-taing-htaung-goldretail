import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Phone, MapPin, CircleDot } from "lucide-react";
import { recomputeBookTotals, type OrderRow } from "@/lib/calc";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function Dashboard() {
  const { isAdmin, isMarketing } = useAuth();
  if (isMarketing && !isAdmin) return <Navigate to="/marketing" />;
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
          ပိုင်တိုင်ထောင် ရွှေဆိုင် · Tap a goldsmith to open their full ledger.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : goldsmithTotals.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No goldsmiths yet. Add the first one to begin tracking.
          </p>
          <Link
            to="/goldsmiths"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-gradient-gold px-4 py-2 text-sm font-medium text-primary-foreground shadow-gold"
          >
            Go to Goldsmiths
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {goldsmithTotals.map((g) => {
            const busy = g.work_status === "busy";
            return (
              <Link
                key={g.id}
                to="/goldsmiths/$id"
                params={{ id: g.id }}
                className="group overflow-hidden rounded-2xl border bg-gradient-surface p-5 transition-all hover:border-gold/60 hover:shadow-gold"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gold-soft text-2xl font-semibold text-gold shadow-gold">
                    {g.photo_url ? (
                      <img src={g.photo_url} alt={g.name} className="h-full w-full object-cover" />
                    ) : (
                      g.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-display text-lg font-semibold">{g.name}</p>
                      {(g as { symbol?: string | null }).symbol && (
                        <span className="shrink-0 rounded-md border border-gold/40 bg-gold-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-gold">
                          {(g as { symbol?: string | null }).symbol}
                        </span>
                      )}
                    </div>
                    <span
                      className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        busy
                          ? "bg-[color:var(--due)]/15 text-[color:var(--due)]"
                          : "bg-[color:var(--excess)]/15 text-[color:var(--excess)]"
                      }`}
                    >
                      <CircleDot className="h-2.5 w-2.5" />
                      {busy ? "Active Work" : "Available"}
                    </span>
                    {g.phone && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {g.phone}
                      </p>
                    )}
                    {g.address && (
                      <p className="mt-0.5 line-clamp-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {g.address}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-center">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Books</p>
                    <p className="text-sm font-semibold tabular-nums">{g.bookCount}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Due</p>
                    <p className="text-sm font-semibold tabular-nums text-[color:var(--due)]">{fmt(g.due)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Excess</p>
                    <p className="text-sm font-semibold tabular-nums text-[color:var(--excess)]">{fmt(g.excess)}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
