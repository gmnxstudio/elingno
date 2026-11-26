import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type GenerationConfig } from "@google/generative-ai";
import { db, ensureSchema } from "@/db";
import { categories } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();

    const body = await req.json();
    const { transcript, currentDateISO, timezoneOffset } = body;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json({ error: "Missing or invalid transcript" }, { status: 400 });
    }

    // 1. Fetch available categories
    const allCategories = await db.select().from(categories);
    const categoryCatalog = allCategories.map((c) => ({
      id: c.id,
      name: c.name,
      keywords: c.keywords,
    }));

    const geminiApiKey = process.env.GEMINI_API_KEY;

    // Fallback if GEMINI_API_KEY is not configured yet
    if (!geminiApiKey) {
      const lower = transcript.toLowerCase();
      let matchedCategory = allCategories[0]?.id || "cat-umum";

      for (const cat of allCategories) {
        const kws = (cat.keywords || "").split(",").map((k) => k.trim().toLowerCase());
        if (kws.some((k) => k && lower.includes(k))) {
          matchedCategory = cat.id;
          break;
        }
      }

      const isHighPriority =
        lower.includes("urgent") ||
        lower.includes("penting") ||
        lower.includes("segera") ||
        lower.includes("rusak") ||
        lower.includes("berhenti") ||
        lower.includes("bocor");

      return NextResponse.json({
        title: transcript.slice(0, 45) + (transcript.length > 45 ? "..." : ""),
        categoryId: matchedCategory,
        formattedContent: `• Transkrip: ${transcript}\n• Status operasional dicatat secara presisi.`,
        priority: isHighPriority ? "high" : "normal",
        dueDateISO: null,
        notice: "GEMINI_API_KEY belum disetel. Menggunakan penataan heuristik lokal.",
      });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);

    const schemaConfig: GenerationConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description: "Maksimal 6 kata, judul operasional tegas dan padat.",
          },
          categoryId: {
            type: SchemaType.STRING,
            description: "Pilih ID divisi/kategori yang paling tepat dari daftar yang disediakan.",
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
            description: "Infer 'high' jika ada kata urgent, penting, segera, rusak, berhenti, bahaya.",
          },
          dueDateISO: {
            type: SchemaType.STRING,
            description:
              "ISO 8601 string waktu jatuh tempo (WIB +07:00). Terjemahkan ekspresi waktu relatif seperti 'besok jam 9 pagi', 'hari sabtu', 'lusa sore', atau 'tanggal 5' relatif terhadap currentDateISO. Jika tidak disebutkan batas waktu, kembalikan string kosong.",
          },
        },
        required: ["title", "categoryId", "formattedContent", "priority"],
      },
    };

    const systemInstruction = `Anda adalah sekretaris eksekutif operasional pabrik dan industri manufaktur di Indonesia ("Elingno").
Tugas Anda merapikan transkrip suara kasar pekerja/manajer pabrik menjadi catatan kerja terstruktur dan presisi.

ATURAN WAJIB:
1. Angka, kuantitas, satuan ukur (kg, m3, sak, Volt, Ampere, bar, °C, RPM, ton, rupiah) dan nomor mesin/part HARUS DIPERTAHANKAN 100% PERSIS DAN PRESISI.
2. Format formattedContent dalam bullet points (•) bahasa Indonesia profesional tanpa kata-kata ragu (eee, anu, mmm, apa itu).
3. dueDateISO: jika diucapkan waktu (misal "tolong dicek besok sebelum jam 10 pagi", "selesaikan hari jumat"), hitung tanggal ISO dari currentDateISO di zona waktu Asia/Jakarta (WIB). Jika tidak ada batas waktu, kosongkan.
4. Pilih categoryId HANYA dari daftar kategori yang valid: ${JSON.stringify(categoryCatalog)}.`;

    const prompt = `Tanggal & Waktu Saat Ini: ${currentDateISO || new Date().toISOString()} (Timezone Offset: ${timezoneOffset || "+07:00"})
Daftar Kategori Tersedia:
${JSON.stringify(categoryCatalog, null, 2)}

Transkrip Suara:
"${transcript}"`;

    const candidateModels = ["gemini-2.5-flash", "gemini-3.8-flash", "gemini-flash-latest"];
    let result = null;
    let lastError: unknown = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: schemaConfig,
          systemInstruction,
        });

        result = await model.generateContent(prompt);
        if (result) break;
      } catch (err: unknown) {
        lastError = err;
        console.warn(`Model ${modelName} unavailable, falling back...`, (err as Error)?.message);
      }
    }

    if (!result) {
      throw lastError || new Error("Gemini API service unavailable");
    }

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    // Validate categoryId
    const validCategory = allCategories.find((c) => c.id === parsed.categoryId);
    const categoryId = validCategory ? validCategory.id : (allCategories[0]?.id || "cat-umum");

    return NextResponse.json({
      rawTranscript: transcript,
      title: parsed.title || "Catatan Operasional",
      categoryId,
      formattedContent: parsed.formattedContent || transcript,
      priority: parsed.priority === "high" ? "high" : "normal",
      dueDateISO: parsed.dueDateISO && parsed.dueDateISO.trim().length > 0 ? parsed.dueDateISO : null,
    });
  } catch (error: unknown) {
    console.error("Structure API Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
