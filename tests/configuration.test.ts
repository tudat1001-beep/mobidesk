import "fake-indexeddb/auto";
import { beforeAll, describe, it, expect, vi } from "vitest";
let config: typeof import("../src/lib/configuration");
beforeAll(async () => {
  const values = new Map<string, string>();
  vi.stubGlobal("navigator", { onLine: false });
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => values.get(k) || null,
    setItem: (k: string, v: string) => values.set(k, v),
  });
  config = await import("../src/lib/configuration");
});
describe("per-customer installation", () => {
  it("rejects privileged keys and arbitrary credential destinations", () => {
    expect(() =>
      config.validateConfig({
        customer: "A",
        url: "https://example.com",
        publishableKey: "sb_publishable_test",
      }),
    ).toThrow("Project URL");
    expect(() =>
      config.validateConfig({
        customer: "A",
        url: "https://project.supabase.co",
        publishableKey: "sb_secret_do-not-use",
      }),
    ).toThrow("secret");
    const jwt = `a.${btoa(JSON.stringify({ role: "service_role" }))}.z`;
    expect(() =>
      config.validateConfig({
        customer: "A",
        url: "https://project.supabase.co",
        publishableKey: jwt,
      }),
    ).toThrow("đặc quyền");
  });
  it("accepts only explicit public installation settings", () => {
    expect(
      config.validateConfig({
        customer: " Khách A ",
        url: "https://alpha.supabase.co/",
        publishableKey: "sb_publishable_fake_test_fixture",
      }),
    ).toEqual({
      customer: "Khách A",
      url: "https://alpha.supabase.co",
      publishableKey: "sb_publishable_fake_test_fixture",
    });
  });
  it("locks setup locally without persisting its passphrase", async () => {
    await expect(config.unlockSetup("short")).rejects.toThrow("8 ký tự");
    await config.unlockSetup("test-only-operator-passphrase");
    expect(localStorage.getItem("mobidesk-setup-lock")).not.toContain(
      "test-only",
    );
    await expect(config.unlockSetup("wrong-password")).rejects.toThrow(
      "không đúng",
    );
    expect(await config.unlockSetup("test-only-operator-passphrase")).toBe(
      true,
    );
  });
});
