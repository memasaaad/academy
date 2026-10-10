-- تشغيل بعد 006: تحديث لحظي لآخر تسجيل دخول في لوحة المدرس (الأونلاين نفسه يعمل عبر Realtime Presence بدون إعداد إضافي)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
