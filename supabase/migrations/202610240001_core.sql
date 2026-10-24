begin;
create schema if not exists app_private;
revoke all on schema app_private from public;
create sequence app_private.document_number;

create table app_private.stores (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120),
 address text not null default '',phone text not null default '',policies_approved boolean not null default false,
 tax_note text not null default '',version bigint not null default 0,offline_terminal_id uuid,opening_closed boolean not null default false,
 created_at timestamptz not null default now()
);
create table app_private.store_members (
 store_id uuid not null references app_private.stores(id),user_id uuid not null references auth.users(id),
 role text not null check(role in ('OWNER','STAFF')),active boolean not null default true,
 primary key(store_id,user_id)
);
create table app_private.products (
 id uuid primary key default gen_random_uuid(),store_id uuid not null references app_private.stores(id),
 sku text not null check(sku=upper(btrim(sku)) and length(sku) between 1 and 80),name text not null check(length(btrim(name)) between 1 and 180),
 brand text not null default '',category text not null default '',color text not null default '',capacity text not null default '',
 mode text not null check(mode in ('IMEI','QUANTITY','SERIAL')),price bigint not null check(price between 0 and 1000000000000),
 min_stock integer not null default 3 check(min_stock>=0),warranty_days integer not null default 0 check(warranty_days between 0 and 3650),
 hue text not null default '#849898',archived boolean not null default false,barcode text not null default '' check(length(barcode)<=100),
 unique(store_id,id),unique(store_id,sku)
);
create unique index products_barcode on app_private.products(store_id,barcode)where barcode<>'';
create table app_private.parties (
 id uuid primary key default gen_random_uuid(),store_id uuid not null references app_private.stores(id),
 name text not null check(length(btrim(name)) between 1 and 160),phone text not null default '',
 type text not null check(type in ('CUSTOMER','SUPPLIER','BOTH')),note text not null default '',unique(store_id,id)
);
create table app_private.documents (
 id uuid primary key default gen_random_uuid(),store_id uuid not null references app_private.stores(id),
 code text not null,kind text not null check(kind in ('SALE','PURCHASE','SALE_RETURN','PURCHASE_RETURN','PAYMENT','ADJUSTMENT','COST','OPENING')),account_side text check(account_side in ('AR','AP')),
 party_id uuid,actor_id uuid not null references auth.users(id),request_id uuid not null,
 posted_at timestamptz not null default now(),occurred_at timestamptz,local_id uuid,
 original_id uuid,note text not null default '',total bigint not null default 0 check(total>=0),
 paid bigint not null default 0 check(paid>=0),cost numeric(20,6) not null default 0,
 unique(store_id,id),unique(store_id,code),unique(store_id,request_id),unique(store_id,local_id),
 foreign key(store_id,party_id) references app_private.parties(store_id,id),
 foreign key(store_id,original_id) references app_private.documents(store_id,id)
);
create table app_private.stock_units (
 id uuid primary key default gen_random_uuid(),store_id uuid not null,variant_id uuid not null,
 identifier text not null,imei2 text not null default '',condition text not null default 'Mới',
 status text not null default 'AVAILABLE' check(status in ('AVAILABLE','OFFLINE_RESERVED','SOLD','QUARANTINE','REPAIR','SUPPLIER_RETURNED','DISPOSED')),
 cost numeric(20,6) not null check(cost>=0),purchase_line_id uuid,last_sale_line_id uuid,
 unique(store_id,id),foreign key(store_id,variant_id) references app_private.products(store_id,id)
);
create table app_private.unit_identifiers (
 store_id uuid not null,unit_id uuid not null,kind text not null check(kind in ('IMEI','SERIAL')),
 slot text not null check(slot in ('IMEI_1','IMEI_2','SERIAL')),value text not null check(length(value)>0),
 primary key(store_id,kind,value),unique(store_id,unit_id,slot),
 check((kind='IMEI' and slot in ('IMEI_1','IMEI_2')) or (kind='SERIAL' and slot='SERIAL')),
 foreign key(store_id,unit_id) references app_private.stock_units(store_id,id)
);
create table app_private.inventory_balances (
 store_id uuid not null,variant_id uuid not null,available integer not null default 0 check(available>=0),
 reserved integer not null default 0 check(reserved>=0),quarantine integer not null default 0 check(quarantine>=0),
 value numeric(20,6) not null default 0 check(value>=0),primary key(store_id,variant_id),
 check(available+reserved+quarantine>0 or value=0),foreign key(store_id,variant_id) references app_private.products(store_id,id)
);
create table app_private.document_lines (
 id uuid primary key default gen_random_uuid(),store_id uuid not null,document_id uuid not null,variant_id uuid not null,
 unit_id uuid,original_line_id uuid,name text not null,sku text not null,quantity integer not null check(quantity>0),
 price bigint not null check(price>=0),discount bigint not null default 0 check(discount>=0),
 total bigint not null check(total>=0),cost numeric(20,6) not null check(cost>=0),warranty_days integer not null default 0,
 unique(store_id,id),foreign key(store_id,document_id) references app_private.documents(store_id,id),
 foreign key(store_id,variant_id) references app_private.products(store_id,id),
 foreign key(store_id,unit_id) references app_private.stock_units(store_id,id),
 foreign key(store_id,original_line_id) references app_private.document_lines(store_id,id)
);
alter table app_private.stock_units add foreign key(store_id,purchase_line_id) references app_private.document_lines(store_id,id);
alter table app_private.stock_units add foreign key(store_id,last_sale_line_id) references app_private.document_lines(store_id,id);
create table app_private.inventory_movements (
 id uuid primary key default gen_random_uuid(),store_id uuid not null,document_id uuid not null,variant_id uuid not null,
 line_id uuid,unit_id uuid,quantity integer not null check(quantity>=0),from_bucket text not null,to_bucket text not null,
 value numeric(20,6) not null,at timestamptz not null default now(),note text not null default '',
 foreign key(store_id,document_id) references app_private.documents(store_id,id),
 foreign key(store_id,variant_id) references app_private.products(store_id,id),
 foreign key(store_id,line_id) references app_private.document_lines(store_id,id),foreign key(store_id,unit_id)references app_private.stock_units(store_id,id)
);
create table app_private.payments (
 id uuid primary key default gen_random_uuid(),store_id uuid not null,document_id uuid not null,
 method text not null check(method in ('CASH','BANK')),direction text not null check(direction in ('IN','OUT')),
 amount bigint not null check(amount>0),foreign key(store_id,document_id) references app_private.documents(store_id,id)
);
create table app_private.party_ledger (
 id uuid primary key default gen_random_uuid(),store_id uuid not null,party_id uuid not null,document_id uuid not null,
 target_document_id uuid not null,account_side text not null check(account_side in ('AR','AP')),amount bigint not null,
 foreign key(store_id,party_id) references app_private.parties(store_id,id),
 foreign key(store_id,document_id) references app_private.documents(store_id,id),
 foreign key(store_id,target_document_id) references app_private.documents(store_id,id)
);
create table app_private.audit_events (
 id uuid primary key default gen_random_uuid(),store_id uuid not null references app_private.stores(id),
 actor_id uuid not null references auth.users(id),action text not null,document_id uuid,at timestamptz not null default now(),
 foreign key(store_id,document_id) references app_private.documents(store_id,id)
);
create table app_private.requests (
 store_id uuid not null references app_private.stores(id),request_id uuid not null,operation text not null,
 payload jsonb not null,result jsonb not null,actor_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),primary key(store_id,request_id)
);
create table app_private.warranties (
 id uuid primary key default gen_random_uuid(),store_id uuid not null,sale_line_id uuid not null,
 issue text not null,status text not null default 'RECEIVED' check(status in ('RECEIVED','PROCESSING','CLOSED')),
 created_at timestamptz not null default now(),history jsonb not null default '[]',
 foreign key(store_id,sale_line_id) references app_private.document_lines(store_id,id)
);
create unique index one_open_warranty on app_private.warranties(store_id,sale_line_id) where status<>'CLOSED';
create table app_private.offline_grants (
 id uuid primary key default gen_random_uuid(),store_id uuid not null references app_private.stores(id),terminal_id uuid not null,
 user_id uuid not null references auth.users(id),status text not null default 'ACTIVE' check(status in ('ACTIVE','CLOSED')),
 created_at timestamptz not null default now(),last_sequence integer not null default 0 check(last_sequence>=0),unique(store_id,id)
);
create unique index one_active_grant on app_private.offline_grants(store_id) where status='ACTIVE';
create table app_private.offline_grant_lines (
 id uuid primary key default gen_random_uuid(),store_id uuid not null,grant_id uuid not null,variant_id uuid not null,unit_id uuid,
 quantity integer not null check(quantity>0),consumed integer not null default 0,price bigint not null check(price>=0),
 assignment_active boolean not null default true,warranty_days integer not null default 0,
 check(consumed between 0 and quantity),foreign key(store_id,grant_id) references app_private.offline_grants(store_id,id),
 foreign key(store_id,variant_id) references app_private.products(store_id,id),foreign key(store_id,unit_id) references app_private.stock_units(store_id,id)
);
create unique index one_grant_per_unit on app_private.offline_grant_lines(store_id,unit_id) where assignment_active and unit_id is not null;
create table app_private.offline_sync_records (
 store_id uuid not null,grant_id uuid not null,local_id uuid not null,sequence integer not null,document_id uuid not null,
 primary key(store_id,local_id),unique(store_id,grant_id,sequence),foreign key(store_id,grant_id) references app_private.offline_grants(store_id,id),
 foreign key(store_id,document_id) references app_private.documents(store_id,id)
);
create table app_private.device_costs (
 store_id uuid not null,document_id uuid not null,unit_id uuid not null,sale_line_id uuid,
 amount bigint not null check(amount>0),classification text not null check(classification in ('CAPITALIZED','AFTER_SALE')),
 foreign key(store_id,document_id) references app_private.documents(store_id,id),foreign key(store_id,unit_id) references app_private.stock_units(store_id,id),
 foreign key(store_id,sale_line_id) references app_private.document_lines(store_id,id)
);
create index units_inventory on app_private.stock_units(store_id,variant_id,status);
create index docs_history on app_private.documents(store_id,posted_at desc,id);
create index lines_document on app_private.document_lines(store_id,document_id);
create index lines_returns on app_private.document_lines(store_id,original_line_id);
create index ledger_target on app_private.party_ledger(store_id,target_document_id);
create index ledger_party on app_private.party_ledger(store_id,party_id,account_side);
create index movements_history on app_private.inventory_movements(store_id,variant_id,at desc);

