import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "@/db";
import { categories } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    await ensureSchema();

    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.createdAt));

    return NextResponse.json({ categories: allCategories });
  } catch (error: unknown) {
    console.error("GET /api/categories error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const body = await req.json();

    const { name, colorHex = "#E4F65B", icon = "Tag", keywords = "" } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const id = `cat-${randomUUID().slice(0, 8)}`;
    const newCat = {
      id,
      name: name.trim(),
      colorHex: colorHex.trim(),
      icon: icon.trim(),
      keywords: keywords ? keywords.trim() : null,
      createdAt: Date.now(),
    };

    await db.insert(categories).values(newCat);

    return NextResponse.json({ category: newCat }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/categories error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureSchema();
    const body = await req.json();
    const { id, name, colorHex, icon, keywords } = body;

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name.trim();
    if (colorHex) updateData.colorHex = colorHex.trim();
    if (icon) updateData.icon = icon.trim();
    if (keywords !== undefined) updateData.keywords = keywords ? keywords.trim() : null;

    await db.update(categories).set(updateData).where(eq(categories.id, id));

    return NextResponse.json({ success: true, updated: updateData });
  } catch (error: unknown) {
    console.error("PATCH /api/categories error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    await db.delete(categories).where(eq(categories.id, id));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DELETE /api/categories error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
