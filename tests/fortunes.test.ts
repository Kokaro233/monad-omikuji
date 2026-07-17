import { describe, expect, it, vi } from "vitest";
import { FORTUNES, drawWeightedFortune, getFortune, stars } from "@/src/lib/fortunes";

describe("fortune catalog", () => {
  it("contains the seven weighted Japanese outcomes totaling 100%", () => {
    expect(FORTUNES).toHaveLength(7);
    expect(FORTUNES.reduce((total, item) => total + item.weight, 0)).toBe(100);
    expect(FORTUNES.map((item) => item.kanji)).toEqual(["大吉", "中吉", "小吉", "吉", "末吉", "凶", "大凶"]);
  });

  it("uses exact catalog boundaries", () => {
    expect(drawWeightedFortune(0).id).toBe(0);
    expect(drawWeightedFortune(4.99).id).toBe(0);
    expect(drawWeightedFortune(5).id).toBe(1);
    expect(drawWeightedFortune(94.99).id).toBe(5);
    expect(drawWeightedFortune(95).id).toBe(6);
  });

  it("falls back safely and renders five-star ratings", () => {
    expect(getFortune(999).kanji).toBe("吉");
    expect(stars(3)).toBe("★★★☆☆");
  });
});
