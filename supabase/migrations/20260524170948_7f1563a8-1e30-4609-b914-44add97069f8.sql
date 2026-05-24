
-- Storage buckets
insert into storage.buckets (id, name, public) values
  ('goldsmith-photos','goldsmith-photos',true),
  ('product-photos','product-photos',true),
  ('portfolio-photos','portfolio-photos',true),
  ('gemstone-photos','gemstone-photos',true)
on conflict (id) do nothing;

-- Storage policies (public read, admin write)
create policy "Public read goldsmith photos" on storage.objects for select using (bucket_id = 'goldsmith-photos');
create policy "Admins write goldsmith photos" on storage.objects for insert to authenticated with check (bucket_id = 'goldsmith-photos' and public.is_admin(auth.uid()));
create policy "Admins update goldsmith photos" on storage.objects for update to authenticated using (bucket_id = 'goldsmith-photos' and public.is_admin(auth.uid()));
create policy "Admins delete goldsmith photos" on storage.objects for delete to authenticated using (bucket_id = 'goldsmith-photos' and public.is_admin(auth.uid()));

create policy "Public read product photos" on storage.objects for select using (bucket_id = 'product-photos');
create policy "Admins write product photos" on storage.objects for insert to authenticated with check (bucket_id = 'product-photos' and public.is_admin(auth.uid()));
create policy "Admins update product photos" on storage.objects for update to authenticated using (bucket_id = 'product-photos' and public.is_admin(auth.uid()));
create policy "Admins delete product photos" on storage.objects for delete to authenticated using (bucket_id = 'product-photos' and public.is_admin(auth.uid()));

create policy "Public read portfolio photos" on storage.objects for select using (bucket_id = 'portfolio-photos');
create policy "Admins write portfolio photos" on storage.objects for insert to authenticated with check (bucket_id = 'portfolio-photos' and public.is_admin(auth.uid()));
create policy "Admins update portfolio photos" on storage.objects for update to authenticated using (bucket_id = 'portfolio-photos' and public.is_admin(auth.uid()));
create policy "Admins delete portfolio photos" on storage.objects for delete to authenticated using (bucket_id = 'portfolio-photos' and public.is_admin(auth.uid()));

create policy "Public read gemstone photos" on storage.objects for select using (bucket_id = 'gemstone-photos');
create policy "Admins write gemstone photos" on storage.objects for insert to authenticated with check (bucket_id = 'gemstone-photos' and public.is_admin(auth.uid()));
create policy "Admins update gemstone photos" on storage.objects for update to authenticated using (bucket_id = 'gemstone-photos' and public.is_admin(auth.uid()));
create policy "Admins delete gemstone photos" on storage.objects for delete to authenticated using (bucket_id = 'gemstone-photos' and public.is_admin(auth.uid()));

-- Column additions
alter table public.goldsmiths add column if not exists apprentice_phone text;
alter table public.products add column if not exists category text;
alter table public.orders add column if not exists wastage_per_piece numeric default 0;
alter table public.orders add column if not exists water_loss numeric default 0;
alter table public.orders add column if not exists return_date date;

-- Specialties M2M
create table if not exists public.goldsmith_specialties (
  id uuid primary key default gen_random_uuid(),
  goldsmith_id uuid not null references public.goldsmiths(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(goldsmith_id, product_id)
);
alter table public.goldsmith_specialties enable row level security;
create policy "View specialties" on public.goldsmith_specialties for select to authenticated using (true);
create policy "Admins insert specialties" on public.goldsmith_specialties for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "Admins update specialties" on public.goldsmith_specialties for update to authenticated using (public.is_admin(auth.uid()));
create policy "Admins delete specialties" on public.goldsmith_specialties for delete to authenticated using (public.is_admin(auth.uid()));

-- Portfolio
create table if not exists public.goldsmith_portfolio (
  id uuid primary key default gen_random_uuid(),
  goldsmith_id uuid not null references public.goldsmiths(id) on delete cascade,
  photo_url text not null,
  caption text,
  created_at timestamptz not null default now()
);
alter table public.goldsmith_portfolio enable row level security;
create policy "View portfolio" on public.goldsmith_portfolio for select to authenticated using (true);
create policy "Admins insert portfolio" on public.goldsmith_portfolio for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "Admins update portfolio" on public.goldsmith_portfolio for update to authenticated using (public.is_admin(auth.uid()));
create policy "Admins delete portfolio" on public.goldsmith_portfolio for delete to authenticated using (public.is_admin(auth.uid()));

-- Auto work status: recompute on order changes
create or replace function public.recompute_goldsmith_status(_goldsmith_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  busy boolean;
begin
  select exists(
    select 1
    from public.orders o
    join public.books b on b.id = o.book_id
    where b.goldsmith_id = _goldsmith_id
      and o.issue_date is not null
      and (o.return_date is null or o.returned_qty is null)
  ) into busy;
  update public.goldsmiths
  set work_status = case when busy then 'busy' else 'available' end
  where id = _goldsmith_id;
end;
$$;

create or replace function public.orders_status_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  gs uuid;
begin
  select goldsmith_id into gs from public.books where id = coalesce(new.book_id, old.book_id);
  if gs is not null then
    perform public.recompute_goldsmith_status(gs);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_orders_status on public.orders;
create trigger trg_orders_status
after insert or update or delete on public.orders
for each row execute function public.orders_status_trigger();
