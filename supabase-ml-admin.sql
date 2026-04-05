-- Toka ML admin SQL pack
-- Run after supabase-schema.sql

-- 1) Deterministic train/validation/test split view
create or replace view public.toka_ml_training_split as
select
    base.*,
    case
        when mod(abs(hashtext(base.device_id || ':' || base.event_id)), 100) < 80 then 'train'
        when mod(abs(hashtext(base.device_id || ':' || base.event_id)), 100) < 90 then 'validation'
        else 'test'
    end as split_bucket
from public.toka_ml_training_rows base;

-- 2) Feature quality checks
create or replace view public.toka_ml_quality_checks as
select
    current_date as report_date,
    count(*) as total_rows,
    count(*) filter (where category is null or btrim(category) = '') as missing_category,
    count(*) filter (where starts_at is null) as missing_starts_at,
    count(*) filter (where city is null or btrim(city) = '') as missing_city,
    count(*) filter (where price_amount is null) as missing_price_amount,
    count(*) filter (where capacity is null or capacity <= 0) as bad_capacity,
    avg(ticket_sales_count::numeric) as avg_ticket_sales,
    avg(impressions::numeric) as avg_impressions
from public.toka_ml_training_rows;

-- 3) Partition-ready daily snapshot table for ML reproducibility
create table if not exists public.toka_ml_event_daily (
    snapshot_date date not null,
    device_id text not null,
    event_id text not null,
    category text,
    event_type text,
    delivery_mode text,
    city text,
    starts_at timestamptz,
    price_amount numeric(14, 2),
    capacity integer,
    impressions integer,
    ticket_sales_count integer,
    ticket_revenue_total numeric(14, 2),
    comment_count integer,
    avg_likes_per_comment numeric(14, 4),
    ticket_count integer,
    sales_band text,
    primary key (snapshot_date, device_id, event_id)
) partition by range (snapshot_date);

create table if not exists public.toka_ml_event_daily_default
partition of public.toka_ml_event_daily default;

create or replace function public.toka_ml_ensure_month_partition(target_date date)
returns void
language plpgsql
as $$
declare
    start_month date;
    next_month date;
    partition_name text;
begin
    start_month := date_trunc('month', target_date)::date;
    next_month := (start_month + interval '1 month')::date;
    partition_name := format('toka_ml_event_daily_%s', to_char(start_month, 'YYYYMM'));

    execute format(
        'create table if not exists public.%I partition of public.toka_ml_event_daily for values from (%L) to (%L)',
        partition_name,
        start_month,
        next_month
    );
end;
$$;

create or replace function public.toka_ml_refresh_daily_snapshot(target_date date default current_date)
returns integer
language plpgsql
as $$
declare
    affected_rows integer;
begin
    perform public.toka_ml_ensure_month_partition(target_date);

    insert into public.toka_ml_event_daily (
        snapshot_date,
        device_id,
        event_id,
        category,
        event_type,
        delivery_mode,
        city,
        starts_at,
        price_amount,
        capacity,
        impressions,
        ticket_sales_count,
        ticket_revenue_total,
        comment_count,
        avg_likes_per_comment,
        ticket_count,
        sales_band
    )
    select
        target_date,
        device_id,
        event_id,
        category,
        event_type,
        delivery_mode,
        city,
        starts_at,
        price_amount,
        capacity,
        impressions,
        ticket_sales_count,
        ticket_revenue_total,
        comment_count,
        avg_likes_per_comment,
        ticket_count,
        sales_band
    from public.toka_ml_training_rows
    on conflict (snapshot_date, device_id, event_id)
    do update
    set
        category = excluded.category,
        event_type = excluded.event_type,
        delivery_mode = excluded.delivery_mode,
        city = excluded.city,
        starts_at = excluded.starts_at,
        price_amount = excluded.price_amount,
        capacity = excluded.capacity,
        impressions = excluded.impressions,
        ticket_sales_count = excluded.ticket_sales_count,
        ticket_revenue_total = excluded.ticket_revenue_total,
        comment_count = excluded.comment_count,
        avg_likes_per_comment = excluded.avg_likes_per_comment,
        ticket_count = excluded.ticket_count,
        sales_band = excluded.sales_band;

    get diagnostics affected_rows = row_count;
    return affected_rows;
end;
$$;

create index if not exists idx_toka_ml_daily_event on public.toka_ml_event_daily (event_id);
create index if not exists idx_toka_ml_daily_category on public.toka_ml_event_daily (category);
create index if not exists idx_toka_ml_daily_snapshot_date on public.toka_ml_event_daily (snapshot_date);
