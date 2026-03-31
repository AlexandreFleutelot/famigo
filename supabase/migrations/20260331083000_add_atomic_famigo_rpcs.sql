create or replace function public.purchase_reward(
  p_family_id uuid,
  p_member_id uuid,
  p_reward_id uuid,
  p_purchased_at timestamptz default timezone('utc', now())
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_reward public.rewards%rowtype;
  v_member public.members%rowtype;
  v_current_balance integer;
  v_purchase_id uuid := gen_random_uuid();
  v_point_transaction_id uuid := gen_random_uuid();
  v_audit_event_id uuid := gen_random_uuid();
begin
  select *
  into v_member
  from public.members
  where id = p_member_id
    and family_id = p_family_id
  for update;

  if not found then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  select *
  into v_reward
  from public.rewards
  where id = p_reward_id
    and family_id = p_family_id
  for update;

  if not found then
    raise exception 'REWARD_NOT_FOUND';
  end if;

  if v_reward.active is not true then
    raise exception 'SHOP_ITEM_INACTIVE';
  end if;

  select coalesce(sum(points_delta), 0)
  into v_current_balance
  from public.point_transactions
  where family_id = p_family_id
    and member_id = p_member_id;

  if v_current_balance < v_reward.cost then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  insert into public.reward_purchases (
    id,
    family_id,
    member_id,
    reward_id,
    cost_snapshot,
    purchased_at,
    created_at
  )
  values (
    v_purchase_id,
    p_family_id,
    p_member_id,
    p_reward_id,
    v_reward.cost,
    p_purchased_at,
    timezone('utc', now())
  );

  insert into public.point_transactions (
    id,
    family_id,
    member_id,
    type,
    points_delta,
    reward_purchase_id,
    occurred_at,
    created_at
  )
  values (
    v_point_transaction_id,
    p_family_id,
    p_member_id,
    'shop_purchase',
    -v_reward.cost,
    v_purchase_id,
    p_purchased_at,
    timezone('utc', now())
  );

  insert into public.audit_events (
    id,
    family_id,
    type,
    actor_member_id,
    occurred_at,
    metadata,
    created_at
  )
  values (
    v_audit_event_id,
    p_family_id,
    'shop_purchase_made',
    p_member_id,
    p_purchased_at,
    jsonb_build_object(
      'purchaseId', v_purchase_id,
      'rewardId', p_reward_id,
      'cost', v_reward.cost
    ),
    timezone('utc', now())
  );

  return jsonb_build_object(
    'purchaseId', v_purchase_id,
    'pointTransactionId', v_point_transaction_id,
    'auditEventId', v_audit_event_id,
    'memberId', p_member_id,
    'rewardId', p_reward_id,
    'cost', v_reward.cost,
    'purchasedAt', p_purchased_at,
    'resultingBalance', v_current_balance - v_reward.cost
  );
end;
$$;

create or replace function public.finalize_daily_point_allocation(
  p_family_id uuid,
  p_allocation_id uuid,
  p_finalized_at timestamptz default timezone('utc', now())
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_allocation public.daily_point_allocations%rowtype;
  v_allocated_total integer;
  v_line_count integer;
  v_point_transaction_count integer;
  v_audit_event_count integer;
begin
  select *
  into v_allocation
  from public.daily_point_allocations
  where id = p_allocation_id
    and family_id = p_family_id
  for update;

  if not found then
    raise exception 'ALLOCATION_NOT_FOUND';
  end if;

  if v_allocation.status <> 'draft' then
    raise exception 'ALLOCATION_ALREADY_FINALIZED';
  end if;

  perform 1
  from public.members
  where id = v_allocation.giver_member_id
    and family_id = p_family_id
  for update;

  perform 1
  from public.members
  where family_id = p_family_id
    and id in (
      select receiver_member_id
      from public.daily_point_allocation_lines
      where allocation_id = p_allocation_id
        and family_id = p_family_id
    )
  order by id
  for update;

  select coalesce(sum(points), 0), count(*)
  into v_allocated_total, v_line_count
  from public.daily_point_allocation_lines
  where allocation_id = p_allocation_id
    and family_id = p_family_id;

  update public.daily_point_allocations
  set status = 'finalized',
      finalized_at = p_finalized_at,
      updated_at = timezone('utc', now())
  where id = p_allocation_id
    and family_id = p_family_id;

  insert into public.point_transactions (
    id,
    family_id,
    member_id,
    type,
    points_delta,
    day_key,
    daily_point_allocation_id,
    occurred_at,
    created_at
  )
  select
    gen_random_uuid(),
    p_family_id,
    line.receiver_member_id,
    'daily_points_received',
    line.points,
    v_allocation.day_key,
    p_allocation_id,
    p_finalized_at,
    timezone('utc', now())
  from public.daily_point_allocation_lines line
  where line.allocation_id = p_allocation_id
    and line.family_id = p_family_id;

  get diagnostics v_point_transaction_count = row_count;

  insert into public.audit_events (
    id,
    family_id,
    type,
    actor_member_id,
    subject_member_id,
    occurred_at,
    metadata,
    created_at
  )
  select
    gen_random_uuid(),
    p_family_id,
    'points_given',
    v_allocation.giver_member_id,
    line.receiver_member_id,
    p_finalized_at,
    jsonb_build_object(
      'allocationId', p_allocation_id,
      'dayKey', v_allocation.day_key,
      'points', line.points
    ),
    timezone('utc', now())
  from public.daily_point_allocation_lines line
  where line.allocation_id = p_allocation_id
    and line.family_id = p_family_id;

  get diagnostics v_audit_event_count = row_count;

  return jsonb_build_object(
    'allocationId', p_allocation_id,
    'familyId', p_family_id,
    'status', 'finalized',
    'dayKey', v_allocation.day_key,
    'giverMemberId', v_allocation.giver_member_id,
    'finalizedAt', p_finalized_at,
    'creditedReceiversCount', v_line_count,
    'pointTransactionCount', v_point_transaction_count,
    'auditEventCount', v_audit_event_count,
    'allocatedPoints', v_allocated_total,
    'unallocatedPointsExpired', greatest(0, 5 - v_allocated_total)
  );
end;
$$;

create or replace function public.cast_goal_vote(
  p_family_id uuid,
  p_member_id uuid,
  p_family_goal_id uuid,
  p_day_key date,
  p_created_at timestamptz default timezone('utc', now())
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_member public.members%rowtype;
  v_goal public.family_goals%rowtype;
  v_vote_id uuid := gen_random_uuid();
  v_vote_audit_event_id uuid := gen_random_uuid();
  v_goal_reached_audit_event_id uuid := gen_random_uuid();
  v_total_votes integer;
  v_reached_target boolean := false;
begin
  select *
  into v_member
  from public.members
  where id = p_member_id
    and family_id = p_family_id;

  if not found then
    raise exception 'VOTER_NOT_FOUND';
  end if;

  select *
  into v_goal
  from public.family_goals
  where id = p_family_goal_id
    and family_id = p_family_id
  for update;

  if not found then
    raise exception 'GOAL_NOT_FOUND';
  end if;

  if v_goal.status <> 'active' then
    raise exception 'GOAL_NOT_ACTIVE';
  end if;

  begin
    insert into public.goal_votes (
      id,
      family_id,
      day_key,
      member_id,
      family_goal_id,
      created_at
    )
    values (
      v_vote_id,
      p_family_id,
      p_day_key,
      p_member_id,
      p_family_goal_id,
      p_created_at
    );
  exception
    when unique_violation then
      raise exception 'DAILY_VOTE_ALREADY_RECORDED';
  end;

  insert into public.audit_events (
    id,
    family_id,
    type,
    actor_member_id,
    occurred_at,
    metadata,
    created_at
  )
  values (
    v_vote_audit_event_id,
    p_family_id,
    'goal_vote_recorded',
    p_member_id,
    p_created_at,
    jsonb_build_object(
      'goalId', p_family_goal_id,
      'dayKey', p_day_key
    ),
    timezone('utc', now())
  );

  select count(*)
  into v_total_votes
  from public.goal_votes
  where family_id = p_family_id
    and family_goal_id = p_family_goal_id;

  if v_total_votes >= v_goal.target_vote_count then
    update public.family_goals
    set status = 'promised',
        promised_at = p_created_at,
        updated_at = timezone('utc', now())
    where id = p_family_goal_id
      and family_id = p_family_id
      and status = 'active';

    if found then
      v_reached_target := true;

      insert into public.audit_events (
        id,
        family_id,
        type,
        actor_member_id,
        occurred_at,
        metadata,
        created_at
      )
      values (
        v_goal_reached_audit_event_id,
        p_family_id,
        'goal_reached',
        p_member_id,
        p_created_at,
        jsonb_build_object(
          'goalId', p_family_goal_id,
          'targetVoteCount', v_goal.target_vote_count
        ),
        timezone('utc', now())
      );
    end if;
  end if;

  return jsonb_build_object(
    'voteId', v_vote_id,
    'voteAuditEventId', v_vote_audit_event_id,
    'goalReachedAuditEventId', case when v_reached_target then v_goal_reached_audit_event_id else null end,
    'familyGoalId', p_family_goal_id,
    'memberId', p_member_id,
    'dayKey', p_day_key,
    'goalStatus', case when v_reached_target then 'promised' else v_goal.status end,
    'reachedTarget', v_reached_target,
    'totalVotes', v_total_votes
  );
end;
$$;
