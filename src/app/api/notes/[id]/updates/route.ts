import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "@/db";
import { notes, noteUpdates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await ensureSchema();
    const { id } = await params;
    const body = await req.json();

    const { content, sourceType = "voice" } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Verify parent note exists
    const note = await db.select({ id: notes.id }).from(notes).where(eq(notes.id, id)).limit(1);
    if (note.length === 0) {
      return NextResponse.json({ error: "Parent note not found" }, { status: 404 });
    }

    const now = Date.now();
    const updateRecord = {
      id: randomUUID(),
      noteId: id,
      content: content.trim(),
      sourceType: (sourceType as "voice" | "manual") || "voice",
      createdAt: now,
    };

    await db.insert(noteUpdates).values(updateRecord);

    // Bump updatedAt on parent note
    await db.update(notes).set({ updatedAt: now }).where(eq(notes.id, id));

    return NextResponse.json({ update: updateRecord }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/notes/[id]/updates error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
