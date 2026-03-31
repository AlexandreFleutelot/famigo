drop trigger if exists set_reward_purchases_updated_at on public.reward_purchases;
drop trigger if exists set_goal_votes_updated_at on public.goal_votes;
drop trigger if exists set_point_transactions_updated_at on public.point_transactions;
drop trigger if exists set_audit_events_updated_at on public.audit_events;

alter table public.reward_purchases
  drop column if exists updated_at;

alter table public.goal_votes
  drop column if exists updated_at;

alter table public.point_transactions
  drop column if exists updated_at;

alter table public.audit_events
  drop column if exists updated_at;

create or replace function public.prevent_append_only_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception '% is append-only and cannot be updated', tg_table_name;
  end if;

  raise exception '% is append-only and cannot be deleted', tg_table_name;
end;
$$;

create or replace function public.ensure_reward_purchase_reward_is_active()
returns trigger
language plpgsql
as $$
declare
  reward_is_active boolean;
begin
  select active
  into reward_is_active
  from public.rewards
  where id = new.reward_id
    and family_id = new.family_id;

  if reward_is_active is null then
    raise exception 'REWARD_NOT_FOUND';
  end if;

  if reward_is_active is not true then
    raise exception 'SHOP_ITEM_INACTIVE';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_finalized_allocation_is_immutable()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'finalized' and (
    new.family_id is distinct from old.family_id
    or new.day_key is distinct from old.day_key
    or new.giver_member_id is distinct from old.giver_member_id
    or new.status is distinct from old.status
    or new.finalized_at is distinct from old.finalized_at
  ) then
    raise exception 'FINALIZED_ALLOCATION_IMMUTABLE';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_daily_points_transaction_matches_finalized_allocation()
returns trigger
language plpgsql
as $$
declare
  allocation_day_key date;
  allocation_finalized_at timestamptz;
  allocation_status public.daily_allocation_status;
  allocated_points integer;
begin
  if new.type <> 'daily_points_received' then
    return new;
  end if;

  select day_key, finalized_at, status
  into allocation_day_key, allocation_finalized_at, allocation_status
  from public.daily_point_allocations
  where id = new.daily_point_allocation_id
    and family_id = new.family_id;

  if allocation_status is null then
    raise exception 'ALLOCATION_NOT_FOUND';
  end if;

  if allocation_status <> 'finalized' then
    raise exception 'ALLOCATION_NOT_FINALIZED';
  end if;

  if new.day_key is distinct from allocation_day_key then
    raise exception 'POINT_TRANSACTION_DAY_KEY_MISMATCH';
  end if;

  if new.occurred_at is distinct from allocation_finalized_at then
    raise exception 'POINT_TRANSACTION_OCCURRED_AT_MISMATCH';
  end if;

  select points
  into allocated_points
  from public.daily_point_allocation_lines
  where allocation_id = new.daily_point_allocation_id
    and family_id = new.family_id
    and receiver_member_id = new.member_id;

  if allocated_points is null then
    raise exception 'POINT_TRANSACTION_RECEIVER_NOT_IN_ALLOCATION';
  end if;

  if new.points_delta <> allocated_points then
    raise exception 'POINT_TRANSACTION_POINTS_MISMATCH';
  end if;

  return new;
end;
$$;

create trigger prevent_reward_purchases_update_or_delete
before update or delete on public.reward_purchases
for each row
execute function public.prevent_append_only_change();

create trigger prevent_goal_votes_update_or_delete
before update or delete on public.goal_votes
for each row
execute function public.prevent_append_only_change();

create trigger prevent_point_transactions_update_or_delete
before update or delete on public.point_transactions
for each row
execute function public.prevent_append_only_change();

create trigger prevent_audit_events_update_or_delete
before update or delete on public.audit_events
for each row
execute function public.prevent_append_only_change();

create trigger ensure_reward_purchase_reward_is_active
before insert on public.reward_purchases
for each row
execute function public.ensure_reward_purchase_reward_is_active();

create trigger ensure_finalized_allocation_is_immutable
before update on public.daily_point_allocations
for each row
execute function public.ensure_finalized_allocation_is_immutable();

create trigger ensure_daily_points_transaction_matches_finalized_allocation
before insert on public.point_transactions
for each row
execute function public.ensure_daily_points_transaction_matches_finalized_allocation();
