-- Phase 6 — role-based access control
--
-- Three roles: admin (full access), manager (everything except staff
-- management and system settings), cashier (process sales, view
-- products/inventory/their own sales — no pricing, inventory, recipe,
-- staff, or settings writes, no business-wide reports).
--
-- Every rule here is enforced at the database level via RLS or inside a
-- SECURITY DEFINER function's own logic — the UI hides what a role can't
-- do too, but that's a convenience layer on top, never the only gate.
-- Anything reachable through PostgREST or an RPC call directly is
-- covered here independent of what the client renders.

-- ---------------------------------------------------------------------
-- Role helper. SECURITY DEFINER + a pinned search_path so it can be used
-- inside RLS policies on `staff` itself without recursively re-invoking
-- those same policies (the classic RLS-helper-function gotcha).
-- ---------------------------------------------------------------------
create or replace function current_staff_role()
returns staff_role
language sql
stable
security definer
set search_path = public
as $$
  select role from staff where id = auth.uid();
$$;

create or replace function is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select active from staff where id = auth.uid()), false);
$$;

revoke execute on function current_staff_role() from public;
revoke execute on function is_active_staff() from public;
grant execute on function current_staff_role() to authenticated;
grant execute on function is_active_staff() to authenticated;

-- ---------------------------------------------------------------------
-- staff — admin only for writes. No delete policy at all: staff records
-- referenced by historical orders must never be removable, only
-- deactivated (enforced here, not just by omitting a delete button).
-- ---------------------------------------------------------------------
drop policy if exists "Authenticated users can read staff" on staff;
drop policy if exists "Authenticated users can manage staff" on staff;

create policy "Staff can view their own record; admins and managers view all"
  on staff for select to authenticated
  using (id = auth.uid() or current_staff_role() in ('admin', 'manager'));

create policy "Admins can insert staff"
  on staff for insert to authenticated
  with check (current_staff_role() = 'admin');

create policy "Admins can update staff"
  on staff for update to authenticated
  using (current_staff_role() = 'admin')
  with check (current_staff_role() = 'admin');

-- ---------------------------------------------------------------------
-- categories / products — everyone can read (cashiers need the menu),
-- only admin/manager can write.
-- ---------------------------------------------------------------------
drop policy if exists "Authenticated users can manage categories" on categories;
create policy "Admins and managers can manage categories"
  on categories for all to authenticated
  using (current_staff_role() in ('admin', 'manager'))
  with check (current_staff_role() in ('admin', 'manager'));

drop policy if exists "Authenticated users can manage products" on products;
create policy "Admins and managers can manage products"
  on products for all to authenticated
  using (current_staff_role() in ('admin', 'manager'))
  with check (current_staff_role() in ('admin', 'manager'));

-- ---------------------------------------------------------------------
-- inventory_items — everyone can read (cashiers see availability), only
-- admin/manager can write directly. `apply_stock_movement` (below) still
-- needs to update current_quantity as a side effect of any role's sale,
-- so it runs as SECURITY DEFINER rather than depending on this policy.
-- ---------------------------------------------------------------------
drop policy if exists "Authenticated users can manage inventory_items" on inventory_items;
create policy "Admins and managers can manage inventory_items"
  on inventory_items for all to authenticated
  using (current_staff_role() in ('admin', 'manager'))
  with check (current_staff_role() in ('admin', 'manager'));

create or replace function apply_stock_movement()
returns trigger as $$
declare
  current_qty numeric(12, 3);
begin
  select current_quantity into current_qty
  from inventory_items
  where id = new.inventory_item_id
  for update;

  if current_qty is null then
    raise exception 'Inventory item % not found', new.inventory_item_id;
  end if;

  new.previous_quantity := current_qty;
  new.new_quantity := current_qty + new.quantity;

  if new.new_quantity < 0 then
    raise exception 'Insufficient stock: this movement would leave a negative quantity';
  end if;

  update inventory_items
  set current_quantity = new.new_quantity
  where id = new.inventory_item_id;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------
-- recipes / recipe_items — everyone can read, only admin/manager write.
-- ---------------------------------------------------------------------
drop policy if exists "Authenticated users can manage recipes" on recipes;
create policy "Admins and managers can manage recipes"
  on recipes for all to authenticated
  using (current_staff_role() in ('admin', 'manager'))
  with check (current_staff_role() in ('admin', 'manager'));

