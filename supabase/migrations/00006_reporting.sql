-- Phase 5 — dashboard & reporting
--
-- Every figure here is computed by the database, not the client: each
-- function does its own SUM/COUNT/GROUP BY and returns only the small,
-- already-aggregated result the UI needs. Nothing here pulls the raw
-- orders/order_items tables into JS to total them by hand.
--
-- All "today" boundaries are supplied by the caller as timestamptz, so
-- the notion of "today" is whatever local day the app resolves — these
-- functions don't hardcode a timezone.

-- Sales-report and product-performance queries filter on
-- orders.completed_at over a date range for completed orders; this
-- partial index keeps that fast without indexing held/draft rows.
create index orders_completed_at_idx on orders(completed_at) where status = 'completed';
create index orders_cashier_id_idx on orders(cashier_id);
create index order_items_product_id_idx on order_items(product_id);

-- Single source of truth for stock status, shared by the dashboard's
-- Low Stock card and the Inventory Report's status filter.
create view inventory_report as
select
  ii.*,
  case
    when ii.current_quantity <= 0 then 'out_of_stock'
    when ii.current_quantity <= ii.minimum_quantity then 'low_stock'
    else 'normal'
  end as stock_status
from inventory_items ii;

-- Today's Sales / Orders / Average Order Value.
create or replace function dashboard_stats(p_start timestamptz, p_end timestamptz)
returns table (
  total_sales numeric,
  order_count bigint,
  average_order_value numeric
) as $$
  select
    coalesce(sum(total), 0) as total_sales,
    count(*) as order_count,
    case when count(*) = 0 then 0 else round(sum(total) / count(*), 2) end as average_order_value
  from orders
  where status = 'completed'
    and completed_at >= p_start
    and completed_at <= p_end;
$$ language sql stable;

grant execute on function dashboard_stats(timestamptz, timestamptz) to authenticated;

-- Revenue + order count per day over a trailing window, zero-filled so
-- days without a sale still appear (a clean, gap-free chart).
create or replace function sales_by_day(p_days int)
returns table (
  day date,
  revenue numeric,
  order_count bigint
) as $$
  select
    d::date as day,
    coalesce(sum(o.total), 0) as revenue,
    count(o.id) as order_count
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
$$ language sql stable;

grant execute on function sales_by_day(int) to authenticated;

-- Same idea as sales_by_day, but hour-of-day for the "Today" chart view.
create or replace function sales_by_hour_today()
returns table (
  hour int,
  revenue numeric,
  order_count bigint
) as $$
  select
    h::int as hour,
    coalesce(sum(o.total), 0) as revenue,
    count(o.id) as order_count
  from generate_series(0, 23) h
  left join orders o
    on o.status = 'completed'
    and date_trunc('day', o.completed_at) = date_trunc('day', now())
    and extract(hour from o.completed_at) = h
  group by h
  order by h;
$$ language sql stable;

grant execute on function sales_by_hour_today() to authenticated;

-- Transaction count + total value per payment method.
create or replace function payment_breakdown(p_start timestamptz, p_end timestamptz)
returns table (
  payment_method order_payment_method,
  transaction_count bigint,
  total_value numeric
) as $$
  select
    payment_method,
    count(*) as transaction_count,
    coalesce(sum(total), 0) as total_value
  from orders
  where status = 'completed'
    and payment_method is not null
    and completed_at >= p_start
    and completed_at <= p_end
  group by payment_method;
$$ language sql stable;

grant execute on function payment_breakdown(timestamptz, timestamptz) to authenticated;

-- Units sold, revenue, and share of revenue per product. Reads
-- order_items.product_name (a sale-time snapshot from Phase 4) rather
-- than joining products, so a renamed or deleted product doesn't change
-- historical figures. Powers both the dashboard's Top Products (called
-- with a small p_limit) and the full Product Performance report.
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
    case when t.grand_total = 0 then 0 else round(s.revenue / t.grand_total * 100, 2) end as percentage_of_sales,
    count(*) over() as total_count
  from sales s, totals t
  order by s.revenue desc
  limit p_limit offset p_offset;
$$ language sql stable;

grant execute on function product_performance(timestamptz, timestamptz, int, int) to authenticated;

-- The Sales Report: filterable, paginated order list. total_count is
-- computed once via a window function so the page slice and the total
-- for pagination come back in a single query instead of two.
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
  select
    o.id,
    o.order_number,
    o.completed_at,
    s.name as cashier_name,
    o.total,
    o.payment_method,
    o.status,
    o.payment_status,
    count(*) over() as total_count
  from orders o
  left join staff s on s.id = o.cashier_id
  where o.status = 'completed'
    and (p_start is null or o.completed_at >= p_start)
    and (p_end is null or o.completed_at <= p_end)
    and (p_cashier_id is null or o.cashier_id = p_cashier_id)
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
$$ language sql stable;

grant execute on function search_orders(
  timestamptz, timestamptz, uuid, order_payment_method, uuid, uuid, int, int
) to authenticated;
