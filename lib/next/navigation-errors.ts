import { isNotFoundError } from "next/dist/client/components/not-found";
import { isRedirectError } from "next/dist/client/components/redirect";

export function rethrowNextNavigationErrors(err: unknown): void {
  if (isRedirectError(err) || isNotFoundError(err)) throw err;
}
