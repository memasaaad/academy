-- تشغيل بعد 005: الطلاب الأونلاين + آخر تسجيل دخول
alter table profiles add column if not exists last_seen_at timestamptz;
alter table profiles add column if not exists last_login_at timestamptz;
-- الواجهة تستدعيها كل دقيقة أثناء فتح الموقع. "دخول جديد" = تسجيل دخول صريح، أو عودة بعد غياب أكثر من 30 دقيقة.
create or replace function touch_presence(p_login boolean default false) returns void language plpgsql security definer set search_path=public as $$
begin
  update profiles set last_seen_at = now(),
    last_login_at = case when p_login or last_login_at is null or last_seen_at is null or last_seen_at < now() - interval '30 minutes' then now() else last_login_at end
  where id = auth.uid();
end $$;
grant execute on function touch_presence(boolean) to authenticated;
