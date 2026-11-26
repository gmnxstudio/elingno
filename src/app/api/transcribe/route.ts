import { NextRequest, NextResponse } from "next/server";

const FACTORY_INDUSTRIAL_PROMPT =
  "Catatan operasional pabrik di Indonesia. Tulis semua angka dalam format numerik presisi (contoh: 53,5 kg, 243V, 1200 sak, 300 m3, pukul 09.00, Rp 1.500.000). Istilah teknis: rafia, extruder, pelletizing, PP, PE, PET, PVC, karung, tonase, voltase, ampere, inverter, VFD, timbangan, shift, gudang, maintenance, dinamo, bearing, SIPA, SKPD.";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json({ error: "Missing or invalid audio file" }, { status: 400 });
    }

    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      // In development or if key is pending, return informative message or fallback
      return NextResponse.json({
        transcript:
          "Pengecekan extruder 02 suhu normal 210C, hasil timbangan shift pagi 1250 sak karung PP 50kg, dinamo motor pendingin bearing bergetar sedikit.",
        notice: "GROQ_API_KEY belum disetel. Menggunakan transkrip simulasi pabrik untuk preview.",
      });
    }

    const groqFormData = new FormData();
    groqFormData.append("file", audioFile, "audio.webm");
    groqFormData.append("model", "whisper-large-v3-turbo");
    groqFormData.append("language", "id");
    groqFormData.append("temperature", "0");
    groqFormData.append("prompt", FACTORY_INDUSTRIAL_PROMPT);

    const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: groqFormData,
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq Whisper API error:", errText);
      return NextResponse.json(
        { error: "Groq transcription failed", details: errText },
        { status: groqRes.status }
      );
    }

    const data = (await groqRes.json()) as { text?: string };
    const transcript = (data.text || "").trim();

    return NextResponse.json({ transcript });
  } catch (error: unknown) {
    console.error("Transcribe API Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
