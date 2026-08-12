-- Phase 7 — production hardening
--
-- Fixes from a full audit of the transaction and inventory logic. None
-- of these change behavior for a well-formed client; they close gaps
-- that only show up under a double-submit, a race between two tills, or
-- someone hitting PostgREST directly instead of the app.

-- ---------------------------------------------------------------------
-- 1. Duplicate orders / duplicate payments. checkout_order had no
-- protection against being called twice for the same sale — a
-- double-clicked "Complete Sale", a retried request after a dropped
-- response, or a replayed call would each create a separate paid order
-- and deduct inventory again. The client now generates one idempotency
-- key per checkout attempt; the same key replays the original result
-- instead of creating a second order. The unique index is the real
-- guarantee — the pre-check is just a fast path that avoids doing all
-- the validation work twice for the common (non-concurrent) case.
-- ---------------------------------------------------------------------
alter table orders add column idempotency_key uuid;
create unique index orders_idempotency_key_idx on orders(idempotency_key)
  where idempotency_key is not null;

drop function if exists checkout_order(jsonb, numeric, order_payment_method, numeric);

create function checkout_order(
  p_items jsonb,
  p_discount numeric,
  p_payment_method order_payment_method,
  p_amount_received numeric,
  p_idempotency_key uuid default null
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
  v_existing record;
  v_subtotal numeric := 0;
  v_discount numeric := coalesce(p_discount, 0);
  v_tax numeric := 0;
  v_total numeric := 0;
  v_amount_received numeric;
  v_change numeric := 0;
  v_settings record;
  v_line_total numeric;
begin
  if p_idempotency_key is not null then
    select o.id, o.order_number, o.total, o.change_due into v_existing
    from orders o where o.idempotency_key = p_idempotency_key;

    if v_existing.id is not null then
      return query select v_existing.id, v_existing.order_number, v_existing.total, v_existing.change_due;
      return;
    end if;
  end if;

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

  begin
    insert into orders (
      subtotal, discount, tax, total, payment_method, payment_status,
      amount_received, change_due, status, cashier_id, completed_at,
      idempotency_key
    ) values (
      v_subtotal, v_discount, v_tax, v_total, p_payment_method, 'paid',
      v_amount_received, v_change, 'completed', auth.uid(), now(),
      p_idempotency_key
    )
    returning id into v_order_id;
  exception when unique_violation then
    -- Lost the race to a concurrent call with the same idempotency key —
    -- that call's order is the real one; return it instead of erroring.
    select o.id, o.order_number, o.total, o.change_due into v_existing
    from orders o where o.idempotency_key = p_idempotency_key;
    return query select v_existing.id, v_existing.order_number, v_existing.total, v_existing.change_due;
    return;
  end;

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

revoke execute on function checkout_order(jsonb, numeric, order_payment_method, numeric, uuid) from public;
grant execute on function checkout_order(jsonb, numeric, order_payment_method, numeric, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2. current_quantity was writable by any direct UPDATE an admin or
-- manager's RLS grant allowed — meaning a raw PostgREST call (not just
-- the UI) could set it to anything, including negative, with no stock
-- movement recorded at all. That silently breaks the ledger's own
-- invariant ("inventory changes must never happen without a stock
-- movement") stated since Phase 2 but never actually enforced at the
-- database level. Column-level privileges close this: the trigger that
-- legitimately maintains this column runs SECURITY DEFINER (as the
-- function owner, unaffected by this grant), but a direct client UPDATE
-- naming current_quantity is now rejected outright, for every role.
-- ---------------------------------------------------------------------
revoke update (current_quantity) on inventory_items from authenticated;

-- ---------------------------------------------------------------------
-- 3. Defense-in-depth CHECK constraints on the money columns orders
-- can't be written to directly (checkout_order is the only writer, and
-- already validates all of this) — but a constraint costs nothing and
-- means a future code path can't silently write a corrupt total.
-- ---------------------------------------------------------------------
alter table orders
  add constraint orders_subtotal_non_negative check (subtotal >= 0),
  add constraint orders_discount_non_negative check (discount >= 0),
  add constraint orders_tax_non_negative check (tax >= 0),
  add constraint orders_total_non_negative check (total >= 0),
  add constraint orders_discount_not_exceeding_subtotal check (discount <= subtotal);

-- ---------------------------------------------------------------------
-- 4. Atomic inventory-item creation with opening stock, and atomic
-- stock receiving / adjustment. Each of these used to be two separate
-- round trips from the client (insert the item, then insert a
-- movement; or insert a movement, then update cost_per_unit) — if the
-- second call failed or the connection dropped in between, the item or
-- movement was left recorded without its counterpart. One function call
-- per action makes each one a single transaction. All three stay
-- SECURITY INVOKER (the default): they only touch tables admin/manager
-- already have direct RLS access to, so the existing policies are the
-- real access check — no privilege escalation needed here.
-- ---------------------------------------------------------------------
create function create_inventory_item_with_opening_stock(
  p_name text,
  p_sku text,
  p_unit inventory_unit,
  p_minimum_quantity numeric,
  p_cost_per_unit numeric,
  p_opening_quantity numeric
) returns uuid as $$
declare
  v_item_id uuid;
begin
  insert into inventory_items (name, sku, unit, minimum_quantity, cost_per_unit, current_quantity)
  values (p_name, p_sku, p_unit, p_minimum_quantity, p_cost_per_unit, 0)
  returning id into v_item_id;

  if p_opening_quantity > 0 then
    insert into stock_movements (inventory_item_id, movement_type, quantity, note, created_by)
    values (v_item_id, 'opening_stock', p_opening_quantity, 'Opening stock', auth.uid());
  end if;

  return v_item_id;
end;
$$ language plpgsql;

create function receive_stock(
  p_inventory_item_id uuid,
  p_quantity numeric,
  p_cost_per_unit numeric,
  p_note text
) returns void as $$
begin
  if p_quantity <= 0 then
    raise exception 'Quantity received must be greater than zero';
  end if;

  insert into stock_movements (inventory_item_id, movement_type, quantity, note, created_by)
  values (p_inventory_item_id, 'purchase', p_quantity, p_note, auth.uid());

  if p_cost_per_unit is not null then
    update inventory_items set cost_per_unit = p_cost_per_unit where id = p_inventory_item_id;
  end if;
end;
$$ language plpgsql;

-- p_mode 'set' locks the row and computes the delta from whatever the
-- quantity actually is at that instant (not a value read moments
-- earlier by the client), so two concurrent adjustments — or an
-- adjustment racing a sale — can't overwrite each other's intent.
create function adjust_stock(
  p_inventory_item_id uuid,
  p_movement_type stock_movement_type,
  p_mode text,
  p_value numeric,
  p_note text
) returns void as $$
declare
  v_current numeric;
  v_delta numeric;
begin
  if p_mode not in ('set', 'delta') then
    raise exception 'Invalid adjustment mode: %', p_mode;
  end if;

  if p_mode = 'set' then
    select current_quantity into v_current
    from inventory_items where id = p_inventory_item_id
    for update;

    if v_current is null then
      raise exception 'Inventory item not found';
    end if;

    v_delta := p_value - v_current;

    if v_delta = 0 then
      raise exception 'New quantity matches the current quantity';
    end if;
  else
    if p_value <= 0 then
      raise exception 'Quantity must be greater than zero';
    end if;
    v_delta := -p_value;
  end if;

  insert into stock_movements (inventory_item_id, movement_type, quantity, note, created_by)
  values (p_inventory_item_id, p_movement_type, v_delta, p_note, auth.uid());
end;
$$ language plpgsql;

revoke execute on function create_inventory_item_with_opening_stock(
  text, text, inventory_unit, numeric, numeric, numeric
) from public;
revoke execute on function receive_stock(uuid, numeric, numeric, text) from public;
revoke execute on function adjust_stock(uuid, stock_movement_type, text, numeric, text) from public;

grant execute on function create_inventory_item_with_opening_stock(
  text, text, inventory_unit, numeric, numeric, numeric
) to authenticated;
grant execute on function receive_stock(uuid, numeric, numeric, text) to authenticated;
grant execute on function adjust_stock(uuid, stock_movement_type, text, numeric, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Thermal receipt width. A shop's printer is one physical size —
-- 58mm or 80mm roll — so this is a one-time setting, not a per-sale
-- choice.
-- ---------------------------------------------------------------------
alter table business_settings
  add column receipt_paper_width text not null default '80mm'
  check (receipt_paper_width in ('58mm', '80mm'));
