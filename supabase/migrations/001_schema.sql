-- أكاديمية المهندس إبراهيم سعد — Schema + RLS + RPC
create extension if not exists pgcrypto;

create table profiles(
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'student' check(role in('admin','student')),
  full_name text not null, phone text, active boolean not null default true,
  created_at timestamptz not null default now());

create or replace function is_admin() returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id,full_name,phone) values(new.id, coalesce(new.raw_user_meta_data->>'full_name','طالب'), new.raw_user_meta_data->>'phone');
  return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create table chapters(id uuid primary key default gen_random_uuid(), position int not null default 0, title text not null, source_page int, active boolean not null default true);
create table lessons(id uuid primary key default gen_random_uuid(), chapter_id uuid not null references chapters on delete cascade, position int not null default 0, title text not null, source_page int, active boolean not null default true);
create table question_sections(id uuid primary key default gen_random_uuid(), lesson_id uuid not null references lessons on delete cascade, position int not null default 0, title text not null, unique(lesson_id,title));

create table questions(
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons on delete cascade,
  section_id uuid references question_sections on delete set null,
  group_title text, group_instruction text, number_in_group int,
  question_type text not null check(question_type in('mcq','true_false','fill_blank','short_answer','essay','multi_answer','code')),
  context_text text, code_text text, question_text text not null,
  correct_answer jsonb, model_answer text, explanation text,
  marks numeric not null default 1 check(marks>=0),
  source_page int, source_pdf_page int, answer_source_page int, source_book text,
  image_url text, active boolean not null default true,
  needs_review boolean not null default false, review_notes text,
  import_key text unique, position int not null default 0,
  created_at timestamptz not null default now());
create index on questions(lesson_id,position); create index on questions(question_type); create index on questions(section_id);

create table question_options(id uuid primary key default gen_random_uuid(), question_id uuid not null references questions on delete cascade, key text not null, text text not null, is_correct boolean not null default false, position int not null default 0);
create index on question_options(question_id);

create table assignments(
  id uuid primary key default gen_random_uuid(), title text not null,
  chapter_id uuid references chapters on delete set null, lesson_id uuid references lessons on delete cascade,
  starts_at timestamptz, ends_at timestamptz, is_open boolean not null default true,
  max_attempts int not null default 1 check(max_attempts>=1),
  total_marks numeric, auto_grade boolean not null default true,
  created_at timestamptz not null default now());
create table assignment_questions(assignment_id uuid references assignments on delete cascade, question_id uuid references questions on delete cascade, position int not null default 0, primary key(assignment_id,question_id));

create table attempts(
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments on delete cascade,
  student_id uuid not null references profiles on delete cascade,
  attempt_no int not null default 1, status text not null default 'in_progress' check(status in('in_progress','submitted','graded')),
  started_at timestamptz not null default now(), submitted_at timestamptz,
  score numeric not null default 0, max_score numeric not null default 0, pending_marks numeric not null default 0,
  correct_count int not null default 0, wrong_count int not null default 0, pending_count int not null default 0,
  unique(assignment_id,student_id,attempt_no));
create index on attempts(student_id); create index on attempts(assignment_id);

create table student_answers(
  id uuid primary key default gen_random_uuid(), attempt_id uuid not null references attempts on delete cascade,
  question_id uuid not null references questions on delete cascade, answer jsonb,
  is_correct boolean, auto_marks numeric, updated_at timestamptz not null default now(),
  unique(attempt_id,question_id));
create table essay_reviews(id uuid primary key default gen_random_uuid(), student_answer_id uuid not null unique references student_answers on delete cascade, marks numeric not null default 0, feedback text, reviewer uuid references profiles, reviewed_at timestamptz not null default now());

-- ===== RLS =====
alter table profiles enable row level security; alter table chapters enable row level security; alter table lessons enable row level security;
alter table question_sections enable row level security; alter table questions enable row level security; alter table question_options enable row level security;
alter table assignments enable row level security; alter table assignment_questions enable row level security; alter table attempts enable row level security;
alter table student_answers enable row level security; alter table essay_reviews enable row level security;

