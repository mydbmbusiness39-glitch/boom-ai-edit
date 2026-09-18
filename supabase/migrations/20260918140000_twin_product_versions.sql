-- Gate #79 product layer: twin versioning storage.
--
-- STATUS: WRITTEN, NOT APPLIED. Reported to the owner as SCHEMA_CHANGE_REQUIRED=YES
-- before any application, per the standing rule (no schema change without reporting first).
--
-- Shape chosen deliberately: one additive jsonb column, mirroring the existing
-- "prefer existing jsonb over new tables" decision used for the two-phase flow states.
-- Nothing is dropped, renamed, or rewritten; no RLS policy is altered; the twin's live
-- voice_provider_id / visual_provider_id columns remain the source of truth for the
-- ACTIVE version, so every existing code path (including the proven generation flow)
-- behaves identically before and after this migration.
--
-- v1 (the proven Gate #79 baseline) is backfilled from the twin's CURRENT columns and is
-- never overwritten: activateVersion() only ever changes which record is marked active.

alter table public.ai_twins
  add column if not exists twin_versions jsonb not null default '[]'::jsonb;

comment on column public.ai_twins.twin_versions is
  'Ordered twin version records. v1 = proven Gate #79 baseline (immutable identity fields). '
  'The row''s own voice_provider_id / visual_provider_id always describe the ACTIVE version.';

-- Backfill v1 for existing twins from their live, already-proven values.
update public.ai_twins t
   set twin_versions = jsonb_build_array(
         jsonb_build_object(
           'version', 1,
           'label', 'v1 · proven baseline',
           'status', 'proven',
           'voiceProvider', t.voice_provider::text,
           'voiceProviderId', t.voice_provider_id,
           'visualProvider', t.visual_provider::text,
           'visualProviderId', t.visual_provider_id,
           'sourceAssetPath', t.source_asset_path,
           'createdAt', coalesce(t.created_at, now()),
           'notes', 'Gate #79 end-to-end proven baseline.'
         )
       )
 where t.twin_versions = '[]'::jsonb;

-- Guard: a twin may never lose its v1 baseline, and the baseline's identity fields are
-- immutable. Enforced in the database, not only in application code.
create or replace function public.ai_twins_guard_twin_versions()
returns trigger
language plpgsql
as $$
declare
  old_baseline jsonb;
  new_baseline jsonb;
begin
  if tg_op = 'UPDATE' then
    old_baseline := (select v from jsonb_array_elements(coalesce(old.twin_versions, '[]'::jsonb)) v
                      where (v->>'version')::int = 1 limit 1);
    new_baseline := (select v from jsonb_array_elements(coalesce(new.twin_versions, '[]'::jsonb)) v
                      where (v->>'version')::int = 1 limit 1);
    if old_baseline is not null and new_baseline is null then
      raise exception 'twin_versions: the v1 baseline record may not be removed'
        using errcode = '23514';
    end if;
    if old_baseline is not null and new_baseline is not null then
      if (old_baseline->>'voiceProviderId') is distinct from (new_baseline->>'voiceProviderId')
         or (old_baseline->>'visualProviderId') is distinct from (new_baseline->>'visualProviderId') then
        raise exception 'twin_versions: the v1 baseline identity fields are immutable'
          using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ai_twins_guard_twin_versions_trg on public.ai_twins;
create trigger ai_twins_guard_twin_versions_trg
  before update on public.ai_twins
  for each row
  execute function public.ai_twins_guard_twin_versions();

-- Rollback (manual, by design): two DROP statements.
--   drop trigger if exists ai_twins_guard_twin_versions_trg on public.ai_twins;
--   alter table public.ai_twins drop column if exists twin_versions;
