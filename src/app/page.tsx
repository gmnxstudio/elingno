"use client";

import React, { useState, useEffect, useCallback } from "react";
import { HomeScreen } from "@/components/HomeScreen";
import { TimelineScreen } from "@/components/TimelineScreen";
import { FloatingActionDock } from "@/components/FloatingActionDock";
import { VoiceRecorderSheet } from "@/components/VoiceRecorderSheet";
import { NoteDetailDrawer } from "@/components/NoteDetailDrawer";
import { CategoryManagerDrawer } from "@/components/CategoryManagerDrawer";
import { NotificationRemindersDrawer } from "@/components/NotificationRemindersDrawer";
import { getPendingAudioList, removePendingAudio, updateAudioStatus } from "@/lib/offlineQueue";
import type { Category, Note } from "@/db/schema";

interface NoteItem extends Note {
  categoryName?: string | null;
  categoryColor?: string | null;
  categoryIcon?: string | null;
  updatesCount?: number;
}

export default function Page() {
  const [activeTab, setActiveTab] = useState<"home" | "timeline">("home");
  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Drawers
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const [immediateRecording, setImmediateRecording] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Offline queue status
  const [offlinePendingCount, setOfflinePendingCount] = useState<number>(0);

  // Fetch categories
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }, []);

  // Fetch notes
  const loadNotes = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategoryId !== "all") {
        params.append("categoryId", selectedCategoryId);
      }
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const res = await fetch(`/api/notes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategoryId, searchQuery]);

  // Initial load
  useEffect(() => {
    loadCategories();
    loadNotes();
  }, [loadCategories, loadNotes]);

  // Check and process offline audio queue
  const processOfflineQueue = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.onLine) return;

    try {
      const pending = await getPendingAudioList();
      setOfflinePendingCount(pending.length);

      for (const item of pending) {
        if (!item.id) continue;
        await updateAudioStatus(item.id, "processing");

        // 1. Transcribe
        const formData = new FormData();
        formData.append("audio", item.blob, "offline-voice.webm");

        const tRes = await fetch("/api/transcribe", { method: "POST", body: formData });
        if (!tRes.ok) continue;

        const { transcript } = await tRes.json();

        // 2. Structure
        const sRes = await fetch("/api/structure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript,
            currentDateISO: new Date().toISOString(),
            timezoneOffset: "+07:00",
          }),
        });

        if (!sRes.ok) continue;
        const structured = await sRes.json();

        // 3. Save
        let dueMs: number | null = null;
        if (structured.dueDateISO) {
          const d = new Date(structured.dueDateISO);
          if (!isNaN(d.getTime())) dueMs = d.getTime();
        }

        await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: structured.title || "Catatan Sinkronisasi",
            categoryId: structured.categoryId || null,
            formattedContent: structured.formattedContent || transcript,
            rawTranscript: transcript,
            priority: structured.priority || "normal",
            dueDate: dueMs,
          }),
        });

        // Remove from Dexie
        await removePendingAudio(item.id);
      }

      const remaining = await getPendingAudioList();
      setOfflinePendingCount(remaining.length);
      loadNotes();
    } catch (err) {
      console.error("Offline sync error:", err);
    }
  }, [loadNotes]);

  useEffect(() => {
    processOfflineQueue();
    window.addEventListener("online", processOfflineQueue);
    return () => window.removeEventListener("online", processOfflineQueue);
  }, [processOfflineQueue]);

  // Quick toggle note status from card
  const handleToggleNoteStatus = async (note: NoteItem) => {
    const newStatus = note.status === "done" ? "open" : "done";
    const newProgress = newStatus === "done" ? 100 : 0;

    // Optimistic update
    setNotes((prev) =>
      prev.map((n) =>
        n.id === note.id ? { ...n, status: newStatus, progress: newProgress } : n
      )
    );

    try {
      await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, progress: newProgress }),
      });
    } catch (err) {
      console.error("Toggle status error:", err);
      loadNotes();
    }
  };

  const handleOpenVoiceRecorder = (immediate = false) => {
    setImmediateRecording(immediate);
    setIsVoiceRecorderOpen(true);
  };

  return (
    <main className="min-h-screen bg-canvas text-charcoal max-w-lg mx-auto relative overflow-hidden flex flex-col">
      {/* Offline sync indicator if pending audio exists */}
      {offlinePendingCount > 0 && (
        <div className="bg-amber-600 text-white px-4 py-1.5 text-center text-[11px] font-bold">
          ⚡ {offlinePendingCount} rekaman offline menunggu sinkronisasi otomatis
        </div>
      )}

      {/* Screen 1 or Screen 2 */}
      {activeTab === "home" ? (
        <HomeScreen
          categories={categories}
          notes={notes}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(id) => setSelectedCategoryId(id)}
          onOpenCategoriesManager={() => setIsCategoryManagerOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onSelectNote={(id) => setSelectedNoteId(id)}
          onToggleNoteStatus={handleToggleNoteStatus}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      ) : (
        <TimelineScreen
          notes={notes}
          onSelectNote={(id) => setSelectedNoteId(id)}
        />
      )}

      {/* Floating Bottom Action Dock */}
      <FloatingActionDock
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenVoiceRecorder={handleOpenVoiceRecorder}
      />

      {/* Slide-up Voice / Manual Capture Sheet */}
      <VoiceRecorderSheet
        isOpen={isVoiceRecorderOpen}
        onClose={() => {
          setIsVoiceRecorderOpen(false);
          setImmediateRecording(false);
        }}
        categories={categories}
        onNoteCreated={() => {
          loadNotes();
        }}
        initialRecording={immediateRecording}
      />

      {/* Note Detail & Follow-up Thread Drawer */}
      <NoteDetailDrawer
        noteId={selectedNoteId}
        onClose={() => setSelectedNoteId(null)}
        onUpdated={() => {
          loadNotes();
        }}
      />

      {/* Category Manager Drawer */}
      <CategoryManagerDrawer
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onCategoriesChanged={() => {
          loadCategories();
          loadNotes();
        }}
      />

      {/* Notifications Drawer */}
      <NotificationRemindersDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notes={notes}
        onSelectNote={(id) => setSelectedNoteId(id)}
      />
    </main>
  );
}
