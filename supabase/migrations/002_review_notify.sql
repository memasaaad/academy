-- تشغيل بعد 001: إشعارات المدرس + مراجعة حل الطالب + إصلاح صلاحيات الحفظ التلقائي
grant update(attempt_id,question_id) on student_answers to authenticated;

create table notifications(
  id uuid primary key default gen_random_uuid(), kind text not null default 'submit', title text not null, body text,
  attempt_id uuid references attempts on delete cascade, read boolean not null default false, created_at timestamptz not null default now());
create index on notifications(read,created_at desc);
alter table notifications enable row level security;
create policy p_n_adm on notifications for all using(is_admin()) with check(is_admin());
grant select,update,delete on notifications to authenticated;

create or replace function notify_submit() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.status='in_progress' and new.status<>'in_progress' then
    insert into notifications(title,body,attempt_id)
    select 'تم تسليم واجب', p.full_name||' سلّم «'||a.title||'»', new.id from profiles p, assignments a where p.id=new.student_id and a.id=new.assignment_id;
  end if; return new; end $$;
create trigger trg_notify_submit after update on attempts for each row execute function notify_submit();
alter publication supabase_realtime add table notifications;

-- مراجعة الحل: للطالب (بعد إعلان النتيجة) وللمدرس دائمًا
create or replace function get_attempt_review(p_attempt uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare t attempts; a assignments; adm boolean := is_admin();
begin
  select * into t from attempts where id=p_attempt;
  if not found then raise exception 'غير موجود'; end if;
  if t.student_id<>auth.uid() and not adm then raise exception 'غير مصرح'; end if;
  if t.status='in_progress' then raise exception 'لم يتم التسليم بعد'; end if;
  select * into a from assignments where id=t.assignment_id;
  if not adm and t.status<>'graded' and not a.auto_grade then raise exception 'النتيجة لم تُعلن بعد — بانتظار تصحيح المدرس'; end if;
  return jsonb_build_object('attempt',to_jsonb(t),'title',a.title,'auto',a.auto_grade,'student',(select full_name from profiles where id=t.student_id),
   'items',coalesce((select jsonb_agg(jsonb_build_object(
     'id',q.id,'type',q.question_type,'text',q.question_text,'context',q.context_text,'code',q.code_text,'image',q.image_url,'marks',q.marks,
     'options',(select coalesce(jsonb_agg(jsonb_build_object('key',o.key,'text',o.text,'correct',o.is_correct) order by o.position),'[]'::jsonb) from question_options o where o.question_id=q.id),
     'answer',sa.answer,'is_correct',sa.is_correct,'pending',(sa.id is null or (sa.auto_marks is null and er.id is null)),
     'earned',coalesce(sa.auto_marks,er.marks),'feedback',er.feedback,
     'correct_answer',case when q.question_type in('fill_blank','short_answer') then q.correct_answer end,
     'model_answer',q.model_answer,'explanation',q.explanation) order by aq.position)
     from assignment_questions aq join questions q on q.id=aq.question_id
     left join student_answers sa on sa.question_id=q.id and sa.attempt_id=p_attempt
     left join essay_reviews er on er.student_answer_id=sa.id where aq.assignment_id=t.assignment_id),'[]'::jsonb));
end $$;
grant execute on function get_attempt_review(uuid) to authenticated;
