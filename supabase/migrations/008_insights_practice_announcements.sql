-- تشغيل بعد 007: تحليلات الطالب والمدرس + وضع التدريب + الإعلانات + تنبيهات ذكية
-- ===== 1) مجموعات الطلاب =====
alter table profiles add column if not exists group_name text;

-- ===== 2) الإعلانات =====
create table if not exists announcements(
  id uuid primary key default gen_random_uuid(), title text not null, body text,
  audience text not null default 'all' check(audience in('all','track','chapter','lesson','group')),
  track_id uuid references tracks on delete cascade, chapter_id uuid references chapters on delete cascade, lesson_id uuid references lessons on delete cascade,
  group_name text, created_at timestamptz not null default now());
alter table announcements enable row level security;
create or replace function my_group() returns text language sql stable security definer set search_path=public as $$ select group_name from profiles where id=auth.uid() $$;
grant execute on function my_group() to authenticated;
drop policy if exists p_an_sel on announcements; drop policy if exists p_an_adm on announcements;
create policy p_an_sel on announcements for select using(is_admin() or (is_active() and (audience<>'group' or group_name=my_group())));
create policy p_an_adm on announcements for all using(is_admin()) with check(is_admin());
grant select on announcements to authenticated;
-- إشعار للطلاب عند نشر إعلان (المجموعة: أعضاؤها فقط، غير ذلك: كل الطلاب المفعّلين)
create or replace function notify_announcement() returns trigger language plpgsql security definer set search_path=public as $$
declare lk text; tid uuid;
begin
  tid := coalesce(new.track_id, (select track_id from chapters where id=coalesce(new.chapter_id,(select chapter_id from lessons where id=new.lesson_id))));
  lk := case when tid is not null then '/tracks/'||tid when new.audience in('chapter','lesson') then '/learn' else '/dashboard' end;
  insert into notifications(kind,title,body,user_id,link)
  select 'announcement','📢 '||new.title, left(coalesce(new.body,''),140), p.id, lk from profiles p
  where p.role='student' and p.active and (new.audience<>'group' or p.group_name=new.group_name);
  return new; end $$;
drop trigger if exists trg_notify_announcement on announcements;
create trigger trg_notify_announcement after insert on announcements for each row execute function notify_announcement();

-- ===== 3) تحليلات الطالب =====
create or replace function my_analytics() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare uid uuid := auth.uid(); res jsonb;
begin
  with best as (
    select distinct on (a.assignment_id) a.assignment_id, round(100*a.score/nullif(a.max_score,0)) p
    from attempts a where a.student_id=uid and a.status<>'in_progress' order by a.assignment_id, a.score/nullif(a.max_score,0) desc nulls last),
  ans as (
    select q.lesson_id, l.title ltitle, c.title ctitle, sa.is_correct
    from student_answers sa join attempts t on t.id=sa.attempt_id and t.student_id=uid and t.status<>'in_progress'
    join questions q on q.id=sa.question_id join lessons l on l.id=q.lesson_id join chapters c on c.id=l.chapter_id where sa.is_correct is not null),
  topics as (select lesson_id, ltitle, ctitle, count(*) n, count(*) filter(where is_correct) ok from ans group by 1,2,3)
  select jsonb_build_object(
    'avg', (select round(avg(p)) from best), 'assignments_done', (select count(*) from best),
    'assignments_total', (select count(*) from assignments where is_open),
    'lessons_done', (select count(*) from lesson_progress where student_id=uid),
    'lessons_total', (select count(*) from lessons l join chapters c on c.id=l.chapter_id where l.active and c.active),
    'questions', (select count(*) from ans), 'correct', (select count(*) from ans where is_correct), 'wrong', (select count(*) from ans where not is_correct),
    'topics', coalesce((select jsonb_agg(jsonb_build_object('id',lesson_id,'title',ltitle,'chapter',ctitle,'n',n,'pct',round(100.0*ok/n)) order by 100.0*ok/n) from topics),'[]'::jsonb),
    'timeline', coalesce((select jsonb_agg(jsonb_build_object('t',submitted_at,'p',round(100*score/nullif(max_score,0))) order by submitted_at) from attempts where student_id=uid and status<>'in_progress' and max_score>0),'[]'::jsonb)
  ) into res;
  return res;
end $$;
grant execute on function my_analytics() to authenticated;

