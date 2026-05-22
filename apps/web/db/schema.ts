import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  role: text("role", { enum: ["admin"] }).notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
