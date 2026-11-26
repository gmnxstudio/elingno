"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Check, Tag } from "lucide-react";
import { DynamicIcon } from "./DynamicIcon";
import type { Category } from "@/db/schema";

interface CategoryManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCategoriesChanged: () => void;
}

const PALETTE = [
  "#E4F65B", // Lime
  "#223309", // Forest Olive
  "#1A1B18", // Charcoal
  "#D97706", // Amber
  "#0284C7", // Sky
  "#DC2626", // Red
  "#9333EA", // Purple
  "#0D9488", // Teal
];

const AVAILABLE_ICONS = [
  "Factory",
  "Wrench",
  "Package",
  "Zap",
  "Users",
  "ClipboardList",
  "Truck",
  "Gauge",
  "Shield",
  "AlertOctagon",
  "Settings",
  "Activity",
];

export function CategoryManagerDrawer({
  isOpen,
  onClose,
  categories,
  onCategoriesChanged,
}: CategoryManagerDrawerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [colorHex, setColorHex] = useState(PALETTE[0]);
  const [icon, setIcon] = useState(AVAILABLE_ICONS[0]);
  const [keywords, setKeywords] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setIsCreating(false);
    setName("");
    setColorHex(PALETTE[0]);
    setIcon(AVAILABLE_ICONS[0]);
    setKeywords("");
    setErrorMsg(null);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama divisi/kategori wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          colorHex,
          icon,
          keywords: keywords.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Gagal membuat kategori.");
      }

      resetForm();
      onCategoriesChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan kategori";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Hapus divisi ini? Catatan yang menggunakannya akan dialihkan ke Umum.")) {
      try {
        await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
        onCategoriesChanged();
      } catch (err) {
        console.error("Delete category error:", err);
      }
    }
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

        {/* Drawer */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="relative w-full max-w-lg bg-[#FAF9F5] rounded-t-[34px] shadow-tactileElevated overflow-hidden max-h-[90vh] flex flex-col z-10"
        >
          {/* Grab Handle */}
          <div className="w-full flex items-center justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 rounded-full bg-charcoal/20" />
          </div>

          {/* Header */}
          <div className="px-6 py-2.5 flex items-center justify-between border-b border-stone-border/40">
            <h3 className="text-lg font-bold text-charcoal tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-lime border border-charcoal/20" />
              Kelola Divisi Operasional
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-surface text-charcoal/70 hover:text-charcoal flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-red-50 text-red-800 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {!isCreating ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-charcoal/60 font-semibold">
                    Divisi aktif digunakan Gemini untuk auto-routing catatan suara.
                  </p>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="px-3.5 py-1.5 rounded-full bg-charcoal text-lime text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Divisi
                  </button>
                </div>

                {/* Categories List */}
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-3.5 rounded-2xl bg-white border border-stone-border/60 flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-charcoal border border-charcoal/10"
                          style={{ backgroundColor: cat.colorHex }}
                        >
                          <DynamicIcon name={cat.icon} size={16} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-charcoal">{cat.name}</h4>
                          {cat.keywords && (
                            <p className="text-[11px] text-charcoal/50 max-w-xs truncate">
                              Kata kunci: {cat.keywords}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="w-8 h-8 rounded-full text-charcoal/40 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                        title="Hapus divisi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Create Form */
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-charcoal/80 mb-1">
                    Nama Divisi / Bagian
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Quality Control (QC)"
                    className="w-full px-4 py-2.5 rounded-2xl bg-white border border-stone-border text-sm font-semibold text-charcoal outline-none focus:ring-2 focus:ring-charcoal/20"
                  />
                </div>

                {/* Color Swatch */}
                <div>
                  <label className="block text-xs font-bold text-charcoal/80 mb-1.5">
                    Warna Aksen Tanda
                  </label>
                  <div className="flex items-center gap-2">
                    {PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColorHex(c)}
                        className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                          colorHex === c ? "scale-110 ring-2 ring-charcoal" : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {colorHex === c && <Check className="w-3.5 h-3.5 text-charcoal stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon Picker */}
                <div>
                  <label className="block text-xs font-bold text-charcoal/80 mb-1.5">
                    Ikon Divisi
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {AVAILABLE_ICONS.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setIcon(ic)}
                        className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                          icon === ic
                            ? "bg-charcoal text-lime border-charcoal shadow-sm"
                            : "bg-white text-charcoal/70 border-stone-border hover:border-charcoal/30"
                        }`}
                      >
                        <DynamicIcon name={ic} size={18} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Industrial Keywords */}
                <div>
                  <label className="block text-xs font-bold text-charcoal/80 mb-1">
                    Kata Kunci Pembias AI (Pisahkan koma)
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="contoh: reject, lab, gramatur, tensile, uji tarik"
                    className="w-full px-4 py-2.5 rounded-2xl bg-white border border-stone-border text-xs font-medium text-charcoal outline-none focus:ring-2 focus:ring-charcoal/20"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-3 rounded-2xl bg-stone-surface text-charcoal font-bold text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-2xl bg-charcoal text-lime font-bold text-xs shadow-tactile flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan Divisi"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
