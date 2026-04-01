create or replace function public.verify_member_pin(
  p_pin text,
  p_pin_hash text
)
returns boolean
language sql
stable
set search_path = public, extensions
as $$
  select case
    when p_pin is null or p_pin_hash is null then false
    else extensions.crypt(p_pin, p_pin_hash) = p_pin_hash
  end
$$;
