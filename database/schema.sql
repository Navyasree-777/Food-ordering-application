-- Online Food Ordering System schema for Supabase PostgreSQL.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  email text not null unique,
  password_hash text not null,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 1 and 60)
);

create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '',
  price numeric(10,2) not null check (price > 0),
  image_url text,
  category_id uuid references public.categories(id) on delete set null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'Pending' check (status in ('Pending','Confirmed','Preparing','Out for Delivery','Delivered','Cancelled')),
  total numeric(10,2) not null check (total > 0),
  delivery_address text not null check (char_length(trim(delivery_address)) between 1 and 500),
  phone text not null check (char_length(trim(phone)) between 1 and 30),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  food_id uuid references public.food_items(id) on delete set null,
  food_name text not null,
  quantity integer not null check (quantity between 1 and 20),
  unit_price numeric(10,2) not null check (unit_price > 0)
);

create index if not exists food_items_category_idx on public.food_items(category_id);
create index if not exists food_items_available_idx on public.food_items(is_available);
create index if not exists orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists order_items_order_idx on public.order_items(order_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists food_items_updated_at on public.food_items;
create trigger food_items_updated_at before update on public.food_items for each row execute function public.set_updated_at();

-- Atomic order creation: insert order + order lines in one transaction.
create or replace function public.create_food_order(
  p_customer_id uuid, p_delivery_address text, p_phone text, p_total numeric, p_items jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare new_order public.orders; item jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then raise exception 'Order items are required'; end if;
  insert into public.orders(customer_id, delivery_address, phone, total)
  values (p_customer_id, trim(p_delivery_address), trim(p_phone), p_total) returning * into new_order;
  for item in select value from jsonb_array_elements(p_items) loop
    insert into public.order_items(order_id, food_id, food_name, quantity, unit_price)
    values (new_order.id, (item->>'food_id')::uuid, item->>'food_name', (item->>'quantity')::integer, (item->>'unit_price')::numeric);
  end loop;
  return jsonb_build_object('id', new_order.id, 'status', new_order.status, 'total', new_order.total, 'created_at', new_order.created_at);
end; $$;
revoke all on function public.create_food_order(uuid, text, text, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.create_food_order(uuid, text, text, numeric, jsonb) to service_role;

-- Backend uses the server-only Supabase service key and enforces authorization in Express.
-- RLS is enabled as defense in depth; never expose the service key to the browser.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.food_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
-- No anon/authenticated policies are created because this project accesses tables through the protected backend.

insert into public.categories(name) values ('Burgers'), ('Pizza'), ('Indian'), ('Sides'), ('Drinks') on conflict (name) do nothing;
insert into public.food_items(name, description, price, category_id)
select v.name, v.description, v.price, c.id from (values
 ('Classic Veg Burger','Crispy vegetable patty, lettuce and house sauce.',129.00,'Burgers'),
 ('Margherita Pizza','Classic cheese pizza with tomato and basil.',249.00,'Pizza'),
 ('Paneer Butter Masala','Paneer in a creamy tomato gravy.',219.00,'Indian'),
 ('French Fries','Golden, crispy salted fries.',89.00,'Sides'),
 ('Masala Dosa','Crispy dosa served with chutney and sambar.',119.00,'Indian'),
 ('Fresh Lime Soda','Refreshing lime soda.',59.00,'Drinks')
) as v(name, description, price, category_name)
join public.categories c on c.name = v.category_name
where not exists (select 1 from public.food_items f where f.name = v.name);
