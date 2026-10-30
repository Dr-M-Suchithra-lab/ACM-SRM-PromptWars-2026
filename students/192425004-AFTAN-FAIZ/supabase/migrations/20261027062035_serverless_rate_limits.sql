create table private.rate_limit_buckets (
 bucket_key text not null check(length(bucket_key)=64),
 scope text not null check(scope in ('api','login','safety_submit','safety_track','assistant')),
 window_start timestamptz not null,
 requests integer not null check(requests>0),
 expires_at timestamptz not null,
 primary key(bucket_key,scope,window_start)
);
alter table private.rate_limit_buckets enable row level security;
revoke all on private.rate_limit_buckets from public,anon,authenticated;
create index rate_limit_expiry on private.rate_limit_buckets(expires_at);
create function private.consume_rate_limit(p_key text,p_scope text) returns jsonb language plpgsql security definer set search_path='' as $$
declare seconds integer; maximum integer; beginning timestamptz; count_now integer;
begin
 if not exists(select 1 from private.gateway_accounts where user_id=auth.uid()) then raise exception 'Forbidden'; end if;
 if p_key !~ '^[a-f0-9]{64}$' then raise exception 'Invalid bucket'; end if;
 case p_scope
 when 'api' then seconds:=60;maximum:=120;
 when 'login' then seconds:=900;maximum:=30;
 when 'safety_submit' then seconds:=900;maximum:=15;
 when 'safety_track' then seconds:=900;maximum:=90;
 when 'assistant' then seconds:=900;maximum:=45;
 else raise exception 'Invalid rate scope';
 end case;
 beginning:=to_timestamp(floor(extract(epoch from now())/seconds)*seconds);
 -- Remove expired buckets opportunistically, using the expiry index. No background process required.
 delete from private.rate_limit_buckets where expires_at<now()-interval '1 hour';
 insert into private.rate_limit_buckets(bucket_key,scope,window_start,requests,expires_at)
 values(p_key,p_scope,beginning,1,beginning+make_interval(secs=>seconds))
 on conflict(bucket_key,scope,window_start) do update set requests=least(private.rate_limit_buckets.requests+1,maximum+1)
 returning requests into count_now;
 return jsonb_build_object('allowed',count_now<=maximum,'retryAfter',greatest(1,ceil(extract(epoch from(beginning+make_interval(secs=>seconds)-now())))));
end $$;
revoke all on function private.consume_rate_limit(text,text) from public,anon;
grant execute on function private.consume_rate_limit(text,text) to authenticated;
create function public.consume_rate_limit(p_key text,p_scope text) returns jsonb language sql security invoker set search_path='' as $$ select private.consume_rate_limit(p_key,p_scope) $$;
revoke all on function public.consume_rate_limit(text,text) from public,anon;
grant execute on function public.consume_rate_limit(text,text) to authenticated;
