"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, Calendar, Mic } from "lucide-react";

interface FloatingActionDockProps {
  activeTab: "home" | "timeline";
  onChangeTab: (tab: "home" | "timeline") => void;
  onOpenVoiceRecorder: (immediateRecord?: boolean) => void;
}

export function FloatingActionDock({
  activeTab,
  onChangeTab,
  onOpenVoiceRecorder,
}: FloatingActionDockProps) {
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const handleStartPress = () => {
    isLongPressRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      // Trigger instant hands-free recording on long press
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(50);
      }
      onOpenVoiceRecorder(true);
    }, 450);
  };

  const handleEndPress = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleClickMic = () => {
    if (!isLongPressRef.current) {
      onOpenVoiceRecorder(false);
    }
  };

  return (
    <div className="fixed bottom-6 inset-x-0 z-40 flex items-center justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 px-3 py-2 rounded-full bg-[#E5E4DE]/90 backdrop-blur-md border border-white/60 shadow-tactileElevated">
        {/* Tab 1: Home / Divisions */}
        <button
          onClick={() => onChangeTab("home")}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full transition-all text-xs font-bold ${
            activeTab === "home"
              ? "bg-white text-charcoal shadow-sm"
              : "text-charcoal/70 hover:text-charcoal"
          }`}
          title="Beranda & Divisi"
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Beranda</span>
        </button>

        {/* Center Hero Mic Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onMouseDown={handleStartPress}
          onMouseUp={handleEndPress}
          onTouchStart={handleStartPress}
          onTouchEnd={handleEndPress}
          onClick={handleClickMic}
          className="w-13 h-13 px-4 py-3 rounded-full bg-charcoal text-lime shadow-tactile flex items-center justify-center gap-1.5 active:scale-95 transition-all group"
          title="Ketuk untuk buka rekaman suara, tahan untuk langsung rekam"
        >
          <Mic className="w-5 h-5 text-lime animate-pulseSubtle" />
          <span className="text-xs font-extrabold tracking-tight">Catat</span>
        </motion.button>

        {/* Tab 2: Timeline / Calendar */}
        <button
          onClick={() => onChangeTab("timeline")}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full transition-all text-xs font-bold ${
            activeTab === "timeline"
              ? "bg-white text-charcoal shadow-sm"
              : "text-charcoal/70 hover:text-charcoal"
          }`}
          title="Jadwal & Garis Waktu"
        >
          <Calendar className="w-4 h-4" />
          <span>Jadwal</span>
        </button>
      </div>
    </div>
  );
}
