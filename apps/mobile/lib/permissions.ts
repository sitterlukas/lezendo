// Mirror of the server's canModify rule (apps/web/lib/api/auth.ts): an owner or
// an admin may edit/delete. The DELETE endpoints enforce this too — this just
// gates whether to show the affordance.
export function canModify(
  viewer: { id: number; role: string } | null | undefined,
  ownerId: number | null,
): boolean {
  return !!viewer && (viewer.role === "admin" || viewer.id === ownerId);
}
