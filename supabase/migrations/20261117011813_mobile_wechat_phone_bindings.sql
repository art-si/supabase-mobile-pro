create schema if not exists mobile_identity_private;
revoke all on schema mobile_identity_private from public, anon, authenticated;
grant usage on schema mobile_identity_private to service_role;

create table mobile_identity_private.wechat_phone_bindings (
  app text not null check (app in ('shipper', 'smis')),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  phone_digest text not null check (phone_digest ~ '^[a-f0-9]{64}$'),
  bound_at timestamptz not null default now(),
  primary key (app, auth_user_id),
  unique (app, phone_digest)
);

alter table mobile_identity_private.wechat_phone_bindings enable row level security;
revoke all on mobile_identity_private.wechat_phone_bindings from public, anon, authenticated;
grant select, insert, update on mobile_identity_private.wechat_phone_bindings to service_role;

create function public.mobile_wechat_phone_account(p_app text, p_digest text)
returns uuid
language sql stable security invoker set search_path = ''
as $$
  select auth_user_id from mobile_identity_private.wechat_phone_bindings
  where app = p_app and phone_digest = p_digest;
$$;

create function public.bind_mobile_wechat_phone(p_app text, p_digest text, p_account uuid)
returns void
language sql security invoker set search_path = ''
as $$
  insert into mobile_identity_private.wechat_phone_bindings (app, phone_digest, auth_user_id)
  values (p_app, p_digest, p_account)
  on conflict (app, auth_user_id) do update
    set phone_digest = excluded.phone_digest, bound_at = now();
$$;

revoke execute on function public.mobile_wechat_phone_account(text, text) from public, anon, authenticated;
revoke execute on function public.bind_mobile_wechat_phone(text, text, uuid) from public, anon, authenticated;
grant execute on function public.mobile_wechat_phone_account(text, text) to service_role;
grant execute on function public.bind_mobile_wechat_phone(text, text, uuid) to service_role;
