import type {
  Snapshot,
  Command,
  CommandResult,
  CartLine,
  Document,
  Line,
  Product,
  Party,
  Grant,
  Payment,
} from "./types";
import { allocate, cartTotal, integer, isImei } from "./money";

export interface DemoState extends Snapshot {
  requests: Record<string, { payload: string; result: CommandResult }>;
}
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const text = (v: unknown) => String(v ?? "").trim();
const required = (v: unknown, label: string) => {
  const s = text(v);
  if (!s) throw new Error(`Vui lòng nhập ${label}.`);
  return s;
};
const share = (v: number, q: number, n: number) =>
  q === n ? v : Math.round(((v * q) / n) * 1e6) / 1e6;
export function applyDemo(
  previous: DemoState,
  command: Command,
): { state: DemoState; result: CommandResult } {
  const s = structuredClone(previous),
    p = command.payload,
    hash = JSON.stringify(p),
    saved = s.requests[command.request_id];
  if (saved) {
    if (saved.payload !== command.operation + hash)
      throw new Error("Mã yêu cầu đã được dùng cho nội dung khác.");
    return { state: s, result: saved.result };
  }
  if (
    s.role !== "OWNER" &&
    !["sale", "payment", "warranty"].includes(command.operation)
  )
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
  if (command.operation === "exchange") {
    const original = s.documents.find(
      (d) => d.id === p.document_id && d.kind === "SALE",
    );
    if (!original?.party_id)
      throw new Error("Đổi hàng cần hóa đơn có khách hàng xác định.");
    const returned = applyDemo(s, {
      request_id: id(),
      operation: "return",
      payload: {
        document_id: original.id,
        lines: p.lines,
        refund: 0,
        note: p.note,
      },
    });
    const sold = applyDemo(returned.state, {
      request_id: id(),
      operation: "sale",
      payload: {
        party_id: original.party_id,
        lines: p.new_lines,
        payments: p.payments || [],
        note: `Đổi từ ${original.code}`,
      },
    });
    const old = sold.state.documents.find((d) => d.id === original.id)!,
      next = sold.state.documents.find((d) => d.id === sold.result.id)!,
      credit = Math.min(Math.max(0, -old.balance), Math.max(0, next.balance));
    old.balance += credit;
    next.balance -= credit;
    let state = sold.state;
    if (Number(p.refund) > 0)
      state = applyDemo(state, {
        request_id: id(),
        operation: "payment",
        payload: { document_id: old.id, amount: p.refund, method: "CASH" },
      }).state;
    state.parties.forEach((p) => {
      p.ar = state.documents
        .filter((d) => d.party_id === p.id && d.kind === "SALE")
        .reduce((a, d) => a + d.balance, 0);
      p.ap = state.documents
        .filter((d) => d.party_id === p.id && d.kind === "PURCHASE")
        .reduce((a, d) => a + d.balance, 0);
    });
    state.requests[command.request_id] = {
      payload: command.operation + hash,
      result: sold.result,
    };
    return { state, result: sold.result };
  }
  const stamp = now();
  let result: CommandResult = {};
  const product = (pid: string) => {
    const v = s.products.find((x) => x.id === pid && !x.archived);
    if (!v) throw new Error("Không tìm thấy sản phẩm.");
    return v;
  };
  const balance = (pid: string) => {
    let b = s.balances.find((x) => x.variant_id === pid);
    if (!b) {
      b = {
        variant_id: pid,
        available: 0,
        reserved: 0,
        quarantine: 0,
        value: 0,
      };
      s.balances.push(b);
    }
    return b;
  };
  const party = (pid: unknown) => s.parties.find((x) => x.id === pid);
  const doc = (
    kind: Document["kind"],
    total: number,
    who?: Party,
  ): Document => ({
    id: id(),
    request_id: command.request_id,
    code: `${({ OPENING: "DK", SALE: "BH", PURCHASE: "NH", SALE_RETURN: "TH", PURCHASE_RETURN: "TN", PAYMENT: "TT", ADJUSTMENT: "KK", COST: "CP" } as const)[kind]}${String(s.documents.length + 1).padStart(5, "0")}`,
    kind,
    party_id: who?.id,
    party_name: who?.name || "Khách lẻ",
    posted_at: stamp,
    total,
    paid: 0,
    balance: 0,
    cost: 0,
    lines: [],
    payments: [],
    note: text(p.note),
  });
  const add = (d: Document) => {
    s.documents.unshift(d);
    result = { id: d.id, code: d.code };
  };
  const move = (
    v: Product,
    d: Document,
    q: number,
    from: string,
    to: string,
    value: number,
    note = "",
  ) =>
    s.movements.unshift({
      id: id(),
      variant_id: v.id,
      name: v.name,
      document_id: d.id,
      code: d.code,
      quantity: q,
      from,
      to,
      value,
      at: stamp,
      note,
    });
  const payList = (): Payment[] => {
    const ps = (p.payments as Payment[] | undefined) || [];
    return ps
      .filter((x) => Number(x.amount) > 0)
      .map((x) => ({
        method: x.method === "BANK" ? "BANK" : "CASH",
        amount: integer(x.amount, "Thanh toán", 1),
        direction: command.operation === "purchase" ? "OUT" : "IN",
      }));
  };
  if (["opening", "close_opening"].includes(command.operation)) {
    throw new Error(
      "Dữ liệu minh họa đã có nhập/bán. Nhập đầu kỳ chỉ dành cho cửa hàng mới chưa phát sinh.",
    );
  }
  if (command.operation === "product") {
    const sku = required(p.sku, "SKU").toUpperCase();
    if (s.products.some((v) => v.sku === sku))
      throw new Error("SKU đã tồn tại.");
    if (
      text(p.barcode) &&
      s.products.some((v) => v.barcode === text(p.barcode))
    )
      throw new Error("Mã vạch đã thuộc SKU khác.");
    const mode = text(p.mode);
    if (!["IMEI", "QUANTITY", "SERIAL"].includes(mode))
      throw new Error("Cách quản lý kho không hợp lệ.");
    const v: Product = {
      id: id(),
      sku,
      barcode: text(p.barcode),
      name: required(p.name, "tên sản phẩm"),
      brand: text(p.brand) || "Khác",
      category: mode === "IMEI" ? "Điện thoại" : "Phụ kiện",
      color: text(p.color),
      capacity: text(p.capacity),
      mode: mode as Product["mode"],
      price: integer(p.price, "Giá bán"),
      min_stock: integer(p.min_stock ?? 3, "Tồn tối thiểu"),
      archived: false,
      hue: text(p.hue) || "#849898",
      warranty_days: integer(p.warranty_days ?? 0, "Bảo hành"),
    };
    s.products.push(v);
    if (mode === "QUANTITY") balance(v.id);
    result = { id: v.id };
  } else if (command.operation === "product_update") {
    const v = product(text(p.variant_id));
    if (
      text(p.barcode) &&
      s.products.some((x) => x.id !== v.id && x.barcode === text(p.barcode))
    )
      throw new Error("Mã vạch đã thuộc SKU khác.");
    v.barcode = text(p.barcode);
    v.price = integer(p.price, "Giá bán");
    v.min_stock = integer(p.min_stock, "Tồn tối thiểu");
    v.warranty_days = integer(p.warranty_days, "Bảo hành");
    result = { id: v.id };
  } else if (command.operation === "party") {
    const v: Party = {
      id: id(),
      name: required(p.name, "tên đối tác"),
      phone: text(p.phone),
      type: ["SUPPLIER", "BOTH"].includes(text(p.type))
        ? (text(p.type) as Party["type"])
        : "CUSTOMER",
      note: text(p.note),
      ar: 0,
      ap: 0,
    };
    s.parties.push(v);
    result = { id: v.id };
  } else if (["sale", "purchase"].includes(command.operation)) {
    const buying = command.operation === "purchase";
    const lines = p.lines as CartLine[];
    if (!Array.isArray(lines) || !lines.length)
      throw new Error("Chưa có hàng trong phiếu.");
    const { total, amounts } = cartTotal(
      lines,
      integer(p.discount ?? 0, "Giảm giá"),
    );
    integer(total, "Tổng tiền");
    const who = party(p.party_id),
      payments = payList(),
      paid = payments.reduce((a, v) => a + v.amount, 0);
    if (paid > total)
      throw new Error("Số thanh toán vượt tổng tiền. Tiền thừa cần trả khách.");
    if (!who && (buying || paid < total))
      throw new Error("Vui lòng chọn đối tác để ghi nhận công nợ.");
    const grant = p.grant_id
      ? s.grants.find((g) => g.id === p.grant_id && g.status === "ACTIVE")
      : undefined;
    if (p.grant_id && !grant)
      throw new Error("Quyền bán offline không hợp lệ.");
    if (grant) {
      if (p.terminal_id !== grant.terminal_id || p.user_id !== grant.user_id)
        throw new Error("Sai máy quầy hoặc người dùng.");
      if (Number(p.sequence) !== grant.last_sequence + 1)
        throw new Error("Thiếu hoặc sai thứ tự phiếu offline.");
      if (
        paid !== total ||
        payments.some((x) => x.method !== "CASH") ||
        p.discount
      )
        throw new Error("Offline chỉ bán tiền mặt đủ theo giá đã cấp.");
    }
    const d = doc(buying ? "PURCHASE" : "SALE", total, who);
    d.paid = paid;
    d.balance = who ? total - paid : 0;
    d.payments = payments;
    d.occurred_at = text(p.occurred_at) || undefined;
    d.local_id = text(p.local_id) || undefined;
    lines.forEach((l, i) => {
      const v = product(l.variant_id),
        quantity = integer(l.quantity, "Số lượng", 1),
        cost = amounts[i],
        line: Line = {
          id: id(),
          variant_id: v.id,
          name: v.name,
          sku: v.sku,
          quantity,
          price: l.price,
          discount: quantity * l.price - amounts[i],
          total: amounts[i],
          returned: 0,
          warranty_days: v.warranty_days,
        };
      let unitCost = 0;
      const gl = grant?.lines.find(
        (g) =>
          g.variant_id === v.id &&
          (v.mode === "QUANTITY" || g.unit_id === l.unit_id),
      );
      if (
        grant &&
        (!gl ||
          gl.quantity - gl.consumed < quantity ||
          gl.price !== l.price ||
          l.discount)
      )
        throw new Error("Hàng hoặc giá vượt quyền bán offline.");
      if (v.mode === "QUANTITY") {
        const b = balance(v.id),
          q = b.available + b.reserved + b.quarantine;
        if (buying) {
          b.available += quantity;
          b.value = (b.value || 0) + cost;
          unitCost = cost;
        } else {
          const field = grant ? "reserved" : "available";
          if (b[field] < quantity) throw new Error(`${v.name} không đủ tồn.`);
          unitCost = share(b.value || 0, quantity, q);
          b[field] -= quantity;
          b.value = (b.value || 0) - unitCost;
        }
      } else {
        if (quantity !== 1)
          throw new Error("Mỗi dòng IMEI/Serial phải chọn một thiết bị.");
        if (buying) {
          const code = required(
              l.identifier,
              v.mode === "IMEI" ? "IMEI 1" : "Serial",
            ),
            imei2 = text(l.imei2);
          if (v.mode === "IMEI" && (!isImei(code) || (imei2 && !isImei(imei2))))
            throw new Error("IMEI phải có 15 chữ số và checksum hợp lệ.");
          if (
            code === imei2 ||
            s.units.some((u) =>
              [u.identifier, u.imei2]
                .filter(Boolean)
                .some((x) => x === code || (imei2 && x === imei2)),
            )
          )
            throw new Error("IMEI/Serial đã tồn tại, kể cả IMEI 2.");
          const u = {
            id: id(),
            variant_id: v.id,
            identifier: code,
            imei2,
            condition: text(l.condition) || "Mới",
            status: "AVAILABLE" as const,
            cost,
            purchase_line_id: line.id,
          };
          s.units.push(u);
          line.unit_id = u.id;
          line.identifier = code;
          unitCost = cost;
        } else {
          const u = s.units.find(
            (x) => x.id === l.unit_id && x.variant_id === v.id,
          );
          if (!u || u.status !== (grant ? "OFFLINE_RESERVED" : "AVAILABLE"))
            throw new Error("Máy/Serial đã bán hoặc chưa sẵn sàng.");
          unitCost = u.cost || 0;
          u.status = "SOLD";
          u.last_sale_line_id = line.id;
          line.unit_id = u.id;
          line.identifier = u.identifier;
        }
      }
      if (gl) gl.consumed += quantity;
      line.cost = unitCost;
      d.cost = (d.cost || 0) + unitCost;
      d.lines.push(line);
      move(
        v,
        d,
        quantity,
        buying ? "EXTERNAL" : grant ? "OFFLINE_RESERVED" : "AVAILABLE",
        buying ? "AVAILABLE" : "EXTERNAL",
        buying ? cost : -unitCost,
      );
    });
    if (grant) grant.last_sequence++;
    add(d);
  } else if (command.operation === "payment") {
    const origin = s.documents.find(
      (d) => d.id === p.document_id && ["SALE", "PURCHASE"].includes(d.kind),
    );
    if (!origin || !origin.party_id)
      throw new Error("Chứng từ không có công nợ.");
    const amount = integer(p.amount, "Số tiền", 1);
    if (amount > Math.abs(origin.balance))
      throw new Error("Số tiền vượt phần còn cần thanh toán/hoàn.");
    const refund = origin.balance < 0;
    const d = doc("PAYMENT", amount, party(origin.party_id));
    d.original_id = origin.id;
    d.paid = amount;
    d.note = refund ? "Hoàn tiền" : "Thanh toán công nợ";
    d.payments = [
      {
        method: p.method === "BANK" ? "BANK" : "CASH",
        amount,
        direction: (origin.kind === "SALE") !== refund ? "IN" : "OUT",
      },
    ];
    origin.balance += refund ? amount : -amount;
    add(d);
  } else if (command.operation === "return") {
    const origin = s.documents.find(
      (d) => d.id === p.document_id && ["SALE", "PURCHASE"].includes(d.kind),
    );
    if (!origin) throw new Error("Không tìm thấy chứng từ gốc.");
    const purchase = origin.kind === "PURCHASE";
    const d = doc(
      purchase ? "PURCHASE_RETURN" : "SALE_RETURN",
      0,
      party(origin.party_id),
    );
    d.original_id = origin.id;
    const selected = p.lines as { line_id: string; quantity: number }[];
    if (!selected?.length) throw new Error("Chưa chọn hàng trả.");
    selected.forEach((r) => {
      const l = origin.lines.find((x) => x.id === r.line_id);
      const q = integer(r.quantity, "Số lượng trả", 1);
      if (!l || q > l.quantity - l.returned)
        throw new Error("Lượng trả vượt phần còn được trả.");
      const v = product(l.variant_id);
      const amount =
        l.returned + q === l.quantity
          ? l.total - Math.round((l.total * l.returned) / l.quantity)
          : Math.round((l.total * q) / l.quantity);
      let cost = share(l.cost || 0, q, l.quantity);
      if (v.mode === "QUANTITY") {
        const b = balance(v.id);
        if (purchase) {
          if (b.available < q)
            throw new Error("Không đủ hàng trả nhà cung cấp.");
          cost = share(
            b.value || 0,
            q,
            b.available + b.reserved + b.quarantine,
          );
          b.available -= q;
          b.value = (b.value || 0) - cost;
        } else {
          b.quarantine += q;
          b.value = (b.value || 0) + cost;
        }
      } else {
        const u = s.units.find((u) => u.id === l.unit_id);
        if (
          !u ||
          u.status !== (purchase ? "AVAILABLE" : "SOLD") ||
          (!purchase && u.last_sale_line_id !== l.id)
        )
          throw new Error("Đơn vị đã trả hoặc không còn đủ điều kiện.");
        u.status = purchase ? "SUPPLIER_RETURNED" : "QUARANTINE";
        if (!purchase) {
          u.cost = cost;
          u.last_sale_line_id = undefined;
        }
      }
      l.returned += q;
      d.total += amount;
      d.cost = (d.cost || 0) + cost;
      d.lines.push({
        ...l,
        id: id(),
        quantity: q,
        total: amount,
        cost,
        original_line_id: l.id,
        returned: 0,
      });
      move(
        v,
        d,
        q,
        purchase ? "AVAILABLE" : "EXTERNAL",
        purchase ? "EXTERNAL" : "QUARANTINE",
        purchase ? -cost : cost,
      );
    });
    const refund = integer(p.refund ?? 0, "Tiền hoàn");
    const next = origin.balance - d.total;
    if (refund > Math.max(0, -next))
      throw new Error("Tiền hoàn vượt phần credit còn lại.");
    if (!origin.party_id && refund !== d.total)
      throw new Error("Khách lẻ phải hoàn đủ tiền hàng trả.");
    origin.balance = origin.party_id ? next + refund : 0;
    d.paid = refund;
    if (refund)
      d.payments = [
        {
          method: p.method === "BANK" ? "BANK" : "CASH",
          amount: refund,
          direction: purchase ? "IN" : "OUT",
        },
      ];
    add(d);
  } else if (command.operation === "status") {
    const u = s.units.find((x) => x.id === p.unit_id);
    if (
      !u ||
      !["AVAILABLE", "QUARANTINE", "REPAIR"].includes(u.status) ||
      !["AVAILABLE", "QUARANTINE", "REPAIR", "DISPOSED"].includes(
        text(p.status),
      )
    )
      throw new Error("Không thể đổi trạng thái thiết bị này.");
    const from = u.status;
    u.status = text(p.status) as typeof u.status;
    const d = doc("ADJUSTMENT", 0);
    move(
      product(u.variant_id),
      d,
      1,
      from,
      u.status,
      u.status === "DISPOSED" ? -(u.cost || 0) : 0,
      required(p.note, "lý do"),
    );
    add(d);
  } else if (command.operation === "adjust") {
    if (s.grants.some((g) => g.status === "ACTIVE"))
      throw new Error("Cần đóng và đối soát quyền offline trước kiểm kê.");
    if (integer(p.version, "Phiên bản sổ") !== s.store.version)
      throw new Error("Sổ kho đã thay đổi. Vui lòng tải lại số kiểm kê.");
    const v = product(text(p.variant_id));
    if (v.mode !== "QUANTITY")
      throw new Error("Kiểm kê số lượng áp dụng cho SKU QUANTITY.");
    const b = balance(v.id);
    const count = integer(p.count, "Số thực đếm"),
      delta = count - b.available;
    let value = 0;
    if (delta > 0) value = integer(p.unit_cost, "Giá vốn hàng thừa", 1) * delta;
    else if (delta < 0)
      value = -share(b.value || 0, -delta, b.available + b.quarantine);
    b.available = count;
    b.value = (b.value || 0) + value;
    const d = doc("ADJUSTMENT", Math.abs(value));
    d.note = required(p.note, "lý do kiểm kê");
    move(
      v,
      d,
      Math.abs(delta),
      delta >= 0 ? "EXTERNAL" : "AVAILABLE",
      delta >= 0 ? "AVAILABLE" : "EXTERNAL",
      value,
      d.note,
    );
    add(d);
  } else if (command.operation === "quantity_status") {
    const v = product(text(p.variant_id));
    const b = balance(v.id),
      q = integer(p.quantity, "Số lượng", 1);
    if (b.quarantine < q) throw new Error("Không đủ hàng cách ly.");
    b.quarantine -= q;
    b.available += q;
    const d = doc("ADJUSTMENT", 0);
    d.note = required(p.note, "lý do");
    move(v, d, q, "QUARANTINE", "AVAILABLE", 0, d.note);
    add(d);
  } else if (command.operation === "cost") {
    const u = s.units.find((x) => x.id === p.unit_id);
    if (!u || !["AVAILABLE", "QUARANTINE", "REPAIR", "SOLD"].includes(u.status))
      throw new Error("Thiết bị không đủ điều kiện ghi chi phí.");
    const amount = integer(p.amount, "Chi phí", 1);
    const d = doc("COST", amount);
    d.note = required(p.note, "nội dung chi phí");
    d.cost = u.status === "SOLD" ? amount : 0;
    d.original_id = u.last_sale_line_id;
    s.documents.find((x) => x.lines.some((l) => l.id === u.last_sale_line_id));
    if (u.status !== "SOLD") u.cost = (u.cost || 0) + amount;
    d.payments = [
      {
        method: p.method === "BANK" ? "BANK" : "CASH",
        direction: "OUT",
        amount,
      },
    ];
    move(
      product(u.variant_id),
      d,
      0,
      u.status,
      u.status,
      u.status === "SOLD" ? 0 : amount,
      d.note,
    );
    add(d);
  } else if (command.operation === "grant") {
    if (s.grants.some((g) => g.status === "ACTIVE"))
      throw new Error(
        "Đã có phiên cấp hàng offline. Hãy đối soát và đóng trước.",
      );
    const terminal = required(p.terminal_id, "máy quầy");
    const g: Grant = {
      id: id(),
      terminal_id: terminal,
      user_id: s.user_id,
      store_id: s.store.id,
      created_at: stamp,
      status: "ACTIVE",
      last_sequence: 0,
      lines: [],
    };
    (p.lines as CartLine[]).forEach((l) => {
      const v = product(l.variant_id),
        q = integer(l.quantity, "Hạn mức", 1);
      let identifier = "";
      if (v.mode === "QUANTITY") {
        const b = balance(v.id);
        if (b.available < q) throw new Error("Hạn mức vượt tồn.");
        b.available -= q;
        b.reserved += q;
      } else {
        const u = s.units.find(
          (u) => u.id === l.unit_id && u.variant_id === v.id,
        );
        if (!u || u.status !== "AVAILABLE" || q !== 1)
          throw new Error("Thiết bị không sẵn sàng.");
        u.status = "OFFLINE_RESERVED";
        identifier = u.identifier;
      }
      g.lines.push({
        id: id(),
        variant_id: v.id,
        unit_id: l.unit_id,
        quantity: q,
        consumed: 0,
        price: v.price,
        name: v.name,
        sku: v.sku,
        mode: v.mode,
        identifier,
        warranty_days: v.warranty_days,
      });
    });
    if (!g.lines.length) throw new Error("Chưa chọn hàng cấp.");
    s.grants.push(g);
    result = { id: g.id };
  } else if (command.operation === "release_grant") {
    const g = s.grants.find(
      (x) => x.id === p.grant_id && x.status === "ACTIVE",
    );
    if (!g) throw new Error("Không có phiên offline.");
    if (Number(p.last_sequence) !== g.last_sequence)
      throw new Error("Chưa đối soát đủ sequence.");
    g.lines.forEach((l) => {
      const v = product(l.variant_id),
        remain = l.quantity - l.consumed;
      if (v.mode === "QUANTITY") {
        const b = balance(v.id);
        b.reserved -= remain;
        b.available += remain;
      } else if (remain) {
        const u = s.units.find((x) => x.id === l.unit_id)!;
        u.status = "AVAILABLE";
      }
    });
    g.status = "CLOSED";
  } else if (command.operation === "warranty") {
    const d = s.documents.find(
        (d) =>
          d.kind === "SALE" && d.lines.some((l) => l.id === p.sale_line_id),
      ),
      l = d?.lines.find((l) => l.id === p.sale_line_id);
    if (!d || !l) throw new Error("Không tìm thấy dòng bán.");
    if (
      s.warranties.some((w) => w.sale_line_id === l.id && w.status !== "CLOSED")
    )
      throw new Error("Hàng đã có hồ sơ đang xử lý.");
    const w = {
      id: id(),
      sale_line_id: l.id,
      customer: d.party_name,
      product: l.name,
      identifier: l.identifier || l.sku,
      issue: required(p.issue, "mô tả lỗi"),
      status: "RECEIVED" as const,
      created_at: stamp,
      history: [{ at: stamp, status: "RECEIVED", note: text(p.issue) }],
    };
    s.warranties.unshift(w);
    result = { id: w.id };
  } else if (command.operation === "warranty_status") {
    const w = s.warranties.find((x) => x.id === p.id);
    if (!w) throw new Error("Không tìm thấy hồ sơ.");
    if (!["PROCESSING", "CLOSED"].includes(text(p.status)))
      throw new Error("Trạng thái không hợp lệ.");
    w.status = text(p.status) as typeof w.status;
    w.history.push({
      at: stamp,
      status: w.status,
      note: required(p.note, "kết quả xử lý"),
    });
  } else if (command.operation === "settings") {
    s.store.name = required(p.name, "tên cửa hàng");
    s.store.address = text(p.address);
    s.store.phone = text(p.phone);
    s.store.tax_note = required(p.tax_note, "ghi chú thuế");
    s.store.policies_approved = p.policies_approved === true;
  } else if (command.operation === "member") {
    throw new Error(
      "Chế độ minh họa không gửi lời mời. Kết nối Supabase để quản lý tài khoản thật.",
    );
  } else throw new Error("Thao tác chưa được hỗ trợ.");
  s.parties.forEach((p) => {
    p.ar = s.documents
      .filter((d) => d.party_id === p.id && d.kind === "SALE")
      .reduce((a, d) => a + d.balance, 0);
    p.ap = s.documents
      .filter((d) => d.party_id === p.id && d.kind === "PURCHASE")
      .reduce((a, d) => a + d.balance, 0);
  });
  s.store.version++;
  s.audit.unshift({
    id: id(),
    action: command.operation,
    name: "Nguyễn Minh · Chủ cửa hàng",
    at: stamp,
    code: result.code || "",
  });
  s.requests[command.request_id] = {
    payload: command.operation + hash,
    result,
  };
  return { state: s, result };
}

