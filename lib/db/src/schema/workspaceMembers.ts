import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspacesTable } from "./workspaces";

export const workspaceMembersTable = pgTable("workspace_members", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspacesTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  userId: text("user_id"),
  role: text("role", { enum: ["owner", "admin", "member"] })
    .notNull()
    .default("member"),
  status: text("status", { enum: ["active", "pending"] })
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertWorkspaceMemberSchema = createInsertSchema(
  workspaceMembersTable,
).omit({ id: true, createdAt: true });
export type InsertWorkspaceMember = z.infer<typeof insertWorkspaceMemberSchema>;
export type WorkspaceMemberRow = typeof workspaceMembersTable.$inferSelect;
