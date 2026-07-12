import { NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/session-store";

// Read the live session (students poll this). No caching — always fresh.
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await getSession(code);
  return NextResponse.json(session, { headers: { "Cache-Control": "no-store" } });
}

// Teacher writes phase / pause / phaseCount / spotlight here.
export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await request.json().catch(() => ({}));
  const session = await updateSession(code, {
    currentPhase: typeof body.currentPhase === "number" ? body.currentPhase : undefined,
    paused: typeof body.paused === "boolean" ? body.paused : undefined,
    phaseCount: typeof body.phaseCount === "number" ? body.phaseCount : undefined,
    renderer: typeof body.renderer === "string" || body.renderer === null ? body.renderer : undefined,
    spotlightStudentId:
      typeof body.spotlightStudentId === "string" || body.spotlightStudentId === null
        ? body.spotlightStudentId
        : undefined,
  });
  return NextResponse.json(session, { headers: { "Cache-Control": "no-store" } });
}
