-- Marvin Coffee Spot — Phase 1 foundation schema
-- Enums

create type staff_role as enum ('admin', 'manager', 'cashier');

create type inventory_unit as enum (
  'g', 'kg', 'ml', 'litre', 'piece', 'pack', 'bottle'
);

create type stock_movement_type as enum (
  'purchase', 'sale', 'adjustment', 'waste', 'return', 'opening_stock'
);

-- Helper: keep updated_at fresh
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- staff
create table staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role staff_role not null default 'cashier',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger staff_set_updated_at
  before update on staff
  for each row execute function set_updated_at();

-- categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_set_updated_at
  before update on categories
  for each row execute function set_updated_at();

-- products (sellable menu items)
create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  description text,
  sku text unique,
  selling_price numeric(10, 2) not null check (selling_price >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_id_idx on products(category_id);

create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

-- inventory_items (ingredients / materials)
create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  unit inventory_unit not null,
  current_quantity numeric(12, 3) not null default 0,
  minimum_quantity numeric(12, 3) not null default 0,
  cost_per_unit numeric(10, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger inventory_items_set_updated_at
  before update on inventory_items
  for each row execute function set_updated_at();

-- recipes (one per product — links a product to its ingredient list)
create table recipes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger recipes_set_updated_at
  before update on recipes
  for each row execute function set_updated_at();

-- recipe_items (ingredient lines within a recipe)
create table recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete restrict,
  quantity numeric(12, 3) not null check (quantity > 0),
  unique (recipe_id, inventory_item_id)
);

create index recipe_items_recipe_id_idx on recipe_items(recipe_id);
create index recipe_items_inventory_item_id_idx on recipe_items(inventory_item_id);

-- stock_movements (ledger of all inventory changes)
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references inventory_items(id) on delete restrict,
  movement_type stock_movement_type not null,
  quantity numeric(12, 3) not null,
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid references staff(id) on delete set null,
  created_at timestamptz not null default now()
);

create index stock_movements_inventory_item_id_idx on stock_movements(inventory_item_id);
create index stock_movements_created_at_idx on stock_movements(created_at);

-- business_settings (single-row settings table)
create table business_settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'Marvin Coffee Spot',
  logo_url text,
  phone text,
  email text,
  address text,
  currency text not null default 'GHS',
  receipt_footer text,
  tax_rate numeric(5, 2) not null default 0,
  tax_inclusive boolean not null default true,
  payment_methods text[] not null default array['cash', 'card', 'mobile_money'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger business_settings_set_updated_at
  before update on business_settings
  for each row execute function set_updated_at();

-- seed a single settings row
insert into business_settings (business_name) values ('Marvin Coffee Spot');
