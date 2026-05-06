export function cleanNulls<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value != null) {
      result[key as keyof T] = value;
    }
  }
  return result;
}
