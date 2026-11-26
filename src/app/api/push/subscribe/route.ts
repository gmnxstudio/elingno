import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const body = await req.json();

    const { endpoint, keys, deviceLabel } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: "Invalid push subscription object" },
        { status: 400 }
      );
    }

    const existing = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(pushSubscriptions)
        .set({
          p256dh: keys.p256dh,
          auth: keys.auth,
          deviceLabel: deviceLabel || "Browser Client",
        })
        .where(eq(pushSubscriptions.endpoint, endpoint));
    } else {
      await db.insert(pushSubscriptions).values({
        id: randomUUID(),
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        deviceLabel: deviceLabel || "Browser Client",
        createdAt: Date.now(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("POST /api/push/subscribe error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
