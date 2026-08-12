-- Phase 4 — POS orders, checkout, and hold/retrieve
--
-- Orders only ever exist in one of two persisted states: 'held' (a saved
-- draft cart, no money or inventory touched yet) or 'completed' (a
-- finished, paid sale). There is no in-between "cancelled" row for the
-- active cart being built at the register — that cart lives entirely in
-- the browser until the cashier holds or checks out, so cancelling it is
-- just clearing local state and never touches the database. Cancelling a
-- *held* order deletes its row outright, since nothing else references
-- it and nothing was ever deducted for it.

create type order_status as enum ('held', 'completed');
create type order_payment_status as enum ('pending', 'paid', 'failed');
create type order_payment_method as enum ('cash', 'card', 'mobile_money');

-- Order numbers are sequential and collision-safe by construction: a
-- Postgres sequence hands out a distinct value per nextval() call even
-- under concurrent transactions, no locking or read-then-write race
-- possible. Only assigned when an order completes — held orders don't
-- consume a number.
create sequence order_number_seq start 1000;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number integer unique,
  subtotal numeric(10, 2) not null default 0,
  discount numeric(10, 2) not null default 0,
  tax numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  payment_method order_payment_method,
  payment_status order_payment_status not null default 'pending',
  amount_received numeric(10, 2),
  change_due numeric(10, 2),
  status order_status not null default 'held',
  cashier_id uuid references staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index orders_status_idx on orders(status);
create index orders_created_at_idx on orders(created_at);

create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- product_name/unit_price/line_total are a snapshot at sale time — order
-- history must stay accurate even if a product is later renamed,
-- repriced, or deleted. Selling a product that's later deleted is why
-- this references products with `on delete restrict`: a product that has
-- ever been sold can't be hard-deleted out from under its order history.
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  product_name text not null,
  quantity numeric(10, 2) not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  line_total numeric(10, 2) not null check (line_total >= 0)
);

create index order_items_order_id_idx on order_items(order_id);

alter table orders enable row level security;
alter table order_items enable row level security;

create policy "Authenticated users can read orders"
  on orders for select to authenticated using (true);
create policy "Authenticated users can manage orders"
  on orders for all to authenticated using (true) with check (true);

create policy "Authenticated users can read order_items"
  on order_items for select to authenticated using (true);
create policy "Authenticated users can manage order_items"
  on order_items for all to authenticated using (true) with check (true);

-- Saves the current cart as a held order so the cashier can start
-- another sale and come back to it later. No inventory or payment is
-- touched — holding is purely a draft snapshot, priced from the
-- authoritative product prices at hold time.
create or replace function hold_order(p_items jsonb, p_cashier_id uuid)
returns uuid as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_product record;
  v_subtotal numeric := 0;
  v_line_total numeric;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cannot hold an empty order';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select id, name, selling_price into v_product
    from products where id = (v_item->>'product_id')::uuid;

    if v_product.id is null then
      raise exception 'Product % not found', v_item->>'product_id';
    end if;

    v_subtotal := v_subtotal + (v_product.selling_price * (v_item->>'quantity')::numeric);
  end loop;

  insert into orders (subtotal, discount, tax, total, status, cashier_id)
  values (v_subtotal, 0, 0, v_subtotal, 'held', p_cashier_id)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select id, name, selling_price into v_product
    from products where id = (v_item->>'product_id')::uuid;

    v_line_total := v_product.selling_price * (v_item->>'quantity')::numeric;

    insert into order_items (order_id, product_id, product_name, quantity, unit_price, line_total)
    values (v_order_id, v_product.id, v_product.name, (v_item->>'quantity')::numeric, v_product.selling_price, v_line_total);
  end loop;

  return v_order_id;
end;
$$ language plpgsql;

grant execute on function hold_order(jsonb, uuid) to authenticated;

-- The critical transaction: validates the cart against authoritative
-- product data, validates inventory is sufficient for every ingredient
-- the sale requires, then creates the order, its line items, and the
-- inventory deduction (via process_sale, reusing the Phase 3 engine) —
-- all inside one function call, i.e. one Postgres transaction. Any
-- exception raised at any step (bad product, inactive product, zero
-- quantity, insufficient stock, insufficient cash) unwinds everything
-- this call has done so far. Nothing is left half-applied.
create or replace function checkout_order(
  p_items jsonb,
  p_discount numeric,
  p_payment_method order_payment_method,
  p_amount_received numeric,
  p_cashier_id uuid
) returns table (
  order_id uuid,
  order_number integer,
  total numeric,
  change_due numeric
) as $$
declare
  v_order_id uuid;
  v_order_number integer;
  v_item jsonb;
  v_product record;
  v_shortfall record;
  v_subtotal numeric := 0;
  v_discount numeric := coalesce(p_discount, 0);
  v_tax numeric := 0;
  v_total numeric := 0;
  v_amount_received numeric;
  v_change numeric := 0;
  v_settings record;
  v_line_total numeric;
