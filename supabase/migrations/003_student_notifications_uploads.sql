-- تشغيل بعد 002: إشعارات الطالب + رفع صور إجابات المقالي

-- 1) إشعارات الطالب (user_id = null تعني إشعارًا للمدرس)
alter table notifications add column if not exists user_id uuid references profiles on delete cascade;
alter table notifications add column if not exists link text;
create index if not exists notifications_user_idx on notifications(user_id, read, created_at desc);
create policy p_n_stu_sel on notifications for select using(user_id = auth.uid());
create policy p_n_stu_upd on notifications for update using(user_id = auth.uid()) with check(user_id = auth.uid());

-- عند اكتمال تصحيح المدرس لواجب كان ينتظر المراجعة
create or replace function notify_graded() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into notifications(title,body,attempt_id,user_id,link)
  select 'تم تصحيح واجبك', 'تم تصحيح «'||a.title||'» — درجتك '||round(new.score::numeric,2)||' من '||round(new.max_score::numeric,2), new.id, new.student_id, '/review/'||new.id
  from assignments a where a.id=new.assignment_id;
  return new; end $$;
create trigger trg_notify_graded after update on attempts for each row
  when (old.status <> 'graded' and new.status = 'graded' and old.pending_count > 0) execute function notify_graded();

-- عند نشر واجب جديد (أو فتحه) لكل الطلاب
create or replace function notify_new_assignment() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.is_open then
    insert into notifications(title,body,user_id,link)
    select 'واجب جديد', 'تم نشر «'||new.title||'»', p.id, '/solve/'||new.id from profiles p where p.role='student' and p.active;
  end if; return new; end $$;
create trigger trg_notify_new_assignment after insert on assignments for each row execute function notify_new_assignment();
create trigger trg_notify_reopen after update on assignments for each row when (old.is_open = false and new.is_open = true) execute function notify_new_assignment();

-- 2) صور إجابات الطلاب: bucket خاص، كل طالب يكتب داخل مجلده فقط، والمدرس يقرأ الكل
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('answer-images','answer-images',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=5242880, allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create policy "ans-img insert own" on storage.objects for insert to authenticated
  with check (bucket_id='answer-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ans-img select own or admin" on storage.objects for select to authenticated
  using (bucket_id='answer-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "ans-img delete own or admin" on storage.objects for delete to authenticated
  using (bucket_id='answer-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
