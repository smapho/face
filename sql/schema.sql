-- 顔認証出退勤アプリ用スキーマ
-- Supabase の SQL Editor でそのまま実行してください

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  descriptor jsonb not null, -- face-api.js の128次元特徴量ベクトル
  created_at timestamptz not null default now()
);

create table if not exists attendance_logs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  type text not null check (type in ('clock_in', 'clock_out')),
  created_at timestamptz not null default now()
);

create index if not exists idx_attendance_employee_created
  on attendance_logs (employee_id, created_at desc);

-- Row Level Security
alter table employees enable row level security;
alter table attendance_logs enable row level security;

-- MVP: anon キーで読み書き可能にする(社内利用・低リスク想定)。
-- 本番運用では Supabase Auth 等で書き込みを制限することを推奨します。
create policy "allow anon select employees" on employees
  for select using (true);
create policy "allow anon insert employees" on employees
  for insert with check (true);

create policy "allow anon select attendance_logs" on attendance_logs
  for select using (true);
create policy "allow anon insert attendance_logs" on attendance_logs
  for insert with check (true);
