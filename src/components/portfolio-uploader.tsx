import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function PortfolioUploader({ goldsmithId, canEdit }: { goldsmithId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["portfolio", goldsmithId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goldsmith_portfolio")
        .select("*")
        .eq("goldsmith_id", goldsmithId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upload = async (files: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${goldsmithId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("portfolio-photos")
          .upload(path, file, { contentType: file.type });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("portfolio-photos").getPublicUrl(path);
        const { error: insertError } = await supabase.from("goldsmith_portfolio").insert({
          goldsmith_id: goldsmithId,
          photo_url: data.publicUrl,
        });
        if (insertError) throw insertError;
      }
      toast.success("Portfolio updated");
      qc.invalidateQueries({ queryKey: ["portfolio", goldsmithId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goldsmith_portfolio").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["portfolio", goldsmithId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {canEdit && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="group flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-gold/40 bg-gold-soft/30 transition-all hover:border-gold hover:bg-gold-soft"
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
            ) : (
              <Plus className="h-8 w-8 text-gold" />
            )}
          </button>
        )}
        {items.map((it) => (
          <div key={it.id} className="group relative aspect-square overflow-hidden rounded-xl border bg-card">
            <img src={it.photo_url} alt="" className="h-full w-full object-cover" />
            {canEdit && (
              <button
                type="button"
                onClick={() => { if (confirm("Remove this photo?")) del.mutate(it.id); }}
                className="absolute right-2 top-2 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && !canEdit && (
          <p className="col-span-full text-sm text-muted-foreground">No portfolio photos yet.</p>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) upload(e.target.files);
        }}
      />
    </div>
  );
}
