import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Package, ClipboardList, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/marketing-orders")({
  component: AdminMarketingOrders,
});

type MarketingOrder = {
  id: string;
  team_name: string;
  product_id: string | null;
  product_name: string;
  product_photo_url: string | null;
  qty: number;
  specs: string | null;
  order_date: string;
  status: string;
  assigned_goldsmith_id: string | null;
};

function AdminMarketingOrders() {
  const { isAdmin, isSuperAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [assigning, setAssigning] = useState<MarketingOrder | null>(null);
  const [goldsmithId, setGoldsmithId] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["marketing_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MarketingOrder[];
    },
    enabled: isAdmin,
  });

  const { data: goldsmiths = [] } = useQuery({
    queryKey: ["goldsmiths_for_assign"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goldsmiths")
        .select("id, name, symbol")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const assign = useMutation({
    mutationFn: async () => {
      if (!assigning || !goldsmithId) throw new Error("Pick a goldsmith");
      // Find or create a default book
      const { data: existingBooks } = await supabase
        .from("books")
        .select("id")
        .eq("goldsmith_id", goldsmithId)
        .limit(1);
      let bookId = existingBooks?.[0]?.id;
      if (!bookId) {
        const { data: newBook, error: be } = await supabase
          .from("books")
          .insert({ goldsmith_id: goldsmithId, name: "Main Book" })
          .select("id")
          .single();
        if (be) throw be;
        bookId = newBook.id;
      }
      // Create order prefilled
      const { data: order, error: oe } = await supabase
        .from("orders")
        .insert({
          book_id: bookId,
          issue_date: assigning.order_date,
          ordered_qty: assigning.qty,
          issued_item_name: assigning.product_name,
          specs: assigning.specs,
        })
        .select("id")
        .single();
      if (oe) throw oe;
      // Update marketing order
      const { error: me } = await supabase
        .from("marketing_orders")
        .update({
          status: "assigned",
          assigned_goldsmith_id: goldsmithId,
          assigned_order_id: order.id,
        })
        .eq("id", assigning.id);
      if (me) throw me;
      return { goldsmithId, bookId };
    },
    onSuccess: ({ goldsmithId, bookId }) => {
      toast.success("Assigned · ပန်းထိမ်ဆရာထံ အပ်နှံပြီး");
      setAssigning(null);
      setGoldsmithId("");
      qc.invalidateQueries({ queryKey: ["marketing_orders"] });
      navigate({
        to: "/goldsmiths/$id/books/$bookId",
        params: { id: goldsmithId, bookId },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("marketing_orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["marketing_orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["marketing_orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!isAdmin) return <Navigate to="/" />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-gold shadow-gold">
          <ClipboardList className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            Office · ပန်းထိမ်ရုံးချုပ်
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Marketing Re-orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            လမ်းကြောင်းအဖွဲ့များမှ တင်လာသော အရေးပေါ်အမှာစာများ
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Team · အဖွဲ့</th>
                <th className="px-4 py-3 font-medium">Product · ပစ္စည်း</th>
                <th className="px-4 py-3 font-medium text-right">Qty · ခုရေ</th>
                <th className="px-4 py-3 font-medium">Date · ရက်စွဲ</th>
                <th className="px-4 py-3 font-medium">Status · အခြေအနေ</th>
                <th className="px-4 py-3 font-medium">Specs · မှတ်ချက်</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No marketing orders yet.</td></tr>
              ) : orders.map((o) => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{o.team_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 overflow-hidden rounded-md bg-gold-soft">
                        {o.product_photo_url ? (
                          <img src={o.product_photo_url} alt={o.product_name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Package className="h-5 w-5 text-gold/50" />
                          </div>
                        )}
                      </div>
                      <span>{o.product_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{Number(o.qty)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.order_date}</td>
                  <td className="px-4 py-3">
                    <Select value={o.status} onValueChange={(v) => setStatus.mutate({ id: o.id, status: v })}>
                      <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending · စီစစ်ဆဲ</SelectItem>
                        <SelectItem value="assigned">Assigned · အပ်နှံပြီး</SelectItem>
                        <SelectItem value="completed">Completed · ပြီးဆုံး</SelectItem>
                        <SelectItem value="cancelled">Cancelled · ပယ်ဖျက်</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[240px] truncate" title={o.specs ?? ""}>
                    {o.specs ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => { setAssigning(o); setGoldsmithId(""); }}
                        className="bg-gradient-gold text-primary-foreground"
                      >
                        Assign · အပ်နှံ
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                      {isSuperAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { if (confirm("Delete this order?")) del.mutate(o.id); }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!assigning} onOpenChange={(v) => !v && setAssigning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Goldsmith · ပန်းထိမ်ဆရာထံ အပ်နှံရန်</DialogTitle>
          </DialogHeader>
          {assigning && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p><span className="text-muted-foreground">Team:</span> <strong>{assigning.team_name}</strong></p>
                <p><span className="text-muted-foreground">Product:</span> <strong>{assigning.product_name}</strong></p>
                <p><span className="text-muted-foreground">Qty:</span> <strong>{Number(assigning.qty)}</strong></p>
                {assigning.specs && <p className="text-muted-foreground">{assigning.specs}</p>}
              </div>
              <div>
                <Label>Goldsmith · ပန်းထိမ်ဆရာ</Label>
                <Select value={goldsmithId} onValueChange={setGoldsmithId}>
                  <SelectTrigger><SelectValue placeholder="Select goldsmith" /></SelectTrigger>
                  <SelectContent>
                    {goldsmiths.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}{(g as { symbol?: string | null }).symbol ? ` · ${(g as { symbol?: string | null }).symbol}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  A new order will be created in the goldsmith's book with item, qty, specs, and date prefilled. You'll be redirected there to finish entering details.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigning(null)}>Cancel</Button>
            <Button
              onClick={() => assign.mutate()}
              disabled={assign.isPending || !goldsmithId}
              className="bg-gradient-gold text-primary-foreground"
            >
              {assign.isPending ? "Assigning…" : "Assign & Open Book"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
