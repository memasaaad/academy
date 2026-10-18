-- تشغيل بعد 013: إعادة التصحيح
--  1) المدرس: إعادة التصحيح التلقائي لواجب أو لمحاولة (بعد تعديل الإجابة الصحيحة في بنك الأسئلة) مع إبلاغ من تغيّرت درجته
--  2) المدرس: فتح أي محاولة مُصحَّحة وتعديل درجة أي سؤال + ملاحظة، ثم «إنهاء وإبلاغ الطالب»
--  3) الطالب: طلب إعادة تصحيح مع ملاحظة
alter table attempts add column if not exists regrade_requested_at timestamptz;
alter table attempts add column if not exists regrade_note text;
alter table attempts add column if not exists regrade_prev_score numeric;

-- (1) إعادة التصحيح التلقائي: يُعيد حساب كل الأسئلة ذات الإجابة الثابتة من مفتاح الإجابة الحالي. تُحترم الدرجات التي عدّلها المدرس يدويًا (لها سجل مراجعة).
create or replace function regrade_assignment(p_assignment uuid default null, p_attempt uuid default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare r record; ok boolean; sel text[]; cor text[]; nm numeric; changed int:=0; ids uuid[]:='{}'; olds numeric[]:='{}'; notified int:=0; i int; att attempts; title text;
begin
  if not is_admin() then raise exception 'غير مصرح'; end if;
  if p_assignment is null and p_attempt is null then raise exception 'حدد واجبًا أو محاولة'; end if;
  for r in
    select sa.id sa_id, sa.attempt_id, sa.answer, sa.auto_marks, q.id qid, q.marks, q.correct_answer, t.score
    from student_answers sa join attempts t on t.id=sa.attempt_id and t.status in('submitted','graded') and t.mode<>'photo'
    join questions q on q.id=sa.question_id
    where q.question_type not in('essay','code')
      and not exists(select 1 from essay_reviews e where e.student_answer_id=sa.id)
      and (p_attempt is null or sa.attempt_id=p_attempt) and (p_assignment is null or t.assignment_id=p_assignment)
      and (exists(select 1 from question_options o where o.question_id=q.id and o.is_correct) or coalesce(q.correct_answer#>>'{}','')<>'')
  loop
    if exists(select 1 from question_options where question_id=r.qid and is_correct) then
      select coalesce(array_agg(key order by key),'{}') into cor from question_options where question_id=r.qid and is_correct;
      if jsonb_typeof(r.answer)='array' then select coalesce(array_agg(v order by v),'{}') into sel from jsonb_array_elements_text(r.answer) v;
      elsif r.answer is null or jsonb_typeof(r.answer)='null' then sel:='{}'; else sel:=array[r.answer#>>'{}']; end if;
      ok := sel=cor;
    else
      ok := r.answer is not null and jsonb_typeof(r.answer)='string' and norm(r.answer#>>'{}')<>'' and exists(
        select 1 from unnest(string_to_array(coalesce(r.correct_answer#>>'{}',''),'|')) c where norm(c)=norm(r.answer#>>'{}'));
    end if;
    nm := case when ok then r.marks else 0 end;
    if r.auto_marks is distinct from nm then changed:=changed+1; end if;
    update student_answers set is_correct=ok, auto_marks=nm where id=r.sa_id;
    if not (r.attempt_id = any(ids)) then ids:=ids||r.attempt_id; olds:=olds||r.score; end if;
  end loop;
  for i in 1..coalesce(array_length(ids,1),0) loop
    perform recalc_attempt(ids[i]);
    select * into att from attempts where id=ids[i];
    if att.score is distinct from olds[i] and att.status='graded' then
      select a.title into title from assignments a where a.id=att.assignment_id;
      insert into notifications(kind,title,body,attempt_id,user_id,link) values('regrade','🔄 أُعيد تصحيح واجبك','تغيّرت درجتك في «'||title||'» من '||olds[i]||' إلى '||att.score,att.id,att.student_id,'/review/'||att.id);
      notified:=notified+1;
    end if;
  end loop;
  return jsonb_build_object('answers',changed,'attempts',coalesce(array_length(ids,1),0),'notified',notified);
end $$;
grant execute on function regrade_assignment(uuid, uuid) to authenticated;

-- (2) تعديل درجة أي سؤال في محاولة (يحل محل الدرجة التلقائية). يُسجَّل كمراجعة يدوية فلا تُلغيها إعادة التصحيح التلقائي لاحقًا.
create or replace function regrade_answer(p_answer uuid, p_marks numeric, p_feedback text default null) returns void language plpgsql security definer set search_path=public as $$
declare aid uuid; qm numeric; qt text; old_score numeric;
begin
  if not is_admin() then raise exception 'غير مصرح'; end if;
  select sa.attempt_id, q.marks, q.question_type into aid, qm, qt from student_answers sa join questions q on q.id=sa.question_id where sa.id=p_answer;
  if aid is null then raise exception 'إجابة غير موجودة'; end if;
  if p_marks is null or p_marks < 0 or p_marks > qm then raise exception 'الدرجة يجب أن تكون بين 0 و %', qm; end if;
  select score into old_score from attempts where id=aid;
  insert into essay_reviews(student_answer_id,marks,feedback,reviewer) values(p_answer,p_marks,nullif(trim(coalesce(p_feedback,'')),''),auth.uid())
    on conflict(student_answer_id) do update set marks=excluded.marks, feedback=excluded.feedback, reviewed_at=now(), reviewer=auth.uid();
  if qt not in('essay','code') then update student_answers set auto_marks=p_marks, is_correct=(p_marks>=qm and qm>0) where id=p_answer; end if;
  perform recalc_attempt(aid);
  update attempts set regrade_prev_score=coalesce(regrade_prev_score, old_score) where id=aid;
end $$;
grant execute on function regrade_answer(uuid, numeric, text) to authenticated;

-- إنهاء إعادة التصحيح وإبلاغ الطالب (ويُغلق طلبه إن كان قد طلب)
create or replace function finish_regrade(p_attempt uuid) returns void language plpgsql security definer set search_path=public as $$
declare t attempts; title text; txt text;
begin
  if not is_admin() then raise exception 'غير مصرح'; end if;
  select * into t from attempts where id=p_attempt; if not found then raise exception 'محاولة غير موجودة'; end if;
  select a.title into title from assignments a where a.id=t.assignment_id;
  txt := case when t.regrade_prev_score is not null and t.regrade_prev_score is distinct from t.score then 'تغيّرت درجتك في «'||title||'» من '||t.regrade_prev_score||' إلى '||t.score
              when t.regrade_requested_at is not null then 'راجع المدرس طلبك في «'||title||'» وبقيت درجتك '||t.score||' من '||t.max_score
              else 'تمت مراجعة «'||title||'»، درجتك '||t.score||' من '||t.max_score end;
  insert into notifications(kind,title,body,attempt_id,user_id,link) values('regrade', case when t.regrade_requested_at is not null then '✅ تمت مراجعة طلب إعادة التصحيح' else '🔄 أُعيد تصحيح واجبك' end, txt, t.id, t.student_id, '/review/'||t.id);
  update attempts set regrade_prev_score=null, regrade_requested_at=null, regrade_note=null where id=p_attempt;
end $$;
grant execute on function finish_regrade(uuid) to authenticated;

-- (3) الطالب: طلب إعادة تصحيح (مرة واحدة حتى يردّ المدرس)
create or replace function request_regrade(p_attempt uuid, p_note text default null) returns void language plpgsql security definer set search_path=public as $$
declare t attempts; title text; nm text;
begin
  select * into t from attempts where id=p_attempt and student_id=auth.uid() and status='graded';
  if not found then raise exception 'لا يمكن طلب إعادة التصحيح لهذه المحاولة'; end if;
  if t.regrade_requested_at is not null then raise exception 'تم إرسال طلبك بالفعل وهو قيد المراجعة'; end if;
  update attempts set regrade_requested_at=now(), regrade_note=nullif(left(trim(coalesce(p_note,'')),500),'') where id=p_attempt;
  select a.title into title from assignments a where a.id=t.assignment_id; select full_name into nm from profiles where id=t.student_id;
  insert into notifications(kind,title,body,attempt_id,link) values('regrade_request','🔄 طلب إعادة تصحيح','طلب «'||nm||'» إعادة تصحيح «'||title||'»',t.id,'/admin/grading?attempt='||t.id||'&redo=1');
end $$;
grant execute on function request_regrade(uuid, text) to authenticated;

-- تحديث تصحيح الصور: عند تعديل درجة محاولة مصحَّحة يُبلَّغ الطالب ويُغلق طلبه
create or replace function grade_photo_attempt(p_attempt uuid, p_score numeric, p_feedback text default null) returns void language plpgsql security definer set search_path=public as $$
declare t attempts; title text;
begin
  if not is_admin() then raise exception 'غير مصرح'; end if;
  select * into t from attempts where id=p_attempt and mode='photo' and status in('submitted','graded') for update;
  if not found then raise exception 'محاولة غير صالحة'; end if;
  if p_score is null or p_score < 0 or p_score > t.max_score then raise exception 'الدرجة يجب أن تكون بين 0 و %', t.max_score; end if;
  update attempts set score=p_score, photo_feedback=nullif(trim(coalesce(p_feedback,'')),''), pending_marks=0, pending_count=0, status='graded', regrade_requested_at=null, regrade_note=null where id=p_attempt;
  if t.status='graded' then
    select a.title into title from assignments a where a.id=t.assignment_id;
    insert into notifications(kind,title,body,attempt_id,user_id,link) values('regrade', case when t.regrade_requested_at is not null then '✅ تمت مراجعة طلب إعادة التصحيح' else '🔄 أُعيد تصحيح واجبك' end, 'درجتك الآن في «'||title||'»: '||p_score||' من '||t.max_score, t.id, t.student_id, '/review/'||t.id);
  end if;
end $$;
