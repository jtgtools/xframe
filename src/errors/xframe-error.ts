import type { CauseSummary, XFrameErrorContext } from "./error-context.js";
import type { XFrameErrorCode } from "./error-code.js";

export interface XFrameErrorOptions {
  readonly cause?: unknown;
}

interface XFrameErrorJson {
  readonly name: "XFrameError";
  readonly code: XFrameErrorCode;
  readonly message: string;
  readonly context: XFrameErrorContext;
  readonly causeSummary?: CauseSummary;
}

function cloneAndFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => cloneAndFreeze(entry))) as T;
  }

  if (value !== null && typeof value === "object") {
    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      Object.defineProperty(copy, key, {
        value: cloneAndFreeze(entry),
        enumerable: true,
        configurable: false,
        writable: false,
      });
    }
    return Object.freeze(copy) as T;
  }

  return value;
}

function summarizeCause(cause: unknown): CauseSummary | undefined {
  if (cause === undefined) {
    return undefined;
  }

  if (cause instanceof Error) {
    const candidateCode = (cause as Error & { readonly code?: unknown }).code;
    const summary: { name: string; message: string; code?: string } = {
      name: cause.name || "Error",
      message: cause.message,
    };
    if (typeof candidateCode === "string" || typeof candidateCode === "number") {
      summary.code = String(candidateCode);
    }
    return Object.freeze(summary);
  }

  return Object.freeze({
    name: typeof cause,
    message: String(cause),
  });
}

export class XFrameError extends Error {
  public readonly code: XFrameErrorCode;
  public readonly context: XFrameErrorContext;
  public readonly causeSummary: CauseSummary | undefined;

  public constructor(
    code: XFrameErrorCode,
    message: string,
    context: XFrameErrorContext,
    options: XFrameErrorOptions = {},
  ) {
    super(message);
    this.name = "XFrameError";
    this.code = code;
    this.context = cloneAndFreeze(context);
    this.causeSummary = summarizeCause(options.cause);
  }

  public toJSON(): XFrameErrorJson {
    const base = {
      name: "XFrameError" as const,
      code: this.code,
      message: this.message,
      context: this.context,
    };
    return this.causeSummary === undefined ? base : { ...base, causeSummary: this.causeSummary };
  }
}
