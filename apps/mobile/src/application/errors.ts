import { DomainError } from "@famigo/domain";

export type ApplicationErrorKind = "domain" | "infrastructure" | "configuration";

export class ApplicationError extends Error {
  readonly code: string;
  readonly kind: ApplicationErrorKind;
  override readonly cause?: unknown;

  constructor(params: {
    code: string;
    kind: ApplicationErrorKind;
    message: string;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = "ApplicationError";
    this.code = params.code;
    this.kind = params.kind;
    this.cause = params.cause;
  }
}

export function createApplicationError(params: {
  code: string;
  kind: ApplicationErrorKind;
  message: string;
  cause?: unknown;
}): ApplicationError {
  return new ApplicationError(params);
}

export function toApplicationError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) {
    return error;
  }

  if (error instanceof DomainError) {
    return new ApplicationError({
      code: error.code,
      kind: "domain",
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)) {
    return new ApplicationError({
      code: error.message,
      kind: "infrastructure",
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new ApplicationError({
      code: "INFRASTRUCTURE_ERROR",
      kind: "infrastructure",
      message: error.message,
      cause: error,
    });
  }

  return new ApplicationError({
    code: "UNKNOWN_ERROR",
    kind: "infrastructure",
    message: "Une erreur inattendue est survenue.",
    cause: error,
  });
}
