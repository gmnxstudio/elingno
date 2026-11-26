import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { db, ensureSchema } from "@/db";
import { categories } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();

    const formData = await req.formData();
    const audio = formData.get("audio");
    const currentDateISO = (formData.get("currentDateISO") as string) || new Date().toISOString();
    const timezoneOffset = (formData.get("timezoneOffset") as string) || "+07:00";

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "Missing or invalid audio file" }, { status: 400 });
    }

    // 1. Fetch available categories from Turso DB
    const allCategories = await db.select().from(categories);
    const categoryCatalog = allCategories.map((c) => ({
      id: c.id,
      name: c.name,
      keywords: c.keywords,
    }));

    const geminiApiKey = process.env.GEMINI_API_KEY;

    // Graceful fallback for local dev when GEMINI_API_KEY is not yet supplied
    if (!geminiApiKey) {
      const fallbackTranscript =
        "Pemeriksaan extruder 02 suhu operasi 210°C, timbangan shift pagi menghasilkan 1250 sak karung PP 50kg, getaran motor bearing dinamo perlu dicek besok jam 09.00.";
      return NextResponse.json({
        rawTranscript: fallbackTranscript,
        title: "Pengecekan Extruder 02 Shift Pagi",
        categoryId: allCategories[0]?.id || "cat-produksi",
        formattedContent:
          "• Suhu operasi extruder 02 terpantau normal pada 210°C.\n• Hasil timbangan shift pagi: 1250 sak karung PP 50kg.\n• Terdeteksi getaran pada bearing dinamo motor pendingin; perlu inspeksi lusa.",
        priority: "high",
        dueDateISO: null,
        notice: "GEMINI_API_KEY belum disetel. Menggunakan simulasi multimodal Gemini untuk preview.",
      });
    }

    // 2. Prepare audio buffer & base64
    const audioBuffer = await audio.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    // Normalize mimeType (strip codecs e.g. audio/webm;codecs=opus -> audio/webm)
    let rawMime = audio.type || "audio/webm";
    const cleanMime = rawMime.split(";")[0].trim() || "audio/webm";

    // 3. Initialize Gemini 2.5 Flash
    const genAI = new GoogleGenerativeAI(geminiApiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            rawTranscript: {
              type: SchemaType.STRING,
              description:
                "Transkripsi kata-per-kata (verbatim) bahasa Indonesia dari audio rekaman. Tulis semua angka, kuantitas, pengukuran, mata uang, dan satuan dalam format numerik presisi (contoh: 53,5 kg, 243V, 1200 sak, 300 m3, pukul 09.00, Rp 1.500.000). Istilah teknis: rafia, extruder, pelletizing, PP, PE, PET, PVC, karung, tonase, voltase, ampere, inverter, VFD, timbangan, shift, gudang, maintenance, dinamo, bearing, SIPA, SKPD.",
            },
            title: {
              type: SchemaType.STRING,
              description: "Maksimal 6 kata, judul operasional tegas, informatif, dan padat.",
            },
            categoryId: {
              type: SchemaType.STRING,
              description: "Pilih ID divisi/kategori yang paling tepat dari daftar kategori yang disediakan.",
            },
            formattedContent: {
              type: SchemaType.STRING,
              description:
                "Poin-poin markdown bahasa Indonesia yang bersih dan rapi. Hapus kata pengisi (eee, anu, terus). JANGAN PERNAH mengubah, membulatkan, atau menghilangkan angka, satuan, waktu, uang, atau kuantitas apapun.",
            },
            priority: {
              type: SchemaType.STRING,
              format: "enum",
              enum: ["normal", "high"],
              description: "Infer 'high' jika ada kata atau nada urgent, penting, segera, rusak, berhenti, bocor, bahaya.",
            },
            dueDateISO: {
              type: SchemaType.STRING,
              description:
                "ISO 8601 string waktu jatuh tempo (WIB +07:00). Terjemahkan ekspresi waktu relatif seperti 'besok jam 9 pagi', 'hari sabtu', 'lusa sore', atau 'tanggal 5' relatif terhadap currentDateISO. Jika tidak disebutkan batas waktu, kembalikan string kosong.",
            },
          },
          required: ["rawTranscript", "title", "categoryId", "formattedContent", "priority"],
        },
      },
      systemInstruction: `Anda adalah sekretaris eksekutif operasional pabrik dan industri manufaktur di Indonesia ("Elingno").
Anda menerima rekaman audio suara langsung dari operator / manajer lapangan di lantai produksi yang bising.

TUGAS ANDA:
1. Dengarkan audio secara seksama dan hasilkan transkripsi kata-per-kata yang akurat (rawTranscript). Tulis semua angka, kuantitas, dan satuan ukur (kg, m3, sak, Volt, Ampere, bar, °C, RPM, ton, rupiah) dan nomor mesin/part secara numerik presisi.
2. Buat judul operasional padat (title, maksimal 6 kata).
3. Pilih divisi/kategori (categoryId) HANYA dari daftar kategori yang valid: ${JSON.stringify(categoryCatalog)}.
4. Susun catatan terstruktur (formattedContent) dalam bentuk poin-poin markdown bersih (•), singkirkan kata ragu/pengisi seperti 'eee', 'anu', 'apa itu'. PERTAHANKAN SEMUA ANGKA DAN METRIK DENGAN PRESISI 100%.
5. Tentukan priority ('normal' atau 'high' jika darurat/rusak/urgent).
6. Tentukan dueDateISO jika pekerja menyebutkan batas waktu penyelesaian, dihitung relatif terhadap currentDateISO di zona waktu Asia/Jakarta (WIB +07:00).`,
    });

    const audioPart = {
      inlineData: {
        data: base64Audio,
        mimeType: cleanMime,
      },
    };

    const textPrompt = `Tanggal & Waktu Saat Ini: ${currentDateISO} (Timezone Offset: ${timezoneOffset})
Daftar Kategori Divisi:
${JSON.stringify(categoryCatalog, null, 2)}

Analisis audio rekaman suara operasional terlampir dan berikan output JSON terstruktur sesuai schema.`;

    const result = await model.generateContent([audioPart, textPrompt]);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    // Validate categoryId
    const validCategory = allCategories.find((c) => c.id === parsed.categoryId);
    const categoryId = validCategory ? validCategory.id : (allCategories[0]?.id || "cat-umum");

    return NextResponse.json({
      rawTranscript: parsed.rawTranscript || "",
      title: parsed.title || "Catatan Operasional",
      categoryId,
      formattedContent: parsed.formattedContent || parsed.rawTranscript || "",
      priority: parsed.priority === "high" ? "high" : "normal",
      dueDateISO: parsed.dueDateISO && parsed.dueDateISO.trim().length > 0 ? parsed.dueDateISO : null,
    });
  } catch (error: unknown) {
    console.error("Process Voice API Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