-- ===== 4) تحليلات المدرس =====
create or replace function admin_insights() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare res jsonb;
begin
  if not is_admin() then raise exception 'غير مصرح'; end if;
  with st as (select id, full_name, active, created_at, coalesce(last_login_at,last_seen_at) seen from profiles where role='student'),
  best as (select distinct on (a.student_id,a.assignment_id) a.student_id, a.assignment_id, 100*a.score/nullif(a.max_score,0) p from attempts a where a.status<>'in_progress' and a.max_score>0 order by a.student_id,a.assignment_id,a.score/nullif(a.max_score,0) desc nulls last),
  avgs as (select student_id, round(avg(p)) a, count(*) n from best group by 1),
  seq as (select a.student_id, 100*a.score/nullif(a.max_score,0) p, row_number() over(partition by a.student_id order by a.submitted_at desc) rn from attempts a where a.status<>'in_progress' and a.max_score>0),
  trend as (select student_id, avg(p) filter(where rn<=2) recent, avg(p) filter(where rn>2) older, count(*) n from seq group by 1),
  hard as (select question_id, question_text, answered, round(100.0*wrong/nullif(correct+wrong,0)) wr from question_stats where correct+wrong>=5)
  select jsonb_build_object(
    'students', (select count(*) from st), 'activated', (select count(*) from st where active),
    'active7', (select count(*) from st where seen > now() - interval '7 days'),
    'assignments', (select count(*) from assignments), 'pending', (select count(*) from attempts where status='submitted'),
    'avg', (select round(avg(p)) from best),
    'top', coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.full_name,'avg',v.a,'n',v.n) order by v.a desc, v.n desc) from (select * from avgs order by a desc, n desc limit 5) v join st s on s.id=v.student_id),'[]'::jsonb),
    'low', coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.full_name,'avg',v.a) order by v.a) from avgs v join st s on s.id=v.student_id where v.a<50),'[]'::jsonb),
    'declining', coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.full_name,'from',round(t.older),'to',round(t.recent)) order by t.older-t.recent desc) from trend t join st s on s.id=t.student_id where t.n>=3 and t.older-t.recent>=15),'[]'::jsonb),
    'inactive', coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',full_name,'seen',seen) order by seen nulls first) from st where active and coalesce(seen,created_at) < now() - interval '14 days'),'[]'::jsonb),
    'hard', coalesce((select jsonb_agg(jsonb_build_object('id',question_id,'text',left(question_text,90),'wrong',wr,'n',answered) order by wr desc) from (select * from hard where wr>=60 order by wr desc limit 5) h),'[]'::jsonb),
    'ended', coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'ends_at',ends_at) order by ends_at desc) from assignments where is_open and ends_at between now() - interval '3 days' and now()),'[]'::jsonb)
  ) into res;
  return res;
end $$;
grant execute on function admin_insights() to authenticated;

-- ===== 5) وضع التدريب (بدون محاولة رسمية) =====
create or replace function lesson_question_counts(p_ids uuid[]) returns table(lesson_id uuid, n bigint) language sql stable security definer set search_path=public as $$
  select q.lesson_id, count(*) from questions q where q.active and q.lesson_id = any(p_ids) and is_active() group by 1 $$;
grant execute on function lesson_question_counts(uuid[]) to authenticated;
create or replace function practice_questions(p_lesson uuid) returns jsonb language sql stable security definer set search_path=public as $$
  select case when not is_active() then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'type',q.question_type,'text',q.question_text,'context',q.context_text,'code',q.code_text,'image',q.image_url,'instruction',q.group_instruction,
    'options',(select coalesce(jsonb_agg(jsonb_build_object('key',o.key,'text',o.text) order by o.position),'[]'::jsonb) from question_options o where o.question_id=q.id)) order by q.position)
    from questions q where q.lesson_id=p_lesson and q.active),'[]'::jsonb) end $$;
