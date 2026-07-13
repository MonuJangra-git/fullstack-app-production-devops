import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { tasksTable } from "./tasks";
import { workspacesTable } from "./workspaces";

export const activityLogTable = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspacesTable.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: [
      "task_created",
      "task_completed",
      "task_updated",
      "task_deleted",
      "project_created",
    ],
  }).notNull(),
  title: text("title").notNull(),
  taskId: integer("task_id").references(() => tasksTable.id, {
    onDelete: "set null",
  }),
  projectId: integer("project_id").references(() => projectsTable.id, {
    onDelete: "set null",
  }),
  actorId: text("actor_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(
  activityLogTable,
).omit({ id: true, createdAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLogRow = typeof activityLogTable.$inferSelect;
