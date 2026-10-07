-- تشغيل بعد 003: تفعيل الحسابات من المدرس + ملفات وفيديوهات شرح الدروس

-- ===== 1) تفعيل الحسابات =====
alter table profiles alter column active set default false;   -- الحسابات الجديدة تبدأ غير مفعّلة (الحالية تبقى كما هي)
create or replace function is_active() returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from profiles where id=auth.uid() and (active or role='admin')) $$;
grant execute on function is_active() to authenticated;

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id,full_name,phone,active) values(new.id, coalesce(new.raw_user_meta_data->>'full_name','طالب'), new.raw_user_meta_data->>'phone', false);
  if coalesce(new.raw_user_meta_data->>'by_admin','') <> '1' then
    insert into notifications(title,body,link) values('طالب جديد بانتظار التفعيل', coalesce(new.raw_user_meta_data->>'full_name','طالب')||' أنشأ حسابًا ويحتاج تفعيلك','/admin/students');
  end if;
  return new; end $$;

drop policy if exists p_as_sel on assignments;
create policy p_as_sel on assignments for select using((is_open and is_active()) or is_admin());

create or replace function start_attempt(p_assignment uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare a assignments; cur attempts; n int; nid uuid;
begin
  if not is_active() then raise exception 'حسابك بانتظار التفعيل من المدرس'; end if;
  select * into a from assignments where id=p_assignment and is_open;
  if not found then raise exception 'الواجب غير متاح'; end if;
  if a.starts_at is not null and now()<a.starts_at then raise exception 'لم يبدأ الواجب بعد'; end if;
  if a.ends_at is not null and now()>a.ends_at then raise exception 'انتهى موعد الواجب'; end if;
  select * into cur from attempts where assignment_id=p_assignment and student_id=auth.uid() and status='in_progress';
  if found then return cur.id; end if;
  select count(*) into n from attempts where assignment_id=p_assignment and student_id=auth.uid();
  if n>=a.max_attempts then raise exception 'استنفدت عدد المحاولات'; end if;
  insert into attempts(assignment_id,student_id,attempt_no) values(p_assignment,auth.uid(),n+1) returning id into nid;
  return nid;
end $$;

create or replace function get_attempt_questions(p_attempt uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'type',q.question_type,'text',q.question_text,'context',q.context_text,'code',q.code_text,'image',q.image_url,
   'group_title',q.group_title,'instruction',q.group_instruction,'marks',q.marks,'section',s.title,
   'options',(select coalesce(jsonb_agg(jsonb_build_object('key',o.key,'text',o.text) order by o.position),'[]') from question_options o where o.question_id=q.id))
   order by aq.position),'[]')
 from attempts t join assignment_questions aq on aq.assignment_id=t.assignment_id join questions q on q.id=aq.question_id
 left join question_sections s on s.id=q.section_id
 where t.id=p_attempt and is_active() and (t.student_id=auth.uid() or is_admin()) $$;

-- ===== 2) ملفات وفيديوهات شرح الدروس =====
create table if not exists lesson_resources(
  id uuid primary key default gen_random_uuid(), lesson_id uuid not null references lessons on delete cascade,
  kind text not null check(kind in('video','file','link')), title text not null,
  file_path text, url text, mime text, size_bytes bigint,
  position int not null default 0, active boolean not null default true, created_at timestamptz not null default now(),
  check (file_path is not null or url is not null));
create index if not exists lesson_resources_idx on lesson_resources(lesson_id, position);
alter table lesson_resources enable row level security;
create policy p_lr_sel on lesson_resources for select using(is_admin() or (active and is_active()));
create policy p_lr_adm on lesson_resources for all using(is_admin()) with check(is_admin());
grant select on lesson_resources to authenticated;

insert into storage.buckets(id,name,public) values('lesson-files','lesson-files',false) on conflict (id) do update set public=false;
create policy "lf read" on storage.objects for select to authenticated using (bucket_id='lesson-files' and (public.is_admin() or public.is_active()));
create policy "lf admin insert" on storage.objects for insert to authenticated with check (bucket_id='lesson-files' and public.is_admin());
create policy "lf admin update" on storage.objects for update to authenticated using (bucket_id='lesson-files' and public.is_admin());
create policy "lf admin delete" on storage.objects for delete to authenticated using (bucket_id='lesson-files' and public.is_admin());