create function app_private.member_role(s uuid) returns text language sql stable set search_path='' as $$
 select role from app_private.store_members where store_id=s and user_id=auth.uid() and active
$$;
create function app_private.imei_valid(v text) returns boolean language sql immutable set search_path='' as $$
 select v ~ '^[0-9]{15}$' and (select sum(case when n>9 then n-9 else n end)%10=0 from(select substring(v from i for 1)::int*case when i%2=0 then 2 else 1 end n from generate_series(1,case when v ~ '^[0-9]{15}$' then 15 else 0 end) i)z)
$$;
create function app_private.money(v text, label text, minimum bigint default 0) returns bigint language plpgsql immutable set search_path='' as $$
declare n numeric;begin n:=coalesce(nullif(v,''),'0')::numeric;if n<>trunc(n) or n<minimum or n>1000000000000 then raise exception '% không hợp lệ.',label;end if;return n::bigint;end $$;
create function app_private.alloc(total bigint, weights jsonb) returns jsonb language sql immutable set search_path='' as $$
 with w as(select ordinality i,value::text::numeric v from jsonb_array_elements(weights) with ordinality),
 a as(select *,sum(v)over() s from w),b as(select *,case when s=0 then 0 else floor(total*v/s)end q,case when s=0 then 0 else mod(total*v,s)end r from a),
 c as(select *,row_number()over(order by r desc,i) rank,total-sum(q)over() remainder from b)
 select coalesce(jsonb_agg((q+case when rank<=remainder then 1 else 0 end)::bigint order by i),'[]') from c
$$;
create function app_private.new_doc(s uuid,k text,r uuid,party uuid,note text default '') returns uuid language plpgsql set search_path='' as $$
declare d uuid;begin insert into app_private.documents(store_id,code,kind,actor_id,request_id,party_id,note)values(s,case k when 'SALE' then 'BH' when 'PURCHASE' then 'NH' when 'PAYMENT' then 'TT' when 'SALE_RETURN' then 'TH' when 'PURCHASE_RETURN' then 'TN' when 'COST' then 'CP' else 'KK' end||lpad(nextval('app_private.document_number')::text,7,'0'),k,auth.uid(),r,party,coalesce(note,''))returning id into d;return d;end $$;
create function app_private.add_payment(s uuid,d uuid,method text,direction text,amount bigint) returns void language plpgsql set search_path='' as $$
begin if amount>0 then insert into app_private.payments(store_id,document_id,method,direction,amount)values(s,d,method,direction,amount);end if;end $$;
create function app_private.add_ledger(s uuid,party uuid,d uuid,target uuid,side text,amount bigint)returns void language plpgsql set search_path='' as $$
begin if party is not null and amount<>0 then insert into app_private.party_ledger(store_id,party_id,document_id,target_document_id,account_side,amount)values(s,party,d,target,side,amount);end if;end $$;

