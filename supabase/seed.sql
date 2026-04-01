-- Seed de demonstration pour Famigo.
-- Hypothese explicite:
-- - ce fichier sert a peupler un projet Supabase vierge avec une famille minimale ;
-- - les PIN sont haches avec `crypt(...)` pour rester compatibles avec une future verification reelle.
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
