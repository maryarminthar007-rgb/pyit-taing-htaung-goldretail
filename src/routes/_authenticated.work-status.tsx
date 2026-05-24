import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Activity, Phone, MapPin, CircleDot } from "lucide-react";
import { type OrderRow } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/work-status")({
  component: WorkStatusPage,
});

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
        goldsmiths: goldsmiths ?? [],
        books: books ?? [],
        orders: (orders ?? []) as OrderRow[],
      };
    },
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const busy = data.goldsmiths.filter((g) => g.work_status === "busy");
  const available = data.goldsmiths.filter((g) => g.work_status !== "busy");

  const openOrdersFor = (gid: string) => {
    const bookIds = data.books.filter((b) => b.goldsmith_id === gid).map((b) => b.id);
    return data.orders.filter(
      (o) =>
        bookIds.includes(o.book_id) &&
        o.issue_date &&
        (!o.return_date || o.returned_qty == null),
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
          Work Status · အလုပ်ရှိ / မရှိ
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Goldsmith Workload</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Auto-updated: busy while any order is issued and not yet returned.
        </p>
      </div>

      <Tabs defaultValue="busy">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="busy">
            Active Work · အလုပ်ရှိသူ ({busy.length})
          </TabsTrigger>
          <TabsTrigger value="available">
            Available · အလုပ်မရှိသူ ({available.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="busy" className="pt-4">
          {busy.length === 0 ? (
            <EmptyState text="No goldsmiths are currently working on issued orders." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {busy.map((g) => {
                const open = openOrdersFor(g.id);
                return (
                  <Card key={g.id} g={g} status="busy">
                    <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Open orders ({open.length})
                    </p>
                    <ul className="mt-1 space-y-1 text-xs">
                      {open.slice(0, 4).map((o) => (
                        <li key={o.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{o.issued_item_name ?? "Item"}</span>
                          <span className="text-muted-foreground">{o.issue_date}</span>
                        </li>
                      ))}
                      {open.length > 4 && (
                        <li className="text-muted-foreground">+{open.length - 4} more</li>
                      )}
                    </ul>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="available" className="pt-4">
          {available.length === 0 ? (
            <EmptyState text="Everyone is currently busy." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((g) => (
                <Card key={g.id} g={g} status="available" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({
  g,
  status,
  children,
}: {
  g: { id: string; name: string; phone: string | null; address: string | null; photo_url: string | null };
  status: "busy" | "available";
  children?: React.ReactNode;
}) {
  return (
    <Link
      to="/goldsmiths/$id"
      params={{ id: g.id }}
      className="block rounded-2xl border bg-card p-4 transition-all hover:border-gold/50 hover:shadow-gold"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gold-soft text-gold">
          {g.photo_url ? <img src={g.photo_url} alt={g.name} className="h-full w-full object-cover" /> : g.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{g.name}</p>
          <span
            className={`mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              status === "busy"
                ? "bg-[color:var(--due)]/15 text-[color:var(--due)]"
                : "bg-[color:var(--excess)]/15 text-[color:var(--excess)]"
            }`}
          >
            <CircleDot className="h-2.5 w-2.5" />
            {status === "busy" ? "Active Work" : "Available"}
          </span>
          {g.phone && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" /> {g.phone}
            </p>
          )}
          {g.address && (
            <p className="line-clamp-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {g.address}
            </p>
          )}
        </div>
      </div>
      {children}
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-12 text-center">
      <Activity className="mx-auto h-10 w-10 text-muted-foreground/40" />
      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