create policy p_prof_sel on profiles for select using(id=auth.uid() or is_admin());
create policy p_prof_adm on profiles for all using(is_admin()) with check(is_admin());
create policy p_ch_sel on chapters for select using(active or is_admin());
create policy p_ch_adm on chapters for all using(is_admin()) with check(is_admin());
create policy p_ls_sel on lessons for select using(active or is_admin());
create policy p_ls_adm on lessons for all using(is_admin()) with check(is_admin());
create policy p_sec_adm on question_sections for all using(is_admin()) with check(is_admin());
-- الأسئلة والخيارات (وفيها الإجابات الصحيحة) للمدرس فقط؛ الطالب يصل لها عبر RPC بدون إجابات
create policy p_q_adm on questions for all using(is_admin()) with check(is_admin());
create policy p_qo_adm on question_options for all using(is_admin()) with check(is_admin());
create policy p_as_sel on assignments for select using(is_open or is_admin());
create policy p_as_adm on assignments for all using(is_admin()) with check(is_admin());
create policy p_aq_adm on assignment_questions for all using(is_admin()) with check(is_admin());
create policy p_at_sel on attempts for select using(student_id=auth.uid() or is_admin());
create policy p_at_adm on attempts for all using(is_admin()) with check(is_admin());
create policy p_sa_sel on student_answers for select using(is_admin() or exists(select 1 from attempts a where a.id=attempt_id and a.student_id=auth.uid()));
create policy p_sa_ins on student_answers for insert with check(exists(select 1 from attempts a where a.id=attempt_id and a.student_id=auth.uid() and a.status='in_progress'));
create policy p_sa_upd on student_answers for update using(exists(select 1 from attempts a where a.id=attempt_id and a.student_id=auth.uid() and a.status='in_progress')) with check(exists(select 1 from attempts a where a.id=attempt_id and a.student_id=auth.uid() and a.status='in_progress'));
create policy p_sa_adm on student_answers for all using(is_admin()) with check(is_admin());
create policy p_er_sel on essay_reviews for select using(is_admin() or exists(select 1 from student_answers s join attempts a on a.id=s.attempt_id where s.id=student_answer_id and a.student_id=auth.uid()));
create policy p_er_adm on essay_reviews for all using(is_admin()) with check(is_admin());
-- الطالب لا يملك صلاحية كتابة is_correct / auto_marks
revoke insert,update on student_answers from authenticated, anon;
grant insert(attempt_id,question_id,answer,updated_at), update(answer,updated_at) on student_answers to authenticated;
grant select on all tables in schema public to authenticated; grant select on chapters,lessons to anon;

-- ===== دوال =====
create or replace function norm(t text) returns text language sql immutable as $$
 select lower(trim(regexp_replace(translate(regexp_replace(coalesce(t,''),'[\u064B-\u0652\u0640]','','g'),'أإآىة','ااايه'),'\s+',' ','g'))) $$;

create or replace function assignment_factor(p_a uuid) returns numeric language sql stable security definer set search_path=public as $$
 select coalesce(nullif(a.total_marks,0)/nullif((select sum(q.marks) from assignment_questions aq join questions q on q.id=aq.question_id where aq.assignment_id=a.id),0),1) from assignments a where a.id=p_a $$;

create or replace function recalc_attempt(p_attempt uuid) returns void language plpgsql security definer set search_path=public as $$
declare f numeric; aid uuid;
begin
  select assignment_id into aid from attempts where id=p_attempt; f:=assignment_factor(aid);
  update attempts t set
    score = coalesce(x.score,0)*f, max_score=coalesce(x.mx,0)*f,
    pending_marks=coalesce(x.pm,0)*f, pending_count=coalesce(x.pc,0),
    correct_count=coalesce(x.cc,0), wrong_count=coalesce(x.wc,0),
    status=case when t.status='in_progress' then 'in_progress' when coalesce(x.pc,0)=0 then 'graded' else 'submitted' end
  from (select
      sum(coalesce(sa.auto_marks,er.marks,0)) score, sum(q.marks) mx,
      sum(q.marks) filter(where sa.auto_marks is null and er.id is null) pm,
      count(*) filter(where sa.auto_marks is null and er.id is null) pc,
      count(*) filter(where sa.is_correct is true or (er.id is not null and er.marks>=q.marks and q.marks>0)) cc,
      count(*) filter(where sa.is_correct is false or (er.id is not null and er.marks<q.marks)) wc
    from assignment_questions aq join questions q on q.id=aq.question_id
    left join student_answers sa on sa.question_id=q.id and sa.attempt_id=p_attempt
    left join essay_reviews er on er.student_answer_id=sa.id
    where aq.assignment_id=aid) x
  where t.id=p_attempt;
end $$;

create or replace function start_attempt(p_assignment uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare a assignments; cur attempts; n int; nid uuid;
begin
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

-- أسئلة المحاولة بدون الإجابات الصحيحة
create or replace function get_attempt_questions(p_attempt uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'type',q.question_type,'text',q.question_text,'context',q.context_text,'code',q.code_text,'image',q.image_url,
   'group_title',q.group_title,'instruction',q.group_instruction,'marks',q.marks,'section',s.title,
   'options',(select coalesce(jsonb_agg(jsonb_build_object('key',o.key,'text',o.text) order by o.position),'[]') from question_options o where o.question_id=q.id))
   order by aq.position),'[]')
 from attempts t join assignment_questions aq on aq.assignment_id=t.assignment_id join questions q on q.id=aq.question_id
 left join question_sections s on s.id=q.section_id
 where t.id=p_attempt and (t.student_id=auth.uid() or is_admin()) $$;

