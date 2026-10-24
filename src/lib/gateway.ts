import { createClient } from "@supabase/supabase-js";
import type { Command, Snapshot, CommandResult } from "../domain/types";
import type { Document } from "../domain/types";
import { executeDemo, getDemo } from "./storage";
import { installation, projectNamespace } from "./configuration";
const config = installation.config;
export const supabase = config
  ? createClient(config.url, config.publishableKey, {
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: init?.signal
              ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)])
              : AbortSignal.timeout(15000),
          }),
      },
      auth: { storageKey: `mobidesk-auth-${projectNamespace}` },
    })
  : null;
export const configured = !!supabase;
export async function loadHistory(
  store: string,
  query: string,
  kind: string,
  offset: number,
): Promise<Document[]> {
  const { data, error } = await supabase!.rpc("app_history", {
    p_store: store,
    p_query: query,
    p_kind: kind,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return data as Document[];
}
export async function snapshot(
  demo: boolean,
  storeId?: string,
): Promise<Snapshot> {
  if (demo) return getDemo();
  if (!supabase) throw new Error("Chưa cấu hình Supabase.");
  const { data, error } = await supabase.rpc("app_snapshot", {
    p_store: storeId || null,
  });
  if (error) throw new Error(error.message);
  return data as Snapshot;
}
export async function execute(
  demo: boolean,
  store: string,
  c: Command,
): Promise<CommandResult> {
  if (demo) return executeDemo(c);
  if (!supabase) throw new Error("Chưa cấu hình Supabase.");
  const { data, error } = await supabase.rpc("app_execute", {
    p_store: store,
    p_request: c.request_id,
    p_operation: c.operation,
    p_payload: c.payload,
  });
  if (error) throw new Error(error.message);
  return data as CommandResult;
}
export async function bootstrap(name: string) {
  if (!supabase) throw new Error("Chưa cấu hình Supabase.");
  const { data, error } = await supabase.rpc("app_create_store", {
    p_name: name,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
