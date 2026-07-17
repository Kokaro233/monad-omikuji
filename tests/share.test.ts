import { describe, expect, it } from "vitest";
import { buildFortuneShareUrl, getSharedFortuneId } from "@/src/lib/share";

describe("fortune share links", () => {
  it("keeps the shared fortune id in a portable result URL", () => {
    expect(buildFortuneShareUrl("https://example.com", 2)).toBe("https://example.com/result?fortune=2");
    expect(getSharedFortuneId("?fortune=2")).toBe(2);
  });

  it("rejects missing or unknown fortune ids", () => {
    expect(getSharedFortuneId("")).toBeNull();
    expect(getSharedFortuneId("?fortune=99")).toBeNull();
    expect(getSharedFortuneId("?fortune=oops")).toBeNull();
  });
});
