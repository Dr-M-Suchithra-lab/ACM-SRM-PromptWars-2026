-- Match the TypeScript validator exactly; numeric-to-integer casts would round fractional seconds.
alter table public.shifts add constraint shifts_exact_whole_minute_boundaries check (starts_at = date_trunc('minute', starts_at) and ends_at = date_trunc('minute', ends_at));
