-- Seed de demonstration pour Famigo.
-- Hypothese explicite:
-- - ce fichier sert a peupler un projet Supabase vierge avec une famille minimale ;
-- - les PIN sont haches avec `crypt(...)` pour rester compatibles avec une future verification reelle.
-- - les PIN ci-dessous sont des PIN de demonstration uniquement.
--
-- PIN de demo:
-- - Papa: 1234
-- - Maman: 2345
-- - Alice: 1111
-- - Viktoria: 2222

insert into public.families (id, name, timezone)
values (
  '11111111-1111-1111-1111-111111111111',
  'Famille Fleutelot',
  'Europe/Paris'
)
on conflict (id) do update
set
  name = excluded.name,
  timezone = excluded.timezone,
  updated_at = timezone('utc', now());

insert into public.members (id, family_id, display_name, role, pin_hash, avatar_url)
values
  (
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111111',
    'Papa',
    'parent',
    crypt('1234', gen_salt('bf')),
    null
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Maman',
    'parent',
    crypt('2345', gen_salt('bf')),
    null
  ),
  (
    '22222222-2222-2222-2222-222222222223',
    '11111111-1111-1111-1111-111111111111',
    'Alice',
    'child',
    crypt('1111', gen_salt('bf')),
    null
  ),
  (
    '22222222-2222-2222-2222-222222222224',
    '11111111-1111-1111-1111-111111111111',
    'Viktoria',
    'child',
    crypt('2222', gen_salt('bf')),
    null
  )
on conflict (id) do update
set
  family_id = excluded.family_id,
  display_name = excluded.display_name,
  role = excluded.role,
  pin_hash = excluded.pin_hash,
  avatar_url = excluded.avatar_url,
  updated_at = timezone('utc', now());

insert into public.rewards (id, family_id, name, image_url, cost, active)
values
  (
    '33333333-3333-3333-3333-333333333331',
    '11111111-1111-1111-1111-111111111111',
    'Soiree cinema',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
    4,
    true
  ),
  (
    '33333333-3333-3333-3333-333333333332',
    '11111111-1111-1111-1111-111111111111',
    'Dessert maison',
    'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=600&q=80',
    2,
    true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Sortie au parc',
    'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=600&q=80',
    3,
    true
  )
on conflict (id) do update
set
  family_id = excluded.family_id,
  name = excluded.name,
  image_url = excluded.image_url,
  cost = excluded.cost,
  active = excluded.active,
  updated_at = timezone('utc', now());

