import { Router, type IRouter } from "express";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  projectsTable,
  tasksTable,
  workspaceMembersTable,
  workspacesTable,
} from "@workspace/db";
import {
  CreateWorkspaceBody,
  DeleteWorkspaceParams,
  GetWorkspaceParams,
  GetWorkspaceResponse,
  ListWorkspacesResponse,
  ListWorkspacesResponseItem,
  UpdateWorkspaceBody,
  UpdateWorkspaceParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../../middlewares/requireAuth";
import { getMembershipRole } from "../../lib/workspaceAccess";
import { getUserPrimaryEmail } from "../../lib/clerkUsers";
import membersRouter from "./members";

type WorkspaceItem = z.infer<typeof ListWorkspacesResponseItem>;

const router: IRouter = Router();
router.use(requireAuth);

/** Activates any pending invites created for this user's email address. */
async function activatePendingInvites(userId: string): Promise<void> {
  const email = await getUserPrimaryEmail(userId);
  if (!email) return;

  await db
    .update(workspaceMembersTable)
    .set({ userId, status: "active" })
    .where(
      and(
        eq(workspaceMembersTable.email, email),
        eq(workspaceMembersTable.status, "pending"),
      ),
    );
}

/** Creates a personal workspace + a starter project for a brand-new user. */
async function bootstrapPersonalWorkspace(userId: string): Promise<void> {
  const email = (await getUserPrimaryEmail(userId)) ?? `${userId}@unknown`;

  const [workspace] = await db
    .insert(workspacesTable)
    .values({ name: "My Tasks", type: "personal", ownerId: userId })
    .returning();

  if (!workspace) return;

  await db.insert(workspaceMembersTable).values({
    workspaceId: workspace.id,
    email,
    userId,
    role: "owner",
    status: "active",
  });

  await db.insert(projectsTable).values({
    workspaceId: workspace.id,
    name: "Getting Started",
    description: "Your first project",
    color: "#6366f1",
  });
}

async function buildWorkspaceListItems(
  userId: string,
): Promise<WorkspaceItem[]> {
  const memberships = await db
    .select({
      workspaceId: workspaceMembersTable.workspaceId,
      role: workspaceMembersTable.role,
    })
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.userId, userId),
        eq(workspaceMembersTable.status, "active"),
      ),
    );

  if (memberships.length === 0) return [];

  const workspaceIds = memberships.map((m) => m.workspaceId);
  const roleByWorkspaceId = new Map(
    memberships.map((m) => [m.workspaceId, m.role]),
  );

  const workspaces = await db
    .select()
    .from(workspacesTable)
    .where(inArray(workspacesTable.id, workspaceIds));

  const memberCounts = await db
    .select({
      workspaceId: workspaceMembersTable.workspaceId,
      count: sql<number>`count(*)::int`,
    })
    .from(workspaceMembersTable)
    .where(
      and(
        inArray(workspaceMembersTable.workspaceId, workspaceIds),
        eq(workspaceMembersTable.status, "active"),
      ),
    )
    .groupBy(workspaceMembersTable.workspaceId);
  const memberCountByWorkspaceId = new Map(
    memberCounts.map((m) => [m.workspaceId, m.count]),
  );

  const projectCounts = await db
    .select({
      workspaceId: projectsTable.workspaceId,
      count: sql<number>`count(*)::int`,
    })
    .from(projectsTable)
    .where(inArray(projectsTable.workspaceId, workspaceIds))
    .groupBy(projectsTable.workspaceId);
  const projectCountByWorkspaceId = new Map(
    projectCounts.map((p) => [p.workspaceId, p.count]),
  );

  const taskCounts = await db
    .select({
      workspaceId: tasksTable.workspaceId,
      count: sql<number>`count(*)::int`,
    })
    .from(tasksTable)
    .where(inArray(tasksTable.workspaceId, workspaceIds))
    .groupBy(tasksTable.workspaceId);
  const taskCountByWorkspaceId = new Map(
    taskCounts.map((t) => [t.workspaceId, t.count]),
  );

  return workspaces.map((w) => ({
    id: w.id,
    name: w.name,
    type: w.type,
    role: roleByWorkspaceId.get(w.id) ?? "member",
    memberCount: memberCountByWorkspaceId.get(w.id) ?? 0,
    projectCount: projectCountByWorkspaceId.get(w.id) ?? 0,
    taskCount: taskCountByWorkspaceId.get(w.id) ?? 0,
    createdAt: w.createdAt,
  }));
}

router.get("/workspaces", async (req, res): Promise<void> => {
  const { userId } = req as unknown as AuthedRequest;

  await activatePendingInvites(userId);

  let items = await buildWorkspaceListItems(userId);
  if (items.length === 0) {
    await bootstrapPersonalWorkspace(userId);
    items = await buildWorkspaceListItems(userId);
  }

  res.json(ListWorkspacesResponse.parse(items));
});

router.post("/workspaces", async (req, res): Promise<void> => {
  const { userId } = req as unknown as AuthedRequest;
  const parsed = CreateWorkspaceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = (await getUserPrimaryEmail(userId)) ?? `${userId}@unknown`;

  const [workspace] = await db
    .insert(workspacesTable)
    .values({
      name: parsed.data.name,
      type: parsed.data.type ?? "team",
      ownerId: userId,
    })
    .returning();

  if (!workspace) {
    res.status(500).json({ error: "Failed to create workspace" });
    return;
  }

  await db.insert(workspaceMembersTable).values({
    workspaceId: workspace.id,
    email,
    userId,
    role: "owner",
    status: "active",
  });

  res.status(201).json(
    GetWorkspaceResponse.parse({
      id: workspace.id,
      name: workspace.name,
      type: workspace.type,
      role: "owner",
      memberCount: 1,
      projectCount: 0,
      taskCount: 0,
      createdAt: workspace.createdAt,
    }),
  );
});

router.get("/workspaces/:workspaceId", async (req, res): Promise<void> => {
  const { userId } = req as unknown as AuthedRequest;
  const params = GetWorkspaceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const role = await getMembershipRole(params.data.workspaceId, userId);
  if (!role) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const items: WorkspaceItem[] = await buildWorkspaceListItems(userId);
  const item = items.find((w) => w.id === params.data.workspaceId);
  if (!item) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  res.json(GetWorkspaceResponse.parse(item));
});

router.patch("/workspaces/:workspaceId", async (req, res): Promise<void> => {
  const { userId } = req as unknown as AuthedRequest;
  const params = UpdateWorkspaceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const role = await getMembershipRole(params.data.workspaceId, userId);
  if (role !== "owner" && role !== "admin") {
    res.status(403).json({ error: "Only owners and admins can edit a workspace" });
    return;
  }

  const parsed = UpdateWorkspaceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .update(workspacesTable)
    .set(parsed.data)
    .where(eq(workspacesTable.id, params.data.workspaceId));

  const items: WorkspaceItem[] = await buildWorkspaceListItems(userId);
  const item = items.find((w) => w.id === params.data.workspaceId);
  if (!item) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  res.json(GetWorkspaceResponse.parse(item));
});

router.delete("/workspaces/:workspaceId", async (req, res): Promise<void> => {
  const { userId } = req as unknown as AuthedRequest;
  const params = DeleteWorkspaceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const role = await getMembershipRole(params.data.workspaceId, userId);
  if (role !== "owner") {
    res.status(403).json({ error: "Only the owner can delete a workspace" });
    return;
  }

  await db
    .delete(workspacesTable)
    .where(eq(workspacesTable.id, params.data.workspaceId));

  res.sendStatus(204);
});

router.use(membersRouter);

export default router;