create or replace function submit_attempt(p_attempt uuid) returns attempts language plpgsql security definer set search_path=public as $$
declare t attempts; a assignments; r record; ans jsonb; ok boolean; f numeric; sel text[]; cor text[]; res attempts;
begin
  select * into t from attempts where id=p_attempt and student_id=auth.uid() and status='in_progress' for update;
  if not found then raise exception 'محاولة غير صالحة'; end if;
  select * into a from assignments where id=t.assignment_id; f:=1;
  for r in select q.* from assignment_questions aq join questions q on q.id=aq.question_id where aq.assignment_id=t.assignment_id loop
    insert into student_answers(attempt_id,question_id) values(p_attempt,r.id) on conflict do nothing;
    select answer into ans from student_answers where attempt_id=p_attempt and question_id=r.id;
    if r.question_type in('essay','code') or not a.auto_grade then
      update student_answers set is_correct=null,auto_marks=null where attempt_id=p_attempt and question_id=r.id; continue; end if;
    if exists(select 1 from question_options where question_id=r.id and is_correct) then
      select coalesce(array_agg(key order by key),'{}') into cor from question_options where question_id=r.id and is_correct;
      if jsonb_typeof(ans)='array' then select coalesce(array_agg(v order by v),'{}') into sel from jsonb_array_elements_text(ans) v;
      elsif ans is null or jsonb_typeof(ans)='null' then sel:='{}'; else sel:=array[ans#>>'{}']; end if;
      ok := sel=cor;
    else
      ok := ans is not null and jsonb_typeof(ans)='string' and norm(ans#>>'{}')<>'' and exists(
        select 1 from unnest(string_to_array(coalesce(r.correct_answer#>>'{}',''),'|')) c where norm(c)=norm(ans#>>'{}'));
    end if;
    update student_answers set is_correct=ok, auto_marks=case when ok then r.marks else 0 end where attempt_id=p_attempt and question_id=r.id;
  end loop;
  update attempts set status='submitted', submitted_at=now() where id=p_attempt;
  perform recalc_attempt(p_attempt);
  select * into res from attempts where id=p_attempt; return res;
end $$;

create or replace function save_review(p_answer uuid, p_marks numeric, p_feedback text) returns void language plpgsql security definer set search_path=public as $$
declare aid uuid;
begin
  if not is_admin() then raise exception 'غير مصرح'; end if;
  insert into essay_reviews(student_answer_id,marks,feedback,reviewer) values(p_answer,p_marks,p_feedback,auth.uid())
   on conflict(student_answer_id) do update set marks=excluded.marks, feedback=excluded.feedback, reviewed_at=now(), reviewer=auth.uid();
  select attempt_id into aid from student_answers where id=p_answer; perform recalc_attempt(aid);
end $$;

create or replace view question_stats with(security_invoker=true) as
 select q.id question_id, q.question_text, q.lesson_id, count(sa.id) answered,
   count(*) filter(where sa.is_correct is true) correct, count(*) filter(where sa.is_correct is false) wrong
 from questions q join student_answers sa on sa.question_id=q.id join attempts a on a.id=sa.attempt_id and a.status<>'in_progress'
 group by q.id;

grant execute on function start_attempt(uuid), get_attempt_questions(uuid), submit_attempt(uuid), save_review(uuid,numeric,text) to authenticated;
revoke execute on function recalc_attempt(uuid) from public, anon, authenticated;

-- ===== Storage =====
insert into storage.buckets(id,name,public) values('question-images','question-images',true) on conflict do nothing;
create policy "q-img read" on storage.objects for select using(bucket_id='question-images');
create policy "q-img admin write" on storage.objects for all using(bucket_id='question-images' and public.is_admin()) with check(bucket_id='question-images' and public.is_admin());

-- ===== هيكل الكتاب (من الفهرس) =====
with c as (insert into chapters(position,title,source_page) values
 (1,'الفصل الأول: تكنولوجيا المعلومات والمجتمع',4),(2,'الفصل الثاني: الأمن السيبراني',31),
 (3,'الفصل الثالث: تطبيقات الويب',50),(4,'الفصل الرابع: تصميم الويب والوسائط',68) returning id,position)
insert into lessons(chapter_id,position,title,source_page)
select c.id,l.n,'الدرس '||l.n||': '||l.t,l.p from c join (values
 (1,1,'تطور تكنولوجيا المعلومات والتحول الاجتماعي',4),(1,2,'كيف يعمل الذكاء الاصطناعي',12),(1,3,'الذكاء الاصطناعي في الحياة اليومية والصناعة',18),(1,4,'القضايا الأخلاقية المتعلقة بالذكاء الاصطناعي',24),
 (2,1,'تقنيات التشفير والمصادقة',31),(2,2,'تصميم أمن الشبكات',38),(2,3,'الاستجابة للحوادث وإدارة المخاطر',44),
 (3,1,'البنية العامة لتطبيقات الويب',50),(3,2,'طرق الاتصال في تطبيقات الويب',56),(3,3,'أساسيات تكنولوجيا الواجهة الأمامية',62),
 (4,1,'أنواع الوسائط وخصائصها',68),(4,2,'تصميم المعلومات وتجربة المستخدم للمواقع',74),(4,3,'أساليب تقييم المواقع الإلكترونية',81),(4,4,'عملية التحسين التكراري للمواقع',87)
) l(ch,n,t,p) on l.ch=c.position;