grant execute on function practice_questions(uuid) to authenticated;
create or replace function practice_check(p_question uuid, p_answer jsonb) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare r questions; ok boolean; sel text[]; cor text[]; shown jsonb;
begin
  if not is_active() then raise exception 'غير مصرح'; end if;
  select * into r from questions where id=p_question and active; if not found then raise exception 'سؤال غير موجود'; end if;
  if r.question_type in('essay','code') then return jsonb_build_object('graded',false,'model',r.model_answer,'explanation',r.explanation); end if;
  if exists(select 1 from question_options where question_id=r.id and is_correct) then
    select coalesce(array_agg(key order by key),'{}') into cor from question_options where question_id=r.id and is_correct;
    if jsonb_typeof(p_answer)='array' then select coalesce(array_agg(v order by v),'{}') into sel from jsonb_array_elements_text(p_answer) v;
    elsif p_answer is null or jsonb_typeof(p_answer)='null' then sel:='{}'; else sel:=array[p_answer#>>'{}']; end if;
    ok := sel=cor;
    select coalesce(jsonb_agg(jsonb_build_object('key',key,'text',text) order by position),'[]'::jsonb) into shown from question_options where question_id=r.id and is_correct;
  else
    ok := p_answer is not null and jsonb_typeof(p_answer)='string' and norm(p_answer#>>'{}')<>'' and exists(select 1 from unnest(string_to_array(coalesce(r.correct_answer#>>'{}',''),'|')) c where norm(c)=norm(p_answer#>>'{}'));
    shown := to_jsonb(replace(coalesce(r.correct_answer#>>'{}',''),'|',' / '));
  end if;
  return jsonb_build_object('graded',true,'correct',ok,'answer',shown,'explanation',r.explanation,'model',r.model_answer);
end $$;
grant execute on function practice_check(uuid,jsonb) to authenticated;

-- ===== 6) تنبيهات ذكية تلقائية =====
-- (أ) للمدرس: طالب جديد
create or replace function notify_new_student() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.role='student' then insert into notifications(kind,title,body,link) values('student','طالب جديد','سجّل «'||new.full_name||'» ويحتاج إلى تفعيل الحساب','/admin/students'); end if;
  return new; end $$;
drop trigger if exists trg_notify_new_student on profiles;
create trigger trg_notify_new_student after insert on profiles for each row execute function notify_new_student();
-- (ب) للطالب: انخفاض الدرجة / درجة كاملة (عند اكتمال التصحيح)
create or replace function notify_result_insights() returns trigger language plpgsql security definer set search_path=public as $$
declare p numeric; prior numeric; cnt int; t text;
begin
  if new.max_score>0 then
    p := 100*new.score/new.max_score; select title into t from assignments where id=new.assignment_id;
    if p>=100 then insert into notifications(kind,title,body,attempt_id,user_id,link) values('achievement','🏆 درجة كاملة!','حصلت على الدرجة النهائية في «'||t||'»',new.id,new.student_id,'/review/'||new.id); end if;
    select avg(100*score/nullif(max_score,0)), count(*) into prior, cnt from attempts where student_id=new.student_id and status='graded' and id<>new.id and max_score>0;
    if cnt>=2 and prior-p>=20 then insert into notifications(kind,title,body,attempt_id,user_id,link) values('warning','📉 انخفضت درجتك','نتيجتك في «'||t||'» أقل من مستواك المعتاد. راجع أخطاءك وجرّب التدريب.',new.id,new.student_id,'/review/'||new.id); end if;
  end if; return new; end $$;
drop trigger if exists trg_notify_result_insights on attempts;
create trigger trg_notify_result_insights after update on attempts for each row when (old.status<>'graded' and new.status='graded') execute function notify_result_insights();
-- (ج) للطالب: ظهور فصل جديد (عند إظهار فصل كان مخفيًا)
create or replace function notify_chapter_open() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into notifications(kind,title,body,user_id,link)
  select 'chapter','📖 فصل جديد','تم فتح «'||new.title||'»', p.id, case when new.track_id is not null then '/tracks/'||new.track_id else '/learn' end from profiles p where p.role='student' and p.active;
  return new; end $$;
drop trigger if exists trg_notify_chapter_open on chapters;
create trigger trg_notify_chapter_open after update on chapters for each row when (old.active=false and new.active=true) execute function notify_chapter_open();
-- (د) للطالب: إنهاء فصل (إنجاز)
create or replace function notify_progress_milestones() returns trigger language plpgsql security definer set search_path=public as $$
declare ch chapters; left_ch int;
begin
  select c.* into ch from lessons l join chapters c on c.id=l.chapter_id where l.id=new.lesson_id;
  select count(*) into left_ch from lessons l where l.chapter_id=ch.id and l.active and not exists(select 1 from lesson_progress p where p.student_id=new.student_id and p.lesson_id=l.id);
  if left_ch=0 and not exists(select 1 from notifications where user_id=new.student_id and kind='achievement' and body='أنهيت «'||ch.title||'»') then
    insert into notifications(kind,title,body,user_id,link) values('achievement','🎉 أنهيت فصلًا كاملًا','أنهيت «'||ch.title||'»',new.student_id,case when ch.track_id is not null then '/tracks/'||ch.track_id else '/learn' end); end if;
  return new; end $$;
drop trigger if exists trg_notify_milestones on lesson_progress;
create trigger trg_notify_milestones after insert on lesson_progress for each row execute function notify_progress_milestones();
