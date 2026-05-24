import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Phone, MapPin, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/products/$pid")({
  component: ProductDetail,
});

function ProductDetail() {
  const { pid } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["product", pid],
    queryFn: async () => {
      const [{ data: product }, { data: links }] = await Promise.all([
        supabase.from("products").select("*").eq("id", pid).single(),
        supabase.from("goldsmith_specialties").select("goldsmith_id").eq("product_id", pid),
      ]);
      const ids = (links ?? []).map((l) => l.goldsmith_id as string);
      const { data: goldsmiths } = ids.length
        ? await supabase.from("goldsmiths").select("*").in("id", ids).order("name")
        : { data: [] as Array<{ id: string; name: string; phone: string | null; address: string | null; photo_url: string | null; work_status: string; symbol?: string | null }> };
      return { product, goldsmiths: goldsmiths ?? [] };
    },
  });

  if (isLoading || !data?.product) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const p = data.product;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Products · ပစ္စည်းစာရင်းသို့ပြန်သွားရန်
      </Link>

      <div className="flex flex-wrap items-start gap-5 rounded-2xl border bg-gradient-surface p-6">
        <div className="h-28 w-28 overflow-hidden rounded-2xl bg-gold-soft">
          {p.photo_url ? (
            <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            {(p as { category?: string | null }).category ?? "Product"}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">{p.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Goldsmiths who specialise in this item.
          </p>
        </div>
      </div>

      <section>
        <h2 className="font-display text-xl font-semibold">Specialists · ကျွမ်းကျင်သူများ</h2>
        {data.goldsmiths.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No goldsmiths yet associated with this product. Add it as a specialty from a goldsmith's profile.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.goldsmiths.map((g) => {
              const busy = g.work_status === "busy";
              return (
                <Link
                  key={g.id}
                  to="/goldsmiths/$id"
                  params={{ id: g.id }}
                  className="group flex items-start gap-3 rounded-2xl border bg-card p-4 transition-all hover:border-gold/50 hover:shadow-gold"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gold-soft text-gold">
                    {g.photo_url ? <img src={g.photo_url} alt={g.name} className="h-full w-full object-cover" /> : g.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{g.name}</p>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${busy ? "bg-[color:var(--due)]/15 text-[color:var(--due)]" : "bg-[color:var(--excess)]/15 text-[color:var(--excess)]"}`}>
                        {busy ? "Busy" : "Available"}
                      </span>
                    </div>
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
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
