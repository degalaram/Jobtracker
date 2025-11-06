
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().unique(),
  password: text("password").notNull(),
});

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().default('default-user'),
  url: text("url").notNull(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  postedDate: text("posted_date").notNull(),
  analyzedDate: text("analyzed_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().default('default-user'),
  title: text("title").notNull(),
  company: text("company").notNull(),
  url: text("url"),
  type: text("type").notNull(),
  completed: boolean("completed").notNull().default(false),
  addedDate: text("added_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().default('default-user'),
  title: text("title").notNull().default(''),
  content: text("content").notNull().default(''),
  color: text("color").notNull().default('#ffffff'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  identifier: text("identifier").notNull(),
  otp: text("otp").notNull(),
  type: text("type").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueIdentifierType: sql`UNIQUE(identifier, type)`,
}));

export const folders = pgTable("folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().default('default-user'),
  name: text("name").notNull(),
  parentId: varchar("parent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().default('default-user'),
  folderId: varchar("folder_id"),
  name: text("name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: varchar("size").notNull(),
  path: text("path").notNull(),
  isTrashed: boolean("is_trashed").notNull().default(false),
  trashedAt: timestamp("trashed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  phone: true,
  password: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFolderSchema = createInsertSchema(folders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type File = typeof files.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type InsertFile = z.infer<typeof insertFileSchema>;
