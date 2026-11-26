import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "@/db";
import { notes, categories, noteUpdates } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await ensureSchema();
    const { id } = await params;

    const noteRows = await db
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
      .where(eq(notes.id, id))
      .limit(1);

    if (noteRows.length === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const note = noteRows[0];

    // Fetch chronological updates thread
    const updates = await db
      .select()
      .from(noteUpdates)
      .where(eq(noteUpdates.noteId, id))
      .orderBy(asc(noteUpdates.createdAt));

    return NextResponse.json({
      note: {
        ...note,
        updates,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/notes/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await ensureSchema();
    const { id } = await params;
    const body = await req.json();

    const allowedFields = [
      "title",
      "categoryId",
      "formattedContent",
      "rawTranscript",
      "status",
      "priority",
      "progress",
      "dueDate",
      "reminderSent",
    ];

    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "dueDate") {
          updateData.dueDate = body.dueDate ? Number(body.dueDate) : null;
        } else if (field === "progress") {
          updateData.progress = Math.min(100, Math.max(0, Number(body.progress) || 0));
        } else if (field === "reminderSent") {
          updateData.reminderSent = Number(body.reminderSent) ? 1 : 0;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    await db.update(notes).set(updateData).where(eq(notes.id, id));

    return NextResponse.json({ success: true, updated: updateData });
  } catch (error: unknown) {
    console.error("PATCH /api/notes/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await ensureSchema();
    const { id } = await params;

    await db.delete(notes).where(eq(notes.id, id));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DELETE /api/notes/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
