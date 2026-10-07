import { ApiClientError } from "./client";

export function getApiErrorCode(error: unknown): string | undefined {
  if (error instanceof ApiClientError) {
    return error.body?.code;
  }
  return undefined;
}
