export type Mode = "IMEI" | "QUANTITY" | "SERIAL";
export type Role = "OWNER" | "STAFF";
export type UnitStatus =
  | "AVAILABLE"
  | "OFFLINE_RESERVED"
  | "SOLD"
  | "QUARANTINE"
  | "REPAIR"
  | "SUPPLIER_RETURNED"
  | "DISPOSED";
export type DocKind =
  | "OPENING"
  | "SALE"
  | "PURCHASE"
  | "SALE_RETURN"
  | "PURCHASE_RETURN"
  | "PAYMENT"
  | "ADJUSTMENT"
  | "COST";
export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  policies_approved: boolean;
  tax_note: string;
  version: number;
}
export interface Product {
  id: string;
  barcode?: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  color: string;
  capacity: string;
  mode: Mode;
  price: number;
  min_stock: number;
  archived: boolean;
  hue: string;
  warranty_days: number;
}
export interface Unit {
  id: string;
  variant_id: string;
  identifier: string;
  imei2: string;
  condition: string;
  status: UnitStatus;
  cost?: number;
  last_sale_line_id?: string;
  purchase_line_id?: string;
}
export interface Balance {
  variant_id: string;
  available: number;
  reserved: number;
  quarantine: number;
  value?: number;
}
export interface Party {
  id: string;
  name: string;
  phone: string;
  type: "CUSTOMER" | "SUPPLIER" | "BOTH";
  ar: number;
  ap: number;
  note: string;
}
export interface Line {
  id: string;
  variant_id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  cost?: number;
  unit_id?: string;
  identifier?: string;
  original_line_id?: string;
  returned: number;
  warranty_days: number;
}
export interface Payment {
  method: "CASH" | "BANK";
  amount: number;
  direction: "IN" | "OUT";
}
export interface Document {
  account_side?: "AR" | "AP";
  id: string;
  code: string;
  kind: DocKind;
  party_id?: string;
  party_name: string;
  posted_at: string;
  occurred_at?: string;
  total: number;
  paid: number;
  balance: number;
  cost?: number;
  lines: Line[];
  payments: Payment[];
  note: string;
  original_id?: string;
  local_id?: string;
  request_id: string;
}
export interface Movement {
  unit_id?: string;
  id: string;
  variant_id: string;
  name: string;
  document_id: string;
  code: string;
  quantity: number;
  from: string;
  to: string;
  value?: number;
  at: string;
  note: string;
}
export interface Audit {
  id: string;
  action: string;
  name: string;
  at: string;
  code: string;
}
export interface Warranty {
  id: string;
  sale_line_id: string;
  customer: string;
  product: string;
  identifier: string;
  issue: string;
  status: "RECEIVED" | "PROCESSING" | "CLOSED";
  created_at: string;
  history: { at: string; status: string; note: string }[];
}
export interface GrantLine {
  id: string;
  variant_id: string;
  unit_id?: string;
  quantity: number;
  consumed: number;
  price: number;
  name: string;
  sku: string;
  mode: Mode;
  identifier?: string;
  warranty_days: number;
}
export interface Grant {
  id: string;
  terminal_id: string;
  user_id: string;
  store_id: string;
  created_at: string;
  status: "ACTIVE" | "CLOSED";
  last_sequence: number;
  lines: GrantLine[];
}
export interface Member {
  user_id: string;
  email: string;
  role: Role;
  active: boolean;
}
export interface Snapshot {
  store: Store;
  role: Role;
  user_id: string;
  products: Product[];
  units: Unit[];
  balances: Balance[];
  parties: Party[];
  documents: Document[];
  movements: Movement[];
  audit: Audit[];
  warranties: Warranty[];
  grants: Grant[];
  members: Member[];
}
export interface CartLine {
  variant_id: string;
  unit_id?: string;
  quantity: number;
  price: number;
  discount: number;
  identifier?: string;
  imei2?: string;
  condition?: string;
}
export interface Command {
  request_id: string;
  operation: string;
  payload: Record<string, unknown>;
}
export interface CommandResult {
  id?: string;
  code?: string;
  snapshot?: Snapshot;
}
export interface OfflineReceipt {
  id: string;
  grant_id: string;
  terminal_id: string;
  user_id: string;
  store_id: string;
  sequence: number;
  occurred_at: string;
  lines: CartLine[];
  total: number;
  cash: number;
  change: number;
  status: "PENDING" | "POSTED" | "REVIEW";
  code: string;
  server_code?: string;
  error?: string;
  names: string[];
}
