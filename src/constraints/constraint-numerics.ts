import { XFrameError } from "../errors/xframe-error.js";
import { finiteNumber } from "../geometry/finite.js";

/**
 * Compiler-side compensated working scalar for the rank engine. Kept
 * independent of the shared compensatedCoefficientSum oracle on purpose:
 * the rank engine needs incremental add/divideBy with per-step bounds,
 * while the shared helper is a one-shot deterministic sum.
 */
export class WorkingScalar {
  private sum: number;
  private compensation: number;

  public constructor(valueInput: number) {
    this.sum = finiteNumber(valueInput, "workingScalar.initial");
    this.compensation = 0;
  }

  public add(deltaInput: number): void {
    const delta = finiteNumber(deltaInput, "workingScalar.delta");
    const next = this.sum + delta;
    if (Math.abs(this.sum) >= Math.abs(delta)) {
      this.compensation += this.sum - next + delta;
    } else {
      this.compensation += delta - next + this.sum;
    }
    this.sum = next;
  }

  public total(path: string): number {
    return finiteNumber(this.sum + this.compensation, path);
  }

  public divideBy(divisorInput: number, path: string): void {
    const divisor = finiteNumber(divisorInput, `${path}Divisor`);
    if (divisor === 0) {
      throw new XFrameError(
        "CONSTRAINT_RANK_DEFICIENT",
        "Working scalar division by zero would corrupt the constraint system.",
        {
          kind: "analysis",
          stage: "constraint-rank",
          detail: `path=${path}`,
        },
      );
    }
    const before = this.sum + this.compensation;
    this.sum = finiteNumber(this.sum / divisor, `${path}Sum`);
    this.compensation = finiteNumber(this.compensation / divisor, `${path}Compensation`);
    const after = this.sum + this.compensation;
    if (before !== 0 && after === 0) {
      throw new XFrameError(
        "NON_FINITE_VALUE",
        "Working scalar division underflowed to zero: the scaled ratio is below the representable number range.",
        {
          kind: "analysis",
          stage: "constraint-rank",
          detail: `path=${path}, before=${String(before)}, divisor=${String(divisor)}`,
        },
      );
    }
  }
}