drop policy if exists "Authenticated users can manage recipe_items" on recipe_items;
create policy "Admins and managers can manage recipe_items"
  on recipe_items for all to authenticated
  using (current_staff_role() in ('admin', 'manager'))
  with check (current_staff_role() in ('admin', 'manager'));

-- ---------------------------------------------------------------------
-- stock_movements — an append-only ledger. admin/manager can read it and
-- record manual movements (receiving stock, adjustments) directly, but
-- can never insert a 'sale' row by hand — that only ever comes from
-- process_sale. Cashiers have no direct access; their sales still write
-- movements through process_sale, which is SECURITY DEFINER. Nobody can
-- update or delete a movement once written.
-- ---------------------------------------------------------------------
drop policy if exists "Authenticated users can read stock_movements" on stock_movements;
drop policy if exists "Authenticated users can manage stock_movements" on stock_movements;

create policy "Admins and managers can read stock_movements"
  on stock_movements for select to authenticated
  using (current_staff_role() in ('admin', 'manager'));

create policy "Admins and managers can record manual stock movements"
  on stock_movements for insert to authenticated
  with check (
    current_staff_role() in ('admin', 'manager')
    and movement_type <> 'sale'
  );

-- ---------------------------------------------------------------------
-- business_settings — everyone can read (POS needs tax/currency/payment
-- methods), only admin can change "critical system configuration".
-- ---------------------------------------------------------------------
drop policy if exists "Authenticated users can manage business_settings" on business_settings;
create policy "Admins can update business_settings"
  on business_settings for update to authenticated
  using (current_staff_role() = 'admin')
  with check (current_staff_role() = 'admin');

-- ---------------------------------------------------------------------
-- orders / order_items — nobody writes these tables directly, ever, for
-- any role including admin. The only path in is checkout_order /
-- hold_order, which validate cart, prices, and inventory before writing
-- anything. This closes off a direct-INSERT bypass of that validation
-- entirely, not just for cashiers. Reading is scoped: admin/manager see
-- everything, cashiers see only their own orders — this is what makes
-- "View their own sales" a real guarantee rather than a UI filter.
-- A held order (nothing charged, nothing deducted) can be cancelled by
-- any signed-in staff member, matching a shared till.
-- ---------------------------------------------------------------------
drop policy if exists "Authenticated users can read orders" on orders;
drop policy if exists "Authenticated users can manage orders" on orders;
drop policy if exists "Authenticated users can read order_items" on order_items;
drop policy if exists "Authenticated users can manage order_items" on order_items;

create policy "Staff view orders per role"
  on orders for select to authenticated
  using (current_staff_role() in ('admin', 'manager') or cashier_id = auth.uid());

create policy "Staff can cancel held orders"
  on orders for delete to authenticated
  using (status = 'held');

create policy "Staff view order_items per parent order"
  on order_items for select to authenticated
  using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and (current_staff_role() in ('admin', 'manager') or o.cashier_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- audit_log — a record of who did what, when, for the actions Phase 6
-- calls out as needing a trail: staff role/active changes and product
-- price changes today; inventory adjustments are already fully audited
-- via stock_movements (created_by + created_at on every row), so it's
-- not duplicated here. Only admins can read it, and it can only be
-- written through log_audit_event, never directly — same pattern as
-- stock_movements being the only route to changing inventory quantity.
-- ---------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references staff(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log(entity_type, entity_id);
create index audit_log_created_at_idx on audit_log(created_at);

alter table audit_log enable row level security;

create policy "Admins can read the audit log"
  on audit_log for select to authenticated
  using (current_staff_role() = 'admin');

create or replace function log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_details jsonb
) returns void
language sql
security definer
set search_path = public
as $$
  insert into audit_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_details);
$$;

revoke execute on function log_audit_event(text, text, uuid, jsonb) from public;

