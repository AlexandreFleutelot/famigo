import type { ApplicationError } from "./errors";
import { toApplicationError } from "./errors";

export type UseCaseResult<TData> =
  | {
      ok: true;
      data: TData;
    }
  | {
      ok: false;
      error: ApplicationError;
    };

export async function executeUseCase<TData>(
  run: () => Promise<TData>
): Promise<UseCaseResult<TData>> {
  try {
    return {
      ok: true,
      data: await run(),
    };
  } catch (error) {
    return {
      ok: false,
      error: toApplicationError(error),
    };
  }
}
