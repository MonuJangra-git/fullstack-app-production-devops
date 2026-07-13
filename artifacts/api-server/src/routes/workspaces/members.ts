import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, workspaceMembersTable } from "@workspace/db";
import {
  InviteWorkspaceMemberBody,
  InviteWorkspaceMemberParams,
  ListWorkspaceMembersParams,
  ListWorkspaceMembersResponse,
  RemoveWorkspaceMemberParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../../middlewares/requireAuth";
import { getMembershipRole } from "../../lib/workspaceAccess";

const router: IRouter = Router();
router.use(requireAuth);

router.get(
  "/workspaces/:workspaceId/members",
  async (req, res): Promise<void> => {
    const { userId } = req as unknown as AuthedRequest;
    const params = ListWorkspaceMembersParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const role = await getMembershipRole(params.data.workspaceId, userId);
    if (!role) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    const members = await db
      .select()
      .from(workspaceMembersTable)
      .where(eq(workspaceMembersTable.workspaceId, params.data.workspaceId))
      .orderBy(workspaceMembersTable.createdAt);

    res.json(ListWorkspaceMembersResponse.parse(members));
  },
);

router.post(
  "/workspaces/:workspaceId/members",
  async (req, res): Promise<void> => {
    const { userId } = req as unknown as AuthedRequest;
    const params = InviteWorkspaceMemberParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const role = await getMembershipRole(params.data.workspaceId, userId);
    if (role !== "owner" && role !== "admin") {
      res
        .status(403)
        .json({ error: "Only owners and admins can invite members" });
      return;
    }

    const parsed = InviteWorkspaceMemberBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const email = parsed.data.email.toLowerCase();

    const [existing] = await db
      .select()
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, params.data.workspaceId),
          eq(workspaceMembersTable.email, email),
        ),
      );
    if (existing) {
      res.status(409).json({ error: "This email is already a member" });
      return;
    }

    const [member] = await db
      .insert(workspaceMembersTable)
      .values({
        workspaceId: params.data.workspaceId,
        email,
        role: parsed.data.role ?? "member",
        status: "pending",
      })
      .returning();

    res.status(201).json(member);
  },
);

router.delete(
  "/workspaces/:workspaceId/members/:memberId",
  async (req, res): Promise<void> => {
    const { userId } = req as unknown as AuthedRequest;
    const params = RemoveWorkspaceMemberParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const role = await getMembershipRole(params.data.workspaceId, userId);
    if (role !== "owner" && role !== "admin") {
      res
        .status(403)
        .json({ error: "Only owners and admins can remove members" });
      return;
    }

    const [target] = await db
      .select()
      .from(workspaceMembersTable)
      .where(eq(workspaceMembersTable.id, params.data.memberId));

    if (target?.role === "owner") {
      res.status(403).json({ error: "Cannot remove the workspace owner" });
      return;
    }

    await db
      .delete(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.id, params.data.memberId),
          eq(workspaceMembersTable.workspaceId, params.data.workspaceId),
        ),
      );

    res.sendStatus(204);
  },
);

export default router;
