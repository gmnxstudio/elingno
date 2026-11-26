"use client";

import React, { useState, useEffect } from "react";
import { Clock, Calendar as CalendarIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { DynamicIcon } from "./DynamicIcon";
import type { Note } from "@/db/schema";

interface NoteItem extends Note {
  categoryName?: string | null;
  categoryColor?: string | null;
  categoryIcon?: string | null;
  updatesCount?: number;
}

interface TimelineScreenProps {
  notes: NoteItem[];
  onSelectNote: (noteId: string) => void;
}

export function TimelineScreen({ notes, onSelectNote }: TimelineScreenProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Generate 7-day horizontal week strip centered on selected week
  const getWeekDays = (baseDate: Date) => {
    const currentDay = baseDate.getDay(); // 0 is Sunday
    // Adjust so Monday is 0
    const distanceToMonday = (currentDay + 6) % 7;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - distanceToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays(selectedDate);

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  // Filter notes for selected date (either created on or due on this date)
  const dayNotes = notes.filter((n) => {
    const createdDate = new Date(n.createdAt);
    const hasDueDate = n.dueDate ? new Date(n.dueDate) : null;

    return isSameDay(createdDate, selectedDate) || (hasDueDate && isSameDay(hasDueDate, selectedDate));
  });

  // Hours array from 07:00 to 22:00
  const hours = Array.from({ length: 16 }, (_, i) => i + 7);

  const getNotesForHour = (hour: number) => {
    return dayNotes.filter((n) => {
      // Prioritize due date time if set, otherwise creation time
      const targetTime = n.dueDate ? new Date(n.dueDate) : new Date(n.createdAt);
      return targetTime.getHours() === hour;
    });
  };

  const currentHour = Math.floor(currentTimeMinutes / 60);
  const showCurrentTimeLine =
    isSameDay(selectedDate, new Date()) && currentHour >= 7 && currentHour <= 22;

  return (
    <div className="w-full pb-32">
      {/* Curved Dark Header (#223309, rounded-b-[36px]) */}
      <header className="bg-olive text-white pt-6 pb-7 px-5 rounded-b-[36px] shadow-tactileCard space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5 cursor-pointer">
              <span>
                {selectedDate.toLocaleDateString("id-ID", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="text-lime text-xs">▾</span>
            </div>
            <p className="text-xs text-white/70 font-medium mt-0.5">
              {dayNotes.length} aktivitas & target tercatat
            </p>
          </div>

          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-lime text-xs font-bold border border-white/20 transition-all"
          >
            Hari Ini
          </button>
        </div>

        {/* 7-Day Horizontal Week Strip (Mon - Sun) */}
        <div className="grid grid-cols-7 gap-1 pt-1">
          {weekDays.map((date, idx) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center py-2.5 px-1 rounded-2xl transition-all ${
                  isSelected
                    ? "bg-white/20 text-lime ring-2 ring-lime/50 shadow-inner"
                    : "hover:bg-white/5 text-white/70"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {dayNames[idx]}
                </span>
                <span
                  className={`text-base font-black tabular-nums mt-0.5 ${
                    isSelected ? "text-lime" : isToday ? "text-white underline" : "text-white/90"
                  }`}
                >
                  {date.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Hourly Vertical Timeline (07:00 - 22:00) */}
      <section className="px-5 pt-6 space-y-4 relative">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-extrabold text-charcoal/80 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-olive" />
            Garis Waktu Shift Operasional
          </h3>
          <span className="text-[11px] font-mono text-charcoal/50 tabular-nums">
            07.00 — 22.00 WIB
          </span>
        </div>

        <div className="relative">
          {/* Vertical axis line */}
          <div className="absolute left-[52px] top-2 bottom-2 w-0.5 bg-stone-border/70" />

          {hours.map((hour) => {
            const hourFormatted = `${String(hour).padStart(2, "0")}:00`;
            const hourNotes = getNotesForHour(hour);
            const isCurrentThisHour =
              showCurrentTimeLine && hour === currentHour;

            return (
              <div key={hour} className="relative flex items-start gap-4 min-h-[72px] pb-4">
                {/* Left Column: Tabular-nums hour */}
                <div className="w-10 text-right font-mono text-xs font-bold text-charcoal/50 tabular-nums pt-0.5 flex-shrink-0">
                  {hourFormatted}
                </div>

                {/* Timeline node dot */}
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 border-canvas mt-1 z-10 flex-shrink-0 ${
                    hourNotes.length > 0
                      ? "bg-charcoal ring-2 ring-lime"
                      : "bg-stone-border"
                  }`}
                />

                {/* Live horizontal current time line */}
                {isCurrentThisHour && (
                  <div
                    className="absolute left-[52px] right-0 z-20 flex items-center pointer-events-none"
                    style={{
                      top: `${((currentTimeMinutes % 60) / 60) * 100}%`,
                    }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600 ring-4 ring-red-200" />
                    <div className="flex-1 h-0.5 bg-red-500" />
                    <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                      Sekarang
                    </span>
                  </div>
                )}

                {/* Right Column: Cards */}
                <div className="flex-1 space-y-2">
                  {hourNotes.length > 0 ? (
                    hourNotes.map((note) => {
                      const isCompleted = note.status === "done";
                      return (
                        <div
                          key={note.id}
                          onClick={() => onSelectNote(note.id)}
                          className="p-4 rounded-[26px] bg-white border border-stone-border/60 hover:border-charcoal/40 transition-all cursor-pointer shadow-sm active:scale-[0.99] space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-charcoal border border-charcoal/10"
                              style={{ backgroundColor: note.categoryColor || "#E4F65B" }}
                            >
                              @{note.categoryName || "Umum"}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {note.priority === "high" && (
                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-extrabold uppercase">
                                  High
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isCompleted
                                    ? "bg-olive text-white"
                                    : note.status === "in_progress"
                                    ? "bg-lime text-charcoal"
                                    : "bg-stone-surface text-charcoal/80"
                                }`}
                              >
                                {isCompleted
                                  ? "Completed"
                                  : note.status === "in_progress"
                                  ? "In Progress"
                                  : "Open"}
                              </span>
                            </div>
                          </div>

                          <h4 className="text-sm font-bold text-charcoal leading-snug line-clamp-1">
                            {note.title}
                          </h4>

                          <p className="text-xs text-charcoal/70 line-clamp-2">
                            {note.formattedContent.replace(/[•\n]/g, " ")}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-charcoal/50 pt-1">
                            <span>
                              {note.dueDate
                                ? `Batas: ${new Date(note.dueDate).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}`
                                : `Dicatat: ${new Date(note.createdAt).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}`}
                            </span>
                            {note.progress > 0 && (
                              <span className="font-mono font-bold tabular-nums">
                                {note.progress}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-6" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
