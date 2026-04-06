-- Toka Supabase schema.
-- Goal:
-- 1) Keep full compatibility with the current app (payload JSON upserts).
-- 2) Expose typed columns + ML views for training and analytics.
--
-- Run this in Supabase SQL Editor.

create table if not exists public.toka_profiles (
    device_id text primary key,
    owner_user_id uuid,
    payload jsonb not null default '{}'::jsonb,
    onboarding_complete boolean not null default false,
    referral_code text,
    updated_at timestamptz not null default now(),
    -- Typed columns for analytics/ML features.
    name text,
    gender text,
    phone text,
    phone_country_code text,
    phone_national_number text,
    email text,
    language text,
    notifications_enabled boolean,
    interests text[]
);

create table if not exists public.toka_events (
    device_id text not null,
    owner_user_id uuid,
    id text not null,
    payload jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    -- Typed columns for broad event modelling.
    event_name text,
    category text,
    event_type text,
    delivery_mode text,
    city text,
    country text,
    venue text,
    organiser text,
    starts_at timestamptz,
    ends_at timestamptz,
    price_amount numeric(14, 2),
    currency text,
    capacity integer,
    inventory_reserve_percent numeric(5, 2),
    ticket_tiers jsonb,
    is_placeholder boolean,
    language text,
    tags text[],
    metadata jsonb,
    primary key (device_id, id)
);

create table if not exists public.toka_tickets (
    device_id text not null,
    owner_user_id uuid,
    id text not null,
    payload jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    -- Typed columns.
    event_id text,
    attendee_name text,
    attendee_gender text,
    attendee_phone text,
    attendee_phone_country_code text,
    attendee_phone_national_number text,
    attendee_email text,
    amount_paid numeric(14, 2),
    refund_amount numeric(14, 2),
    refund_status text,
    refund_reason text,
    refund_requested_at timestamptz,
    refund_resolved_at timestamptz,
    payment_method text,
    purchased_at timestamptz,
    referral_code_used text,
    primary key (device_id, id)
);

create table if not exists public.toka_comments (
    device_id text not null,
    owner_user_id uuid,
    id text not null,
    event_id text not null,
    payload jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    -- Typed columns.
    author text,
    text_body text,
    likes_count integer,
    commented_at timestamptz,
    primary key (device_id, id)
);

create table if not exists public.toka_updates (
    device_id text not null,
    owner_user_id uuid,
    id text not null,
    event_id text not null,
    payload jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    -- Typed columns.
    update_type text,
    text_body text,
    posted_at timestamptz,
    primary key (device_id, id)
);

create table if not exists public.toka_calendar_entries (
    device_id text not null,
    owner_user_id uuid,
    event_id text not null,
    payload jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    -- Typed columns.
    saved_at timestamptz,
    with_ticket boolean,
    primary key (device_id, event_id)
);

create table if not exists public.toka_event_metrics (
    device_id text not null,
    owner_user_id uuid,
    event_id text not null,
    payload jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    -- Typed columns.
    impressions integer,
    ticket_sales_count integer,
    ticket_revenue_total numeric(14, 2),
    calendar_adds_with_ticket integer,
    calendar_adds_without_ticket integer,
    primary key (device_id, event_id)
);

-- Idempotent alter statements in case tables existed before typed columns were added.
alter table public.toka_profiles add column if not exists name text;
alter table public.toka_profiles add column if not exists gender text;
alter table public.toka_profiles add column if not exists phone text;
alter table public.toka_profiles add column if not exists phone_country_code text;
alter table public.toka_profiles add column if not exists phone_national_number text;
alter table public.toka_profiles add column if not exists email text;
alter table public.toka_profiles add column if not exists language text;
alter table public.toka_profiles add column if not exists notifications_enabled boolean;
alter table public.toka_profiles add column if not exists interests text[];
alter table public.toka_profiles add column if not exists owner_user_id uuid;

