import { NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/session-store";

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return NextResponse.json(getSession(code));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await request.json();
  return NextResponse.json(updateSession(code, {
    currentPhase: typeof body.currentPhase === "number" ? body.currentPhase : undefined,
    paused: typeof body.paused === "boolean" ? body.paused : undefined,
    spotlightStudentId: typeof body.spotlightStudentId === "string" || body.spotlightStudentId === null ? body.spotlightStudentId : undefined,
  }));
}
