import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  bucket: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  /** square thumbnail size in tailwind classes */
  className?: string;
  label?: string;
};

export function PhotoUpload({ bucket, value, onChange, className, label }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Max 8 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gold/40 bg-gold-soft/30 transition-all hover:border-gold hover:bg-gold-soft"
        disabled={uploading}
      >
        {value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Plus className="h-6 w-6 text-white" />
            </span>
          </>
        ) : uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        ) : (
          <Plus className="h-7 w-7 text-gold" />
        )}
      </button>
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{label ?? "Upload photo"}</span>
        <span>JPG / PNG · up to 8 MB</span>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 text-destructive hover:underline"
          >
            <X className="h-3 w-3" /> Remove
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}

export function PhotoUploadPlaceholder() {
  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-muted bg-muted/30">
      <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
    </div>
  );
}
