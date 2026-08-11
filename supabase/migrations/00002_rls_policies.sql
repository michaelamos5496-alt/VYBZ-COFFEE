-- Row Level Security — Phase 1 baseline
-- Any authenticated staff member can read/write for now. Fine-grained
-- role permissions (admin/manager/cashier) will be layered on in a later
-- phase once the POS and reporting flows are built.

alter table staff enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table inventory_items enable row level security;
alter table recipes enable row level security;
alter table recipe_items enable row level security;
alter table stock_movements enable row level security;
alter table business_settings enable row level security;

create policy "Authenticated users can read staff"
  on staff for select
  to authenticated
  using (true);

create policy "Authenticated users can manage staff"
  on staff for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read categories"
  on categories for select
  to authenticated
  using (true);

create policy "Authenticated users can manage categories"
  on categories for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read products"
  on products for select
  to authenticated
  using (true);

create policy "Authenticated users can manage products"
  on products for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read inventory_items"
  on inventory_items for select
  to authenticated
  using (true);

create policy "Authenticated users can manage inventory_items"
  on inventory_items for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read recipes"
  on recipes for select
  to authenticated
  using (true);

create policy "Authenticated users can manage recipes"
  on recipes for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read recipe_items"
  on recipe_items for select
  to authenticated
  using (true);

create policy "Authenticated users can manage recipe_items"
  on recipe_items for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read stock_movements"
  on stock_movements for select
  to authenticated
  using (true);

create policy "Authenticated users can manage stock_movements"
  on stock_movements for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read business_settings"
  on business_settings for select
  to authenticated
  using (true);

create policy "Authenticated users can manage business_settings"
  on business_settings for all
  to authenticated
  using (true)
  with check (true);
