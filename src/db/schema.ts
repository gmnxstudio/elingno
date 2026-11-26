import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    colorHex: text("color_hex").notNull(),
    icon: text("icon").notNull(),
    keywords: text("keywords"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("categories_name_idx").on(table.name),
  ]
);

export const notes = sqliteTable(
  "notes",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    rawTranscript: text("raw_transcript"),
    formattedContent: text("formatted_content").notNull(),
    status: text("status", { enum: ["open", "in_progress", "done"] }).notNull().default("open"),
    priority: text("priority", { enum: ["normal", "high"] }).notNull().default("normal"),
    progress: integer("progress").notNull().default(0),
    dueDate: integer("due_date"),
    reminderSent: integer("reminder_sent").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("notes_status_idx").on(table.status),
    index("notes_due_date_idx").on(table.dueDate),
    index("notes_category_idx").on(table.categoryId),
    index("notes_updated_at_idx").on(table.updatedAt),
  ]
);

export const noteUpdates = sqliteTable(
  "note_updates",
  {
    id: text("id").primaryKey(),
    noteId: text("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    sourceType: text("source_type", { enum: ["voice", "manual"] }).notNull().default("voice"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("note_updates_note_id_idx").on(table.noteId),
    index("note_updates_created_at_idx").on(table.createdAt),
  ]
);

export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    deviceLabel: text("device_label"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("push_subscriptions_endpoint_idx").on(table.endpoint),
  ]
);

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  notes: many(notes),
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
  category: one(categories, {
    fields: [notes.categoryId],
    references: [categories.id],
  }),
  updates: many(noteUpdates),
}));

export const noteUpdatesRelations = relations(noteUpdates, ({ one }) => ({
  note: one(notes, {
    fields: [noteUpdates.noteId],
    references: [notes.id],
  }),
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type NoteUpdate = typeof noteUpdates.$inferSelect;
export type NewNoteUpdate = typeof noteUpdates.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