create function public.app_create_store(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare s uuid;begin
 if auth.uid() is null then raise exception 'Vui lòng đăng nhập.';end if;
 perform pg_advisory_xact_lock(hashtextextended('mobidesk:create-store',0));
 if exists(select 1 from app_private.stores)then raise exception 'Bản cài đã có cửa hàng. Chủ cửa hàng cần cấp quyền cho tài khoản này.';end if;
 if exists(select 1 from app_private.store_members where user_id=auth.uid())then raise exception 'Tài khoản đã có cửa hàng.';end if;
 insert into app_private.stores(name)values(btrim(p_name))returning id into s;
 insert into app_private.store_members values(s,auth.uid(),'OWNER',true);return s;
end $$;

create function public.app_execute(p_store uuid,p_request uuid,p_operation text,p_payload jsonb)returns jsonb language plpgsql security definer set search_path='' as $$
<<cmd>>
declare
 role text;shop app_private.stores;prior app_private.requests;v app_private.products;u app_private.stock_units;b app_private.inventory_balances;
 origin app_private.documents;l app_private.document_lines;g app_private.offline_grants;gl app_private.offline_grant_lines;
 d uuid;lid uuid;uid uuid;pid uuid;gid uuid;who uuid;item jsonb;pay jsonb;entry jsonb;lines jsonb;weights jsonb:='[]';amounts jsonb;extra_alloc jsonb;
 q integer;cnt integer;i integer:=0;total bigint:=0;subtotal bigint:=0;discount bigint;line_discount bigint;price bigint;amount bigint;paid bigint:=0;freight bigint:=0;
 value numeric(20,6);total_cost numeric(20,6):=0;returned integer;old_balance bigint;refund bigint;delta integer;mode text;ident text;imei2 text;from_b text;to_b text;side text;
 buying boolean;purchase_return boolean;is_offline boolean:=false;result jsonb:='{}';warranty_days integer;approved boolean;reply jsonb;new_reply jsonb;credit bigint;
begin
 if auth.uid() is null then raise exception 'Vui lòng đăng nhập.';end if;
 if p_request is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>300000 then raise exception 'Yêu cầu không hợp lệ hoặc quá lớn.';end if;
 select m.role into role from app_private.store_members m where m.store_id=p_store and m.user_id=auth.uid() and m.active;
 if role is null then raise exception 'Bạn không có quyền truy cập cửa hàng.';end if;
 -- One shop, few operators: serialize writes on its row to protect every money/stock path with a single lock order.
 select * into strict shop from app_private.stores where id=p_store for update;
 select m.role into role from app_private.store_members m where m.store_id=p_store and m.user_id=auth.uid() and m.active for share;
 if role is null then raise exception 'Quyền cửa hàng đã bị thu hồi.';end if;
 select * into prior from app_private.requests where store_id=p_store and request_id=p_request;
 if found then if prior.operation<>p_operation or prior.payload<>p_payload then raise exception 'Mã yêu cầu đã dùng cho nội dung khác.';end if;if prior.actor_id<>auth.uid() and role<>'OWNER' then raise exception 'Không có quyền xem kết quả.';end if;return prior.result;end if;
 if role<>'OWNER' and p_operation not in ('sale','payment','warranty')then raise exception 'Thao tác chỉ dành cho chủ cửa hàng.';end if;
 if not shop.policies_approved and p_operation not in ('settings','product','product_update','party','member')then raise exception 'Chủ cửa hàng cần xác nhận chính sách trước giao dịch thật.';end if;
 who:=nullif(p_payload->>'party_id','')::uuid;
 if who is not null and not exists(select 1 from app_private.parties where store_id=p_store and id=who)then raise exception 'Đối tác không thuộc cửa hàng.';end if;

 if p_operation='exchange' then
  select * into origin from app_private.documents where store_id=p_store and id=(p_payload->>'document_id')::uuid and kind='SALE';
  if not found or origin.party_id is null then raise exception 'Đổi hàng cần hóa đơn bán có khách hàng xác định.';end if;
  reply:=public.app_execute(p_store,md5(p_request::text||':return')::uuid,'return',jsonb_build_object('document_id',origin.id,'lines',p_payload->'lines','refund',0,'note',coalesce(p_payload->>'note','Đổi hàng')));
  select greatest(0,-coalesce(sum(pl.amount),0))into credit from app_private.party_ledger pl where pl.store_id=p_store and pl.target_document_id=origin.id;
  new_reply:=public.app_execute(p_store,md5(p_request::text||':sale')::uuid,'sale',jsonb_build_object('party_id',origin.party_id,'lines',p_payload->'new_lines','payments',coalesce(p_payload->'payments','[]'),'discount',0,'note','Đổi từ '||origin.code));
  select coalesce(sum(pl.amount),0)into old_balance from app_private.party_ledger pl where pl.store_id=p_store and pl.target_document_id=(new_reply->>'id')::uuid;
  credit:=least(credit,greatest(0,old_balance));
  perform app_private.add_ledger(p_store,origin.party_id,(new_reply->>'id')::uuid,origin.id,'AR',credit);
  perform app_private.add_ledger(p_store,origin.party_id,(new_reply->>'id')::uuid,(new_reply->>'id')::uuid,'AR',-credit);
  refund:=app_private.money(p_payload->>'refund','Hoàn chênh lệch');
  if refund>0 then perform public.app_execute(p_store,md5(p_request::text||':refund')::uuid,'payment',jsonb_build_object('document_id',origin.id,'amount',refund,'method','CASH'));end if;
  result:=new_reply||jsonb_build_object('returned_id',reply->>'id','credit_used',credit);
 elsif p_operation='product' then
  mode:=p_payload->>'mode';
  insert into app_private.products(store_id,sku,name,brand,category,color,capacity,mode,price,min_stock,hue,warranty_days)
  values(p_store,upper(btrim(p_payload->>'sku')),btrim(p_payload->>'name'),coalesce(p_payload->>'brand',''),case when mode='IMEI' then 'Điện thoại' else 'Phụ kiện' end,coalesce(p_payload->>'color',''),coalesce(p_payload->>'capacity',''),mode,app_private.money(p_payload->>'price','Giá bán'),app_private.money(coalesce(p_payload->>'min_stock','3'),'Tồn tối thiểu')::int,coalesce(p_payload->>'hue','#849898'),app_private.money(coalesce(p_payload->>'warranty_days','0'),'Bảo hành')::int)returning id into pid;
  update app_private.products set barcode=btrim(coalesce(p_payload->>'barcode',''))where id=pid;
  if mode='QUANTITY'then insert into app_private.inventory_balances(store_id,variant_id)values(p_store,pid);end if;result:=jsonb_build_object('id',pid);
 elsif p_operation='product_update'then
  update app_private.products set price=app_private.money(p_payload->>'price','Giá bán'),min_stock=app_private.money(p_payload->>'min_stock','Tồn tối thiểu')::int,warranty_days=app_private.money(p_payload->>'warranty_days','Bảo hành')::int,barcode=btrim(coalesce(p_payload->>'barcode',''))where store_id=p_store and id=(p_payload->>'variant_id')::uuid returning id into pid;
  if not found then raise exception 'Không tìm thấy SKU của cửa hàng.';end if;result:=jsonb_build_object('id',pid);
 elsif p_operation='party' then
  insert into app_private.parties(store_id,name,phone,type,note)values(p_store,btrim(p_payload->>'name'),coalesce(p_payload->>'phone',''),p_payload->>'type',coalesce(p_payload->>'note',''))returning id into pid;result:=jsonb_build_object('id',pid);
 elsif p_operation='close_opening'then
  update app_private.stores set opening_closed=true where id=p_store;
 elsif p_operation='opening'and p_payload->>'opening_side' in ('AR','AP')then
  if shop.opening_closed or exists(select 1 from app_private.documents where store_id=p_store and kind in ('SALE','PURCHASE'))then raise exception 'Đã đóng kỳ đầu; không thể nhập thêm số dư.';end if;
  if who is null then raise exception 'Cần đối tác số dư đầu kỳ.';end if;
  amount:=(p_payload->>'balance')::bigint;if amount=0 or abs(amount)>1000000000000 then raise exception 'Số dư không hợp lệ.';end if;
  d:=app_private.new_doc(p_store,'OPENING',p_request,who,'Số dư đầu kỳ đã đối chiếu');
  update app_private.documents set total=abs(amount),account_side=p_payload->>'opening_side'where id=d;
  perform app_private.add_ledger(p_store,who,d,d,p_payload->>'opening_side',amount);
 elsif p_operation in ('sale','purchase','opening')then
  buying:=p_operation in ('purchase','opening');lines:=p_payload->'lines';
  if p_operation='opening'and(shop.opening_closed or exists(select 1 from app_private.documents where store_id=p_store and kind in ('SALE','PURCHASE')))then raise exception 'Đã có nhập/bán; không thể bổ sung tồn đầu kỳ.';end if;
  if jsonb_typeof(lines)is distinct from 'array' or jsonb_array_length(lines)not between 1 and 100 then raise exception 'Phiếu cần từ 1 đến 100 dòng hàng.';end if;
  for item in select * from jsonb_array_elements(lines)loop
   q:=app_private.money(item->>'quantity','Số lượng',1)::int;price:=app_private.money(item->>'price','Đơn giá');line_discount:=app_private.money(item->>'discount','Giảm giá');amount:=q*price-line_discount;
   if amount<0 or amount>1000000000000 then raise exception 'Tiền dòng hàng không hợp lệ.';end if;subtotal:=subtotal+amount;weights:=weights||jsonb_build_array(amount);
  end loop;
  discount:=app_private.money(p_payload->>'discount','Giảm giá phiếu');if discount>subtotal then raise exception 'Giảm giá vượt tiền hàng.';end if;
  total:=subtotal-discount;amounts:=app_private.alloc(discount,weights);freight:=case when buying then app_private.money(p_payload->>'freight','Chi phí nhập')else 0 end;
  if total=0 and freight>0 then raise exception 'Không thể phân bổ chi phí vào phiếu giá trị 0.';end if;
  extra_alloc:=app_private.alloc(freight,(select coalesce(jsonb_agg((w.value::text::bigint-(amounts->>(w.ordinality-1)::int)::bigint) order by w.ordinality),'[]')from jsonb_array_elements(weights)with ordinality w));
  for pay in select * from jsonb_array_elements(coalesce(p_payload->'payments','[]'))loop
   if pay->>'method' not in ('CASH','BANK')then raise exception 'Phương thức thanh toán không hợp lệ.';end if;paid:=paid+app_private.money(pay->>'amount','Thanh toán');
  end loop;
  if paid>total or total>1000000000000 then raise exception 'Thanh toán hoặc tổng tiền vượt giới hạn.';end if;
  if p_operation<>'opening'and who is null and (buying or paid<total)then raise exception 'Vui lòng chọn đối tác cho công nợ.';end if;
  if p_operation='opening'and(paid<>0 or freight<>0 or discount<>0 or who is not null)then raise exception 'Tồn đầu kỳ không tạo thanh toán/nợ/chiết khấu.';end if;
  if role<>'OWNER' and discount>0 then raise exception 'Giảm giá phiếu cần chủ cửa hàng duyệt.';end if;
  gid:=nullif(p_payload->>'grant_id','')::uuid;is_offline:=gid is not null;
  if is_offline then
   select * into g from app_private.offline_grants where store_id=p_store and id=gid and status='ACTIVE';
   if not found or buying or g.user_id is distinct from auth.uid() or g.terminal_id is distinct from nullif(p_payload->>'terminal_id','')::uuid or shop.offline_terminal_id is distinct from g.terminal_id then raise exception 'Quyền máy quầy không hợp lệ.';end if;
   if (p_payload->>'sequence')::integer<>g.last_sequence+1 or discount<>0 or paid<>total or who is not null or exists(select 1 from jsonb_array_elements(p_payload->'payments')x where x->>'method'<>'CASH')then raise exception 'Sai thứ tự hoặc ngoài phạm vi bán offline.';end if;
  end if;
  d:=app_private.new_doc(p_store,case when p_operation='opening'then 'OPENING'when buying then 'PURCHASE' else 'SALE' end,p_request,who,coalesce(p_payload->>'note',''));
  for item in select * from jsonb_array_elements(lines)loop
   select * into v from app_private.products where store_id=p_store and id=(item->>'variant_id')::uuid and not archived;
   if not found then raise exception 'Sản phẩm không thuộc cửa hàng.';end if;
   q:=app_private.money(item->>'quantity','Số lượng',1)::integer;price:=app_private.money(item->>'price','Đơn giá');line_discount:=app_private.money(item->>'discount','Giảm giá');amount:=q*price-line_discount-(amounts->>i)::bigint;warranty_days:=v.warranty_days;uid:=null;
   if not buying and role<>'OWNER' and (price<>v.price or line_discount<>0) and not is_offline then raise exception 'Đổi giá/giảm giá cần chủ cửa hàng.';end if;
   if is_offline then
    select * into gl from app_private.offline_grant_lines where store_id=p_store and grant_id=gid and variant_id=v.id and (v.mode='QUANTITY' or unit_id=(item->>'unit_id')::uuid) order by id limit 1;
    if not found or gl.quantity-gl.consumed<q or gl.price<>price or line_discount<>0 then raise exception 'Vượt hạn mức hoặc giá đã cấp.';end if;warranty_days:=gl.warranty_days;
   end if;
   if v.mode='QUANTITY'then
    select * into strict b from app_private.inventory_balances where store_id=p_store and variant_id=v.id;
    if buying then value:=amount+(extra_alloc->>i)::bigint;update app_private.inventory_balances set available=available+q,value=inventory_balances.value+cmd.value where store_id=p_store and variant_id=v.id;
    else
     if (case when is_offline then b.reserved else b.available end)<q then raise exception '% không đủ tồn.',v.name;end if;
     value:=case when q=b.available+b.reserved+b.quarantine then b.value else round(b.value*q/(b.available+b.reserved+b.quarantine),6)end;
     update app_private.inventory_balances set available=available-case when is_offline then 0 else q end,reserved=reserved-case when is_offline then q else 0 end,value=inventory_balances.value-cmd.value where store_id=p_store and variant_id=v.id;
    end if;
   else
    if q<>1 then raise exception 'Mỗi dòng IMEI/Serial chọn đúng một thiết bị.';end if;
    if buying then
     ident:=btrim(item->>'identifier');imei2:=btrim(coalesce(item->>'imei2',''));if coalesce(ident,'')='' then raise exception 'Thiếu IMEI/Serial.';end if;
     if v.mode='IMEI' and (not coalesce(app_private.imei_valid(ident),false) or (imei2<>'' and not coalesce(app_private.imei_valid(imei2),false)))then raise exception 'IMEI không đúng 15 chữ số/checksum.';end if;
     value:=amount+(extra_alloc->>i)::bigint;
     insert into app_private.stock_units(store_id,variant_id,identifier,imei2,condition,cost)values(p_store,v.id,ident,imei2,coalesce(item->>'condition','Mới'),value)returning id into uid;
     insert into app_private.unit_identifiers values(p_store,uid,case when v.mode='IMEI' then 'IMEI' else 'SERIAL' end,case when v.mode='IMEI' then 'IMEI_1' else 'SERIAL' end,ident);
     if imei2<>'' then if v.mode<>'IMEI' then raise exception 'Serial không có IMEI 2.';end if;insert into app_private.unit_identifiers values(p_store,uid,'IMEI','IMEI_2',imei2);end if;
    else
     select * into u from app_private.stock_units where store_id=p_store and id=(item->>'unit_id')::uuid and variant_id=v.id;
     if not found or u.status<>(case when is_offline then 'OFFLINE_RESERVED' else 'AVAILABLE' end) then raise exception 'IMEI/Serial đã bán hoặc không sẵn sàng.';end if;
     uid:=u.id;value:=u.cost;
    end if;
   end if;
   if not buying and role<>'OWNER' and amount<value then raise exception 'Bán dưới giá vốn cần chủ cửa hàng.';end if;
   insert into app_private.document_lines(store_id,document_id,variant_id,unit_id,name,sku,quantity,price,discount,total,cost,warranty_days)values(p_store,d,v.id,uid,v.name,v.sku,q,price,q*price-amount,amount,value,warranty_days)returning id into lid;
   if uid is not null then if buying then update app_private.stock_units set purchase_line_id=lid where id=uid;else update app_private.stock_units set status='SOLD',last_sale_line_id=lid where id=uid;end if;end if;
   insert into app_private.inventory_movements(store_id,document_id,variant_id,line_id,unit_id,quantity,from_bucket,to_bucket,value)values(p_store,d,v.id,lid,uid,q,case when buying then 'EXTERNAL' when is_offline then 'OFFLINE_RESERVED' else 'AVAILABLE' end,case when buying then 'AVAILABLE' else 'EXTERNAL' end,case when buying then value else -value end);
   if is_offline then update app_private.offline_grant_lines set consumed=consumed+q,assignment_active=case when unit_id is not null then false else assignment_active end where id=gl.id;end if;
   total_cost:=total_cost+value;i:=i+1;
  end loop;
  update app_private.documents set total=cmd.total,paid=cmd.paid,cost=total_cost,occurred_at=nullif(p_payload->>'occurred_at','')::timestamptz,local_id=nullif(p_payload->>'local_id','')::uuid where id=d;
  side:=case when buying then 'AP' else 'AR' end;perform app_private.add_ledger(p_store,who,d,d,side,total);
  for pay in select * from jsonb_array_elements(coalesce(p_payload->'payments','[]'))loop amount:=app_private.money(pay->>'amount','Thanh toán');perform app_private.add_payment(p_store,d,pay->>'method',case when buying then 'OUT' else 'IN' end,amount);perform app_private.add_ledger(p_store,who,d,d,side,-amount);end loop;
  if freight>0 then perform app_private.add_payment(p_store,d,'CASH','OUT',freight);end if;
  if is_offline then update app_private.offline_grants set last_sequence=last_sequence+1 where id=gid;insert into app_private.offline_sync_records values(p_store,gid,(p_payload->>'local_id')::uuid,(p_payload->>'sequence')::int,d);end if;
 elsif p_operation='payment'then
  select * into origin from app_private.documents where store_id=p_store and id=(p_payload->>'document_id')::uuid and (kind in ('SALE','PURCHASE')or(kind='OPENING'and account_side is not null));if not found or origin.party_id is null then raise exception 'Không có chứng từ công nợ hợp lệ.';end if;
  side:=coalesce(origin.account_side,case when origin.kind='SALE'then 'AR'else 'AP'end);
  if role<>'OWNER' and side<>'AR' then raise exception 'Không có quyền chi NCC.';end if;
  select coalesce(sum(pl.amount),0)into old_balance from app_private.party_ledger pl where pl.store_id=p_store and pl.target_document_id=origin.id;
  amount:=app_private.money(p_payload->>'amount','Số tiền',1);if amount>abs(old_balance)then raise exception 'Thanh toán vượt nợ/credit còn lại.';end if;
  if role<>'OWNER' and old_balance<0 then raise exception 'Hoàn tiền cần chủ cửa hàng.';end if;
  d:=app_private.new_doc(p_store,'PAYMENT',p_request,origin.party_id,case when old_balance<0 then 'Hoàn credit' else 'Thanh toán công nợ' end);
  update app_private.documents set total=amount,paid=amount,original_id=origin.id where id=d;
  perform app_private.add_payment(p_store,d,coalesce(p_payload->>'method','CASH'),case when (side='AR')=(old_balance>0)then 'IN' else 'OUT' end,amount);
  perform app_private.add_ledger(p_store,origin.party_id,d,origin.id,side,case when old_balance>0 then -amount else amount end);
 elsif p_operation='return'then
  select * into origin from app_private.documents where store_id=p_store and id=(p_payload->>'document_id')::uuid and kind in ('SALE','PURCHASE');if not found then raise exception 'Không có phiếu gốc.';end if;
  purchase_return:=origin.kind='PURCHASE';lines:=p_payload->'lines';if jsonb_typeof(lines)is distinct from 'array' or jsonb_array_length(lines)not between 1 and 100 then raise exception 'Chưa chọn hàng trả.';end if;
  d:=app_private.new_doc(p_store,case when purchase_return then 'PURCHASE_RETURN' else 'SALE_RETURN' end,p_request,origin.party_id,coalesce(nullif(p_payload->>'note',''),'Trả hàng'));
  for item in select * from jsonb_array_elements(lines)loop
   select * into l from app_private.document_lines where store_id=p_store and document_id=origin.id and id=(item->>'line_id')::uuid;if not found then raise exception 'Dòng trả không thuộc phiếu gốc.';end if;
   select coalesce(sum(quantity),0)::int into returned from app_private.document_lines where store_id=p_store and original_line_id=l.id;
   q:=app_private.money(item->>'quantity','Số lượng trả',1)::int;if q>l.quantity-returned then raise exception 'Vượt số lượng chưa trả.';end if;
   amount:=round(l.total::numeric*(returned+q)/l.quantity)-round(l.total::numeric*returned/l.quantity);
   value:=round(l.cost*(returned+q)/l.quantity,6)-round(l.cost*returned/l.quantity,6);
   select * into strict v from app_private.products where store_id=p_store and id=l.variant_id;
   if v.mode='QUANTITY'then
    select * into strict b from app_private.inventory_balances where store_id=p_store and variant_id=v.id;
    if purchase_return then if b.available<q then raise exception 'Không đủ tồn trả NCC.';end if;value:=case when q=b.available+b.reserved+b.quarantine then b.value else round(b.value*q/(b.available+b.reserved+b.quarantine),6)end;update app_private.inventory_balances set available=available-q,value=inventory_balances.value-cmd.value where store_id=p_store and variant_id=v.id;
    else update app_private.inventory_balances set quarantine=quarantine+q,value=inventory_balances.value+cmd.value where store_id=p_store and variant_id=v.id;end if;
   else
    select * into strict u from app_private.stock_units where store_id=p_store and id=l.unit_id;
    if q<>1 or u.status<>(case when purchase_return then 'AVAILABLE' else 'SOLD' end) or (not purchase_return and u.last_sale_line_id is distinct from l.id)then raise exception 'Đơn vị đã trả hoặc không thuộc lần bán này.';end if;
    if purchase_return then value:=u.cost;end if;
    update app_private.stock_units set status=case when purchase_return then 'SUPPLIER_RETURNED' else 'QUARANTINE' end,cost=value,last_sale_line_id=null where id=u.id;
   end if;
   insert into app_private.document_lines(store_id,document_id,variant_id,unit_id,original_line_id,name,sku,quantity,price,discount,total,cost,warranty_days)values(p_store,d,v.id,l.unit_id,l.id,l.name,l.sku,q,l.price,0,amount,value,l.warranty_days)returning id into lid;
   insert into app_private.inventory_movements(store_id,document_id,variant_id,line_id,unit_id,quantity,from_bucket,to_bucket,value)values(p_store,d,v.id,lid,l.unit_id,q,case when purchase_return then 'AVAILABLE' else 'EXTERNAL' end,case when purchase_return then 'EXTERNAL' else 'QUARANTINE' end,case when purchase_return then -value else value end);
   total:=total+amount;total_cost:=total_cost+value;
  end loop;
  select coalesce(sum(pl.amount),0)into old_balance from app_private.party_ledger pl where pl.store_id=p_store and pl.target_document_id=origin.id;
  refund:=app_private.money(p_payload->>'refund','Tiền hoàn');if refund>greatest(0,total-old_balance)then raise exception 'Hoàn vượt credit còn lại.';end if;
  if origin.party_id is null and refund<>total then raise exception 'Khách lẻ phải hoàn đủ tiền hàng trả.';end if;
  update app_private.documents set total=cmd.total,cost=total_cost,paid=refund,original_id=origin.id where id=d;
  side:=case when purchase_return then 'AP' else 'AR' end;perform app_private.add_ledger(p_store,origin.party_id,d,origin.id,side,-total);perform app_private.add_ledger(p_store,origin.party_id,d,origin.id,side,refund);
  perform app_private.add_payment(p_store,d,coalesce(p_payload->>'method','CASH'),case when purchase_return then 'IN' else 'OUT' end,refund);
 elsif p_operation in ('status','quantity_status','adjust','cost')then
  if p_operation='adjust' and exists(select 1 from app_private.offline_grants where store_id=p_store and status='ACTIVE')then raise exception 'Đối soát và đóng quyền offline trước kiểm kê.';end if;
  if length(btrim(coalesce(p_payload->>'note','')))=0 then raise exception 'Cần ghi rõ lý do.';end if;
  d:=app_private.new_doc(p_store,case when p_operation='cost' then 'COST' else 'ADJUSTMENT' end,p_request,null,p_payload->>'note');
  if p_operation in ('status','cost')then
   select * into u from app_private.stock_units where store_id=p_store and id=(p_payload->>'unit_id')::uuid;if not found then raise exception 'Không tìm thấy thiết bị.';end if;
   if p_operation='status'then
    to_b:=p_payload->>'status';if u.status not in ('AVAILABLE','QUARANTINE','REPAIR') or to_b not in ('AVAILABLE','QUARANTINE','REPAIR','DISPOSED')then raise exception 'Trạng thái không thể chuyển.';end if;
    update app_private.stock_units set status=to_b where id=u.id;
    insert into app_private.inventory_movements(store_id,document_id,variant_id,unit_id,quantity,from_bucket,to_bucket,value,note)values(p_store,d,u.variant_id,u.id,1,u.status,case when to_b='DISPOSED'then 'EXTERNAL'else to_b end,case when to_b='DISPOSED'then -u.cost else 0 end,p_payload->>'note');
   else
    if u.status not in ('AVAILABLE','QUARANTINE','REPAIR','SOLD')then raise exception 'Cần đối soát quyền offline/thiết bị trước ghi chi phí.';end if;
    amount:=app_private.money(p_payload->>'amount','Chi phí',1);insert into app_private.device_costs values(p_store,d,u.id,u.last_sale_line_id,amount,case when u.status='SOLD' then 'AFTER_SALE' else 'CAPITALIZED' end);
    if u.status<>'SOLD' then update app_private.stock_units set cost=cost+amount where id=u.id;end if;
    update app_private.documents set total=amount,paid=amount,cost=case when u.status='SOLD' then amount else 0 end where id=d;perform app_private.add_payment(p_store,d,coalesce(p_payload->>'method','CASH'),'OUT',amount);
    insert into app_private.inventory_movements(store_id,document_id,variant_id,unit_id,quantity,from_bucket,to_bucket,value,note)values(p_store,d,u.variant_id,u.id,0,u.status,u.status,case when u.status='SOLD' then 0 else amount end,p_payload->>'note');
   end if;
  else
   select * into v from app_private.products where store_id=p_store and id=(p_payload->>'variant_id')::uuid and mode='QUANTITY';if not found then raise exception 'Sản phẩm không quản lý theo số lượng.';end if;select * into strict b from app_private.inventory_balances where store_id=p_store and variant_id=v.id;
   if p_operation='quantity_status'then q:=app_private.money(p_payload->>'quantity','Số lượng',1)::int;if q>b.quarantine then raise exception 'Không đủ hàng cách ly.';end if;update app_private.inventory_balances set quarantine=quarantine-q,available=available+q where store_id=p_store and variant_id=v.id;from_b:='QUARANTINE';to_b:='AVAILABLE';value:=0;
   else
    if (p_payload->>'version')::bigint<>shop.version then raise exception 'Sổ kho đã đổi. Tải lại trước kiểm kê.';end if;
    cnt:=app_private.money(p_payload->>'count','Số đếm')::int;delta:=cnt-b.available;q:=abs(delta);
    if delta>0 then value:=app_private.money(p_payload->>'unit_cost','Giá vốn hàng thừa',1)*delta;else value:=case when q=b.available+b.quarantine then -b.value when q=0 then 0 else -round(b.value*q/(b.available+b.quarantine),6)end;end if;
    update app_private.inventory_balances set available=cnt,value=inventory_balances.value+cmd.value where store_id=p_store and variant_id=v.id;from_b:=case when delta>=0 then 'EXTERNAL' else 'AVAILABLE' end;to_b:=case when delta>=0 then 'AVAILABLE' else 'EXTERNAL' end;update app_private.documents set total=abs(cmd.value)::bigint where id=d;
   end if;
   insert into app_private.inventory_movements(store_id,document_id,variant_id,quantity,from_bucket,to_bucket,value,note)values(p_store,d,v.id,q,from_b,to_b,value,p_payload->>'note');
  end if;
 elsif p_operation='grant'then
  d:=app_private.new_doc(p_store,'ADJUSTMENT',p_request,null,'Cấp quyền bán riêng cho quầy offline');
  uid:=(p_payload->>'terminal_id')::uuid;if uid is null then raise exception 'Cần định danh máy quầy.';end if;
  if exists(select 1 from app_private.offline_grants where store_id=p_store and status='ACTIVE')then raise exception 'Đang có phiên offline chưa đóng.';end if;
  if shop.offline_terminal_id is not null and shop.offline_terminal_id<>uid then raise exception 'Chỉ máy quầy đã đăng ký được nhận hạn mức.';end if;
  update app_private.stores set offline_terminal_id=uid where id=p_store;
  insert into app_private.offline_grants(store_id,terminal_id,user_id)values(p_store,uid,auth.uid())returning id into gid;
  lines:=p_payload->'lines';if jsonb_typeof(lines)is distinct from 'array' or jsonb_array_length(lines)not between 1 and 100 then raise exception 'Chưa chọn hàng cấp.';end if;
  for item in select * from jsonb_array_elements(lines)loop
   select * into strict v from app_private.products where store_id=p_store and id=(item->>'variant_id')::uuid and not archived;
   q:=app_private.money(item->>'quantity','Hạn mức',1)::int;uid:=null;
   if v.mode='QUANTITY'then update app_private.inventory_balances set available=available-q,reserved=reserved+q where store_id=p_store and variant_id=v.id and available>=q;if not found then raise exception 'Hạn mức vượt tồn.';end if;
   else uid:=(item->>'unit_id')::uuid;if q<>1 then raise exception 'Mỗi thiết bị cấp một lần.';end if;update app_private.stock_units set status='OFFLINE_RESERVED' where store_id=p_store and id=uid and variant_id=v.id and status='AVAILABLE';if not found then raise exception 'Thiết bị không sẵn sàng.';end if;end if;
   if v.mode='QUANTITY' and exists(select 1 from app_private.offline_grant_lines where grant_id=gid and variant_id=v.id)then raise exception 'Gộp hạn mức SKU vào một dòng.';end if;
   insert into app_private.offline_grant_lines(store_id,grant_id,variant_id,unit_id,quantity,price,warranty_days)values(p_store,gid,v.id,uid,q,v.price,v.warranty_days);
   insert into app_private.inventory_movements(store_id,document_id,variant_id,unit_id,quantity,from_bucket,to_bucket,value,note)values(p_store,d,v.id,uid,q,'AVAILABLE','OFFLINE_RESERVED',0,'Cấp quyền cho quầy');
  end loop;result:=jsonb_build_object('id',gid);
 elsif p_operation='release_grant'then
  d:=app_private.new_doc(p_store,'ADJUSTMENT',p_request,null,'Đóng và đối soát quyền quầy offline');
  select * into g from app_private.offline_grants where store_id=p_store and id=(p_payload->>'grant_id')::uuid and status='ACTIVE';if not found or (p_payload->>'last_sequence')::int<>g.last_sequence then raise exception 'Chưa đối soát đủ phiếu của ca.';end if;
  for gl in select * from app_private.offline_grant_lines where store_id=p_store and grant_id=g.id loop
   q:=gl.quantity-gl.consumed;if gl.unit_id is null then update app_private.inventory_balances set available=available+q,reserved=reserved-q where store_id=p_store and variant_id=gl.variant_id;elsif q>0 then update app_private.stock_units set status='AVAILABLE' where store_id=p_store and id=gl.unit_id and status='OFFLINE_RESERVED';end if;
   if q>0 then insert into app_private.inventory_movements(store_id,document_id,variant_id,unit_id,quantity,from_bucket,to_bucket,value,note)values(p_store,d,gl.variant_id,gl.unit_id,q,'OFFLINE_RESERVED','AVAILABLE',0,'Đã đối soát phần chưa bán');end if;
  end loop;
  update app_private.offline_grant_lines set assignment_active=false where grant_id=g.id;update app_private.offline_grants set status='CLOSED' where id=g.id;
 elsif p_operation='warranty'then
  select l0.* into l from app_private.document_lines l0 join app_private.documents d0 on d0.id=l0.document_id where l0.store_id=p_store and l0.id=(p_payload->>'sale_line_id')::uuid and d0.kind='SALE';if not found or length(btrim(coalesce(p_payload->>'issue','')))=0 then raise exception 'Dòng bán hoặc mô tả lỗi chưa hợp lệ.';end if;
  insert into app_private.warranties(store_id,sale_line_id,issue,history)values(p_store,l.id,p_payload->>'issue',jsonb_build_array(jsonb_build_object('at',now(),'status','RECEIVED','note',p_payload->>'issue')))returning id into uid;result:=jsonb_build_object('id',uid);
 elsif p_operation='warranty_status'then
  if p_payload->>'status' not in ('PROCESSING','CLOSED') or length(btrim(coalesce(p_payload->>'note','')))=0 then raise exception 'Cần trạng thái và kết quả xử lý.';end if;
  update app_private.warranties set status=p_payload->>'status',history=history||jsonb_build_array(jsonb_build_object('at',now(),'status',p_payload->>'status','note',p_payload->>'note'))where store_id=p_store and id=(p_payload->>'id')::uuid;if not found then raise exception 'Không có hồ sơ.';end if;
 elsif p_operation='settings'then
  approved:=coalesce((p_payload->>'policies_approved')::boolean,false);if approved and length(btrim(coalesce(p_payload->>'tax_note','')))<10 then raise exception 'Cần ghi rõ chính sách giá/thuế quản trị được xác nhận.';end if;
  update app_private.stores set name=btrim(p_payload->>'name'),address=coalesce(p_payload->>'address',''),phone=coalesce(p_payload->>'phone',''),tax_note=coalesce(p_payload->>'tax_note',''),policies_approved=approved where id=p_store;
 elsif p_operation='member'then
  select id into uid from auth.users where lower(email)=lower(btrim(p_payload->>'email'));if uid is null then raise exception 'Tài khoản chưa tồn tại. Tạo/mời trong Supabase Auth trước.';end if;
  mode:=p_payload->>'role';if mode not in ('OWNER','STAFF')then raise exception 'Vai trò không hợp lệ.';end if;
  approved:=coalesce((p_payload->>'active')::boolean,true);
  if exists(select 1 from app_private.store_members m where m.store_id=p_store and m.user_id=uid and m.role='OWNER' and m.active)and (mode<>'OWNER' or not approved)and (select count(*)from app_private.store_members m where m.store_id=p_store and m.role='OWNER' and m.active)<=1 then raise exception 'Không được khóa/hạ quyền chủ cuối cùng.';end if;
  insert into app_private.store_members values(p_store,uid,mode,approved)on conflict(store_id,user_id)do update set role=excluded.role,active=excluded.active;
 else raise exception 'Thao tác chưa được hỗ trợ.';
 end if;
 if d is not null then select jsonb_build_object('id',case when p_operation='grant'then gid else id end,'code',code)into result from app_private.documents where id=d;end if;
 insert into app_private.audit_events(store_id,actor_id,action,document_id)values(p_store,auth.uid(),p_operation,d);
 update app_private.stores set version=version+1 where id=p_store;
 insert into app_private.requests values(p_store,p_request,p_operation,p_payload,result,auth.uid(),now());return result;
exception when unique_violation then raise exception 'Mã SKU, IMEI/Serial hoặc giao dịch đã tồn tại. Không có dữ liệu ghi một phần.';
end $$;

create function public.app_snapshot(p_store uuid default null)returns jsonb language plpgsql security definer set search_path='' as $$
declare s uuid;role text;result jsonb;begin
 if auth.uid()is null then raise exception 'Vui lòng đăng nhập.';end if;
 s:=p_store;if s is null then select store_id into s from app_private.store_members where user_id=auth.uid() and active order by store_id limit 1;end if;
 role:=app_private.member_role(s);if role is null then raise exception 'NO_STORE: Tài khoản chưa được cấp quyền cửa hàng.';end if;
 select jsonb_build_object('store',to_jsonb(st),'role',role,'user_id',auth.uid(),
 'products',(select coalesce(jsonb_agg(to_jsonb(p)-'store_id' order by p.name),'[]')from app_private.products p where p.store_id=s),
 'units',(select coalesce(jsonb_agg(case when role='OWNER' then to_jsonb(u)-'store_id' else to_jsonb(u)-'store_id'-'cost' end),'[]')from app_private.stock_units u where u.store_id=s),
 'balances',(select coalesce(jsonb_agg(case when role='OWNER' then to_jsonb(b)-'store_id' else to_jsonb(b)-'store_id'-'value' end),'[]')from app_private.inventory_balances b where b.store_id=s),
 'parties',(select coalesce(jsonb_agg(to_jsonb(p)-'store_id'||jsonb_build_object('ar',(select coalesce(sum(amount),0)from app_private.party_ledger where store_id=s and party_id=p.id and account_side='AR'),'ap',case when role='OWNER' then(select coalesce(sum(amount),0)from app_private.party_ledger where store_id=s and party_id=p.id and account_side='AP')else 0 end)),'[]')from app_private.parties p where p.store_id=s and (role='OWNER' or p.type in ('CUSTOMER','BOTH'))),
 'documents',(select coalesce(jsonb_agg(body order by posted_at desc),'[]')from(select d.posted_at,(case when role='OWNER'then to_jsonb(d)-'store_id'-'actor_id' else to_jsonb(d)-'store_id'-'actor_id'-'cost'end)||jsonb_build_object(
  'party_name',coalesce(p.name,'Khách lẻ'), 'balance',(select coalesce(sum(amount),0)from app_private.party_ledger where store_id=s and target_document_id=d.id),
  'payments',(select coalesce(jsonb_agg(jsonb_build_object('method',method,'direction',direction,'amount',amount)),'[]')from app_private.payments where store_id=s and document_id=d.id),
  'lines',(select coalesce(jsonb_agg((case when role='OWNER'then to_jsonb(l)-'store_id'-'document_id'else to_jsonb(l)-'store_id'-'document_id'-'cost'end)||jsonb_build_object('identifier',coalesce(u.identifier,''),'returned',(select coalesce(sum(quantity),0)from app_private.document_lines where store_id=s and original_line_id=l.id)) order by l.id),'[]')from app_private.document_lines l left join app_private.stock_units u on u.id=l.unit_id where l.store_id=s and l.document_id=d.id)
 )body from app_private.documents d left join app_private.parties p on p.id=d.party_id where d.store_id=s and (role='OWNER' or d.kind in ('SALE','SALE_RETURN')or(d.kind='PAYMENT'and exists(select 1 from app_private.documents o where o.id=d.original_id and o.kind='SALE')))order by d.posted_at desc limit 500)z),
 'movements',(select coalesce(jsonb_agg(body order by at desc),'[]')from(select m.at,(case when role='OWNER'then to_jsonb(m)-'store_id'-'from_bucket'-'to_bucket'else to_jsonb(m)-'store_id'-'from_bucket'-'to_bucket'-'value'end)||jsonb_build_object('name',p.name,'code',d.code,'from',m.from_bucket,'to',m.to_bucket)body from app_private.inventory_movements m join app_private.products p on p.id=m.variant_id join app_private.documents d on d.id=m.document_id where m.store_id=s order by m.at desc limit 500)z),
 'audit',case when role='OWNER'then(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'action',a.action,'name',coalesce(u.email,'Nhân viên'),'at',a.at,'code',coalesce(d.code,'')) order by a.at desc),'[]')from(select * from app_private.audit_events where store_id=s order by at desc limit 100)a left join auth.users u on u.id=a.actor_id left join app_private.documents d on d.id=a.document_id)else '[]'::jsonb end,
 'warranties',(select coalesce(jsonb_agg(to_jsonb(w)-'store_id'||jsonb_build_object('product',l.name,'identifier',coalesce(u.identifier,l.sku),'customer',coalesce(p.name,'Khách lẻ'))order by w.created_at desc),'[]')from app_private.warranties w join app_private.document_lines l on l.id=w.sale_line_id join app_private.documents d on d.id=l.document_id left join app_private.parties p on p.id=d.party_id left join app_private.stock_units u on u.id=l.unit_id where w.store_id=s),
 'grants',(select coalesce(jsonb_agg(to_jsonb(g)||jsonb_build_object('lines',(select coalesce(jsonb_agg(to_jsonb(l)-'store_id'-'grant_id'-'assignment_active'||jsonb_build_object('name',p.name,'sku',p.sku,'mode',p.mode,'identifier',coalesce(u.identifier,''))),'[]')from app_private.offline_grant_lines l join app_private.products p on p.id=l.variant_id left join app_private.stock_units u on u.id=l.unit_id where l.store_id=s and l.grant_id=g.id))),'[]')from app_private.offline_grants g where g.store_id=s and g.status='ACTIVE' and (role='OWNER' or g.user_id=auth.uid())),
 'members',case when role='OWNER'then(select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'email',u.email,'role',m.role,'active',m.active)),'[]')from app_private.store_members m join auth.users u on u.id=m.user_id where m.store_id=s)else '[]'::jsonb end
 )into result from app_private.stores st where st.id=s;return result;
end $$;

-- The private schema is not in Data API's exposed schemas; RLS also protects against accidental future grants.
do $$declare t record;begin for t in select tablename from pg_tables where schemaname='app_private'loop
 execute format('alter table app_private.%I enable row level security',t.tablename);
 execute format('create policy member_read on app_private.%I for select using (app_private.member_role(%I) is not null)',t.tablename,case when t.tablename='stores' then 'id' else 'store_id' end);
end loop;end $$;
revoke all on all tables in schema app_private from public,anon,authenticated;
revoke all on all sequences in schema app_private from public,anon,authenticated;
revoke all on all functions in schema app_private from public,anon,authenticated;
revoke all on function public.app_create_store(text),public.app_execute(uuid,uuid,text,jsonb),public.app_snapshot(uuid) from public,anon;
grant execute on function public.app_create_store(text),public.app_execute(uuid,uuid,text,jsonb),public.app_snapshot(uuid) to authenticated;
alter default privileges in schema app_private revoke execute on functions from public;
commit;
