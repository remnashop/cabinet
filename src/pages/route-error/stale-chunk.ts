/** A deploy removed the chunks an open tab still points at: its lazy pages can't load any more. */
export function isStaleChunkError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(error.message)
  );
}
