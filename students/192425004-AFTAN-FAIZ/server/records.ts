// Never silently label a partial first page as the entire workforce.
export async function readRecords<T>(
  page: (offset: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const data: T[] = [];
  for (let offset = 0; offset < 10000; offset += 500) {
    const result = await page(offset);
    if (result.error) return { data: [] as T[], error: result.error };
    data.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) return { data, error: null };
  }
  throw new Error(
    "Workspace exceeds the supported record window. Narrow the reporting period before loading.",
  );
}
