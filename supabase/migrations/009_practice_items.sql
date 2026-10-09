-- تشغيل بعد 008: وضع التدريب لمسارات البرمجة فقط، بأسئلة وإجابات يضيفها المدرس داخل كل جزء (منفصلة عن بنك أسئلة الواجبات)
-- + إزالة إشعار شهادة الإتمام
create table if not exists practice_items(
  id uuid primary key default gen_random_uuid(), lesson_id uuid not null references lessons on delete cascade,
  kind text not null default 'mcq' check(kind in('mcq','multi','true_false','text')),
  question text not null, options jsonb not null default '[]'::jsonb, correct jsonb not null default '[]'::jsonb,
  explanation text, position int not null default 0, created_at timestamptz not null default now());
create index if not exists practice_items_lesson_idx on practice_items(lesson_id, position);
alter table practice_items enable row level security;
drop policy if exists p_pi_adm on practice_items;
create policy p_pi_adm on practice_items for all using(is_admin()) with check(is_admin());  -- الطالب لا يقرأ الجدول مباشرة (الإجابات مخفية) بل عبر الدوال أدناه

create or replace function lesson_question_counts(p_ids uuid[]) returns table(lesson_id uuid, n bigint) language sql stable security definer set search_path=public as $$
  select p.lesson_id, count(*) from practice_items p join lessons l on l.id=p.lesson_id where p.lesson_id = any(p_ids) and chapter_in_track(l.chapter_id) and is_active() group by 1 $$;
create or replace function practice_questions(p_lesson uuid) returns jsonb language sql stable security definer set search_path=public as $$
  select case when not is_active() or not exists(select 1 from lessons l where l.id=p_lesson and chapter_in_track(l.chapter_id)) then '[]'::jsonb
  else coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'type',case p.kind when 'multi' then 'multi_answer' when 'text' then 'fill_blank' else p.kind end,'text',p.question,'options',p.options) order by p.position, p.created_at) from practice_items p where p.lesson_id=p_lesson),'[]'::jsonb) end $$;
create or replace function practice_check(p_question uuid, p_answer jsonb) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare r practice_items; ok boolean; sel text[]; cor text[]; shown jsonb;
begin
  if not is_active() then raise exception 'غير مصرح'; end if;
  select * into r from practice_items where id=p_question; if not found then raise exception 'سؤال غير موجود'; end if;
  if r.kind='text' then
    ok := p_answer is not null and jsonb_typeof(p_answer)='string' and norm(p_answer#>>'{}')<>'' and exists(select 1 from jsonb_array_elements_text(r.correct) c where norm(c)=norm(p_answer#>>'{}'));
    select to_jsonb(string_agg(c,' / ')) into shown from jsonb_array_elements_text(r.correct) c;
  else
    select coalesce(array_agg(v order by v),'{}') into cor from jsonb_array_elements_text(r.correct) v;
    if jsonb_typeof(p_answer)='array' then select coalesce(array_agg(v order by v),'{}') into sel from jsonb_array_elements_text(p_answer) v;
    elsif p_answer is null or jsonb_typeof(p_answer)='null' then sel:='{}'; else sel:=array[p_answer#>>'{}']; end if;
    ok := sel=cor;
    select coalesce(jsonb_agg(o),'[]'::jsonb) into shown from jsonb_array_elements(r.options) o where (o->>'key') = any(cor);
  end if;
  return jsonb_build_object('graded',true,'correct',ok,'answer',shown,'explanation',r.explanation);
end $$;

-- إزالة شهادة الإتمام: تبقى إشعارات إنهاء الفصل فقط
create or replace function notify_progress_milestones() returns trigger language plpgsql security definer set search_path=public as $$
declare ch chapters; left_ch int;
begin
  select c.* into ch from lessons l join chapters c on c.id=l.chapter_id where l.id=new.lesson_id;
  select count(*) into left_ch from lessons l where l.chapter_id=ch.id and l.active and not exists(select 1 from lesson_progress p where p.student_id=new.student_id and p.lesson_id=l.id);
  if left_ch=0 and not exists(select 1 from notifications where user_id=new.student_id and kind='achievement' and body='أنهيت «'||ch.title||'»') then
    insert into notifications(kind,title,body,user_id,link) values('achievement','🎉 أنهيت فصلًا كاملًا','أنهيت «'||ch.title||'»',new.student_id,case when ch.track_id is not null then '/tracks/'||ch.track_id else '/learn' end); end if;
  return new; end $$;
