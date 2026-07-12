import { NextResponse } from "next/server";
import { generateLesson } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const description = String(form.get("description") || "").trim();
    const file = form.get("file");
    if (!description && !(file instanceof File)) {
      return NextResponse.json({ error: "Describe a lesson or add a source file." }, { status: 400 });
    }

    let sourceText = "";
    if (file instanceof File && file.size > 0) {
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "Keep uploads under 10 MB for this build." }, { status: 413 });
      }
      if (file.type === "text/plain" || file.name.endsWith(".md")) {
        sourceText = await file.text();
      } else {
        sourceText = `Uploaded source: ${file.name}, ${file.type || "unknown type"}, ${file.size} bytes. Use the teacher description as the primary brief.`;
      }
    }

    const result = await generateLesson(description || `Create an interactive lesson from ${file instanceof File ? file.name : "the source"}.`, sourceText);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The generation pipeline stopped unexpectedly.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
