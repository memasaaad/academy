-- تشغيل بعد 004: مسارات البرمجة (كروت مسارات: JavaScript / Python ...) + شرح نصي للدروس + متابعة تقدم الطالب
-- فكرة التصميم: المسار = مجموعة فصول (chapters.track_id)، والفصل = أجزاء (lessons)، وامتحان الفصل = واجب (assignments.chapter_id) بدون درس.
-- المنهج الأساسي لا يتغير: فصوله track_id = null.

-- ===== 1) المسارات =====
create table if not exists tracks(
  id uuid primary key default gen_random_uuid(), title text not null, subtitle text,
  theme text not null default 'violet', position int not null default 0,
  active boolean not null default true, created_at timestamptz not null default now());
alter table tracks enable row level security;
drop policy if exists p_tr_sel on tracks; drop policy if exists p_tr_adm on tracks;
create policy p_tr_sel on tracks for select using(is_admin() or (active and is_active()));
create policy p_tr_adm on tracks for all using(is_admin()) with check(is_admin());
grant select on tracks to authenticated;

alter table chapters add column if not exists track_id uuid references tracks on delete cascade;
create index if not exists chapters_track_idx on chapters(track_id, position);

create or replace function chapter_in_track(p_chapter uuid) returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from chapters where id=p_chapter and track_id is not null) $$;
grant execute on function chapter_in_track(uuid) to anon, authenticated;
grant execute on function is_active() to anon, authenticated;

-- فصول وأجزاء المسارات تظهر للطلاب المفعّلين فقط (المنهج الأساسي كما هو)
drop policy if exists p_ch_sel on chapters;
create policy p_ch_sel on chapters for select using(is_admin() or (active and (track_id is null or is_active())));
drop policy if exists p_ls_sel on lessons;
create policy p_ls_sel on lessons for select using(is_admin() or (active and (not chapter_in_track(chapter_id) or is_active())));

-- ===== 2) شرح نصي للدرس/الجزء (بجانب الفيديوهات والملفات) =====
create table if not exists lesson_notes(
  lesson_id uuid primary key references lessons on delete cascade,
  body text not null default '', updated_at timestamptz not null default now());
alter table lesson_notes enable row level security;
drop policy if exists p_ln_sel on lesson_notes; drop policy if exists p_ln_adm on lesson_notes;
create policy p_ln_sel on lesson_notes for select using(is_admin() or is_active());
create policy p_ln_adm on lesson_notes for all using(is_admin()) with check(is_admin());
grant select on lesson_notes to authenticated;

-- ===== 3) تقدم الطالب (علامة "أنهيت هذا الجزء") =====
create table if not exists lesson_progress(
  student_id uuid not null default auth.uid() references profiles on delete cascade,
  lesson_id uuid not null references lessons on delete cascade,
  completed_at timestamptz not null default now(), primary key(student_id, lesson_id));
alter table lesson_progress enable row level security;
drop policy if exists p_lp_sel on lesson_progress; drop policy if exists p_lp_ins on lesson_progress; drop policy if exists p_lp_del on lesson_progress;
create policy p_lp_sel on lesson_progress for select using(student_id=auth.uid() or is_admin());
create policy p_lp_ins on lesson_progress for insert with check(student_id=auth.uid() and is_active());
create policy p_lp_del on lesson_progress for delete using(student_id=auth.uid());
grant select, insert, delete on lesson_progress to authenticated;
