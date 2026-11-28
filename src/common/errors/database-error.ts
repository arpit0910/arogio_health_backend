/** Drizzle wraps driver errors in `cause`; only inspect structured error codes. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const visited = new Set<unknown>();
  let current = error;
  while (typeof current === 'object' && current !== null && !visited.has(current)) {
    visited.add(current);
    const candidate = current as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (candidate.code === '23505' && (!constraint || candidate.constraint === constraint))
      return true;
    current = candidate.cause;
  }
  return false;
}

/** Safe diagnostic codes only; never return driver messages, SQL or parameters. */
export function getDatabaseErrorCode(error: unknown): string | undefined {
  const visited = new Set<unknown>();
  let current = error;
  const networkCodes = new Set([
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ENETUNREACH',
    'SELF_SIGNED_CERT_IN_CHAIN',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    'CERT_HAS_EXPIRED',
  ]);
  while (typeof current === 'object' && current !== null && !visited.has(current)) {
    visited.add(current);
    const candidate = current as { code?: unknown; cause?: unknown };
    if (
      typeof candidate.code === 'string' &&
      (/^[0-9A-Z]{5}$/.test(candidate.code) || networkCodes.has(candidate.code))
    ) {
      return candidate.code;
    }
    current = candidate.cause;
  }
  return undefined;
}
