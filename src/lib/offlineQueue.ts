import Dexie, { type Table } from "dexie";

export interface PendingAudio {
  id?: number;
  blob: Blob;
  durationMs: number;
  recordedAt: number;
  status: "pending" | "processing" | "failed";
  retryCount: number;
  noteId?: string; // If this audio is a follow-up for a specific note
}

export class ElingnoOfflineDb extends Dexie {
  pendingAudioQueue!: Table<PendingAudio, number>;

  constructor() {
    super("ElingnoOfflineDb");
    this.version(1).stores({
      pendingAudioQueue: "++id, status, recordedAt, noteId",
    });
  }
}

export const offlineDb = new ElingnoOfflineDb();

export async function enqueueAudio(blob: Blob, durationMs: number, noteId?: string) {
  return await offlineDb.pendingAudioQueue.add({
    blob,
    durationMs,
    recordedAt: Date.now(),
    status: "pending",
    retryCount: 0,
    noteId,
  });
}

export async function getPendingAudioList() {
  return await offlineDb.pendingAudioQueue.where("status").equals("pending").toArray();
}

export async function removePendingAudio(id: number) {
  return await offlineDb.pendingAudioQueue.delete(id);
}

export async function updateAudioStatus(id: number, status: "pending" | "processing" | "failed") {
  return await offlineDb.pendingAudioQueue.update(id, { status });
}
