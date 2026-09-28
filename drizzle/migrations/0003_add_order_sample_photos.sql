ALTER TABLE public.marketing_orders
  ADD COLUMN IF NOT EXISTS sample_photo_url text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS sample_photo_url text;

CREATE POLICY "Order sample photos authenticated read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'order-sample-photos');

CREATE POLICY "Order sample photos authorized upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-sample-photos'
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'marketing'::public.app_role)
  )
);

CREATE POLICY "Order sample photos admins update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'order-sample-photos'
  AND public.is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'order-sample-photos'
  AND public.is_admin(auth.uid())
);

CREATE POLICY "Order sample photos admins delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'order-sample-photos'
  AND public.is_admin(auth.uid())
);