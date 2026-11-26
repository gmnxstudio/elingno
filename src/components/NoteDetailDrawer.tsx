"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  Send,
  Mic,
  MicOff,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { DynamicIcon } from "./DynamicIcon";
import { FactoryAudioRecorder } from "@/lib/audioRecorder";
import type { Note, NoteUpdate } from "@/db/schema";

interface NoteDetailDrawerProps {
  noteId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

interface NoteWithDetails extends Note {
  categoryName?: string | null;
  categoryColor?: string | null;
  categoryIcon?: string | null;
  updates?: NoteUpdate[];
}

export function NoteDetailDrawer({ noteId, onClose, onUpdated }: NoteDetailDrawerProps) {
  const [note, setNote] = useState<NoteWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  // New update state
  const [newUpdateText, setNewUpdateText] = useState("");
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [isVoiceUpdateActive, setIsVoiceUpdateActive] = useState(false);
  const [voiceRecorder, setVoiceRecorder] = useState<FactoryAudioRecorder | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  useEffect(() => {
    if (noteId) {
      fetchNoteDetails(noteId);
    } else {
      setNote(null);
    }
  }, [noteId]);

  const fetchNoteDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setNote(data.note);
      }
    } catch (err) {
      console.error("Error fetching note:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: "open" | "in_progress" | "done") => {
    if (!note) return;
    const newProgress = newStatus === "done" ? 100 : note.progress === 100 ? 0 : note.progress;
    setNote({ ...note, status: newStatus, progress: newProgress });

    try {
      await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, progress: newProgress }),
      });
      onUpdated();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const updateProgress = async (newProgress: number) => {
    if (!note) return;
    const newStatus = newProgress === 100 ? "done" : newProgress > 0 ? "in_progress" : "open";
    setNote({ ...note, progress: newProgress, status: newStatus });

    try {
      await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: newProgress, status: newStatus }),
      });
      onUpdated();
    } catch (err) {
      console.error("Failed to update progress:", err);
    }
  };

  const handleAddUpdate = async (content: string, sourceType: "voice" | "manual" = "manual") => {
    if (!note || !content.trim()) return;
    setIsSubmittingUpdate(true);

    try {
      const res = await fetch(`/api/notes/${note.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), sourceType }),
      });

      if (res.ok) {
        const data = await res.json();
        setNote((prev) =>
          prev
            ? {
                ...prev,
                updates: [...(prev.updates || []), data.update],
              }
            : null
        );
        setNewUpdateText("");
        onUpdated();
      }
    } catch (err) {
      console.error("Failed to append update:", err);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleStartVoiceUpdate = async () => {
    try {
      const recorder = new FactoryAudioRecorder();
      await recorder.start();
      setVoiceRecorder(recorder);
      setIsVoiceUpdateActive(true);
    } catch (err) {
      console.error("Voice update mic error:", err);
    }
  };

  const handleStopVoiceUpdate = async () => {
    if (!voiceRecorder) return;
    try {
      setIsProcessingVoice(true);
      const { blob } = await voiceRecorder.stop();
      setIsVoiceUpdateActive(false);

      const formData = new FormData();
      formData.append("audio", blob, "followup.webm");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const transcript = data.transcript || "";
        if (transcript) {
          await handleAddUpdate(transcript, "voice");
        }
      }
    } catch (err) {
      console.error("Voice update transcription error:", err);
    } finally {
      setIsProcessingVoice(false);
      setVoiceRecorder(null);
    }
  };

  const handleDeleteNote = async () => {
    if (!note) return;
    if (confirm("Hapus catatan operasional ini secara permanen?")) {
      try {
        await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
        onUpdated();
        onClose();
      } catch (err) {
        console.error("Delete note error:", err);
      }
    }
  };

  const formatDateTime = (ms: number | null) => {
    if (!ms) return null;
    const d = new Date(ms);
    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!noteId) return null;

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
          className="relative w-full max-w-lg bg-[#FAF9F5] rounded-t-[34px] shadow-tactileElevated overflow-hidden max-h-[92vh] flex flex-col z-10"
        >
          {/* Grab Handle */}
          <div className="w-full flex items-center justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 rounded-full bg-charcoal/20" />
          </div>

          {/* Header */}
          <div className="px-6 py-2.5 flex items-center justify-between border-b border-stone-border/40">
            <div className="flex items-center gap-2">
              {note?.categoryName && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 text-charcoal border border-charcoal/10"
                  style={{ backgroundColor: note.categoryColor || "#E4F65B" }}
                >
                  <DynamicIcon name={note.categoryIcon || "Tag"} size={10} />
                  {note.categoryName}
                </span>
              )}
              {note?.priority === "high" && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                  Penting!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteNote}
                className="w-8 h-8 rounded-full bg-stone-surface text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                title="Hapus Catatan"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-stone-surface text-charcoal/70 hover:text-charcoal flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {loading ? (
              <div className="py-12 flex justify-center items-center">
                <div className="w-8 h-8 rounded-full border-2 border-charcoal border-t-lime animate-spin" />
              </div>
            ) : note ? (
              <>
                {/* Title */}
                <div>
                  <h2 className="text-xl font-extrabold text-charcoal leading-snug tracking-tight">
                    {note.title}
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-charcoal/60">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Dibuat {formatDateTime(note.createdAt)}
                    </span>
                    {note.dueDate && (
                      <span className="flex items-center gap-1 font-semibold text-charcoal/80">
                        <Calendar className="w-3.5 h-3.5" />
                        Tenggat: {formatDateTime(note.dueDate)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Switcher & Progress Slider */}
                <div className="p-4 rounded-2xl bg-white border border-stone-border/70 space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-charcoal/70 uppercase tracking-wide">
                      Status Pekerjaan
                    </span>
                    <span className="text-xs font-extrabold text-charcoal tabular-nums">
                      {note.progress}% Selesai
                    </span>
                  </div>

                  {/* Status Pills */}
                  <div className="grid grid-cols-3 gap-1.5 bg-stone-surface p-1 rounded-2xl">
                    <button
                      onClick={() => updateStatus("open")}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        note.status === "open"
                          ? "bg-white text-charcoal shadow-sm"
                          : "text-charcoal/60"
                      }`}
                    >
                      Buka
                    </button>
                    <button
                      onClick={() => updateStatus("in_progress")}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        note.status === "in_progress"
                          ? "bg-lime text-charcoal shadow-sm"
                          : "text-charcoal/60"
                      }`}
                    >
                      Proses
                    </button>
                    <button
                      onClick={() => updateStatus("done")}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        note.status === "done"
                          ? "bg-olive text-white shadow-sm"
                          : "text-charcoal/60"
                      }`}
                    >
                      Selesai
                    </button>
                  </div>

                  {/* Progress Range Slider */}
                  <div className="space-y-1 pt-1">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={note.progress}
                      onChange={(e) => updateProgress(Number(e.target.value))}
                      className="w-full accent-charcoal cursor-pointer"
                    />
                    <div className="w-full bg-stone-surface h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full progress-diagonal-stripes rounded-full"
                        style={{ width: `${note.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Formatted Content Card */}
                <div className="p-4 rounded-2xl bg-white border border-stone-border/70 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-charcoal/70 uppercase tracking-wider">
                      Instruksi & Log Lapangan
                    </span>
                  </div>
                  <div className="text-sm text-charcoal/90 leading-relaxed whitespace-pre-line font-sans font-medium">
                    {note.formattedContent}
                  </div>
                </div>

                {/* Raw Transcript Accordion */}
                {note.rawTranscript && (
                  <div className="border border-stone-border/60 rounded-2xl overflow-hidden bg-white/60">
                    <button
                      onClick={() => setShowRaw(!showRaw)}
                      className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-charcoal/70 hover:bg-stone-surface/30 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        Transkrip Suara Mentah (Verbatim)
                      </span>
                      {showRaw ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showRaw && (
                      <div className="px-4 pb-3 pt-1 text-xs text-charcoal/80 font-mono bg-stone-light/50 border-t border-stone-border/30">
                        {note.rawTranscript}
                      </div>
                    )}
                  </div>
                )}

                {/* Chronological Follow-Up Updates Thread */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-olive" />
                      Catatan Lanjutan (Thread Update)
                    </h4>
                    <span className="text-xs font-bold text-charcoal/50">
                      {note.updates?.length || 0} entri
                    </span>
                  </div>

                  {note.updates && note.updates.length > 0 ? (
                    <div className="space-y-2.5 relative before:absolute before:top-2 before:bottom-2 before:left-3 before:w-0.5 before:bg-stone-border/60">
                      {note.updates.map((up) => (
                        <div
                          key={up.id}
                          className="relative pl-7 pr-3 py-2.5 rounded-2xl bg-white border border-stone-border/60 text-xs shadow-sm"
                        >
                          <div className="absolute left-2 top-3.5 w-2.5 h-2.5 rounded-full bg-charcoal border-2 border-white ring-1 ring-stone-border" />
                          <div className="flex items-center justify-between text-[11px] text-charcoal/50 mb-1">
                            <span className="font-semibold text-charcoal/80">
                              {up.sourceType === "voice" ? "🎤 Catatan Suara" : "✍️ Ketikan Manual"}
                            </span>
                            <span className="tabular-nums">
                              {formatDateTime(up.createdAt)}
                            </span>
                          </div>
                          <p className="text-charcoal/90 leading-relaxed font-medium">
                            {up.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-white border border-dashed border-stone-border text-center text-xs text-charcoal/50">
                      Belum ada catatan tindak lanjut. Tambahkan pembaruan kondisi di bawah.
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>

          {/* Sticky Bottom Bar for Adding Updates */}
          {note && (
            <div className="p-4 bg-white border-t border-stone-border/50 flex items-center gap-2">
              {isVoiceUpdateActive ? (
                <div className="flex-1 flex items-center justify-between bg-charcoal text-lime px-4 py-2.5 rounded-full">
                  <span className="text-xs font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    Merekam follow-up suara...
                  </span>
                  <button
                    onClick={handleStopVoiceUpdate}
                    className="px-3 py-1 bg-lime text-charcoal font-bold text-xs rounded-full"
                  >
                    Selesai
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={newUpdateText}
                    onChange={(e) => setNewUpdateText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddUpdate(newUpdateText, "manual");
                      }
                    }}
                    placeholder="Tulis update lapangan..."
                    className="flex-1 px-4 py-2.5 rounded-full bg-stone-surface/70 border border-transparent focus:border-stone-border focus:bg-white text-xs font-medium text-charcoal outline-none transition-all"
                  />

                  <button
                    type="button"
                    onClick={handleStartVoiceUpdate}
                    disabled={isProcessingVoice}
                    className="w-10 h-10 rounded-full bg-stone-surface text-charcoal flex items-center justify-center hover:bg-stone-border active:scale-95 transition-all flex-shrink-0"
                    title="Rekam update suara"
                  >
                    {isProcessingVoice ? (
                      <span className="w-4 h-4 rounded-full border-2 border-charcoal border-t-transparent animate-spin" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddUpdate(newUpdateText, "manual")}
                    disabled={!newUpdateText.trim() || isSubmittingUpdate}
                    className="w-10 h-10 rounded-full bg-charcoal text-lime disabled:opacity-40 flex items-center justify-center hover:bg-charcoal/90 active:scale-95 transition-all flex-shrink-0 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
