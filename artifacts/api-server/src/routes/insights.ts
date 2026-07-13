import { Router, type IRouter } from "express";
import { and, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import {
  activityLogTable,
  db,
  projectsTable,
  tasksTable,
  workspaceMembersTable,
} from "@workspace/db";
import {
  GetWorkspaceActivityParams,
  GetWorkspaceActivityQueryParams,
  GetWorkspaceActivityResponse,
  GetWorkspaceSummaryParams,
  GetWorkspaceSummaryResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { getMembershipRole } from "../lib/workspaceAccess";

const router: IRouter = Router();
router.use(requireAuth);

router.get(
  "/workspaces/:workspaceId/summary",
  async (req, res): Promise<void> => {
    const { userId } = req as unknown as AuthedRequest;
    const params = GetWorkspaceSummaryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const role = await getMembershipRole(params.data.workspaceId, userId);
    if (!role) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    const workspaceId = params.data.workspaceId;
    const now = new Date();
    const dueSoonCutoff = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().slice(0, 10);
    const dueSoonStr = dueSoonCutoff.toISOString().slice(0, 10);

    const [statusCounts] = await db
      .select({
        totalTasks: sql<number>`count(*)::int`,
        todoCount: sql<number>`count(*) filter (where ${tasksTable.status} = 'todo')::int`,
        inProgressCount: sql<number>`count(*) filter (where ${tasksTable.status} = 'in_progress')::int`,
        doneCount: sql<number>`count(*) filter (where ${tasksTable.status} = 'done')::int`,
        overdueCount: sql<number>`count(*) filter (where ${tasksTable.dueDate} < ${todayStr} and ${tasksTable.status} != 'done')::int`,
        dueSoonCount: sql<number>`count(*) filter (where ${tasksTable.dueDate} >= ${todayStr} and ${tasksTable.dueDate} <= ${dueSoonStr} and ${tasksTable.status} != 'done')::int`,
      })
      .from(tasksTable)
      .where(eq(tasksTable.workspaceId, workspaceId));

    const [memberCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, workspaceId),
          eq(workspaceMembersTable.status, "active"),
        ),
      );

    const projects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.workspaceId, workspaceId));

    const projectBreakdown = await Promise.all(
      projects.map(async (project) => {
        const [counts] = await db
          .select({
            taskCount: sql<number>`count(*)::int`,
            doneCount: sql<number>`count(*) filter (where ${tasksTable.status} = 'done')::int`,
          })
          .from(tasksTable)
          .where(eq(tasksTable.projectId, project.id));
        return {
          projectId: project.id,
          projectName: project.name,
          color: project.color,
          taskCount: counts?.taskCount ?? 0,
          doneCount: counts?.doneCount ?? 0,
        };
      }),
    );

    res.json(
      GetWorkspaceSummaryResponse.parse({
        totalTasks: statusCounts?.totalTasks ?? 0,
        todoCount: statusCounts?.todoCount ?? 0,
        inProgressCount: statusCounts?.inProgressCount ?? 0,
        doneCount: statusCounts?.doneCount ?? 0,
        overdueCount: statusCounts?.overdueCount ?? 0,
        dueSoonCount: statusCounts?.dueSoonCount ?? 0,
        memberCount: memberCountRow?.count ?? 0,
        projectBreakdown,
      }),
    );
  },
);

router.get(
  "/workspaces/:workspaceId/activity",
  async (req, res): Promise<void> => {
    const { userId } = req as unknown as AuthedRequest;
    const params = GetWorkspaceActivityParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const role = await getMembershipRole(params.data.workspaceId, userId);
    if (!role) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    const query = GetWorkspaceActivityQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }

    const rows = await db
      .select({
        id: activityLogTable.id,
        workspaceId: activityLogTable.workspaceId,
        type: activityLogTable.type,
        title: activityLogTable.title,
        taskId: activityLogTable.taskId,
        projectId: activityLogTable.projectId,
        projectName: projectsTable.name,
        actorId: activityLogTable.actorId,
        createdAt: activityLogTable.createdAt,
      })
      .from(activityLogTable)
      .leftJoin(projectsTable, eq(activityLogTable.projectId, projectsTable.id))
      .where(eq(activityLogTable.workspaceId, params.data.workspaceId))
      .orderBy(desc(activityLogTable.createdAt))
      .limit(query.data.limit ?? 20);

    res.json(GetWorkspaceActivityResponse.parse(rows));
  },
);

export default router;
