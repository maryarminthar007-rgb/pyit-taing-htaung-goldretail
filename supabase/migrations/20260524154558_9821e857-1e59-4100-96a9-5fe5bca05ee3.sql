
create table public.goldsmiths (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  goldsmith_id uuid not null references public.goldsmiths(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  issue_date date,
  ordered_qty numeric,
  issued_item_name text,
  gold_quality text,
  specs text,
  issued_weight numeric default 0,
  return_due_date date,
  returned_qty numeric,
  returned_item_name text,
  returned_weight numeric default 0,
  wastage numeric default 0,
  fire_loss numeric default 0,
  due_gold numeric default 0,
  excess_gold numeric default 0,
  total_due_gold numeric default 0,
  total_excess_gold numeric default 0,
  sort_index bigint not null default extract(epoch from now())*1000,
  created_at timestamptz not null default now()
);

create index on public.books(goldsmith_id);
create index on public.orders(book_id, sort_index);

alter table public.goldsmiths enable row level security;
alter table public.books enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

create policy "public all" on public.goldsmiths for all using (true) with check (true);
create policy "public all" on public.books for all using (true) with check (true);
create policy "public all" on public.products for all using (true) with check (true);
create policy "public all" on public.orders for all using (true) with check (true);
