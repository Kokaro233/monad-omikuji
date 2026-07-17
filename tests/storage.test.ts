import { beforeEach, describe, expect, it } from "vitest";
import { canDrawDemoToday, storage } from "@/src/lib/storage";
import type { DrawResult } from "@/src/types";

describe("demo persistence", () => {
  beforeEach(() => localStorage.clear());
  it("allows ten daily draws and prevents an eleventh on the same UTC day", () => {
    const wallet = "0x1111111111111111111111111111111111111111";
    expect(canDrawDemoToday(wallet)).toBe(true);
    const result: DrawResult = { id: "one", fortuneId: 0, walletAddress: wallet, txHash: `0x${"a".repeat(64)}`, createdAt: new Date().toISOString(), chainId: 10143, claimed: true, favorite: false, mode: "demo" };
    storage.saveHistory(Array.from({ length: 10 }, (_, index) => ({ ...result, id: `draw-${index}` })));
    expect(canDrawDemoToday(wallet)).toBe(false);
    expect(canDrawDemoToday("0x2222222222222222222222222222222222222222")).toBe(true);
  });
});
