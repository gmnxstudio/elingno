"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Square,
  Pause,
  Play,
  Type,
  X,
  Check,
  AlertCircle,
  Loader2,
  Calendar,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { FactoryAudioRecorder } from "@/lib/audioRecorder";
import { enqueueAudio } from "@/lib/offlineQueue";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { DynamicIcon } from "./DynamicIcon";
import type { Category } from "@/db/schema";

interface VoiceRecorderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onNoteCreated: () => void;
  initialRecording?: boolean;
}

export function VoiceRecorderSheet({
  isOpen,
  onClose,
  categories,
  onNoteCreated,
  initialRecording = false,
}: VoiceRecorderSheetProps) {
  const [mode, setMode] = useState<"voice" | "manual">("voice");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [waveformData, setWaveformData] = useState<Uint8Array | null>(null);

  // Pipeline states
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);

  // Review & Edit state
  const [reviewReady, setReviewReady] = useState(false);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [formattedContent, setFormattedContent] = useState("");
  const [rawTranscript, setRawTranscript] = useState("");
  const [priority, setPriority] = useState<"normal" | "high">("normal");
  const [dueDateStr, setDueDateStr] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const recorderRef = useRef<FactoryAudioRecorder | null>(null);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  // Auto-start recording if triggered with initialRecording
  useEffect(() => {
    if (isOpen && initialRecording && !isRecording && !reviewReady) {
      startRecording();
    }
  }, [isOpen, initialRecording]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.stop().catch(() => {});
    }
    recorderRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
    setDurationMs(0);
    setWaveformData(null);
    setIsProcessing(false);
    setErrorMsg(null);
    setIsOfflineSaved(false);
    setReviewReady(false);
    setTitle("");
    setFormattedContent("");
    setRawTranscript("");
    setPriority("normal");
    setDueDateStr("");
    setIsSaving(false);
  };

  const startRecording = async () => {
    setErrorMsg(null);
    setIsOfflineSaved(false);
    try {
      const recorder = new FactoryAudioRecorder();
      recorderRef.current = recorder;

      recorder.onTimeUpdate = (ms) => {
        setDurationMs(ms);
      };

      recorder.onWaveformData = (data) => {
        setWaveformData(data);
      };

      await recorder.start();
      setIsRecording(true);
      setIsPaused(false);
    } catch (err: unknown) {
      console.error("Mic access error:", err);
      setErrorMsg("Izin mikrofon diperlukan untuk merekam catatan suara.");
      setIsRecording(false);
    }
  };

  const togglePause = () => {
    if (!recorderRef.current) return;
    if (isPaused) {
      recorderRef.current.resume();
      setIsPaused(false);
    } else {
      recorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const stopAndProcess = async () => {
    if (!recorderRef.current) return;

    try {
      setIsProcessing(true);

      const { blob, durationMs: finalDuration } = await recorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      // Check if browser is offline
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueAudio(blob, finalDuration);
        setIsOfflineSaved(true);
        setIsProcessing(false);
        return;
      }

      // Single Unified Gemini 2.5 Flash Multimodal Pipeline
      const formData = new FormData();
      formData.append("audio", blob, "factory-voice.webm");
      formData.append("currentDateISO", new Date().toISOString());
      formData.append("timezoneOffset", "+07:00");

      const processRes = await fetch("/api/process-voice", {
        method: "POST",
        body: formData,
      });

      if (!processRes.ok) {
        throw new Error("Gagal memproses suara dengan Gemini AI. Coba lagi.");
      }

      const structured = await processRes.json();

      setRawTranscript(structured.rawTranscript || "");
      setTitle(structured.title || "Catatan Lapangan");
      setCategoryId(structured.categoryId || (categories[0]?.id || ""));
      setFormattedContent(structured.formattedContent || structured.rawTranscript || "");
      setPriority(structured.priority || "normal");

      if (structured.dueDateISO) {
        // Convert to local datetime-local format
        const d = new Date(structured.dueDateISO);
        if (!isNaN(d.getTime())) {
          const pad = (n: number) => String(n).padStart(2, "0");
          const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          setDueDateStr(localStr);
        }
      }

      setIsProcessing(false);
      setReviewReady(true);
    } catch (err: unknown) {
      console.error("Pipeline error:", err);
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem";
      setErrorMsg(msg);
      setIsProcessing(false);
    }
  };

  const handleSaveNote = async () => {
    if (!title.trim() || !formattedContent.trim()) {
      setErrorMsg("Judul dan isi catatan wajib diisi.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      let dueDateMs: number | null = null;
      if (dueDateStr) {
        const d = new Date(dueDateStr);
        if (!isNaN(d.getTime())) {
          dueDateMs = d.getTime();
        }
      }

      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          categoryId: categoryId || null,
          formattedContent,
          rawTranscript: rawTranscript || null,
          status: "open",
          priority,
          progress: 0,
          dueDate: dueDateMs,
        }),
      });

      if (!res.ok) {
        throw new Error("Gagal menyimpan catatan.");
      }

      onNoteCreated();
      onClose();
    } catch (err: unknown) {
      console.error("Save note error:", err);
      const msg = err instanceof Error ? err.message : "Gagal menyimpan";
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimer = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

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

        {/* Drawer Content */}
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

          {/* Drawer Header */}
          <div className="px-6 py-2 flex items-center justify-between border-b border-stone-border/40">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-lime border border-charcoal/20" />
              <h3 className="text-lg font-bold text-charcoal tracking-tight">
                {reviewReady ? "Tinjau Catatan AI" : "Catat Operasional"}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {!reviewReady && !isRecording && !isProcessing && (
                <div className="flex items-center bg-stone-surface p-1 rounded-full text-xs font-semibold">
                  <button
                    onClick={() => setMode("voice")}
                    className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 ${
                      mode === "voice"
                        ? "bg-charcoal text-white shadow-sm"
                        : "text-charcoal/70 hover:text-charcoal"
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Suara
                  </button>
                  <button
                    onClick={() => {
                      setMode("manual");
                      setReviewReady(true);
                    }}
                    className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 ${
                      mode === "manual"
                        ? "bg-charcoal text-white shadow-sm"
                        : "text-charcoal/70 hover:text-charcoal"
                    }`}
                  >
                    <Type className="w-3.5 h-3.5" />
                    Ketik
                  </button>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-stone-surface flex items-center justify-center text-charcoal/70 hover:text-charcoal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="p-6 overflow-y-auto flex-1 flex flex-col">
            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {isOfflineSaved && (
              <div className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
                <WifiOff className="w-5 h-5 flex-shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <p className="font-bold">Koneksi Internet Terputus</p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Catatan suara Anda telah diamankan di antrean offline lokal. Akan otomatis diproses saat sinyal kembali normal.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-3 px-4 py-1.5 bg-amber-800 text-white rounded-full text-xs font-bold"
                  >
                    Tutup Antrean
                  </button>
                </div>
              </div>
            )}

            {/* RECORDING / AI STATE */}
            {!reviewReady && !isOfflineSaved && (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                {isProcessing ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-lime/40 animate-ping absolute inset-0" />
                      <div className="w-20 h-20 rounded-full bg-charcoal flex items-center justify-center text-lime shadow-tactile relative">
                        <Sparkles className="w-8 h-8 animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-base text-charcoal">
                        Menganalisis Suara & Menata Catatan...
                      </h4>
                      <p className="text-xs text-charcoal/60">
                        Gemini 2.5 Flash memproses audio langsung menjadi log operasional presisi
                      </p>
                    </div>
                  </div>
                ) : isRecording ? (
                  <div className="w-full flex flex-col items-center space-y-6">
                    {/* Timer */}
                    <div className="space-y-1">
                      <div className="text-4xl font-extrabold text-charcoal tabular-nums tracking-tight">
                        {formatTimer(durationMs)}
                      </div>
                      <p className="text-xs font-semibold text-charcoal/60 flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        {isPaused ? "Rekaman Dijeda" : "Merekam Suara Lapangan"}
                      </p>
                    </div>

                    {/* Waveform visualizer */}
                    <WaveformVisualizer
                      dataArray={waveformData}
                      isRecording={isRecording}
                      isPaused={isPaused}
                    />

                    {/* Industrial Voice hint */}
                    <p className="text-xs text-charcoal/60 max-w-xs leading-relaxed px-2">
                      Sebutkan angka presisi, nama mesin/shift, atau tenggat waktu. Contoh: <em>"Extruder 2 suhu 210C, 1200 sak, besok jam 9 pagi."</em>
                    </p>

                    {/* Controls */}
                    <div className="flex items-center gap-4 pt-2">
                      <button
                        onClick={togglePause}
                        className="w-14 h-14 rounded-full bg-stone-surface text-charcoal flex items-center justify-center hover:bg-stone-border active:scale-95 transition-all shadow-sm"
                        title={isPaused ? "Lanjutkan" : "Jeda"}
                      >
                        {isPaused ? <Play className="w-5 h-5 ml-0.5" /> : <Pause className="w-5 h-5" />}
                      </button>

                      <button
                        onClick={stopAndProcess}
                        className="w-20 h-20 rounded-full bg-charcoal text-lime flex items-center justify-center hover:bg-charcoal/90 active:scale-95 transition-all shadow-tactile glow-hover"
                        title="Selesai & Proses AI"
                      >
                        <Square className="w-7 h-7 fill-lime" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center space-y-6 py-6">
                    <div className="space-y-1.5">
                      <h4 className="text-xl font-extrabold text-charcoal">
                        Rekam Catatan Operasional
                      </h4>
                      <p className="text-xs text-charcoal/60 max-w-xs">
                        Tekan tombol untuk mulai merekam instruksi, kendala mesin, atau laporan lapangan.
                      </p>
                    </div>

                    {/* Hero Start Record Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startRecording}
                      className="w-24 h-24 rounded-full bg-charcoal text-lime flex items-center justify-center shadow-tactile relative group"
                    >
                      <div className="absolute inset-0 rounded-full bg-lime/20 animate-pulse group-hover:scale-110 transition-transform" />
                      <Mic className="w-10 h-10 relative z-10" />
                    </motion.button>

                    <p className="text-[11px] font-semibold text-charcoal/40 uppercase tracking-wider">
                      Maksimal durasi suara bebas • Bebas kuota
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* INSTANT REVIEW & MANUAL EDIT CARD */}
            {reviewReady && (
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-charcoal/80 mb-1">
                    Judul Tugas / Catatan
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Perbaikan Bearing Extruder 02"
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-stone-border text-charcoal font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-charcoal/30 shadow-sm"
                  />
                </div>

                {/* Division Selector Pills */}
                <div>
                  <label className="block text-xs font-bold text-charcoal/80 mb-1.5">
                    Divisi Operasional
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const isSelected = categoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategoryId(cat.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? "bg-charcoal text-white shadow-sm"
                              : "bg-white text-charcoal/70 border border-stone-border hover:border-charcoal/40"
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: cat.colorHex }}
                          />
                          <DynamicIcon name={cat.icon} size={12} />
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Formatted Content */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-charcoal/80">
                      Rincian Terstruktur (Presisi Angka)
                    </label>
                    {rawTranscript && (
                      <span className="text-[11px] text-charcoal/50">
                        Hasil olah Gemini 2.5 Flash
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={5}
                    value={formattedContent}
                    onChange={(e) => setFormattedContent(e.target.value)}
                    placeholder="• Detail catatan operasional&#10;• Parameter teknis&#10;• Langkah tindak lanjut"
                    className="w-full p-4 rounded-2xl bg-white border border-stone-border text-charcoal text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-charcoal/30 shadow-sm font-sans"
                  />
                </div>

                {/* Priority & Due Date Row */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-charcoal/80 mb-1">
                      Prioritas
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 bg-stone-surface p-1 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setPriority("normal")}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          priority === "normal"
                            ? "bg-white text-charcoal shadow-sm"
                            : "text-charcoal/60"
                        }`}
                      >
                        Biasa
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriority("high")}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          priority === "high"
                            ? "bg-red-600 text-white shadow-sm"
                            : "text-charcoal/60"
                        }`}
                      >
                        Penting!
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-charcoal/80 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Batas Waktu (Due Date)
                    </label>
                    <input
                      type="datetime-local"
                      value={dueDateStr}
                      onChange={(e) => setDueDateStr(e.target.value)}
                      className="w-full px-3 py-2 rounded-2xl bg-white border border-stone-border text-charcoal text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-charcoal/30 shadow-sm"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-3">
                  <button
                    onClick={handleSaveNote}
                    disabled={isSaving}
                    className="w-full py-3.5 rounded-2xl bg-charcoal text-lime font-bold text-sm flex items-center justify-center gap-2 hover:bg-charcoal/90 active:scale-[0.98] transition-all shadow-tactile"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-lime" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        Simpan Catatan
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