begin
  -- 1. Validate cart
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  if v_discount < 0 then
    raise exception 'Discount cannot be negative';
  end if;

  -- 2. Validate prices — always recompute from the authoritative
  -- products table, never trust a client-supplied price.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select id, name, selling_price, active
    into v_product
    from products
    where id = (v_item->>'product_id')::uuid;

    if v_product.id is null then
      raise exception 'Product % not found', v_item->>'product_id';
    end if;

    if not v_product.active then
      raise exception '% is not available for sale', v_product.name;
    end if;

    if ((v_item->>'quantity')::numeric) <= 0 then
      raise exception 'Quantity must be greater than zero for %', v_product.name;
    end if;

    v_subtotal := v_subtotal + (v_product.selling_price * (v_item->>'quantity')::numeric);
  end loop;

  if v_discount > v_subtotal then
    raise exception 'Discount cannot exceed subtotal';
  end if;

  -- 3. Validate inventory — aggregate every ingredient this cart
  -- requires (expanding recipes, converting units) and fail with a clear
  -- message naming the ingredient before anything is written. This is a
  -- courtesy for a clean error message; process_sale's own trigger would
  -- still catch and roll back a shortfall even without this check.
  for v_shortfall in
    select ii.name, ii.unit, ii.current_quantity,
           sum(convert_inventory_quantity(
             ri.quantity * (elem->>'quantity')::numeric, ri.unit, ii.unit
           )) as required
    from jsonb_array_elements(p_items) elem
    join recipes r on r.product_id = (elem->>'product_id')::uuid
    join recipe_items ri on ri.recipe_id = r.id
    join inventory_items ii on ii.id = ri.inventory_item_id
    group by ii.id, ii.name, ii.unit, ii.current_quantity
    having sum(convert_inventory_quantity(
      ri.quantity * (elem->>'quantity')::numeric, ri.unit, ii.unit
    )) > ii.current_quantity
  loop
    raise exception 'Insufficient stock for %: need %, have %',
      v_shortfall.name, v_shortfall.required, v_shortfall.current_quantity;
  end loop;

  select tax_rate, tax_inclusive into v_settings from business_settings limit 1;

  if coalesce(v_settings.tax_inclusive, true) then
    v_tax := (v_subtotal - v_discount) - (v_subtotal - v_discount) / (1 + coalesce(v_settings.tax_rate, 0) / 100);
    v_total := v_subtotal - v_discount;
  else
    v_tax := (v_subtotal - v_discount) * (coalesce(v_settings.tax_rate, 0) / 100);
    v_total := v_subtotal - v_discount + v_tax;
  end if;

  if p_payment_method = 'cash' then
    if p_amount_received is null or p_amount_received < v_total then
      raise exception 'Amount received must be at least the total due';
    end if;
    v_amount_received := p_amount_received;
    v_change := p_amount_received - v_total;
  else
    v_amount_received := v_total;
    v_change := 0;
  end if;

  -- 4. Create order
  insert into orders (
    subtotal, discount, tax, total, payment_method, payment_status,
    amount_received, change_due, status, cashier_id, completed_at
  ) values (
    v_subtotal, v_discount, v_tax, v_total, p_payment_method, 'paid',
    v_amount_received, v_change, 'completed', p_cashier_id, now()
  )
  returning id into v_order_id;

  -- 5. Create order items
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select id, name, selling_price into v_product
    from products where id = (v_item->>'product_id')::uuid;

    v_line_total := v_product.selling_price * (v_item->>'quantity')::numeric;

    insert into order_items (order_id, product_id, product_name, quantity, unit_price, line_total)
    values (v_order_id, v_product.id, v_product.name, (v_item->>'quantity')::numeric, v_product.selling_price, v_line_total);
  end loop;

  -- 6 & 7. Deduct recipe ingredients and record stock movements. Any
  -- failure here (e.g. a race with another till since step 3's check)
  -- raises and rolls back the order and order_items just inserted too.
  perform process_sale(v_order_id, p_items, p_cashier_id);

  -- 8 & 9. Payment already recorded as 'paid' above (the cashier already
  -- confirmed it in the UI before this call — cash was validated as
  -- sufficient, and digital methods require an explicit "payment
  -- received" confirmation click). Assign the order number now that the
  -- sale is fully confirmed.
  v_order_number := nextval('order_number_seq');
  update orders set order_number = v_order_number where id = v_order_id;

  return query select v_order_id, v_order_number, v_total, v_change;
end;
$$ language plpgsql;

grant execute on function checkout_order(jsonb, numeric, order_payment_method, numeric, uuid) to authenticated;
