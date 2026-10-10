-- تشغيل بعد 010: إشعارات الموبايل (Web Push) — حفظ اشتراكات الأجهزة
create table if not exists push_subscriptions(
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references profiles on delete cascade,
  endpoint text not null unique, p256dh text not null, auth text not null, created_at timestamptz not null default now());
create index if not exists push_subscriptions_user_idx on push_subscriptions(user_id);
alter table push_subscriptions enable row level security;
drop policy if exists p_ps_own on push_subscriptions;
create policy p_ps_own on push_subscriptions for all using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select, insert, update, delete on push_subscriptions to authenticated;
