import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "@/db";
import { notes, pushSubscriptions } from "@/db/schema";
import { eq, ne, lte, and } from "drizzle-orm";
import webPush from "web-push";

export async function GET(req: NextRequest) {
  try {
    await ensureSchema();

    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "elingno-cron-secret-key-321";

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();
    const threshold = now + 30 * 60 * 1000; // 30 minutes ahead

    // Find notes needing reminder
    const pendingNotes = await db
      .select()
      .from(notes)
      .where(
        and(
          ne(notes.status, "done"),
          eq(notes.reminderSent, 0),
          lte(notes.dueDate, threshold)
        )
      );

    if (pendingNotes.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending reminders found in window",
        count: 0,
      });
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:operations@elingno.local";

    const subs = await db.select().from(pushSubscriptions);

    let sentCount = 0;

    if (vapidPublicKey && vapidPrivateKey && subs.length > 0) {
      webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

      for (const note of pendingNotes) {
        const payload = JSON.stringify({
          title: "Elingno — Pengingat Tugas",
          body: `Batas waktu: ${note.title}. Segera tindak lanjuti operasional.`,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          data: {
            url: `/?noteId=${note.id}`,
            noteId: note.id,
          },
        });

        for (const sub of subs) {
          try {
            await webPush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              payload
            );
            sentCount++;
          } catch (pushErr: unknown) {
            console.error("Failed to deliver push to subscription:", sub.endpoint, pushErr);
          }
        }

        // Mark reminderSent = 1
        await db.update(notes).set({ reminderSent: 1 }).where(eq(notes.id, note.id));
      }
    } else {
      // If VAPID is not yet configured, still mark reminderSent to avoid loop
      for (const note of pendingNotes) {
        await db.update(notes).set({ reminderSent: 1 }).where(eq(notes.id, note.id));
      }
    }

    return NextResponse.json({
      success: true,
      remindersTriggered: pendingNotes.length,
      notificationsSent: sentCount,
    });
  } catch (error: unknown) {
    console.error("GET /api/cron/reminders error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