alter table public.toka_events add column if not exists event_name text;
alter table public.toka_events add column if not exists category text;
alter table public.toka_events add column if not exists event_type text;
alter table public.toka_events add column if not exists delivery_mode text;
alter table public.toka_events add column if not exists city text;
alter table public.toka_events add column if not exists country text;
alter table public.toka_events add column if not exists venue text;
alter table public.toka_events add column if not exists organiser text;
alter table public.toka_events add column if not exists starts_at timestamptz;
alter table public.toka_events add column if not exists ends_at timestamptz;
alter table public.toka_events add column if not exists price_amount numeric(14, 2);
alter table public.toka_events add column if not exists currency text;
alter table public.toka_events add column if not exists capacity integer;
alter table public.toka_events add column if not exists inventory_reserve_percent numeric(5, 2);
alter table public.toka_events add column if not exists ticket_tiers jsonb;
alter table public.toka_events add column if not exists is_placeholder boolean;
alter table public.toka_events add column if not exists language text;
alter table public.toka_events add column if not exists tags text[];
alter table public.toka_events add column if not exists metadata jsonb;
alter table public.toka_events add column if not exists owner_user_id uuid;

alter table public.toka_tickets add column if not exists event_id text;
alter table public.toka_tickets add column if not exists attendee_name text;
alter table public.toka_tickets add column if not exists attendee_gender text;
alter table public.toka_tickets add column if not exists attendee_phone text;
alter table public.toka_tickets add column if not exists attendee_phone_country_code text;
alter table public.toka_tickets add column if not exists attendee_phone_national_number text;
alter table public.toka_tickets add column if not exists attendee_email text;
alter table public.toka_tickets add column if not exists amount_paid numeric(14, 2);
alter table public.toka_tickets add column if not exists refund_amount numeric(14, 2);
alter table public.toka_tickets add column if not exists refund_status text;
alter table public.toka_tickets add column if not exists refund_reason text;
alter table public.toka_tickets add column if not exists refund_requested_at timestamptz;
alter table public.toka_tickets add column if not exists refund_resolved_at timestamptz;
alter table public.toka_tickets add column if not exists payment_method text;
alter table public.toka_tickets add column if not exists purchased_at timestamptz;
alter table public.toka_tickets add column if not exists referral_code_used text;
alter table public.toka_tickets add column if not exists owner_user_id uuid;

alter table public.toka_comments add column if not exists author text;
alter table public.toka_comments add column if not exists text_body text;
alter table public.toka_comments add column if not exists likes_count integer;
alter table public.toka_comments add column if not exists commented_at timestamptz;
alter table public.toka_comments add column if not exists owner_user_id uuid;

alter table public.toka_updates add column if not exists update_type text;
alter table public.toka_updates add column if not exists text_body text;
alter table public.toka_updates add column if not exists posted_at timestamptz;
alter table public.toka_updates add column if not exists owner_user_id uuid;

alter table public.toka_calendar_entries add column if not exists saved_at timestamptz;
alter table public.toka_calendar_entries add column if not exists with_ticket boolean;
alter table public.toka_calendar_entries add column if not exists owner_user_id uuid;

alter table public.toka_event_metrics add column if not exists impressions integer;
alter table public.toka_event_metrics add column if not exists ticket_sales_count integer;
alter table public.toka_event_metrics add column if not exists ticket_revenue_total numeric(14, 2);
alter table public.toka_event_metrics add column if not exists calendar_adds_with_ticket integer;
alter table public.toka_event_metrics add column if not exists calendar_adds_without_ticket integer;
alter table public.toka_event_metrics add column if not exists owner_user_id uuid;

-- Helper parser for flexible timestamp inputs.
create or replace function public.toka_try_timestamptz(input_text text)
returns timestamptz
language plpgsql
as $$
begin
    if input_text is null or btrim(input_text) = '' then
        return null;
    end if;

    if input_text ~ '^[0-9]{13}$' then
        return to_timestamp((input_text::numeric / 1000.0));
    end if;

    if input_text ~ '^[0-9]{10}$' then
        return to_timestamp(input_text::numeric);
    end if;

    begin
        return input_text::timestamptz;
    exception when others then
        return null;
    end;
