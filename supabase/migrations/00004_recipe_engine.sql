-- Phase 3 — recipe & inventory deduction engine
--
-- A recipe line can be written in whatever unit makes sense to whoever is
-- building the recipe (e.g. "18g" of coffee beans), independent of the
-- unit that ingredient happens to be stocked in (e.g. the bag is tracked
-- in "kg"). `recipe_items.unit` records that authoring unit, and
-- `convert_inventory_quantity` safely converts it to the inventory item's
-- native unit at deduction time. Conversion only ever happens within the
-- same family (mass: g/kg, volume: ml/litre) — piece/pack/bottle are each
-- their own family and never convert into one another or into a
-- mass/volume unit.

alter table recipe_items add column unit inventory_unit not null;

create or replace function convert_inventory_quantity(
  p_quantity numeric,
  p_from_unit inventory_unit,
  p_to_unit inventory_unit
) returns numeric as $$
declare
  v_from_family text;
  v_to_family text;
  v_from_factor numeric;
  v_to_factor numeric;
begin
  v_from_family := case p_from_unit
    when 'g' then 'mass' when 'kg' then 'mass'
    when 'ml' then 'volume' when 'litre' then 'volume'
    else p_from_unit::text
  end;
  v_to_family := case p_to_unit
    when 'g' then 'mass' when 'kg' then 'mass'
    when 'ml' then 'volume' when 'litre' then 'volume'
    else p_to_unit::text
  end;

  if v_from_family <> v_to_family then
    raise exception 'Cannot convert % to %: incompatible units', p_from_unit, p_to_unit;
  end if;

  v_from_factor := case p_from_unit when 'kg' then 1000 when 'litre' then 1000 else 1 end;
  v_to_factor := case p_to_unit when 'kg' then 1000 when 'litre' then 1000 else 1 end;

  return (p_quantity * v_from_factor) / v_to_factor;
end;
$$ language plpgsql immutable;

-- Replaces a product's recipe in one atomic call: upserts the `recipes`
-- row, clears its existing ingredient lines, and inserts the new ones.
-- Duplicate ingredients are rejected. Pass an empty items array to clear
-- all ingredients while keeping the recipe row (e.g. temporarily untracked).
create or replace function save_recipe(p_product_id uuid, p_items jsonb)
returns uuid as $$
declare
  v_recipe_id uuid;
  v_item jsonb;
  v_seen uuid[] := '{}';
  v_inventory_item_id uuid;
  v_quantity numeric;
begin
  insert into recipes (product_id)
  values (p_product_id)
  on conflict (product_id) do update set updated_at = now()
  returning id into v_recipe_id;

  delete from recipe_items where recipe_id = v_recipe_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_inventory_item_id := (v_item->>'inventory_item_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;

    if v_inventory_item_id = any(v_seen) then
      raise exception 'Duplicate ingredient in recipe';
    end if;
    v_seen := array_append(v_seen, v_inventory_item_id);

    if v_quantity <= 0 then
      raise exception 'Ingredient quantity must be greater than zero';
    end if;

    insert into recipe_items (recipe_id, inventory_item_id, quantity, unit)
    values (
      v_recipe_id,
      v_inventory_item_id,
      v_quantity,
      (v_item->>'unit')::inventory_unit
    );
  end loop;

  return v_recipe_id;
end;
$$ language plpgsql;

grant execute on function save_recipe(uuid, jsonb) to authenticated;

-- The reusable inventory deduction engine. Given a batch of {product_id,
-- quantity} sale lines, expands each product's recipe, converts every
-- ingredient line to its inventory item's native unit, and deducts it via
-- a `sale` stock movement. Because this all runs inside one function
-- call, it is one Postgres transaction: the `apply_stock_movement`
-- trigger (from migration 00003) rejects any movement that would leave a
-- negative quantity, and that exception unwinds the entire function —
-- every insert it already made in this call is rolled back too. A sale
-- can therefore never partially deduct inventory.
create or replace function process_sale(
  p_order_id uuid,
  p_items jsonb,
  p_created_by uuid
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
        'order', p_order_id, p_created_by
      );
    end loop;
  end loop;
end;
$$ language plpgsql;

grant execute on function process_sale(uuid, jsonb, uuid) to authenticated;
