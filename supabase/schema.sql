create extension if not exists "pgcrypto";

create type activity_type as enum ('work', 'study', 'exercise', 'reading');

create table activity_sessions (
  id            uuid primary key default gen_random_uuid(),
  chat_id       bigint        not null,
  activity      activity_type not null,
  started_at    timestamptz   not null,
  ended_at      timestamptz,
  duration_secs integer,
  date          date          not null,
  created_at    timestamptz   not null default now()
);

create index idx_sessions_chat_date on activity_sessions(chat_id, date);
create index idx_sessions_active on activity_sessions(chat_id, ended_at) where ended_at is null;

create table bot_users (
  chat_id       bigint      primary key,
  username      text,
  timezone      text        not null default 'Asia/Ho_Chi_Minh',
  registered_at timestamptz not null default now()
);

alter table activity_sessions enable row level security;
alter table bot_users         enable row level security;

create or replace view v_daily_totals as
select
  chat_id,
  date,
  activity,
  sum(duration_secs) as total_secs
from activity_sessions
where ended_at is not null
group by chat_id, date, activity;

create or replace view v_monthly_totals as
select
  chat_id,
  date_trunc('month', date)::date as month,
  activity,
  sum(duration_secs) as total_secs,
  count(distinct date) as active_days
from activity_sessions
where ended_at is not null
group by chat_id, date_trunc('month', date), activity;
