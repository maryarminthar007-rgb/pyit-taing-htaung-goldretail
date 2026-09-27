import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Activity, CircleDot, AlertTriangle } from "lucide-react";
import { type OrderRow } from "@/lib/calc";
import { depositLabel, depositLimitGrams, outstandingGrams, OverLimitAlert } from "@/lib/risk";

export const Route = createFileRoute("/_authenticated/work-status")({
  head: () => ({
    meta: [
      { title: "Work Status · Pyit Taing Htaung" },
      { name: "description", content: "Daily goldsmith workload, due dates and deposit limits." },
      { property: "og:title", content: "Work Status · Pyit Taing Htaung" },
      { property: "og:description", content: "Daily goldsmith workload, due dates and deposit limits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkStatusPage,
});

type G = {
  id: string; name: string; photo_url: string | null; work_status: string;
  deposit_type?: string | null; deposit_gold_g?: number | null; deposit_cash?: number | null; deposit_gold_rate?: number | null;
};

const today = () => new Date().toISOString().slice(0, 10);

function WorkStatusPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["work-status"],
    queryFn: async () => {
      const [{ data: goldsmiths }, { data: books }, { data: orders }] = await Promise.all([
        supabase.from("goldsmiths").select("*").order("name"),
        supabase.from("books").select("*"),
        supabase.from("orders").select("*"),
      ]);
      return {
        goldsmiths: (goldsmiths ?? []) as unknown as G[],
        books: books ?? [],
        orders: (orders ?? []) as OrderRow[],
      };
    },
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const ordersFor = (gid: string) => {
    const ids = new Set(data.books.filter((b) => b.goldsmith_id === gid).map((b) => b.id));
    return data.orders.filter((o) => ids.has(o.book_id));
  };
  const openOf = (os: OrderRow[]) => os.filter((o) => o.issue_date && (!o.return_date || o.returned_qty == null));

  const busy = data.goldsmiths.filter((g) => g.work_status === "busy");
  const available = data.goldsmiths.filter((g) => g.work_status !== "busy");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
          Work Status · နေ့စဉ် အလုပ်ရှိ/မရှိ စာရင်း
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Goldsmith Workload</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Red cards are past their due date — follow up by phone.
        </p>
      </div>

      <Tabs defaultValue="busy">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="busy">In Progress · အလုပ်ရှိ ({busy.length})</TabsTrigger>
          <TabsTrigger value="available">Available · အလုပ်မရှိ ({available.length})</TabsTrigger>
        </TabsList>
        {([["busy", busy], ["available", available]] as const).map(([key, list]) => (
          <TabsContent key={key} value={key} className="pt-4">
            {list.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-12 text-center">
                <Activity className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">Nobody here right now.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((g) => {
                  const all = ordersFor(g.id);
                  return <Card key={g.id} g={g} open={openOf(all)} all={all} />;
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function Card({ g, open, all }: { g: G; open: OrderRow[]; all: OrderRow[] }) {
  const t = today();
  const overdue = open.some((o) => o.return_due_date && o.return_due_date < t);
  const limit = depositLimitGrams(g);
  const outstanding = outstandingGrams(all);
  const over = limit !== null && outstanding > limit;
  const busy = g.work_status === "busy";
  return (
    <Link
      to="/goldsmiths/$id"
      params={{ id: g.id }}
      className={`block rounded-2xl border bg-card p-4 transition-all hover:shadow-gold ${
        overdue ? "border-2 border-destructive bg-destructive/5" : "hover:border-gold/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gold-soft text-gold">
          {g.photo_url ? <img src={g.photo_url} alt={g.name} className="h-full w-full object-cover" /> : g.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{g.name}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              busy ? "bg-[color:var(--due)]/15 text-[color:var(--due)]" : "bg-[color:var(--excess)]/15 text-[color:var(--excess)]"
            }`}>
              <CircleDot className="h-2.5 w-2.5" />
              {busy ? "In Progress" : "Available"}
            </span>
            {overdue && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                <AlertTriangle className="h-2.5 w-2.5" /> Overdue · ရက်ကျော်
              </span>
            )}
            {over && <OverLimitAlert compact outstanding={outstanding} limit={limit!} />}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            စပေါ် · <span className="font-medium text-foreground">{depositLabel(g)}</span>
          </p>
        </div>
      </div>
      {open.length > 0 && (
        <ul className="mt-3 space-y-1 border-t pt-2 text-xs">
          <li className="grid grid-cols-[1fr_auto_auto] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Item</span><span>ပေးသည့်ရက်</span><span>အပ်ရမည့်ရက်</span>
          </li>
          {open.slice(0, 5).map((o) => {
            const late = o.return_due_date && o.return_due_date < t;
            return (
              <li key={o.id} className="grid grid-cols-[1fr_auto_auto] gap-2 tabular-nums">
                <span className="truncate">{o.issued_item_name ?? "Item"}</span>
                <span className="text-muted-foreground">{o.issue_date}</span>
                <span className={late ? "font-semibold text-destructive" : "text-muted-foreground"}>{o.return_due_date ?? "—"}</span>
              </li>
            );
          })}
          {open.length > 5 && <li className="text-muted-foreground">+{open.length - 5} more</li>}
        </ul>
      )}
    </Link>
  );
}
