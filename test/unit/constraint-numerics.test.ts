import { describe, expect, it } from "vitest";
import { WorkingScalar } from "../../src/constraints/constraint-numerics.js";
import { XFrameError } from "../../src/errors/xframe-error.js";

describe("constraint working scalar", () => {
  it("compensated working scalar retains 1e16 + 1 - 1e16 = 1", () => {
    const scalar = new WorkingScalar(1e16);
    scalar.add(1);
    scalar.add(-1e16);
    expect(scalar.total("test")).toBe(1);
  });

  it("divideBy preserves compensation: (1e16 + 1 - 1e16) / 2 = 0.5", () => {
    const scalar = new WorkingScalar(1e16);
    scalar.add(1);
    scalar.add(-1e16);
    scalar.divideBy(2, "test");
    expect(scalar.total("test")).toBe(0.5);
  });

  it("rejects nonfinite initial values and deltas structurally", () => {
    expect(() => new WorkingScalar(Number.POSITIVE_INFINITY)).toThrow(XFrameError);
    const scalar = new WorkingScalar(1);
    expect(() => scalar.add(Number.NaN)).toThrow(XFrameError);
  });

  it("rejects zero-divisor division structurally", () => {
    const scalar = new WorkingScalar(1);
    expect(() => scalar.divideBy(0, "test")).toThrow(XFrameError);
  });

  it("underflowing division fails closed instead of silently zeroing", () => {
    let thrown: unknown;
    try {
      const scalar = new WorkingScalar(Number.MIN_VALUE);
      scalar.divideBy(Number.MAX_VALUE, "test");
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(XFrameError);
    expect((thrown as XFrameError).code).toBe("NON_FINITE_VALUE");
  });
});
