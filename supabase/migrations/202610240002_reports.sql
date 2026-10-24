begin;
create function public.app_health()returns text language sql immutable set search_path='' as $$select 'mobidesk-1'::text$$;
revoke all on function public.app_health()from public;
grant execute on function public.app_health()to anon,authenticated;
create function public.app_report(p_store uuid,p_from date,p_to date)returns jsonb
language plpgsql security definer set search_path='' as $$
declare r text;result jsonb;begin
 r:=app_private.member_role(p_store);if r is null then raise exception 'Không có quyền xem báo cáo.';end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Chọn khoảng báo cáo tối đa 367 ngày.';end if;
 with docs as (
  select d.* from app_private.documents d where d.store_id=p_store
  and d.posted_at>=p_from::timestamp at time zone 'Asia/Ho_Chi_Minh'
  and d.posted_at<(p_to+1)::timestamp at time zone 'Asia/Ho_Chi_Minh'
  and (r='OWNER' or d.kind in ('SALE','SALE_RETURN') or (d.kind='PAYMENT' and exists(select 1 from app_private.documents o where o.id=d.original_id and o.kind='SALE')))
 ),days as(select generate_series(p_from::timestamp,p_to::timestamp,'1 day'::interval)::date as date_key),
 totals as(select coalesce(sum(case when kind='SALE'then total when kind='SALE_RETURN'then -total else 0 end),0)revenue,
 coalesce(sum(case when kind in ('SALE','COST')then cost when kind='SALE_RETURN'then -cost else 0 end),0)cost,
 count(*)filter(where kind='SALE')sale_count,count(*)filter(where kind='SALE_RETURN')return_count from docs),
 pay as(select coalesce(sum(p.amount)filter(where direction='IN'),0)inflow,coalesce(sum(p.amount)filter(where direction='OUT'),0)outflow,
 coalesce(sum(p.amount)filter(where direction='IN' and method='CASH'),0)cash,coalesce(sum(p.amount)filter(where direction='IN' and method='BANK'),0)bank
 from app_private.payments p join docs d on d.id=p.document_id),
 groups as(select modes.mode,coalesce(sum(case when d.kind='SALE'then l.quantity when d.kind='SALE_RETURN'then -l.quantity else 0 end),0)quantity,
 coalesce(sum(case when d.kind='SALE'then l.total when d.kind='SALE_RETURN'then -l.total else 0 end),0)revenue,
 coalesce(sum(case when d.kind='SALE'then l.cost when d.kind='SALE_RETURN'then -l.cost else 0 end),0)+
 (select coalesce(sum(c.amount),0)from app_private.device_costs c join docs cd on cd.id=c.document_id join app_private.stock_units u on u.id=c.unit_id join app_private.products cp on cp.id=u.variant_id where c.classification='AFTER_SALE'and cp.mode=modes.mode)cost
 from (values('IMEI'),('QUANTITY'),('SERIAL'))modes(mode)left join app_private.products p on p.store_id=p_store and p.mode=modes.mode
 left join app_private.document_lines l on l.variant_id=p.id left join docs d on d.id=l.document_id group by modes.mode),
 daily as(select days.date_key,coalesce(sum(case when d.kind='SALE'then d.total when d.kind='SALE_RETURN'then -d.total else 0 end),0)revenue,
 coalesce(sum(case when d.kind in ('SALE','COST')then d.cost when d.kind='SALE_RETURN'then -d.cost else 0 end),0)cost,count(d.id)filter(where d.kind='SALE')sale_count
 from days left join docs d on (d.posted_at at time zone 'Asia/Ho_Chi_Minh')::date=days.date_key group by days.date_key)
 select jsonb_build_object('revenue',totals.revenue,'cost',case when r='OWNER'then totals.cost else null end,'sale_count',totals.sale_count,'return_count',totals.return_count,
 'cash',pay.cash,'bank',pay.bank,'inflow',pay.inflow,'outflow',pay.outflow,
 'daily',(select jsonb_agg(jsonb_build_object('day',date_key,'revenue',revenue,'cost',case when r='OWNER'then cost else null end,'sale_count',sale_count)order by date_key)from daily),
 'groups',(select jsonb_agg(jsonb_build_object('mode',mode,'quantity',quantity,'revenue',revenue,'cost',case when r='OWNER'then cost else null end))from groups),
 'inventory_value',case when r='OWNER'then (select coalesce(sum(value),0)from app_private.inventory_balances where store_id=p_store)+(select coalesce(sum(cost),0)from app_private.stock_units where store_id=p_store and status in ('AVAILABLE','QUARANTINE','REPAIR','OFFLINE_RESERVED'))else null end,
 'receivables',(select coalesce(sum(greatest(0,balance)),0)from(select sum(amount)balance from app_private.party_ledger where store_id=p_store and account_side='AR'group by party_id)x),
 'payables',case when r='OWNER'then(select coalesce(sum(greatest(0,balance)),0)from(select sum(amount)balance from app_private.party_ledger where store_id=p_store and account_side='AP'group by party_id)x)else null end)
 into result from totals,pay;return result;
end $$;
revoke all on function public.app_report(uuid,date,date)from public,anon;
grant execute on function public.app_report(uuid,date,date)to authenticated;
commit;
