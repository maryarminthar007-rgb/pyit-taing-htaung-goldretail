import { useEffect, useRef, useState } from "react";
import { Download, Eye, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const BUCKET = "order-sample-photos";

function useSignedPhoto(path?: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    if (!path) return () => { active = false; };
    void supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60).then(({ data, error }) => {
      if (active && !error) setUrl(data.signedUrl);
    });
    return () => { active = false; };
  }, [path]);

  return url;
}

export function SamplePhotoUpload({
  value,
  onChange,
  compact = false,
}: {
  value?: string | null;
  onChange: (path: string | null) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const signedUrl = useSignedPhoto(value);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const chooseFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Photo must be 8 MB or smaller");
      return;
    }

    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const ext = rawExt.replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      onChange(path);
      toast.success("Sample photo uploaded · နမူနာပုံ တင်ပြီးပါပြီ");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Photo upload failed");
      setLocalPreview(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const preview = localPreview ?? signedUrl;
  return (
    <div className={cn("rounded-md border bg-muted/20", compact ? "p-2" : "p-3")}>
      <p className="mb-2 text-xs font-medium">Upload Sample Photo · နမူနာပုံ တင်ရန် <span className="text-muted-foreground">(Optional)</span></p>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <button
          type="button"
          aria-label="Upload or replace sample photo"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "relative grid shrink-0 place-items-center overflow-hidden rounded-md border border-dashed border-gold/50 bg-gold-soft/30",
            compact ? "h-16 w-16" : "h-20 w-20",
          )}
        >
          {preview ? <img src={preview} alt="Selected sample" className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-gold" />}
          {uploading && <span className="absolute inset-0 grid place-items-center bg-background/70"><Loader2 className="h-5 w-5 animate-spin text-gold" /></span>}
        </button>
        <div className="min-w-0 space-y-1.5">
          <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload className="mr-1.5 h-3.5 w-3.5" /> {value ? "Replace · အသစ်လဲရန်" : "Choose Photo · ပုံရွေးရန်"}
          </Button>
          <p className="text-[11px] text-muted-foreground">JPG, PNG or WEBP · Max 8 MB</p>
          {value && (
            <button type="button" onClick={() => { onChange(null); setLocalPreview(null); }} className="inline-flex items-center gap-1 text-[11px] text-destructive hover:underline">
              <X className="h-3 w-3" /> Remove · ဖယ်ရှားရန်
            </button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void chooseFile(file);
      }} />
    </div>
  );
}

export function SamplePhotoViewer({ path, label = "Sample photo", size = "md", showAction = false }: { path?: string | null; label?: string; size?: "sm" | "md"; showAction?: boolean }) {
  const signedUrl = useSignedPhoto(path);
  const [open, setOpen] = useState(false);

  if (!path) return null;

  const download = async () => {
    if (!signedUrl) return;
    try {
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error("Could not download photo");
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `sample-photo-${Date.now()}.jpg`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    }
  };

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={() => setOpen(true)} aria-label={`View ${label}`} className={cn("group relative shrink-0 overflow-hidden rounded-md border bg-muted", size === "sm" ? "h-10 w-10" : "h-16 w-16")}>
          {signedUrl ? <img src={signedUrl} alt={label} className="h-full w-full object-cover" /> : <Loader2 className="m-auto h-4 w-4 animate-spin text-muted-foreground" />}
          <span className="absolute inset-0 grid place-items-center bg-background/60 opacity-0 transition-opacity group-hover:opacity-100"><Eye className="h-4 w-4" /></span>
        </button>
        {showAction && (
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Eye className="mr-1.5 h-3.5 w-3.5" /> View / Download
          </Button>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-6xl p-4 sm:p-5">
          <DialogHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pr-8">
            <DialogTitle className="truncate font-sans text-base">Attached Sample Photo · နမူနာပုံ</DialogTitle>
            <Button type="button" size="sm" onClick={() => void download()} disabled={!signedUrl}>
              <Download className="mr-1.5 h-4 w-4" /> Download / Save Photo
            </Button>
          </DialogHeader>
          <div className="grid min-h-0 flex-1 place-items-center overflow-hidden rounded-md bg-muted/40">
            {signedUrl ? <img src={signedUrl} alt={label} className="max-h-full max-w-full object-contain" /> : <Loader2 className="h-7 w-7 animate-spin text-gold" />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}