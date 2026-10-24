import { useId, useState, type InputHTMLAttributes } from "react";
import { parseVnd } from "../lib/pos";
const formatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "type" | "min" | "step"
> & {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
};
export function MoneyInput({
  value,
  defaultValue = 0,
  onChange,
  name,
  ...props
}: Props) {
  const [local, setLocal] = useState(defaultValue),
    [editing, setEditing] = useState(false),
    [raw, setRaw] = useState(""),
    id = useId();
  const amount = value ?? local,
    invalid = !Number.isFinite(amount);
  return (
    <span className="money-control">
      <input
        {...props}
        type="text"
        inputMode="numeric"
        enterKeyHint="done"
        autoComplete="off"
        spellCheck={false}
        value={editing || invalid ? raw : formatter.format(amount)}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? id : props["aria-describedby"]}
        pattern="(?:[0-9]+|[0-9]{1,3}(?:\.[0-9]{3})+)"
        onFocus={(e) => {
          setEditing(true);
          setRaw(Number.isFinite(amount) ? String(amount) : raw);
          const input = e.currentTarget;
          requestAnimationFrame(() => input.select());
        }}
        onBlur={() => setEditing(false)}
        onChange={(e) => {
          setRaw(e.target.value);
          const next = parseVnd(e.target.value, props.required);
          setLocal(next);
          onChange?.(next);
        }}
      />
      {name && (
        <input
          type="hidden"
          name={name}
          value={Number.isFinite(amount) ? amount : ""}
        />
      )}
      {invalid && (
        <small id={id} className="danger-text">
          Nhập số tiền nguyên, ví dụ 149000 hoặc 149.000.
        </small>
      )}
    </span>
  );
}
