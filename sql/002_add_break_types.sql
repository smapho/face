-- 既存のSupabaseプロジェクトに「中抜け」「戻り」を追加するマイグレーション
-- SQL Editorで実行してください（sql/schema.sqlを実行済みの環境向け）

alter table attendance_logs drop constraint if exists attendance_logs_type_check;

alter table attendance_logs
  add constraint attendance_logs_type_check
  check (type in ('clock_in', 'clock_out', 'break_start', 'break_end'));
