import { and, eq } from "drizzle-orm";
import { db, workspaceMembersTable } from "@workspace/db";

export type WorkspaceRole = "owner" | "admin" | "member";

/**
 * Returns the caller's active membership role in a workspace, or null if
 * they are not an active member (or the workspace does not exist).
 */
export async function getMembershipRole(
  workspaceId: number,
  userId: string,
): Promise<WorkspaceRole | null> {
  const [membership] = await db
    .select({ role: workspaceMembersTable.role })
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        eq(workspaceMembersTable.userId, userId),
        eq(workspaceMembersTable.status, "active"),
      ),
    );
  return (membership?.role as WorkspaceRole | undefined) ?? null;
}
