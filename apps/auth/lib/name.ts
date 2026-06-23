/** Split a single display name into first / rest. Last name may be "". */
export function splitName(name: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const [first, ...rest] = trimmed.split(/\s+/);
  return { firstName: first ?? "", lastName: rest.join(" ") };
}
