import { ApiClientError } from "./client";

export function getApiErrorCode(error: unknown): string | undefined {
  if (error instanceof ApiClientError) {
    return error.code;
  }
  return undefined;
}
