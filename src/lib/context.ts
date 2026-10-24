import { createContext, useContext } from "react";
import type { CommandResult, Snapshot, OfflineReceipt } from "../domain/types";
export interface AppContextValue {
  data: Snapshot;
  demo: boolean;
  online: boolean;
  busy: boolean;
  terminal: string;
  outbox: OfflineReceipt[];
  run: (
    operation: string,
    payload: Record<string, unknown>,
    requestId?: string,
  ) => Promise<CommandResult>;
  refresh: () => Promise<void>;
  navigate: (page: string) => void;
  modal: (kind: string, value?: unknown) => void;
  notify: (message: string, error?: boolean) => void;
  refreshOutbox: () => Promise<void>;
}
export const AppContext = createContext<AppContextValue | null>(null);
export const useApp = () => {
  const c = useContext(AppContext);
  if (!c) throw new Error("Missing context");
  return c;
};