end;
$$;

create or replace function public.toka_parse_event_start(payload jsonb)
returns timestamptz
language plpgsql
as $$
declare
    d text;
    t text;
begin
    d := nullif(payload ->> 'date', '');
    t := nullif(payload ->> 'time', '');

    if d is null and (payload ? 'startsAt') then
        return public.toka_try_timestamptz(payload ->> 'startsAt');
    end if;

    if d is null or t is null then
        return null;
    end if;

    begin
        return to_timestamp(d || ' ' || t, 'YYYY-MM-DD HH12:MI AM')::timestamptz;
    exception when others then
        begin
            return to_timestamp(d || ' ' || t, 'YYYY-MM-DD HH24:MI')::timestamptz;
        exception when others then
            return null;
        end;
    end;
end;
$$;

create or replace function public.toka_parse_event_end(payload jsonb)
returns timestamptz
language plpgsql
as $$
declare
    d text;
    t text;
begin
    d := nullif(payload ->> 'date', '');
    t := nullif(payload ->> 'endTime', '');

    if d is null and (payload ? 'endsAt') then
        return public.toka_try_timestamptz(payload ->> 'endsAt');
    end if;

    if d is null or t is null then
        return null;
    end if;

    begin
        return to_timestamp(d || ' ' || t, 'YYYY-MM-DD HH12:MI AM')::timestamptz;
    exception when others then
        begin
            return to_timestamp(d || ' ' || t, 'YYYY-MM-DD HH24:MI')::timestamptz;
        exception when others then
            return null;
        end;
    end;
end;
$$;

create or replace function public.toka_assign_owner_user_id()
returns trigger
language plpgsql
as $$
begin
    if new.owner_user_id is null then
        new.owner_user_id := auth.uid();
    end if;
    return new;
end;
$$;

-- Trigger: keep typed feature columns in sync with payload JSON.
create or replace function public.toka_sync_profile_columns()
returns trigger
language plpgsql
as $$
begin
    new.name := coalesce(new.payload ->> 'name', new.name);
    new.gender := coalesce(new.payload ->> 'gender', new.gender);
    new.phone := coalesce(new.payload ->> 'phone', new.phone);
    new.phone_country_code := coalesce(new.payload ->> 'phoneCountryCode', new.phone_country_code);
    new.phone_national_number := coalesce(new.payload ->> 'phoneNationalNumber', new.phone_national_number);
    new.email := coalesce(new.payload ->> 'email', new.email);
    new.language := coalesce(new.payload ->> 'language', new.language);
    new.notifications_enabled := coalesce((new.payload ->> 'notificationsEnabled')::boolean, new.notifications_enabled);
    new.interests := case
        when jsonb_typeof(new.payload -> 'interests') = 'array'
        then array(select jsonb_array_elements_text(new.payload -> 'interests'))
        else new.interests
    end;
    return new;
exception when others then
    return new;
end;
$$;