export function seedDemo(): DemoState {
  let s: DemoState = {
    store: {
      id: "demo-store",
      name: "Minh Phát Mobile",
      address: "128 Nguyễn Trãi, TP. Hồ Chí Minh",
      phone: "0901 234 567",
      policies_approved: false,
      tax_note: "Đang chờ xác nhận chính sách thuế và hóa đơn.",
      version: 0,
    },
    user_id: "demo-owner",
    role: "OWNER",
    products: [],
    units: [],
    balances: [],
    parties: [],
    documents: [],
    movements: [],
    audit: [],
    warranties: [],
    grants: [],
    members: [
      {
        user_id: "demo-owner",
        email: "minh@minhphat.vn",
        role: "OWNER",
        active: true,
      },
    ],
    requests: {},
  };
  const run = (operation: string, payload: Record<string, unknown>) => {
    const r = applyDemo(s, { request_id: id(), operation, payload });
    s = r.state;
    return r.result;
  };
  const supplier = run("party", {
    name: "Công ty TNHH Phân phối An Khang",
    phone: "028 3822 8888",
    type: "SUPPLIER",
  }).id!;
  const c1 = run("party", {
    name: "Nguyễn Hoàng Anh",
    phone: "0938 456 789",
    type: "CUSTOMER",
  }).id!;
  const c2 = run("party", {
    name: "Trần Thùy Linh",
    phone: "0912 345 678",
    type: "CUSTOMER",
  }).id!;
  run("party", { name: "Lê Minh Tuấn", phone: "0987 123 456", type: "BOTH" });
  const catalog = [
    {
      name: "iPhone 16 Pro Max",
      sku: "IP16PM-256-TN",
      brand: "Apple",
      color: "Titan Tự Nhiên",
      capacity: "256GB",
      mode: "IMEI",
      price: 29990000,
      hue: "#b6aa98",
      cost: 26300000,
      ids: ["490154203237518", "356938035643809"],
    },
    {
      name: "iPhone 15",
      sku: "IP15-128-XD",
      brand: "Apple",
      color: "Xanh Dương",
      capacity: "128GB",
      mode: "IMEI",
      price: 16490000,
      hue: "#b3cad5",
      cost: 13800000,
      ids: ["352099001761481"],
    },
    {
      name: "Galaxy S25 Ultra",
      sku: "S25U-256-X",
      brand: "Samsung",
      color: "Titan Xám",
      capacity: "256GB",
      mode: "IMEI",
      price: 26990000,
      hue: "#9694a2",
      cost: 23700000,
      ids: ["353879234567899"],
    },
    {
      name: "iPhone 13 · Đã qua sử dụng",
      sku: "IP13-128-CU",
      brand: "Apple",
      color: "Hồng",
      capacity: "128GB",
      mode: "IMEI",
      price: 8490000,
      hue: "#d8b7b7",
      cost: 6500000,
      ids: ["359881234567890"],
    },
    {
      name: "Cáp sạc USB-C 1m",
      sku: "CAP-USBC-1M",
      brand: "Anker",
      color: "Trắng",
      capacity: "",
      mode: "QUANTITY",
      price: 149000,
      hue: "#b0b5bc",
      cost: 65000,
      qty: 42,
    },
    {
      name: "Ốp lưng trong suốt MagSafe",
      sku: "OP-IP16-MG",
      brand: "Baseus",
      color: "Trong suốt",
      capacity: "iPhone 16",
      mode: "QUANTITY",
      price: 199000,
      hue: "#c3b9d7",
      cost: 80000,
      qty: 18,
    },
    {
      name: "Kính cường lực 9H",
      sku: "KINH-IP-9H",
      brand: "Nillkin",
      color: "Trong suốt",
      capacity: "iPhone",
      mode: "QUANTITY",
      price: 99000,
      hue: "#b2c9c5",
      cost: 30000,
      qty: 5,
    },
    {
      name: "Pin dự phòng 20.000mAh",
      sku: "PIN-ANK-20K",
      brand: "Anker",
      color: "Đen",
      capacity: "20.000mAh",
      mode: "SERIAL",
      price: 890000,
      hue: "#535e69",
      cost: 600000,
      ids: ["ANK-2026-0001", "ANK-2026-0002"],
    },
  ];
  // Deterministic valid IMEIs for demonstration fixtures, including leading zeroes.
  const imei = (value: string) => {
    const prefix = value.slice(0, 14);
    for (let i = 0; i < 10; i++) if (isImei(prefix + i)) return prefix + i;
    throw new Error("Invalid IMEI seed");
  };
  catalog.forEach((c) => {
    const pid = run("product", {
      ...c,
      min_stock: c.mode === "QUANTITY" ? 5 : 1,
      warranty_days: c.mode === "IMEI" ? 365 : 30,
    }).id!;
    const lines: CartLine[] = c.ids
      ? c.ids.map((code) => ({
          variant_id: pid,
          quantity: 1,
          price: c.cost,
          discount: 0,
          identifier: c.mode === "IMEI" ? imei(code) : code,
          condition: c.sku.includes("CU") ? "Cũ · Pin 91%" : "Mới",
        }))
      : [{ variant_id: pid, quantity: c.qty || 1, price: c.cost, discount: 0 }];
    run("purchase", {
      party_id: supplier,
      lines,
      payments: [
        { method: "BANK", amount: cartTotal(lines).total, direction: "OUT" },
      ],
      note: "Dữ liệu mẫu để trải nghiệm",
    });
  });
  const accessory = s.products.filter((x) => x.mode === "QUANTITY");
  for (let n = 0; n < 12; n++) {
    const v = accessory[n % 3];
    const d = run("sale", {
      party_id: n % 2 ? c1 : c2,
      lines: [{ variant_id: v.id, quantity: 1, price: v.price, discount: 0 }],
      payments:
        n % 4
          ? [
              {
                method: n % 2 ? "CASH" : "BANK",
                amount: v.price,
                direction: "IN",
              },
            ]
          : [],
    });
    const stored = s.documents.find((x) => x.id === d.id)!;
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(n / 2));
    date.setHours(9 + (n % 8), 20, 0, 0);
    stored.posted_at = date.toISOString();
  }
  const first = s.units.find((u) => u.variant_id === s.products[0].id)!;
  run("sale", {
    party_id: c1,
    lines: [
      {
        variant_id: first.variant_id,
        unit_id: first.id,
        quantity: 1,
        price: 29990000,
        discount: 0,
      },
    ],
    payments: [{ method: "BANK", amount: 25000000, direction: "IN" }],
  });
  s.audit = s.audit.slice(0, 15);
  return s;
}
