-- تشغيل بعد 009: زر تصحيح تلقائي لكل الأسئلة ذات الإجابة الثابتة (المقالي والكود يبقى يدويًا) + إزالة إشعار مكرر لطالب جديد
-- 1) التصحيح التلقائي: يطبّق نفس منطق التسليم على الإجابات التي لم تُصحَّح بعد (مثلًا الواجبات التي أُوقف فيها التصحيح التلقائي)
create or replace function auto_grade_pending(p_attempt uuid default null, p_assignment uuid default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare r record; ok boolean; sel text[]; cor text[]; n int:=0; ids uuid[]:='{}'; ans jsonb;
begin
  if not is_admin() then raise exception 'غير مصرح'; end if;
  for r in
    select sa.id sa_id, sa.attempt_id, sa.answer, q.id qid, q.marks, q.correct_answer
    from student_answers sa join attempts t on t.id=sa.attempt_id and t.status='submitted'
    join questions q on q.id=sa.question_id
    where sa.auto_marks is null and q.question_type not in('essay','code')
      and not exists(select 1 from essay_reviews e where e.student_answer_id=sa.id)
      and (p_attempt is null or sa.attempt_id=p_attempt) and (p_assignment is null or t.assignment_id=p_assignment)
      and (exists(select 1 from question_options o where o.question_id=q.id and o.is_correct) or coalesce(q.correct_answer#>>'{}','')<>'')
  loop
    ans := r.answer;
    if exists(select 1 from question_options where question_id=r.qid and is_correct) then
      select coalesce(array_agg(key order by key),'{}') into cor from question_options where question_id=r.qid and is_correct;
      if jsonb_typeof(ans)='array' then select coalesce(array_agg(v order by v),'{}') into sel from jsonb_array_elements_text(ans) v;
      elsif ans is null or jsonb_typeof(ans)='null' then sel:='{}'; else sel:=array[ans#>>'{}']; end if;
      ok := sel=cor;
    else
      ok := ans is not null and jsonb_typeof(ans)='string' and norm(ans#>>'{}')<>'' and exists(
        select 1 from unnest(string_to_array(coalesce(r.correct_answer#>>'{}',''),'|')) c where norm(c)=norm(ans#>>'{}'));
    end if;
    update student_answers set is_correct=ok, auto_marks=case when ok then r.marks else 0 end where id=r.sa_id;
    n:=n+1; if not r.attempt_id=any(ids) then ids:=ids||r.attempt_id; end if;
  end loop;
  for r in select unnest(ids) a loop perform recalc_attempt(r.a); end loop;
  return jsonb_build_object('answers',n,'attempts',coalesce(array_length(ids,1),0));
end $$;
grant execute on function auto_grade_pending(uuid,uuid) to authenticated;

-- 2) handle_new_user يرسل إشعار «طالب جديد بانتظار التفعيل» بالفعل؛ نحذف المشغّل المكرر الذي أضافه 008
drop trigger if exists trg_notify_new_student on profiles;
drop function if exists notify_new_student();
