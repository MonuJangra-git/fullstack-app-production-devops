import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  activityLogTable,
  db,
  projectsTable,
  tasksTable,
} from "@workspace/db";
import {
  CreateTaskBody,
  CreateTaskResponse,
  DeleteTaskParams,
  GetTaskParams,
  GetTaskResponse,
  ListWorkspaceTasksParams,
  ListWorkspaceTasksQueryParams,
  ListWorkspaceTasksResponse,
  ListWorkspaceTasksResponseItem,
  UpdateTaskBody,
  UpdateTaskParams,
  UpdateTaskResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { getMembershipRole } from "../lib/workspaceAccess";

type TaskItem = z.infer<typeof ListWorkspaceTasksResponseItem>;

const router: IRouter = Router();
router.use(requireAuth);

function toDueDateString(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

async function toTaskItem(taskId: number) {
  const [row] = await db
    .select({
      id: tasksTable.id,
      projectId: tasksTable.projectId,
      projectName: projectsTable.name,
      workspaceId: tasksTable.workspaceId,
      title: tasksTable.title,
      description: tasksTable.description,
      status: tasksTable.status,
      priority: tasksTable.priority,
      dueDate: tasksTable.dueDate,
      assigneeId: tasksTable.assigneeId,
      createdAt: tasksTable.createdAt,
      updatedAt: tasksTable.updatedAt,
    })
    .from(tasksTable)
    .innerJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .where(eq(tasksTable.id, taskId));
  return row;
}

router.get(
  "/workspaces/:workspaceId/tasks",
  async (req, res): Promise<void> => {
    const { userId } = req as unknown as AuthedRequest;
    const params = ListWorkspaceTasksParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const role = await getMembershipRole(params.data.workspaceId, userId);
    if (!role) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    const query = ListWorkspaceTasksQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }

    const conditions = [eq(tasksTable.workspaceId, params.data.workspaceId)];
    if (query.data.projectId !== undefined) {
      conditions.push(eq(tasksTable.projectId, query.data.projectId));
    }
    if (query.data.status !== undefined) {
      conditions.push(eq(tasksTable.status, query.data.status));
    }
    if (query.data.priority !== undefined) {
      conditions.push(eq(tasksTable.priority, query.data.priority));
    }
    if (query.data.assigneeId !== undefined) {
      conditions.push(eq(tasksTable.assigneeId, query.data.assigneeId));
    }

    const rows = await db
      .select({
        id: tasksTable.id,
        projectId: tasksTable.projectId,
        projectName: projectsTable.name,
        workspaceId: tasksTable.workspaceId,
        title: tasksTable.title,
        description: tasksTable.description,
        status: tasksTable.status,
        priority: tasksTable.priority,
        dueDate: tasksTable.dueDate,
        assigneeId: tasksTable.assigneeId,
        createdAt: tasksTable.createdAt,
        updatedAt: tasksTable.updatedAt,
      })
      .from(tasksTable)
      .innerJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
      .where(and(...conditions))
      .orderBy(desc(tasksTable.createdAt));

    res.json(ListWorkspaceTasksResponse.parse(rows));
  },
);

router.post("/tasks", async (req, res): Promise<void> => {
  const { userId } = req as unknown as AuthedRequest;
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, parsed.data.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const role = await getMembershipRole(project.workspaceId, userId);
  if (!role) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [task] = await db
    .insert(tasksTable)
    .values({
      projectId: parsed.data.projectId,
      workspaceId: project.workspaceId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: parsed.data.status ?? "todo",
      priority: parsed.data.priority ?? "medium",
      dueDate: toDueDateString(parsed.data.dueDate),
      assigneeId: parsed.data.assigneeId ?? null,
    })
    .returning();

  if (!task) {
    res.status(500).json({ error: "Failed to create task" });
    return;
  }

  await db.insert(activityLogTable).values({
    workspaceId: project.workspaceId,
    type: "task_created",
    title: task.title,
    taskId: task.id,
    projectId: project.id,
    actorId: userId,
  });

  res.status(201).json(CreateTaskResponse.parse(await toTaskItem(task.id)));
});

router.get("/tasks/:taskId", async (req, res): Promise<void> => {
  const { userId } = req as unknown as AuthedRequest;
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, params.data.taskId));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const role = await getMembershipRole(task.workspaceId, userId);
  if (!role) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(GetTaskResponse.parse(await toTaskItem(task.id)));
});

router.patch("/tasks/:taskId", async (req, res): Promise<void> => {
  const { userId } = req as unknown as AuthedRequest;
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, params.data.taskId));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const role = await getMembershipRole(task.workspaceId, userId);
  if (!role) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let newProjectWorkspaceId = task.workspaceId;
  if (
    parsed.data.projectId !== undefined &&
    parsed.data.projectId !== task.projectId
  ) {
    const [newProject] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, parsed.data.projectId));
    if (!newProject || newProject.workspaceId !== task.workspaceId) {
      res.status(400).json({ error: "Invalid projectId" });
      return;
    }
    newProjectWorkspaceId = newProject.workspaceId;
  }

  const wasNotDone = task.status !== "done";

  const { dueDate, ...rest } = parsed.data;
  await db
    .update(tasksTable)
    .set({
      ...rest,
      ...(dueDate !== undefined ? { dueDate: toDueDateString(dueDate) } : {}),
      workspaceId: newProjectWorkspaceId,
    })
    .where(eq(tasksTable.id, params.data.taskId));

  if (parsed.data.status === "done" && wasNotDone) {
    await db.insert(activityLogTable).values({
      workspaceId: task.workspaceId,
      type: "task_completed",
      title: parsed.data.title ?? task.title,
      taskId: task.id,
      projectId: task.projectId,
      actorId: userId,
    });
  } else {
    await db.insert(activityLogTable).values({
      workspaceId: task.workspaceId,
      type: "task_updated",
      title: parsed.data.title ?? task.title,
      taskId: task.id,
      projectId: task.projectId,
      actorId: userId,
    });
  }

  res.json(UpdateTaskResponse.parse(await toTaskItem(params.data.taskId)));
});

router.delete("/tasks/:taskId", async (req, res): Promise<void> => {
  const { userId } = req as unknown as AuthedRequest;
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, params.data.taskId));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const role = await getMembershipRole(task.workspaceId, userId);
  if (!role) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  await db.insert(activityLogTable).values({
    workspaceId: task.workspaceId,
    type: "task_deleted",
    title: task.title,
    projectId: task.projectId,
    actorId: userId,
  });

  await db.delete(tasksTable).where(eq(tasksTable.id, params.data.taskId));

  res.sendStatus(204);
});

export default router;
