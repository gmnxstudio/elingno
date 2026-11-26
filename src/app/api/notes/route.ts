import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "@/db";
import { notes, categories, noteUpdates } from "@/db/schema";
import { eq, desc, and, like, or, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  try {
    await ensureSchema();

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const conditions = [];

    if (categoryId && categoryId !== "all") {
      conditions.push(eq(notes.categoryId, categoryId));
    }

    if (status && status !== "all") {
      conditions.push(eq(notes.status, status as "open" | "in_progress" | "done"));
    }

    if (search && search.trim().length > 0) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        or(
          like(sql`lower(${notes.title})`, q),
          like(sql`lower(${notes.formattedContent})`, q),
          like(sql`lower(${notes.rawTranscript})`, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch notes with their category
    const noteList = await db
      .select({
        id: notes.id,
        categoryId: notes.categoryId,
        title: notes.title,
        rawTranscript: notes.rawTranscript,
        formattedContent: notes.formattedContent,
        status: notes.status,
        priority: notes.priority,
        progress: notes.progress,
        dueDate: notes.dueDate,
        reminderSent: notes.reminderSent,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
        categoryName: categories.name,
        categoryColor: categories.colorHex,
        categoryIcon: categories.icon,
      })
      .from(notes)
      .leftJoin(categories, eq(notes.categoryId, categories.id))
      .where(whereClause)
      .orderBy(desc(notes.updatedAt));

    // Also get updates count for each note
    const counts = await db
      .select({
        noteId: noteUpdates.noteId,
        count: sql<number>`count(${noteUpdates.id})`,
      })
      .from(noteUpdates)
      .groupBy(noteUpdates.noteId);

    const countMap = new Map<string, number>();
    for (const c of counts) {
      countMap.set(c.noteId, Number(c.count));
    }

    const result = noteList.map((n) => ({
      ...n,
      updatesCount: countMap.get(n.id) || 0,
    }));

    return NextResponse.json({ notes: result });
  } catch (error: unknown) {
    console.error("GET /api/notes error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();

    const body = await req.json();
    const {
      title,
      categoryId,
      rawTranscript,
      formattedContent,
      status = "open",
      priority = "normal",
      progress = 0,
      dueDate = null,
    } = body;

    if (!title || !formattedContent) {
      return NextResponse.json(
        { error: "Title and formattedContent are required" },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const now = Date.now();

    const newNote = {
      id,
      categoryId: categoryId || null,
      title: title.trim(),
      rawTranscript: rawTranscript || null,
      formattedContent: formattedContent.trim(),
      status: (status as "open" | "in_progress" | "done") || "open",
      priority: (priority as "normal" | "high") || "normal",
      progress: Math.min(100, Math.max(0, Number(progress) || 0)),
      dueDate: dueDate ? Number(dueDate) : null,
      reminderSent: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(notes).values(newNote);

    return NextResponse.json({ note: newNote }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/notes error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
