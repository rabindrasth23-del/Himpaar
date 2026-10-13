import { describe, expect, it } from "vitest";
import { formatBps, formatMoney, formatRateMicro, parseMajorToMinor, toMinorBigInt } from "./money.ts";

describe("formatMoney", () => {
  it("formats USD cents", () => {
    expect(formatMoney(100000n, "USD")).toBe("USD 1,000.00");
    expect(formatMoney("1000", "USD")).toBe("USD 10.00");
    expect(formatMoney(1n, "USD")).toBe("USD 0.01");
    expect(formatMoney(0n, "USD")).toBe("USD 0.00");
  });

  it("formats NPR paisa (the sample settlement)", () => {
    expect(formatMoney("13290750", "NPR")).toBe("NPR 132,907.50");
  });

  it("formats negative values", () => {
    expect(formatMoney(-5n, "USD")).toBe("-USD 0.05");
    expect(formatMoney("-123456789", "NPR")).toBe("-NPR 1,234,567.89");
  });

  it("keeps full precision above 2^53", () => {
    // 2^53 + 1 cannot be represented as a JavaScript number.
    expect(formatMoney("9007199254740993", "USD")).toBe("USD 90,071,992,547,409.93");
    expect(formatMoney(2n ** 64n, "NPR")).toBe("NPR 184,467,440,737,095,516.16");
    expect(formatMoney(-(2n ** 63n), "USD")).toBe("-USD 92,233,720,368,547,758.08");
  });

  it("rejects numbers, decimals and junk", () => {
    expect(() => formatMoney(10 as unknown as bigint, "USD")).toThrow(TypeError);
    expect(() => formatMoney("10.5", "USD")).toThrow(TypeError);
    expect(() => formatMoney("1e3", "USD")).toThrow(TypeError);
    expect(() => formatMoney("", "USD")).toThrow(TypeError);
    expect(() => formatMoney("007", "USD")).toThrow(TypeError);
  });
});

describe("toMinorBigInt", () => {
  it("accepts BigInt and integer strings", () => {
    expect(toMinorBigInt("-42")).toBe(-42n);
    expect(toMinorBigInt(7n)).toBe(7n);
  });
});

describe("parseMajorToMinor", () => {
  it("converts typed amounts with string maths", () => {
    expect(parseMajorToMinor("1000", "USD")).toBe(100000n);
    expect(parseMajorToMinor("1000.5", "USD")).toBe(100050n);
    expect(parseMajorToMinor("0.01", "USD")).toBe(1n);
    expect(parseMajorToMinor("90071992547409.93", "USD")).toBe(9007199254740993n);
  });

  it("refuses more than two decimals and bad input", () => {
    expect(parseMajorToMinor("1.005", "USD")).toBeNull();
    expect(parseMajorToMinor("-1", "USD")).toBeNull();
    expect(parseMajorToMinor("abc", "USD")).toBeNull();
  });
});

describe("rate and fee display", () => {
  it("formats the simulated rate", () => {
    expect(formatRateMicro("134250000")).toBe("134.25");
    expect(formatRateMicro("134256789")).toBe("134.256789");
  });
  it("formats basis points", () => {
    expect(formatBps(100)).toBe("1.00%");
    expect(formatBps(275)).toBe("2.75%");
  });
});
