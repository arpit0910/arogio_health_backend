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
