create type public.member_role as enum ('parent', 'child');
create type public.goal_status as enum ('active', 'promised', 'archived');
create type public.daily_allocation_status as enum ('draft', 'finalized');
create type public.point_transaction_type as enum ('daily_points_received', 'shop_purchase');
create type public.audit_event_type as enum (
  'member_session_started',
  'points_given',
  'shop_purchase_made',
  'goal_vote_recorded',
  'goal_reached'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'UTC',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint families_name_not_blank check (char_length(btrim(name)) > 0),
  constraint families_timezone_not_blank check (char_length(btrim(timezone)) > 0)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  display_name text not null,
  role public.member_role not null,
  pin_hash text not null,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint members_family_id_id_unique unique (family_id, id),
  constraint members_display_name_not_blank check (char_length(btrim(display_name)) > 0),
  constraint members_pin_hash_not_blank check (char_length(btrim(pin_hash)) > 0)
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  image_url text not null,
  cost integer not null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint rewards_family_id_id_unique unique (family_id, id),
  constraint rewards_name_not_blank check (char_length(btrim(name)) > 0),
  constraint rewards_image_url_not_blank check (char_length(btrim(image_url)) > 0),
  constraint rewards_cost_positive check (cost > 0)
);

create table public.daily_point_allocations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  day_key date not null,
  giver_member_id uuid not null,
  status public.daily_allocation_status not null default 'draft',
  finalized_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint daily_point_allocations_family_id_id_unique unique (family_id, id),
  constraint daily_point_allocations_family_giver_fk
    foreign key (family_id, giver_member_id)
    references public.members(family_id, id)
    on delete restrict,
  constraint daily_point_allocations_family_day_giver_unique unique (family_id, day_key, giver_member_id),
  constraint daily_point_allocations_status_finalized_at_check check (
    (status = 'draft' and finalized_at is null)
    or (status = 'finalized' and finalized_at is not null)
  )
);

create table public.daily_point_allocation_lines (
  allocation_id uuid not null,
  family_id uuid not null,
  receiver_member_id uuid not null,
  points integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (allocation_id, receiver_member_id),
  constraint daily_point_allocation_lines_allocation_fk
    foreign key (family_id, allocation_id)
    references public.daily_point_allocations(family_id, id)
    on delete cascade,
  constraint daily_point_allocation_lines_receiver_fk
    foreign key (family_id, receiver_member_id)
    references public.members(family_id, id)
    on delete restrict,
  constraint daily_point_allocation_lines_points_positive check (points > 0)
);

create table public.reward_purchases (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null,
  reward_id uuid not null,
  cost_snapshot integer not null,
  purchased_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint reward_purchases_family_id_id_unique unique (family_id, id),
  constraint reward_purchases_member_fk
    foreign key (family_id, member_id)
    references public.members(family_id, id)
    on delete restrict,
  constraint reward_purchases_reward_fk
    foreign key (family_id, reward_id)
    references public.rewards(family_id, id)
    on delete restrict,
  constraint reward_purchases_cost_snapshot_positive check (cost_snapshot > 0)
);

create table public.family_goals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  target_vote_count integer not null,
  status public.goal_status not null default 'active',
  created_by_member_id uuid not null,
  promised_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint family_goals_family_id_id_unique unique (family_id, id),
  constraint family_goals_title_not_blank check (char_length(btrim(title)) > 0),
  constraint family_goals_target_vote_count_positive check (target_vote_count > 0),
  constraint family_goals_creator_fk
    foreign key (family_id, created_by_member_id)
    references public.members(family_id, id)
    on delete restrict,
  constraint family_goals_promised_at_check check (
    (status = 'active' and promised_at is null)
    or (status = 'promised' and promised_at is not null)
    or status = 'archived'
  )
);

create table public.goal_votes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  day_key date not null,
  member_id uuid not null,
  family_goal_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint goal_votes_member_fk
    foreign key (family_id, member_id)
    references public.members(family_id, id)
    on delete restrict,
  constraint goal_votes_family_goal_fk
    foreign key (family_id, family_goal_id)
    references public.family_goals(family_id, id)
    on delete restrict,
  constraint goal_votes_one_vote_per_member_per_day unique (family_id, member_id, day_key)
);

create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null,
  type public.point_transaction_type not null,
  points_delta integer not null,
  day_key date,
  daily_point_allocation_id uuid,
  reward_purchase_id uuid,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint point_transactions_member_fk
    foreign key (family_id, member_id)
    references public.members(family_id, id)
    on delete restrict,
  constraint point_transactions_allocation_fk
    foreign key (family_id, daily_point_allocation_id)
    references public.daily_point_allocations(family_id, id)
    on delete restrict,
  constraint point_transactions_purchase_fk
    foreign key (family_id, reward_purchase_id)
    references public.reward_purchases(family_id, id)
    on delete restrict,
  constraint point_transactions_non_zero check (points_delta <> 0),
  constraint point_transactions_type_consistency check (
    (
      type = 'daily_points_received'
      and points_delta > 0
      and day_key is not null
      and daily_point_allocation_id is not null
      and reward_purchase_id is null
    )
    or (
      type = 'shop_purchase'
      and points_delta < 0
      and day_key is null
      and daily_point_allocation_id is null
      and reward_purchase_id is not null
    )
  ),
  constraint point_transactions_daily_points_unique unique (daily_point_allocation_id, member_id),
  constraint point_transactions_purchase_unique unique (reward_purchase_id)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  type public.audit_event_type not null,
  actor_member_id uuid,
  subject_member_id uuid,
  occurred_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint audit_events_actor_fk
    foreign key (family_id, actor_member_id)
    references public.members(family_id, id)
    on delete restrict,
  constraint audit_events_subject_fk
    foreign key (family_id, subject_member_id)
    references public.members(family_id, id)
    on delete restrict,
  constraint audit_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create or replace function public.ensure_parent_member()
