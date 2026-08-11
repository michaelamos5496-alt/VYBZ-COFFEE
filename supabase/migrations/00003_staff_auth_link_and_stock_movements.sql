-- Phase 2 correction — two gaps identified before building inventory workflows:
--
-- 1. `staff` had no link to `auth.users`, so there was no way to resolve
--    "who performed this action" from a logged-in session. `staff.id` is
--    now the same id as the auth user, and a trigger auto-provisions a
--    staff row (role 'cashier') whenever someone signs up.
--
-- 2. `stock_movements` had no `previous_quantity` / `new_quantity`, which
--    the inventory history screen needs, and nothing enforced that
--    `inventory_items.current_quantity` only ever changes via a movement.
--    A trigger now computes both columns and applies the delta to
--    `inventory_items` atomically, so a stock movement row is the only way
--    the quantity can change.

-- 1. Link staff to auth.users
alter table staff alter column id drop default;
alter table staff
  add constraint staff_id_fkey foreign key (id) references auth.users(id) on delete cascade;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.staff (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'cashier'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Movement history columns + atomic quantity application
alter table stock_movements
  add column previous_quantity numeric(12, 3) not null default 0,
  add column new_quantity numeric(12, 3) not null default 0;

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
$$ language plpgsql;

create trigger stock_movements_apply
  before insert on stock_movements
  for each row execute function apply_stock_movement();
