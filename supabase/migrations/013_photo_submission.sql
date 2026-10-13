-- تشغيل بعد 012: تسليم حل الواجب كاملًا بالصور (يصوّر الطالب ورقته ويرفعها مرة واحدة، ويصححها المدرس بدرجة إجمالية)
alter table assignments add column if not exists allow_photo boolean not null default true;
alter table attempts add column if not exists mode text not null default 'questions' check (mode in ('questions','photo'));
alter table attempts add column if not exists photo_paths text[] not null default '{}';
alter table attempts add column if not exists photo_note text;
alter table attempts add column if not exists photo_feedback text;

-- الطالب: تسليم المحاولة الجارية كصور (الصور تُرفع أولًا إلى bucket answer-images داخل مجلده)
create or replace function submit_photo_attempt(p_attempt uuid, p_paths text[], p_note text default null) returns attempts language plpgsql security definer set search_path=public as $$
declare t attempts; a assignments; mx numeric; res attempts; p text;
begin
  select * into t from attempts where id=p_attempt and student_id=auth.uid() and status='in_progress' for update;
  if not found then raise exception 'محاولة غير صالحة'; end if;
  select * into a from assignments where id=t.assignment_id;
  if not coalesce(a.allow_photo, true) then raise exception 'تسليم الحل بالصور غير متاح لهذا الواجب'; end if;
  if p_paths is null or coalesce(array_length(p_paths,1),0) < 1 or array_length(p_paths,1) > 10 then raise exception 'ارفع من صورة إلى 10 صور'; end if;
  foreach p in array p_paths loop
    if p not like auth.uid()::text || '/%' or p like '%..%' then raise exception 'مسار صورة غير صالح'; end if;
  end loop;
  select coalesce(sum(q.marks),0) * assignment_factor(a.id) into mx from assignment_questions aq join questions q on q.id=aq.question_id where aq.assignment_id=a.id;
  update attempts set mode='photo', photo_paths=p_paths, photo_note=nullif(trim(coalesce(p_note,'')),''), status='submitted', submitted_at=now(),
    score=0, max_score=mx, pending_marks=mx, pending_count=1, correct_count=0, wrong_count=0 where id=p_attempt returning * into res;
  return res;
end $$;
grant execute on function submit_photo_attempt(uuid, text[], text) to authenticated;

-- المدرس: درجة إجمالية + ملاحظة (يرسل إشعار «تم تصحيح واجبك» تلقائيًا عبر المشغّل الموجود)
create or replace function grade_photo_attempt(p_attempt uuid, p_score numeric, p_feedback text default null) returns void language plpgsql security definer set search_path=public as $$
declare t attempts;
begin
  if not is_admin() then raise exception 'غير مصرح'; end if;
  select * into t from attempts where id=p_attempt and mode='photo' and status in('submitted','graded') for update;
  if not found then raise exception 'محاولة غير صالحة'; end if;
  if p_score is null or p_score < 0 or p_score > t.max_score then raise exception 'الدرجة يجب أن تكون بين 0 و %', t.max_score; end if;
  update attempts set score=p_score, photo_feedback=nullif(trim(coalesce(p_feedback,'')),''), pending_marks=0, pending_count=0, status='graded' where id=p_attempt;
end $$;
grant execute on function grade_photo_attempt(uuid, numeric, text) to authenticated;
