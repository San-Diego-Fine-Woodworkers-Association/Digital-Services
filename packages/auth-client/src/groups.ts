/**
 * Pure group-membership predicates. Safe to use in Next.js middleware (no
 * fetch, no Node-only APIs). Group comparisons are case-sensitive — Workspace
 * group emails are canonically lowercase, so callers should compare against
 * lowercase constants.
 *
 * Default-closed: an empty `userGroups` array yields false for hasGroup /
 * hasAnyGroup / hasAllGroups (when there is at least one required group).
 */

export function hasGroup(userGroups: string[], group: string): boolean {
  return userGroups.includes(group);
}

export function hasAnyGroup(userGroups: string[], allowed: string[]): boolean {
  if (allowed.length === 0) return false;
  return allowed.some((g) => userGroups.includes(g));
}

export function hasAllGroups(userGroups: string[], required: string[]): boolean {
  if (required.length === 0) return false;
  return required.every((g) => userGroups.includes(g));
}
