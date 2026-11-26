"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, BellRing, Clock, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import type { Note } from "@/db/schema";

interface NotificationRemindersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Array<Note & { categoryName?: string | null; categoryColor?: string | null; updatesCount?: number }>;
  onSelectNote: (noteId: string) => void;
}

export function NotificationRemindersDrawer({
  isOpen,
  onClose,
  notes,
  onSelectNote,
}: NotificationRemindersDrawerProps) {
  const [filter, setFilter] = useState<"all" | "due" | "updates">("all");
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [pushStatusMsg, setPushStatusMsg] = useState<string | null>(null);

  const handleEnablePush = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushStatusMsg("Browser ini tidak mendukung Web Push Notifications.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatusMsg("Izin notifikasi ditolak oleh pengguna.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidKey) {
        setPushEnabled(true);
        setPushStatusMsg("Izin notifikasi aktif di browser (VAPID key server opsional).");
        return;
      }

      // Convert VAPID key to Uint8Array
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subJSON = subscription.toJSON();

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJSON.endpoint,
          keys: subJSON.keys,
          deviceLabel: navigator.userAgent.slice(0, 50),
        }),
      });

      setPushEnabled(true);
      setPushStatusMsg("Notifikasi Web Push aktif berhasil terhubung ke server.");
    } catch (err: unknown) {
      console.error("Push subscribe error:", err);
      const msg = err instanceof Error ? err.message : "Gagal mengaktifkan push";
      setPushStatusMsg(msg);
    }
  };

  const getRelativeTime = (ms: number) => {
    const diffMin = Math.floor((Date.now() - ms) / 60000);
    if (diffMin < 1) return "Baru saja";
    if (diffMin < 60) return `${diffMin}m lalu`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}j lalu`;
    return `${Math.floor(diffHours / 24)}h lalu`;
  };

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    if (filter === "due") return n.dueDate && n.dueDate > 0 && n.status !== "done";
    if (filter === "updates") return (n.updatesCount || 0) > 0;
    return true;
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Drawer */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="relative w-full max-w-lg bg-[#FAF9F5] rounded-t-[36px] shadow-tactileElevated overflow-hidden max-h-[88vh] flex flex-col z-10"
        >
          {/* Grab Handle */}
          <div className="w-full flex items-center justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 rounded-full bg-charcoal/20" />
          </div>

          {/* Header */}
          <div className="px-6 py-2.5 flex items-center justify-between border-b border-stone-border/40">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-lime border border-charcoal/20" />
              <h3 className="text-lg font-bold text-charcoal tracking-tight">
                Pengingat & Notifikasi
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-surface text-charcoal/70 hover:text-charcoal flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Web Push Banner */}
          <div className="p-4 mx-6 mt-4 rounded-2xl bg-olive text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-lime text-charcoal flex items-center justify-center flex-shrink-0">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">Web Push Notification</p>
                <p className="text-[11px] text-white/70 mt-0.5">
                  Dapatkan bunyi & getar saat tugas mendekati jatuh tempo.
                </p>
              </div>
            </div>
            <button
              onClick={handleEnablePush}
              className="px-3.5 py-1.5 rounded-full bg-lime text-charcoal font-extrabold text-xs shadow-sm hover:bg-lime/90 active:scale-95 transition-all flex-shrink-0"
            >
              {pushEnabled ? "Aktif" : "Aktifkan"}
            </button>
          </div>

          {pushStatusMsg && (
            <p className="px-6 pt-2 text-[11px] text-charcoal/70 font-medium">
              {pushStatusMsg}
            </p>
          )}

          {/* Filter Pills */}
          <div className="px-6 pt-3 pb-1 flex items-center gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === "all"
                  ? "bg-charcoal text-white shadow-sm"
                  : "bg-white text-charcoal/70 border border-stone-border"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilter("due")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === "due"
                  ? "bg-charcoal text-white shadow-sm"
                  : "bg-white text-charcoal/70 border border-stone-border"
              }`}
            >
              Jatuh Tempo
            </button>
            <button
              onClick={() => setFilter("updates")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === "updates"
                  ? "bg-charcoal text-white shadow-sm"
                  : "bg-white text-charcoal/70 border border-stone-border"
              }`}
            >
              Update Thread
            </button>
          </div>

          {/* List */}
          <div className="p-6 overflow-y-auto flex-1 space-y-2.5">
            {filteredNotes.length > 0 ? (
              filteredNotes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    onSelectNote(n.id);
                    onClose();
                  }}
                  className="p-4 rounded-[24px] bg-white border border-stone-border/60 hover:border-charcoal/40 transition-all cursor-pointer shadow-sm active:scale-[0.99] space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-charcoal border border-charcoal/10"
                      style={{ backgroundColor: n.categoryColor || "#E4F65B" }}
                    >
                      @{n.categoryName || "Umum"}
                    </span>
                    <span className="text-charcoal/50 tabular-nums">
                      {getRelativeTime(n.updatedAt)}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-charcoal line-clamp-1">
                    {n.title}
                  </h4>

                  {n.dueDate && (
                    <div className="flex items-center gap-1.5 text-xs text-charcoal/70 font-semibold pt-0.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        Batas:{" "}
                        {new Date(n.dueDate).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-charcoal/50">
                Tidak ada notifikasi atau pengingat aktif dalam filter ini.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
