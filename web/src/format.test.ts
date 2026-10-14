import { describe, expect, it } from "vitest";
import { formatDuration, inr } from "./format";

describe("format helpers", () => {
  it("formats Indian rupee amounts with Indian digit grouping", () => {
    expect(inr(1234567)).toBe("₹12,34,567");
    expect(inr(99.5)).toBe("₹99.5");
  });

  it("formats durations as padded hours, minutes, and seconds", () => {
    expect(formatDuration(3_723_000)).toBe("01:02:03");
    expect(formatDuration(90_061_000)).toBe("25:01:01");
    expect(formatDuration(0)).toBe("00:00:00");
    expect(formatDuration(-1000)).toBe("00:00:00");
  });
});