create or replace function public.toka_sync_event_columns()
returns trigger
language plpgsql
as $$
begin
    new.event_name := coalesce(new.payload ->> 'name', new.event_name);
    new.category := coalesce(new.payload ->> 'category', new.category);
    new.event_type := coalesce(new.payload ->> 'eventType', new.event_type);
    new.delivery_mode := coalesce(new.payload ->> 'deliveryMode', new.delivery_mode);
    new.city := coalesce(new.payload ->> 'city', new.city);
    new.country := coalesce(new.payload ->> 'country', new.country);
    new.venue := coalesce(new.payload ->> 'venue', new.venue);
    new.organiser := coalesce(new.payload ->> 'organiser', new.organiser);
    new.starts_at := coalesce(public.toka_parse_event_start(new.payload), new.starts_at);
    new.ends_at := coalesce(public.toka_parse_event_end(new.payload), new.ends_at);
    new.price_amount := coalesce((new.payload ->> 'price')::numeric, new.price_amount);
    new.currency := coalesce(new.payload ->> 'currency', new.currency);
    new.capacity := coalesce((new.payload ->> 'capacity')::integer, new.capacity);
    new.inventory_reserve_percent := coalesce((new.payload #>> '{metadata,ticketing,reservePercent}')::numeric, new.inventory_reserve_percent);
    new.ticket_tiers := coalesce(new.payload #> '{metadata,ticketing,tiers}', new.ticket_tiers);
    new.is_placeholder := coalesce((new.payload ->> 'isPlaceholder')::boolean, new.is_placeholder, false);
    new.language := coalesce(new.payload ->> 'language', new.language);
    new.metadata := coalesce(new.payload -> 'metadata', new.metadata, '{}'::jsonb);
    new.tags := case
        when jsonb_typeof(new.payload -> 'tags') = 'array'
        then array(select jsonb_array_elements_text(new.payload -> 'tags'))
        else new.tags
    end;
    return new;
exception when others then
    return new;
end;
$$;

create or replace function public.toka_sync_ticket_columns()
returns trigger
language plpgsql
as $$
begin
    new.event_id := coalesce(new.payload ->> 'eventId', new.event_id);
    new.attendee_name := coalesce(new.payload ->> 'fullName', new.payload ->> 'name', new.attendee_name);
    new.attendee_gender := coalesce(new.payload ->> 'gender', new.attendee_gender);
    new.attendee_phone := coalesce(new.payload ->> 'phone', new.attendee_phone);
    new.attendee_phone_country_code := coalesce(new.payload ->> 'phoneCountryCode', new.attendee_phone_country_code);
    new.attendee_phone_national_number := coalesce(new.payload ->> 'phoneNationalNumber', new.attendee_phone_national_number);
    new.attendee_email := coalesce(new.payload ->> 'email', new.attendee_email);
    new.amount_paid := coalesce((new.payload ->> 'amount')::numeric, (new.payload ->> 'price')::numeric, new.amount_paid);
    new.refund_amount := coalesce((new.payload ->> 'refundAmount')::numeric, new.refund_amount);
    new.refund_status := coalesce(new.payload ->> 'refundStatus', new.refund_status);
    new.refund_reason := coalesce(new.payload ->> 'refundReason', new.refund_reason);
    new.refund_requested_at := coalesce(public.toka_try_timestamptz(new.payload ->> 'refundRequestedAt'), new.refund_requested_at);
    new.refund_resolved_at := coalesce(public.toka_try_timestamptz(new.payload ->> 'refundResolvedAt'), new.refund_resolved_at);
    new.payment_method := coalesce(new.payload ->> 'paymentMethod', new.payment_method);
    new.purchased_at := coalesce(public.toka_try_timestamptz(new.payload ->> 'createdAt'), new.purchased_at, now());
    new.referral_code_used := coalesce(new.payload ->> 'referralCodeUsed', new.referral_code_used);
    return new;
exception when others then
    return new;
end;
$$;

create or replace function public.toka_sync_comment_columns()
returns trigger
language plpgsql
as $$
begin
    new.author := coalesce(new.payload ->> 'author', new.author);
    new.text_body := coalesce(new.payload ->> 'text', new.text_body);
    new.likes_count := coalesce((new.payload ->> 'likes')::integer, new.likes_count, 0);
    new.commented_at := coalesce(public.toka_try_timestamptz(new.payload ->> 'timestamp'), new.commented_at, now());
    return new;
exception when others then
    return new;
end;
$$;

create or replace function public.toka_sync_update_columns()
returns trigger
language plpgsql
as $$
begin
    new.update_type := coalesce(new.payload ->> 'type', new.update_type);
    new.text_body := coalesce(new.payload ->> 'text', new.text_body);
    new.posted_at := coalesce(public.toka_try_timestamptz(new.payload ->> 'timestamp'), new.posted_at, now());
    return new;
exception when others then
    return new;
end;
$$;

create or replace function public.toka_sync_calendar_columns()
returns trigger
language plpgsql
as $$
begin
    new.saved_at := coalesce(public.toka_try_timestamptz(new.payload ->> 'savedAt'), new.saved_at, now());
    new.with_ticket := coalesce((new.payload ->> 'withTicket')::boolean, new.with_ticket, false);
    return new;
exception when others then
    return new;
end;
$$;

create or replace function public.toka_sync_metric_columns()
returns trigger
language plpgsql
as $$
begin
    new.impressions := coalesce((new.payload ->> 'impressions')::integer, new.impressions, 0);
    new.ticket_sales_count := coalesce((new.payload ->> 'ticketSalesCount')::integer, new.ticket_sales_count, 0);
    new.ticket_revenue_total := coalesce((new.payload ->> 'ticketRevenueTotal')::numeric, new.ticket_revenue_total, 0);
    new.calendar_adds_with_ticket := coalesce((new.payload ->> 'calendarAddsWithTicket')::integer, new.calendar_adds_with_ticket, 0);
    new.calendar_adds_without_ticket := coalesce((new.payload ->> 'calendarAddsWithoutTicket')::integer, new.calendar_adds_without_ticket, 0);
    return new;
exception when others then
    return new;
end;
$$;

drop trigger if exists trg_toka_profiles_sync_columns on public.toka_profiles;
create trigger trg_toka_profiles_sync_columns
before insert or update on public.toka_profiles
for each row execute function public.toka_sync_profile_columns();

drop trigger if exists trg_toka_profiles_owner on public.toka_profiles;
create trigger trg_toka_profiles_owner
before insert on public.toka_profiles
for each row execute function public.toka_assign_owner_user_id();

drop trigger if exists trg_toka_events_sync_columns on public.toka_events;
create trigger trg_toka_events_sync_columns
before insert or update on public.toka_events
for each row execute function public.toka_sync_event_columns();

drop trigger if exists trg_toka_events_owner on public.toka_events;
create trigger trg_toka_events_owner
before insert on public.toka_events
for each row execute function public.toka_assign_owner_user_id();

drop trigger if exists trg_toka_tickets_sync_columns on public.toka_tickets;
create trigger trg_toka_tickets_sync_columns
before insert or update on public.toka_tickets
for each row execute function public.toka_sync_ticket_columns();

drop trigger if exists trg_toka_tickets_owner on public.toka_tickets;
create trigger trg_toka_tickets_owner
before insert on public.toka_tickets
for each row execute function public.toka_assign_owner_user_id();

drop trigger if exists trg_toka_comments_sync_columns on public.toka_comments;
create trigger trg_toka_comments_sync_columns
before insert or update on public.toka_comments
for each row execute function public.toka_sync_comment_columns();

drop trigger if exists trg_toka_comments_owner on public.toka_comments;
create trigger trg_toka_comments_owner
before insert on public.toka_comments
for each row execute function public.toka_assign_owner_user_id();

drop trigger if exists trg_toka_updates_sync_columns on public.toka_updates;
create trigger trg_toka_updates_sync_columns
before insert or update on public.toka_updates
for each row execute function public.toka_sync_update_columns();

drop trigger if exists trg_toka_updates_owner on public.toka_updates;
create trigger trg_toka_updates_owner
before insert on public.toka_updates
for each row execute function public.toka_assign_owner_user_id();

drop trigger if exists trg_toka_calendar_sync_columns on public.toka_calendar_entries;
create trigger trg_toka_calendar_sync_columns
before insert or update on public.toka_calendar_entries
for each row execute function public.toka_sync_calendar_columns();

drop trigger if exists trg_toka_calendar_owner on public.toka_calendar_entries;
create trigger trg_toka_calendar_owner
before insert on public.toka_calendar_entries
for each row execute function public.toka_assign_owner_user_id();

drop trigger if exists trg_toka_metrics_sync_columns on public.toka_event_metrics;
create trigger trg_toka_metrics_sync_columns
before insert or update on public.toka_event_metrics
for each row execute function public.toka_sync_metric_columns();

drop trigger if exists trg_toka_metrics_owner on public.toka_event_metrics;
create trigger trg_toka_metrics_owner
before insert on public.toka_event_metrics
for each row execute function public.toka_assign_owner_user_id();

-- Ensure event deletion is fully cleaned up in Supabase regardless of client behavior.
create or replace function public.toka_cascade_event_delete()
returns trigger
language plpgsql
as $$
begin
        delete from public.toka_tickets
        where owner_user_id = old.owner_user_id
            and event_id = old.id;

        delete from public.toka_comments
        where owner_user_id = old.owner_user_id
            and event_id = old.id;

        delete from public.toka_updates
        where owner_user_id = old.owner_user_id
            and event_id = old.id;

        delete from public.toka_calendar_entries
        where owner_user_id = old.owner_user_id
            and event_id = old.id;

        delete from public.toka_event_metrics
        where owner_user_id = old.owner_user_id
            and event_id = old.id;

        return old;
end;
$$;

drop trigger if exists trg_toka_events_cascade_delete on public.toka_events;
create trigger trg_toka_events_cascade_delete
after delete on public.toka_events
for each row execute function public.toka_cascade_event_delete();

-- Global event delete RPC for cross-device/account unpublish.
-- The caller must own at least one row with this event id.
create or replace function public.toka_delete_event_global(p_event_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    caller_id uuid := auth.uid();
    owns_event boolean := false;
    has_other_owner_rows boolean := false;
begin
    if p_event_id is null or btrim(p_event_id) = '' then
        raise exception 'Event id is required';
    end if;

    if caller_id is null then
        raise exception 'Authentication required';
    end if;

    select exists (
        select 1
        from public.toka_events e
        where e.id = p_event_id
          and e.owner_user_id = caller_id
    ) into owns_event;

    if not owns_event then
        raise exception 'Not authorized to delete this event';
    end if;

    select exists (
        select 1
        from public.toka_events e
        where e.id = p_event_id
          and coalesce(e.owner_user_id, '00000000-0000-0000-0000-000000000000'::uuid) <> caller_id
    ) into has_other_owner_rows;

    if has_other_owner_rows then
        raise exception 'Event ownership conflict detected. Contact support to resolve duplicate ownership rows.';
    end if;

    delete from public.toka_tickets where event_id = p_event_id;
    delete from public.toka_comments where event_id = p_event_id;
    delete from public.toka_updates where event_id = p_event_id;
    delete from public.toka_calendar_entries where event_id = p_event_id;
    delete from public.toka_event_metrics where event_id = p_event_id;
    delete from public.toka_events where id = p_event_id;

    return true;
end;
$$;

revoke all on function public.toka_delete_event_global(text) from public;
grant execute on function public.toka_delete_event_global(text) to authenticated;

-- ML-oriented views.
-- Drop first so Postgres does not attempt in-place column rename/order changes
-- when view definitions evolve.
drop view if exists public.toka_ml_event_features;
drop view if exists public.toka_ml_training_rows;

create view public.toka_ml_event_features as
select
    e.device_id,
    e.id as event_id,
    e.event_name,
    e.category,
    e.event_type,
    e.delivery_mode,
    e.city,
    e.country,
    e.venue,
    e.organiser,
    e.starts_at,
    e.ends_at,
    extract(dow from e.starts_at) as start_day_of_week,
    extract(hour from e.starts_at) as start_hour,
    e.price_amount,
    e.currency,
    e.capacity,
    coalesce(e.is_placeholder, false) as is_placeholder,
    e.language,
    e.tags,
    coalesce(m.impressions, 0) as impressions,
    coalesce(m.ticket_sales_count, 0) as ticket_sales_count,
    coalesce(m.ticket_revenue_total, 0) as ticket_revenue_total,
    coalesce(m.calendar_adds_with_ticket, 0) as calendar_adds_with_ticket,
    coalesce(m.calendar_adds_without_ticket, 0) as calendar_adds_without_ticket,
    case
        when coalesce(m.ticket_sales_count, 0) > 0 then true else false
    end as had_sales
from public.toka_events e
left join public.toka_event_metrics m
    on m.device_id = e.device_id
    and m.event_id = e.id
where coalesce(e.is_placeholder, false) = false;

create view public.toka_ml_training_rows as
select
    e.device_id,
    e.id as event_id,
    e.category,
    e.event_type,
    e.delivery_mode,
    e.city,
    e.starts_at,
    e.price_amount,
    e.capacity,
    coalesce(e.is_placeholder, false) as is_placeholder,
    coalesce(m.impressions, 0) as impressions,
    coalesce(m.ticket_sales_count, 0) as ticket_sales_count,
    coalesce(m.ticket_revenue_total, 0) as ticket_revenue_total,
    coalesce(c.comment_count, 0) as comment_count,
    coalesce(c.avg_likes_per_comment, 0) as avg_likes_per_comment,
    coalesce(t.ticket_count, 0) as ticket_count,
    coalesce(t.female_attendee_count, 0) as female_attendee_count,
    coalesce(t.male_attendee_count, 0) as male_attendee_count,
    coalesce(t.unknown_attendee_count, 0) as unknown_attendee_count,
    case
        when coalesce(m.ticket_sales_count, 0) >= 10 then 'high'
        when coalesce(m.ticket_sales_count, 0) between 3 and 9 then 'medium'
        else 'low'
    end as sales_band
from public.toka_events e
left join public.toka_event_metrics m
    on m.device_id = e.device_id
   and m.event_id = e.id
left join (
    select
        device_id,
        event_id,
        count(*) as comment_count,
        avg(coalesce(likes_count, 0)::numeric) as avg_likes_per_comment
    from public.toka_comments
    group by device_id, event_id
) c
    on c.device_id = e.device_id
   and c.event_id = e.id
left join (
    select
        device_id,
        event_id,
        count(*) as ticket_count,
        count(*) filter (where lower(coalesce(attendee_gender, '')) = 'female') as female_attendee_count,
        count(*) filter (where lower(coalesce(attendee_gender, '')) = 'male') as male_attendee_count,
        count(*) filter (where lower(coalesce(attendee_gender, '')) not in ('female', 'male')) as unknown_attendee_count
    from public.toka_tickets
    group by device_id, event_id
) t
    on t.device_id = e.device_id
   and t.event_id = e.id
where coalesce(e.is_placeholder, false) = false;

create index if not exists idx_toka_comments_event on public.toka_comments (device_id, event_id);
create index if not exists idx_toka_updates_event on public.toka_updates (device_id, event_id);
create index if not exists idx_toka_events_category on public.toka_events (category);
create index if not exists idx_toka_events_starts_at on public.toka_events (starts_at);
create index if not exists idx_toka_events_tags_gin on public.toka_events using gin (tags);
create index if not exists idx_toka_events_payload_gin on public.toka_events using gin (payload);
create index if not exists idx_toka_tickets_event_id on public.toka_tickets (device_id, event_id);
create index if not exists idx_toka_tickets_refund_status on public.toka_tickets (owner_user_id, refund_status);
create index if not exists idx_toka_tickets_attendee_gender on public.toka_tickets (owner_user_id, attendee_gender);
create index if not exists idx_toka_events_ticketing on public.toka_events (owner_user_id, inventory_reserve_percent);
create index if not exists idx_toka_events_is_placeholder on public.toka_events (owner_user_id, is_placeholder);
create index if not exists idx_toka_profiles_owner on public.toka_profiles (owner_user_id);
create index if not exists idx_toka_profiles_gender on public.toka_profiles (owner_user_id, gender);
create index if not exists idx_toka_profiles_phone on public.toka_profiles (owner_user_id, phone);
create index if not exists idx_toka_events_owner on public.toka_events (owner_user_id);
create index if not exists idx_toka_tickets_owner on public.toka_tickets (owner_user_id);
create index if not exists idx_toka_comments_owner on public.toka_comments (owner_user_id);
create index if not exists idx_toka_updates_owner on public.toka_updates (owner_user_id);
create index if not exists idx_toka_calendar_owner on public.toka_calendar_entries (owner_user_id);
create index if not exists idx_toka_metrics_owner on public.toka_event_metrics (owner_user_id);

alter table public.toka_profiles enable row level security;
alter table public.toka_events enable row level security;
alter table public.toka_tickets enable row level security;
alter table public.toka_comments enable row level security;
alter table public.toka_updates enable row level security;
alter table public.toka_calendar_entries enable row level security;
alter table public.toka_event_metrics enable row level security;

-- Production policy: owner-only writes, with shared authenticated reads for events.
do $$
begin
    drop policy if exists toka_profiles_anon_rw on public.toka_profiles;
    drop policy if exists toka_events_anon_rw on public.toka_events;
    drop policy if exists toka_tickets_anon_rw on public.toka_tickets;
    drop policy if exists toka_comments_anon_rw on public.toka_comments;
    drop policy if exists toka_updates_anon_rw on public.toka_updates;
    drop policy if exists toka_calendar_entries_anon_rw on public.toka_calendar_entries;
    drop policy if exists toka_event_metrics_anon_rw on public.toka_event_metrics;

    if not exists (select 1 from pg_policies where policyname = 'toka_profiles_owner_rw') then
        create policy toka_profiles_owner_rw on public.toka_profiles
            for all
            using (auth.uid() is not null and owner_user_id = auth.uid())
            with check (auth.uid() is not null and owner_user_id = auth.uid());
    end if;

    if not exists (select 1 from pg_policies where policyname = 'toka_events_owner_rw') then
        create policy toka_events_owner_rw on public.toka_events
            for all
            using (auth.uid() is not null and owner_user_id = auth.uid())
            with check (auth.uid() is not null and owner_user_id = auth.uid());
    end if;

    if not exists (select 1 from pg_policies where policyname = 'toka_events_authenticated_read') then
        create policy toka_events_authenticated_read on public.toka_events
            for select
            using (auth.uid() is not null);
    end if;

    if not exists (select 1 from pg_policies where policyname = 'toka_tickets_owner_rw') then
        create policy toka_tickets_owner_rw on public.toka_tickets
            for all
            using (auth.uid() is not null and owner_user_id = auth.uid())
            with check (auth.uid() is not null and owner_user_id = auth.uid());
    end if;

    if not exists (select 1 from pg_policies where policyname = 'toka_comments_owner_rw') then
        create policy toka_comments_owner_rw on public.toka_comments
            for all
            using (auth.uid() is not null and owner_user_id = auth.uid())
            with check (auth.uid() is not null and owner_user_id = auth.uid());
    end if;

    if not exists (select 1 from pg_policies where policyname = 'toka_updates_owner_rw') then
        create policy toka_updates_owner_rw on public.toka_updates
            for all
            using (auth.uid() is not null and owner_user_id = auth.uid())
            with check (auth.uid() is not null and owner_user_id = auth.uid());
    end if;

    if not exists (select 1 from pg_policies where policyname = 'toka_calendar_entries_owner_rw') then
        create policy toka_calendar_entries_owner_rw on public.toka_calendar_entries
            for all
            using (auth.uid() is not null and owner_user_id = auth.uid())
            with check (auth.uid() is not null and owner_user_id = auth.uid());
    end if;

    if not exists (select 1 from pg_policies where policyname = 'toka_event_metrics_owner_rw') then
        create policy toka_event_metrics_owner_rw on public.toka_event_metrics
            for all
            using (auth.uid() is not null and owner_user_id = auth.uid())
            with check (auth.uid() is not null and owner_user_id = auth.uid());
    end if;
end
$$;
