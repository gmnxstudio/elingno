"use client";

import React, { useRef } from "react";
import {
  Bell,
  Settings,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Sparkles,
  Calendar,
  AlertOctagon,
  Search,
} from "lucide-react";
import { DynamicIcon } from "./DynamicIcon";
import type { Category, Note } from "@/db/schema";

interface NoteItem extends Note {
  categoryName?: string | null;
  categoryColor?: string | null;
  categoryIcon?: string | null;
  updatesCount?: number;
}

interface HomeScreenProps {
  categories: Category[];
  notes: NoteItem[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  onOpenCategoriesManager: () => void;
  onOpenNotifications: () => void;
  onSelectNote: (noteId: string) => void;
  onToggleNoteStatus: (note: NoteItem) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function HomeScreen({
  categories,
  notes,
  selectedCategoryId,
  onSelectCategory,
  onOpenCategoriesManager,
  onOpenNotifications,
  onSelectNote,
  onToggleNoteStatus,
  searchQuery,
  onSearchChange,
}: HomeScreenProps) {
  const activeTasksRef = useRef<HTMLDivElement | null>(null);

  // Stats
  const activeNotesCount = notes.filter((n) => n.status !== "done").length;
  const highPriorityNotes = notes.filter((n) => n.priority === "high" && n.status !== "done");
  const carouselNotes = highPriorityNotes.length > 0 ? highPriorityNotes : notes.slice(0, 5);

  const scrollToActiveTasks = () => {
    activeTasksRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatShortTime = (ms: number) => {
    return new Date(ms).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="w-full pb-32 space-y-6">
      {/* Top Bar */}
      <header className="px-5 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Logo Badge */}
          <div className="w-8 h-8 rounded-xl bg-olive flex items-center justify-center text-lime font-black text-sm tracking-tighter shadow-sm border border-olive/30">
            E
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-charcoal tracking-tightDisplay leading-none">
              Elingno
            </h1>
            <p className="text-[10px] font-bold text-charcoal/50 uppercase tracking-wide">
              Catatan & Pengingat Pabrik
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Category Gear */}
          <button
            onClick={onOpenCategoriesManager}
            className="w-10 h-10 rounded-full bg-stone-surface/80 hover:bg-stone-surface text-charcoal flex items-center justify-center transition-colors shadow-sm"
            title="Kelola Divisi"
          >
            <Settings className="w-4 h-4 text-charcoal/80" />
          </button>

          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative w-10 h-10 rounded-full bg-stone-surface/80 hover:bg-stone-surface text-charcoal flex items-center justify-center transition-colors shadow-sm"
            title="Pengingat & Notifikasi"
          >
            <Bell className="w-4 h-4 text-charcoal/80" />
            {activeNotesCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-600 ring-2 ring-canvas" />
            )}
          </button>
        </div>
      </header>

      {/* Hero Heading & Search Bar */}
      <section className="px-5 space-y-3.5">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal tracking-tightDisplay leading-[1.15]">
          Kendalikan Tugas &<br />Catatan Hari Ini
        </h2>

        {/* Task Summary Pill */}
        <div
          onClick={scrollToActiveTasks}
          className="w-full px-4 py-3 rounded-full bg-stone-surface border border-stone-border/40 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all shadow-sm group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-charcoal text-lime flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-charcoal">
              Ada <span className="tabular-nums font-black">{activeNotesCount}</span> tugas aktif operasional hari ini
            </span>
          </div>
          <div className="w-7 h-7 rounded-full bg-white text-charcoal flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shadow-xs">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-charcoal/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari mesin, unit, sak, kg, nomor, atau divisi..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/90 border border-stone-border text-xs font-medium text-charcoal outline-none focus:ring-2 focus:ring-charcoal/20 shadow-xs"
          />
        </div>
      </section>

      {/* Custom Division Filter Pills */}
      <section className="px-5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => onSelectCategory("all")}
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
              selectedCategoryId === "all"
                ? "bg-charcoal text-white shadow-sm"
                : "bg-white text-charcoal/70 border border-stone-border hover:border-charcoal/40"
            }`}
          >
            Semua
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums ${
                selectedCategoryId === "all"
                  ? "bg-lime text-charcoal font-black"
                  : "bg-stone-surface text-charcoal/80"
              }`}
            >
              {notes.length}
            </span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const count = notes.filter((n) => n.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
                  isSelected
                    ? "bg-charcoal text-white shadow-sm"
                    : "bg-white text-charcoal/70 border border-stone-border hover:border-charcoal/40"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.colorHex }}
                />
                <DynamicIcon name={cat.icon} size={13} />
                <span>{cat.name}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums ${
                      isSelected
                        ? "bg-lime text-charcoal font-black"
                        : "bg-stone-surface text-charcoal/80"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={onOpenCategoriesManager}
            className="px-3 py-2 rounded-full text-xs font-bold text-charcoal/60 bg-stone-surface/60 hover:bg-stone-surface border border-dashed border-stone-border flex items-center gap-1 flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Kategori</span>
          </button>
        </div>
      </section>

      {/* Featured Priority / Active Notes Carousel */}
      {carouselNotes.length > 0 && (
        <section className="space-y-2.5">
          <div className="px-5 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-charcoal/80 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-olive" />
              Tugas Prioritas Lapangan
            </h3>
            <span className="text-[11px] font-bold text-charcoal/40 uppercase">
              Geser Kartu ➔
            </span>
          </div>

          <div className="flex gap-3.5 overflow-x-auto no-scrollbar snap-x snap-mandatory px-5 py-1">
            {carouselNotes.map((note, idx) => {
              const isLimeCard = idx === 0;
              return (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note.id)}
                  className={`snap-center flex-shrink-0 w-[84vw] max-w-sm rounded-card p-5 cursor-pointer relative overflow-hidden transition-all active:scale-[0.99] shadow-tactileCard flex flex-col justify-between ${
                    isLimeCard
                      ? "bg-lime text-charcoal border border-charcoal/15 surface-organic-wave"
                      : "bg-olive text-white border border-olive-surface"
                  }`}
                  style={{ minHeight: "220px" }}
                >
                  {/* Organic wave overlay on Acid Lime card */}
                  {isLimeCard && (
                    <div className="absolute inset-0 pointer-events-none opacity-20 surface-noise" />
                  )}

                  {/* Card Header */}
                  <div className="flex items-center justify-between relative z-10 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1 border ${
                          isLimeCard
                            ? "bg-charcoal text-lime border-charcoal"
                            : "bg-white/10 text-lime border-white/20"
                        }`}
                      >
                        {note.status === "in_progress"
                          ? "In Progress"
                          : note.status === "done"
                          ? "Selesai"
                          : "Terbuka"}
                      </span>

                      {note.priority === "high" && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isLimeCard
                              ? "bg-red-600 text-white"
                              : "bg-lime text-charcoal"
                          }`}
                        >
                          High
                        </span>
                      )}
                    </div>

                    {note.categoryName && (
                      <span
                        className={`text-[11px] font-bold ${
                          isLimeCard ? "text-charcoal/80" : "text-white/80"
                        }`}
                      >
                        @{note.categoryName}
                      </span>
                    )}
                  </div>

                  {/* Card Title & Snippet */}
                  <div className="relative z-10 space-y-1.5 my-auto">
                    <h4
                      className={`text-lg font-extrabold leading-snug tracking-tight line-clamp-2 ${
                        isLimeCard ? "text-charcoal" : "text-white"
                      }`}
                    >
                      {note.title}
                    </h4>
                    <p
                      className={`text-xs font-medium line-clamp-2 ${
                        isLimeCard ? "text-charcoal/75" : "text-white/75"
                      }`}
                    >
                      {note.formattedContent.replace(/[•\n]/g, " ")}
                    </p>
                  </div>

                  {/* Card Footer with Thread count + Due date & Progress */}
                  <div className="relative z-10 pt-3 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {(note.updatesCount || 0) > 0 && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isLimeCard
                                ? "bg-charcoal/10 text-charcoal"
                                : "bg-white/20 text-white"
                            }`}
                          >
                            +{note.updatesCount} update
                          </span>
                        )}
                        {note.dueDate && (
                          <span
                            className={`flex items-center gap-1 text-[11px] font-bold ${
                              isLimeCard ? "text-charcoal/80" : "text-lime"
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {new Date(note.dueDate).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}
                      </div>

                      <span
                        className={`font-mono text-xs font-bold tabular-nums ${
                          isLimeCard ? "text-charcoal" : "text-lime"
                        }`}
                      >
                        {note.progress}%
                      </span>
                    </div>

                    {/* Diagonal striped progress bar */}
                    <div
                      className={`w-full h-2.5 rounded-full overflow-hidden p-0.5 ${
                        isLimeCard ? "bg-charcoal/20" : "bg-white/20"
                      }`}
                    >
                      <div
                        className={`h-full rounded-full ${
                          isLimeCard
                            ? "progress-diagonal-stripes"
                            : "progress-diagonal-stripes-lime"
                        }`}
                        style={{ width: `${Math.max(6, note.progress)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Notes Feed */}
      <section ref={activeTasksRef} className="px-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-charcoal/80 uppercase tracking-wider">
            Semua Catatan Hari Ini ({notes.length})
          </h3>
        </div>

        {notes.length > 0 ? (
          <div className="space-y-3">
            {notes.map((note) => {
              const isDone = note.status === "done";
              return (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note.id)}
                  className={`p-4 rounded-[26px] bg-white border border-stone-border/60 hover:border-charcoal/40 transition-all cursor-pointer shadow-sm active:scale-[0.99] flex items-start gap-3.5 ${
                    isDone ? "opacity-60 bg-white/70" : ""
                  }`}
                >
                  {/* Quick-check toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleNoteStatus(note);
                    }}
                    className="mt-0.5 text-charcoal/40 hover:text-charcoal transition-colors flex-shrink-0"
                    title={isDone ? "Buka kembali" : "Tandai selesai"}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-olive fill-lime" />
                    ) : (
                      <Circle className="w-5 h-5 text-stone-border hover:text-charcoal" />
                    )}
                  </button>

                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold text-charcoal border border-charcoal/10"
                        style={{ backgroundColor: note.categoryColor || "#E4F65B" }}
                      >
                        {note.categoryName || "Umum"}
                      </span>

                      {note.priority === "high" && (
                        <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                          Urgent
                        </span>
                      )}

                      <span className="text-[11px] text-charcoal/40 tabular-nums ml-auto">
                        {formatShortTime(note.createdAt)}
                      </span>
                    </div>

                    <h4
                      className={`text-sm font-bold text-charcoal leading-snug line-clamp-1 ${
                        isDone ? "line-through text-charcoal/50" : ""
                      }`}
                    >
                      {note.title}
                    </h4>

                    <p className="text-xs text-charcoal/70 line-clamp-2 leading-relaxed">
                      {note.formattedContent.replace(/[•\n]/g, " ")}
                    </p>

                    {/* Meta bar */}
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-charcoal/50 font-medium">
                      {(note.updatesCount || 0) > 0 && (
                        <span>+{note.updatesCount} update</span>
                      )}
                      {note.dueDate && (
                        <span className="flex items-center gap-1 font-semibold text-charcoal/70">
                          <Calendar className="w-3 h-3" />
                          {new Date(note.dueDate).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      {note.progress > 0 && (
                        <span className="tabular-nums font-bold text-charcoal/70 ml-auto">
                          {note.progress}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-[28px] bg-white border border-dashed border-stone-border text-center space-y-2">
            <p className="text-sm font-bold text-charcoal">Belum ada catatan operasional</p>
            <p className="text-xs text-charcoal/60 max-w-xs mx-auto">
              Tekan tombol mikrofon di bawah untuk merekam laporan shift, mesin, atau stok pertama Anda.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
