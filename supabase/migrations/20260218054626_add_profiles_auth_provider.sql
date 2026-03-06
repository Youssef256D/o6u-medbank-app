alter table public.profiles
  add column if not exists auth_provider text;

with provider_map as (
  select
    u.id,
    lower(
      coalesce(
        (
          case
            when exists (
              select 1
              from jsonb_array_elements_text(coalesce(u.raw_app_meta_data->'providers', '[]'::jsonb)) as p(provider)
              where lower(p.provider) = 'google'
            ) then 'google'
            when exists (
              select 1
              from jsonb_array_elements_text(coalesce(u.raw_app_meta_data->'providers', '[]'::jsonb)) as p(provider)
              where lower(p.provider) = 'email'
            ) then 'email'
            else null
          end
        ),
        nullif(lower(u.raw_app_meta_data->>'provider'), ''),
        nullif(lower(u.raw_user_meta_data->>'provider'), '')
      )
    ) as provider
  from auth.users u
)
update public.profiles p
set auth_provider = pm.provider,
    updated_at = now()
from provider_map pm
where p.id = pm.id
  and pm.provider is not null
  and p.auth_provider is distinct from pm.provider;;
