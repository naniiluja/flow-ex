export type ErrorKind = "transient" | "needs_user" | "fatal";

export interface AppErrorOptions {
  code: string;
  errorKind: ErrorKind;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
}

/** Standard domain error shape — see ../../.claude/rules/error-handling.md */
export class AppError extends Error {
  readonly code: string;
  readonly errorKind: ErrorKind;
  readonly context: Record<string, unknown> | undefined;

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "AppError";
    this.code = options.code;
    this.errorKind = options.errorKind;
    this.context = options.context;
  }
}