insert into public.family_goals (
  id,
  family_id,
  title,
  target_vote_count,
  status,
  created_by_member_id
)
values (
  '44444444-4444-4444-4444-444444444441',
  '11111111-1111-1111-1111-111111111111',
  'Sortie accrobranche en famille',
  3,
  'active',
  '22222222-2222-2222-2222-222222222221'
)
on conflict (id) do update
set
  family_id = excluded.family_id,
  title = excluded.title,
  target_vote_count = excluded.target_vote_count,
  status = excluded.status,
  created_by_member_id = excluded.created_by_member_id,
  updated_at = timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from public.daily_point_allocations
    where id = '55555555-5555-5555-5555-555555555551'
  ) then
    insert into public.daily_point_allocations (
      id,
      family_id,
      day_key,
      giver_member_id,
      status
    )
    values (
      '55555555-5555-5555-5555-555555555551',
      '11111111-1111-1111-1111-111111111111',
      date '2026-03-30',
      '22222222-2222-2222-2222-222222222221',
      'draft'
    );

    insert into public.daily_point_allocation_lines (
      allocation_id,
      family_id,
      receiver_member_id,
      points
    )
    values
      (
        '55555555-5555-5555-5555-555555555551',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222223',
        3
      ),
      (
        '55555555-5555-5555-5555-555555555551',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222224',
        2
      );

    update public.daily_point_allocations
    set
      status = 'finalized',
      finalized_at = '2026-03-30T19:00:00Z'
    where id = '55555555-5555-5555-5555-555555555551';

    insert into public.point_transactions (
      id,
      family_id,
      member_id,
      type,
      points_delta,
      day_key,
      daily_point_allocation_id,
      occurred_at
    )
    values
      (
        '66666666-6666-6666-6666-666666666661',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222223',
        'daily_points_received',
        3,
        date '2026-03-30',
        '55555555-5555-5555-5555-555555555551',
        '2026-03-30T19:00:00Z'
      ),
      (
        '66666666-6666-6666-6666-666666666662',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222224',
        'daily_points_received',
        2,
        date '2026-03-30',
        '55555555-5555-5555-5555-555555555551',
        '2026-03-30T19:00:00Z'
      );

    insert into public.audit_events (
      id,
      family_id,
      type,
      actor_member_id,
      occurred_at,
      metadata
    )
    values (
      '77777777-7777-7777-7777-777777777771',
      '11111111-1111-1111-1111-111111111111',
      'points_given',
      '22222222-2222-2222-2222-222222222221',
      '2026-03-30T19:00:00Z',
      jsonb_build_object(
        'allocationId', '55555555-5555-5555-5555-555555555551',
        'dayKey', '2026-03-30',
        'giverMemberId', '22222222-2222-2222-2222-222222222221'
      )
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from public.daily_point_allocations
    where id = '55555555-5555-5555-5555-555555555552'
  ) then
    insert into public.daily_point_allocations (
      id,
      family_id,
      day_key,
      giver_member_id,
      status
    )
    values (
      '55555555-5555-5555-5555-555555555552',
      '11111111-1111-1111-1111-111111111111',
      date '2026-03-31',
      '22222222-2222-2222-2222-222222222222',
      'draft'
    );

    insert into public.daily_point_allocation_lines (
      allocation_id,
      family_id,
      receiver_member_id,
      points
    )
    values
      (
        '55555555-5555-5555-5555-555555555552',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222223',
        2
      ),
      (
        '55555555-5555-5555-5555-555555555552',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222224',
        3
      );

    update public.daily_point_allocations
    set
      status = 'finalized',
      finalized_at = '2026-03-31T19:00:00Z'
    where id = '55555555-5555-5555-5555-555555555552';

    insert into public.point_transactions (
      id,
      family_id,
      member_id,
      type,
      points_delta,
      day_key,
      daily_point_allocation_id,
      occurred_at
    )
    values
      (
        '66666666-6666-6666-6666-666666666663',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222223',
        'daily_points_received',
        2,
        date '2026-03-31',
        '55555555-5555-5555-5555-555555555552',
        '2026-03-31T19:00:00Z'
      ),
      (
        '66666666-6666-6666-6666-666666666664',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222224',
        'daily_points_received',
        3,
        date '2026-03-31',
        '55555555-5555-5555-5555-555555555552',
        '2026-03-31T19:00:00Z'
      );

    insert into public.audit_events (
      id,
      family_id,
      type,
      actor_member_id,
      occurred_at,
      metadata
    )
    values (
      '77777777-7777-7777-7777-777777777772',
      '11111111-1111-1111-1111-111111111111',
      'points_given',
      '22222222-2222-2222-2222-222222222222',
      '2026-03-31T19:00:00Z',
      jsonb_build_object(
        'allocationId', '55555555-5555-5555-5555-555555555552',
        'dayKey', '2026-03-31',
        'giverMemberId', '22222222-2222-2222-2222-222222222222'
      )
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from public.reward_purchases
    where id = '88888888-8888-8888-8888-888888888881'
  ) then
    insert into public.reward_purchases (
      id,
      family_id,
      member_id,
      reward_id,
      cost_snapshot,
      purchased_at
    )
    values (
      '88888888-8888-8888-8888-888888888881',
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222223',
      '33333333-3333-3333-3333-333333333332',
      2,
      '2026-03-31T20:00:00Z'
    );

    insert into public.point_transactions (
      id,
      family_id,
      member_id,
      type,
      points_delta,
      reward_purchase_id,
      occurred_at
    )
    values (
      '66666666-6666-6666-6666-666666666665',
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222223',
      'shop_purchase',
      -2,
      '88888888-8888-8888-8888-888888888881',
      '2026-03-31T20:00:00Z'
    );

    insert into public.audit_events (
      id,
      family_id,
      type,
      actor_member_id,
      subject_member_id,
      occurred_at,
      metadata
    )
    values (
      '77777777-7777-7777-7777-777777777773',
      '11111111-1111-1111-1111-111111111111',
      'shop_purchase_made',
      '22222222-2222-2222-2222-222222222223',
      '22222222-2222-2222-2222-222222222223',
      '2026-03-31T20:00:00Z',
      jsonb_build_object(
        'purchaseId', '88888888-8888-8888-8888-888888888881',
        'rewardId', '33333333-3333-3333-3333-333333333332',
        'cost', 2
      )
    );
  end if;
end
$$;
