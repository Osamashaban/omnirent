// Server actions can be called directly with any values, not only the ones
// the page sends. These checks reject anything that isn't the expected shape
// before it reaches the database.

export function isRowId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64;
}

export function isFlag(value: unknown): value is boolean {
  return typeof value === "boolean";
}
