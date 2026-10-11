-- تشغيل بعد 011: صفحة «حسابي» — تفضيلات الإشعارات + تعديل الاسم الشخصي (بدون فتح تعديل بقية بيانات الحساب للمستخدم)
alter table profiles add column if not exists notif_prefs jsonb not null default '{}'::jsonb;
create or replace function update_my_profile(p_full_name text default null, p_prefs jsonb default null) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'غير مصرح'; end if;
  if p_full_name is not null and (char_length(trim(p_full_name)) < 3 or char_length(trim(p_full_name)) > 80) then raise exception 'الاسم يجب أن يكون بين 3 و80 حرفًا'; end if;
  if p_prefs is not null and jsonb_typeof(p_prefs) <> 'object' then raise exception 'تفضيلات غير صالحة'; end if;
  update profiles set full_name = coalesce(nullif(trim(p_full_name), ''), full_name), notif_prefs = coalesce(p_prefs, notif_prefs) where id = auth.uid();
end $$;
grant execute on function update_my_profile(text, jsonb) to authenticated;
