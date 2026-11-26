import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

export const client = createClient({
  url,
  authToken: authToken && authToken.trim().length > 0 ? authToken : undefined,
});

export const db = drizzle(client, { schema });

let isSchemaEnsured = false;

export async function ensureSchema() {
  if (isSchemaEnsured) return;

  try {
    // 1. Create categories table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color_hex TEXT NOT NULL,
        icon TEXT NOT NULL,
        keywords TEXT,
        created_at INTEGER NOT NULL
      );
    `);

    // 2. Create notes table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        raw_transcript TEXT,
        formatted_content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        priority TEXT NOT NULL DEFAULT 'normal',
        progress INTEGER NOT NULL DEFAULT 0,
        due_date INTEGER,
        reminder_sent INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // 3. Create note_updates table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS note_updates (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        source_type TEXT NOT NULL DEFAULT 'voice',
        created_at INTEGER NOT NULL
      );
    `);

    // 4. Create push_subscriptions table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        device_label TEXT,
        created_at INTEGER NOT NULL
      );
    `);

    // Create indexes if not exist
    await client.execute(`CREATE INDEX IF NOT EXISTS notes_status_idx ON notes(status);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS notes_due_date_idx ON notes(due_date);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS notes_category_idx ON notes(category_id);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS note_updates_note_id_idx ON note_updates(note_id);`);

    // Check if categories need seeding
    const catCheck = await client.execute(`SELECT COUNT(*) as count FROM categories;`);
    const count = Number(catCheck.rows[0]?.count ?? 0);

    if (count === 0) {
      const defaultCategories = [
        {
          id: "cat-produksi",
          name: "Produksi",
          colorHex: "#E4F65B",
          icon: "Factory",
          keywords: "mesin, extruder, pelletizing, tonase, shift, output, sak, kg, rafia, pe, pp",
          createdAt: Date.now(),
        },
        {
          id: "cat-maintenance",
          name: "Maintenance",
          colorHex: "#D97706",
          icon: "Wrench",
          keywords: "dinamo, bearing, vfd, inverter, motor, rusak, oli, pelumas, overhaul, baut, sparepart",
          createdAt: Date.now(),
        },
        {
          id: "cat-gudang",
          name: "Gudang & Stok",
          colorHex: "#0284C7",
          icon: "Package",
          keywords: "karung, stok, pallet, forklift, muat, kirim, raw material, penerimaan, barang jadi",
          createdAt: Date.now(),
        },
        {
          id: "cat-kelistrikan",
          name: "Kelistrikan",
          colorHex: "#DC2626",
          icon: "Zap",
          keywords: "voltase, ampere, panel, trafo, mcb, pln, genset, kabel, korslet, tegangan, daya",
          createdAt: Date.now(),
        },
        {
          id: "cat-hr",
          name: "HR & Personalia",
          colorHex: "#223309",
          icon: "Users",
          keywords: "operator, lembur, absensi, izin, sakit, seragam, safety, k3, shift kerja, pengawas",
          createdAt: Date.now(),
        },
        {
          id: "cat-umum",
          name: "Umum & Legal",
          colorHex: "#1A1B18",
          icon: "ClipboardList",
          keywords: "kebersihan, sipa, skpd, limbah, audit, tamu, kantor, inspeksi, dokumen",
          createdAt: Date.now(),
        },
      ];

      for (const cat of defaultCategories) {
        await client.execute({
          sql: `INSERT OR IGNORE INTO categories (id, name, color_hex, icon, keywords, created_at)
                VALUES (?, ?, ?, ?, ?, ?);`,
          args: [cat.id, cat.name, cat.colorHex, cat.icon, cat.keywords, cat.createdAt],
        });
      }
    }

    isSchemaEnsured = true;
  } catch (error) {
    console.error("Error in ensureSchema:", error);
  }
}