create or replace function audit_staff_changes()
returns trigger as $$
begin
  if new.role is distinct from old.role then
    perform log_audit_event(
      'staff.role_changed', 'staff', new.id,
      jsonb_build_object('old_role', old.role, 'new_role', new.role)
    );
  end if;
  if new.active is distinct from old.active then
    perform log_audit_event(
      case when new.active then 'staff.activated' else 'staff.deactivated' end,
      'staff', new.id,
      jsonb_build_object('old_active', old.active, 'new_active', new.active)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger staff_audit_changes
  after update on staff
  for each row execute function audit_staff_changes();

create or replace function audit_product_price_changes()
returns trigger as $$
begin
  if new.selling_price is distinct from old.selling_price then
    perform log_audit_event(
      'product.price_changed', 'product', new.id,
      jsonb_build_object('old_price', old.selling_price, 'new_price', new.selling_price)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger products_audit_price_changes
  after update on products
  for each row execute function audit_product_price_changes();

-- ---------------------------------------------------------------------
-- Signup: an admin invites a staff member with `data: { name, role }`
-- in the invite (see inviteStaff). Falls back to 'cashier' for a plain
-- signup with no role metadata (e.g. the very first account).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role staff_role;
begin
  begin
    v_role := coalesce(new.raw_user_meta_data->>'role', 'cashier')::staff_role;
  exception when invalid_text_representation then
    v_role := 'cashier';
  end;

  insert into public.staff (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    v_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------
-- Report RPCs — business-wide financial data is admin/manager only.
-- search_orders is the exception: instead of denying cashiers, it's
-- their "View their own sales" screen — a cashier's own id silently
-- replaces whatever p_cashier_id was passed, so there's no way to pass
-- someone else's id and see their sales.
-- ---------------------------------------------------------------------
create or replace function dashboard_stats(p_start timestamptz, p_end timestamptz)
returns table (
  total_sales numeric,
  order_count bigint,
  average_order_value numeric
) as $$
begin
  if current_staff_role() not in ('admin', 'manager') then
    raise exception 'Access denied';
  end if;

  return query
  select
    coalesce(sum(total), 0),
    count(*),
    case when count(*) = 0 then 0 else round(sum(total) / count(*), 2) end
  from orders
  where status = 'completed'
    and completed_at >= p_start
    and completed_at <= p_end;
end;
$$ language plpgsql stable;

create or replace function sales_by_day(p_days int)
returns table (
  day date,
  revenue numeric,
  order_count bigint
) as $$
begin
  if current_staff_role() not in ('admin', 'manager') then
    raise exception 'Access denied';
  end if;

  return query
  select
    d::date,
    coalesce(sum(o.total), 0),
    count(o.id)
  from generate_series(
    date_trunc('day', now()) - (p_days - 1) * interval '1 day',
    date_trunc('day', now()),
    interval '1 day'
  ) d
  left join orders o
    on o.status = 'completed'
    and date_trunc('day', o.completed_at) = d
  group by d
  order by d;
end;
$$ language plpgsql stable;

create or replace function sales_by_hour_today()
returns table (
  hour int,
  revenue numeric,
  order_count bigint
) as $$
begin
  if current_staff_role() not in ('admin', 'manager') then
    raise exception 'Access denied';
  end if;

  return query
  select
    h::int,
    coalesce(sum(o.total), 0),
    count(o.id)
  from generate_series(0, 23) h
  left join orders o
    on o.status = 'completed'
    and date_trunc('day', o.completed_at) = date_trunc('day', now())
    and extract(hour from o.completed_at) = h
  group by h
  order by h;
end;
$$ language plpgsql stable;

create or replace function payment_breakdown(p_start timestamptz, p_end timestamptz)
returns table (
  payment_method order_payment_method,
  transaction_count bigint,
  total_value numeric
) as $$
begin
  if current_staff_role() not in ('admin', 'manager') then
    raise exception 'Access denied';
  end if;

  return query
  select
    o.payment_method,
    count(*),
    coalesce(sum(o.total), 0)
  from orders o
  where o.status = 'completed'
    and o.payment_method is not null
    and o.completed_at >= p_start
    and o.completed_at <= p_end
  group by o.payment_method;
end;
$$ language plpgsql stable;

create or replace function product_performance(
  p_start timestamptz default null,
  p_end timestamptz default null,
  p_limit int default 50,
  p_offset int default 0
) returns table (
  product_id uuid,
  product_name text,
  units_sold numeric,
  revenue numeric,
  percentage_of_sales numeric,
  total_count bigint
) as $$
begin
  if current_staff_role() not in ('admin', 'manager') then
    raise exception 'Access denied';
  end if;

  return query
  with sales as (
    select
      oi.product_id,
      oi.product_name,
      sum(oi.quantity) as units_sold,
      sum(oi.line_total) as revenue
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.status = 'completed'
      and (p_start is null or o.completed_at >= p_start)
      and (p_end is null or o.completed_at <= p_end)
    group by oi.product_id, oi.product_name
  ),
  totals as (
    select coalesce(sum(revenue), 0) as grand_total from sales
  )
  select
    s.product_id,
    s.product_name,
    s.units_sold,
    s.revenue,
    case when t.grand_total = 0 then 0 else round(s.revenue / t.grand_total * 100, 2) end,
    count(*) over()
  from sales s, totals t
  order by s.revenue desc
  limit p_limit offset p_offset;
end;
$$ language plpgsql stable;

create or replace function search_orders(
  p_start timestamptz default null,
  p_end timestamptz default null,
  p_cashier_id uuid default null,
  p_payment_method order_payment_method default null,
  p_product_id uuid default null,
  p_category_id uuid default null,
  p_limit int default 25,
  p_offset int default 0
) returns table (
  id uuid,
  order_number integer,
  completed_at timestamptz,
  cashier_name text,
  total numeric,
  payment_method order_payment_method,
  status order_status,
  payment_status order_payment_status,
  total_count bigint
) as $$
declare
  v_cashier_filter uuid := p_cashier_id;
begin
  if current_staff_role() not in ('admin', 'manager') then
    -- Not a business report for a cashier — this is their own sales
    -- history, so their id overrides whatever was passed in.
    v_cashier_filter := auth.uid();
  end if;

  return query
  select
    o.id,
    o.order_number,
    o.completed_at,
    s.name,
    o.total,
    o.payment_method,
    o.status,
    o.payment_status,
    count(*) over()
  from orders o
  left join staff s on s.id = o.cashier_id
  where o.status = 'completed'
    and (p_start is null or o.completed_at >= p_start)
    and (p_end is null or o.completed_at <= p_end)
    and (v_cashier_filter is null or o.cashier_id = v_cashier_filter)
    and (p_payment_method is null or o.payment_method = p_payment_method)
    and (
      (p_product_id is null and p_category_id is null)
      or exists (
        select 1
        from order_items oi
        join products p on p.id = oi.product_id
        where oi.order_id = o.id
          and (p_product_id is null or oi.product_id = p_product_id)
          and (p_category_id is null or p.category_id = p_category_id)
      )
    )
  order by o.completed_at desc nulls last
  limit p_limit offset p_offset;
end;
$$ language plpgsql stable;

-- ---------------------------------------------------------------------
-- Transactional functions — reissued as SECURITY DEFINER so any staff
-- role can process a sale despite orders/order_items/stock_movements
-- having no direct-write policy for anyone. The acting user is always
-- auth.uid(), read inside the function — never a client-supplied id, so
-- there's no way to check out or hold an order "as" someone else by
-- passing a different id to the RPC. An inactive (deactivated) account
-- is rejected even with a still-valid session.
-- ---------------------------------------------------------------------
drop function if exists process_sale(uuid, jsonb, uuid);
drop function if exists hold_order(jsonb, uuid);
drop function if exists checkout_order(jsonb, numeric, order_payment_method, numeric, uuid);

create function process_sale(
  p_order_id uuid,
  p_items jsonb
) returns void as $$
declare
  v_sale_item jsonb;
  v_recipe_item record;
  v_product_id uuid;
  v_product_quantity numeric;
  v_required numeric;
begin
  if p_order_id is null then
    raise exception 'order id is required';
  end if;

  for v_sale_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_sale_item->>'product_id')::uuid;
    v_product_quantity := (v_sale_item->>'quantity')::numeric;

    if v_product_quantity is null or v_product_quantity <= 0 then
      raise exception 'Sale quantity must be greater than zero for product %', v_product_id;
    end if;

    for v_recipe_item in
      select ri.inventory_item_id, ri.quantity, ri.unit, ii.unit as inventory_unit
      from recipes r
      join recipe_items ri on ri.recipe_id = r.id
      join inventory_items ii on ii.id = ri.inventory_item_id
      where r.product_id = v_product_id
    loop
      v_required := convert_inventory_quantity(
        v_recipe_item.quantity * v_product_quantity,
        v_recipe_item.unit,
        v_recipe_item.inventory_unit
      );

      insert into stock_movements (
        inventory_item_id, movement_type, quantity,
        reference_type, reference_id, created_by
      ) values (
        v_recipe_item.inventory_item_id, 'sale', -v_required,
        'order', p_order_id, auth.uid()
      );
    end loop;
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

create function hold_order(p_items jsonb)
returns uuid as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_product record;
  v_subtotal numeric := 0;
  v_line_total numeric;
begin
  if not is_active_staff() then
    raise exception 'Staff account is not active';
  end if;

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
  values (v_subtotal, 0, 0, v_subtotal, 'held', auth.uid())
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
$$ language plpgsql security definer set search_path = public;

create function checkout_order(
  p_items jsonb,
  p_discount numeric,
  p_payment_method order_payment_method,
  p_amount_received numeric
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
  if not is_active_staff() then
    raise exception 'Staff account is not active';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  if v_discount < 0 then
    raise exception 'Discount cannot be negative';
  end if;

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

  insert into orders (
    subtotal, discount, tax, total, payment_method, payment_status,
    amount_received, change_due, status, cashier_id, completed_at
  ) values (
    v_subtotal, v_discount, v_tax, v_total, p_payment_method, 'paid',
    v_amount_received, v_change, 'completed', auth.uid(), now()
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select id, name, selling_price into v_product
    from products where id = (v_item->>'product_id')::uuid;

    v_line_total := v_product.selling_price * (v_item->>'quantity')::numeric;

    insert into order_items (order_id, product_id, product_name, quantity, unit_price, line_total)
    values (v_order_id, v_product.id, v_product.name, (v_item->>'quantity')::numeric, v_product.selling_price, v_line_total);
  end loop;

  perform process_sale(v_order_id, p_items);

  v_order_number := nextval('order_number_seq');
  update orders set order_number = v_order_number where id = v_order_id;

  return query select v_order_id, v_order_number, v_total, v_change;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------
-- Lock down execute grants. Postgres grants EXECUTE on new functions to
-- PUBLIC by default (unlike tables) — that includes the anon role, so
-- every RPC in this schema needs an explicit revoke+grant or it's
-- reachable without signing in at all.
-- ---------------------------------------------------------------------
revoke execute on function save_recipe(uuid, jsonb) from public;
revoke execute on function convert_inventory_quantity(numeric, inventory_unit, inventory_unit) from public;
revoke execute on function process_sale(uuid, jsonb) from public;
revoke execute on function hold_order(jsonb) from public;
revoke execute on function checkout_order(jsonb, numeric, order_payment_method, numeric) from public;
revoke execute on function dashboard_stats(timestamptz, timestamptz) from public;
revoke execute on function sales_by_day(int) from public;
revoke execute on function sales_by_hour_today() from public;
revoke execute on function payment_breakdown(timestamptz, timestamptz) from public;
revoke execute on function product_performance(timestamptz, timestamptz, int, int) from public;
revoke execute on function search_orders(
  timestamptz, timestamptz, uuid, order_payment_method, uuid, uuid, int, int
) from public;

grant execute on function save_recipe(uuid, jsonb) to authenticated;
grant execute on function convert_inventory_quantity(numeric, inventory_unit, inventory_unit) to authenticated;
grant execute on function process_sale(uuid, jsonb) to authenticated;
grant execute on function hold_order(jsonb) to authenticated;
grant execute on function checkout_order(jsonb, numeric, order_payment_method, numeric) to authenticated;
grant execute on function dashboard_stats(timestamptz, timestamptz) to authenticated;
grant execute on function sales_by_day(int) to authenticated;
grant execute on function sales_by_hour_today() to authenticated;
grant execute on function payment_breakdown(timestamptz, timestamptz) to authenticated;
grant execute on function product_performance(timestamptz, timestamptz, int, int) to authenticated;
grant execute on function search_orders(
  timestamptz, timestamptz, uuid, order_payment_method, uuid, uuid, int, int
) to authenticated;