returns trigger
language plpgsql
as $$
declare
  creator_role public.member_role;
begin
  select role
  into creator_role
  from public.members
  where id = new.created_by_member_id
    and family_id = new.family_id;

  if creator_role is distinct from 'parent' then
    raise exception 'GOAL_PARENT_ROLE_REQUIRED';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_goal_vote_is_valid()
returns trigger
language plpgsql
as $$
declare
  target_status public.goal_status;
begin
  select status
  into target_status
  from public.family_goals
  where id = new.family_goal_id
    and family_id = new.family_id;

  if target_status is null then
    raise exception 'GOAL_NOT_FOUND';
  end if;

  if target_status <> 'active' then
    raise exception 'GOAL_NOT_ACTIVE';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_daily_allocation_line_is_valid()
returns trigger
language plpgsql
as $$
declare
  allocation_status public.daily_allocation_status;
  allocation_giver_member_id uuid;
  total_points integer;
begin
  select status, giver_member_id
  into allocation_status, allocation_giver_member_id
  from public.daily_point_allocations
  where id = new.allocation_id
    and family_id = new.family_id;

  if allocation_status is null then
    raise exception 'ALLOCATION_NOT_FOUND';
  end if;

  if allocation_status <> 'draft' then
    raise exception 'ALLOCATION_ALREADY_FINALIZED';
  end if;

  if allocation_giver_member_id = new.receiver_member_id then
    raise exception 'SELF_ALLOCATION_FORBIDDEN';
  end if;

  if tg_op = 'INSERT' then
    select coalesce(sum(points), 0)
    into total_points
    from public.daily_point_allocation_lines
    where allocation_id = new.allocation_id;
  else
    select coalesce(sum(points), 0)
    into total_points
    from public.daily_point_allocation_lines
    where allocation_id = new.allocation_id
      and receiver_member_id <> old.receiver_member_id;
  end if;

  total_points := total_points + new.points;

  if total_points > 5 then
    raise exception 'DAILY_BUDGET_EXCEEDED';
  end if;

  return new;
end;
$$;

create index members_family_idx on public.members (family_id);
create index rewards_family_active_idx on public.rewards (family_id, active);
create index daily_point_allocations_family_day_idx on public.daily_point_allocations (family_id, day_key);
create index daily_point_allocation_lines_family_receiver_idx
  on public.daily_point_allocation_lines (family_id, receiver_member_id);
create index reward_purchases_family_member_purchased_idx
  on public.reward_purchases (family_id, member_id, purchased_at desc);
create index family_goals_family_status_idx on public.family_goals (family_id, status);
create index goal_votes_family_goal_idx on public.goal_votes (family_id, family_goal_id);
create index goal_votes_family_day_idx on public.goal_votes (family_id, day_key);
create index point_transactions_member_occurred_idx
  on public.point_transactions (member_id, occurred_at desc);
create index point_transactions_family_occurred_idx
  on public.point_transactions (family_id, occurred_at desc);
create index audit_events_family_occurred_idx on public.audit_events (family_id, occurred_at desc);

create trigger set_families_updated_at
before update on public.families
for each row
execute function public.set_updated_at();

create trigger set_members_updated_at
before update on public.members
for each row
execute function public.set_updated_at();

create trigger set_rewards_updated_at
before update on public.rewards
for each row
execute function public.set_updated_at();

create trigger set_daily_point_allocations_updated_at
before update on public.daily_point_allocations
for each row
execute function public.set_updated_at();

create trigger set_daily_point_allocation_lines_updated_at
before update on public.daily_point_allocation_lines
for each row
execute function public.set_updated_at();

create trigger set_reward_purchases_updated_at
before update on public.reward_purchases
for each row
execute function public.set_updated_at();

create trigger set_family_goals_updated_at
before update on public.family_goals
for each row
execute function public.set_updated_at();

create trigger set_goal_votes_updated_at
before update on public.goal_votes
for each row
execute function public.set_updated_at();

create trigger set_point_transactions_updated_at
before update on public.point_transactions
for each row
execute function public.set_updated_at();

create trigger set_audit_events_updated_at
before update on public.audit_events
for each row
execute function public.set_updated_at();

create trigger ensure_family_goal_creator_is_parent
before insert or update on public.family_goals
for each row
execute function public.ensure_parent_member();

create trigger ensure_goal_vote_is_valid
before insert or update on public.goal_votes
for each row
execute function public.ensure_goal_vote_is_valid();

create trigger ensure_daily_allocation_line_is_valid
before insert or update on public.daily_point_allocation_lines
for each row
execute function public.ensure_daily_allocation_line_is_valid();
