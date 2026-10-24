begin;
create function public.app_history(p_store uuid,p_query text default '',p_kind text default 'ALL',p_offset integer default 0)returns jsonb
language plpgsql security definer set search_path='' as $$
declare r text;result jsonb;begin
 r:=app_private.member_role(p_store);if r is null then raise exception 'Không có quyền xem lịch sử.';end if;
 if p_offset<0 or length(p_query)>160 then raise exception 'Bộ lọc không hợp lệ.';end if;
 select coalesce(jsonb_agg(body order by posted_at desc,id desc),'[]')into result from(
 select d.posted_at,d.id,(case when r='OWNER'then to_jsonb(d)-'store_id'-'actor_id'else to_jsonb(d)-'store_id'-'actor_id'-'cost'end)||jsonb_build_object('party_name',coalesce(p.name,'Khách lẻ'),
 'balance',(select coalesce(sum(amount),0)from app_private.party_ledger where store_id=p_store and target_document_id=d.id),
 'payments',(select coalesce(jsonb_agg(jsonb_build_object('method',method,'direction',direction,'amount',amount)),'[]')from app_private.payments where store_id=p_store and document_id=d.id),
 'lines',(select coalesce(jsonb_agg((case when r='OWNER'then to_jsonb(l)-'store_id'-'document_id'else to_jsonb(l)-'store_id'-'document_id'-'cost'end)||jsonb_build_object('identifier',coalesce(u.identifier,''),'returned',(select coalesce(sum(quantity),0)from app_private.document_lines where store_id=p_store and original_line_id=l.id))),'[]')from app_private.document_lines l left join app_private.stock_units u on u.id=l.unit_id where l.store_id=p_store and l.document_id=d.id))body
 from app_private.documents d left join app_private.parties p on p.id=d.party_id
 where d.store_id=p_store and(p_kind='ALL'or d.kind=p_kind)
 and(r='OWNER'or d.kind in('SALE','SALE_RETURN')or(d.kind='OPENING'and d.account_side='AR')or(d.kind='PAYMENT'and exists(select 1 from app_private.documents o where o.id=d.original_id and(o.kind='SALE'or(o.kind='OPENING'and o.account_side='AR')))))
 and(p_query=''or d.code ilike '%'||p_query||'%'or p.name ilike '%'||p_query||'%'or exists(select 1 from app_private.document_lines l left join app_private.stock_units u on u.id=l.unit_id where l.document_id=d.id and(l.name ilike '%'||p_query||'%'or l.sku ilike '%'||p_query||'%'or u.identifier=p_query or u.imei2=p_query)))
 order by d.posted_at desc,d.id desc limit 100 offset p_offset)z;return result;
end $$;
revoke all on function public.app_history(uuid,text,text,integer)from public,anon;
grant execute on function public.app_history(uuid,text,text,integer)to authenticated;
commit;
