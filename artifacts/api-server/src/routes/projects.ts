import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, projectsTable, tasksTable } from "@workspace/db";
import {
  CreateProjectBody,
  CreateProjectParams,
  DeleteProjectParams,
  GetProjectParams,
  GetProjectResponse,
  ListProjectsParams,
  ListProjectsResponse,
  ListProjectsResponseItem,
  UpdateProjectBody,
  UpdateProjectParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { getMembershipRole } from "../lib/workspaceAccess";

type ProjectItem = z.infer<typeof ListProjectsResponseItem>;

const router: IRouter = Router();
router.use(requireAuth);

async function toProjectItem(
  projectId: number,
): Promise<ProjectItem | undefined> {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  if (!project) return undefined;

  const [counts] = await db
    .select({
      taskCount: sql<number>`count(*)::int`,
      doneCount: sql<number>`count(*) filter (where ${tasksTable.status} = 'done')::int`,
    })
    .from(tasksTable)
    .where(eq(tasksTable.projectId, projectId));

  return {
    id: project.id,
    workspaceId: project.workspaceId,
    name: project.name,
    description: project.description,
    color: project.color,
    taskCount: counts?.taskCount ?? 0,
    doneCount: counts?.doneCount ?? 0,
    createdAt: project.createdAt,
  };
}

router.get(
  "/workspaces/:workspaceId/projects",
  async (req, res): Promise<void> => {
    const { userId } = req as unknown as AuthedRequest;
    const params = ListProjectsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const role = await getMembershipRole(params.data.workspaceId, userId);
    if (!role) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    const projects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.workspaceId, params.data.workspaceId))
      .orderBy(projectsTable.createdAt);

    const items = await Promise.all(projects.map((p) => toProjectItem(p.id)));
    res.json(ListProjectsResponse.parse(items.filter(Boolean)));
  },
);

router.post(
  "/workspaces/:workspaceId/projects",
  async (req, res): Promise<void> => {
    const { userId } = req as unknown as AuthedRequest;
    const params = CreateProjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const role = await getMembershipRole(params.data.workspaceId, userId);
    if (!role) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    const parsed = CreateProjectBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [project] = await db
      .insert(projectsTable)
      .values({
        workspaceId: params.data.workspaceId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        color: parsed.data.color ?? "#6366f1",
      })
      .returning();

    if (!project) {
      res.status(500).json({ error: "Failed to create project" });
      return;
    }

    res.status(201).json(GetProjectResponse.parse(await toProjectItem(project.id)));
  },
);

router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const { userId } = req as unknown as AuthedRequest;
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const role = await getMembershipRole(project.workspaceId, userId);
  if (!role) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(GetProjectResponse.parse(await toProjectItem(project.id)));
});

router.patch("/projects/:projectId", async (req, res): Promise<void> => {
  const { userId } = req as unknown as AuthedRequest;
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const role = await getMembershipRole(project.workspaceId, userId);
  if (!role) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .update(projectsTable)
    .set(parsed.data)
    .where(eq(projectsTable.id, params.data.projectId));

  res.json(GetProjectResponse.parse(await toProjectItem(params.data.projectId)));
});

router.delete("/projects/:projectId", async (req, res): Promise<void> => {
  const { userId } = req as unknown as AuthedRequest;
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const role = await getMembershipRole(project.workspaceId, userId);
  if (role !== "owner" && role !== "admin") {
    res.status(403).json({ error: "Only owners and admins can delete a project" });
    return;
  }

  await db.delete(projectsTable).where(eq(projectsTable.id, params.data.projectId));

  res.sendStatus(204);
});

export default router;
