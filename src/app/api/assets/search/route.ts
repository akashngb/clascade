import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ error: "Add a search query." }, { status: 400 });
  const key = process.env.POLY_PIZZA_API_KEY;
  if (!key) {
    return NextResponse.json({ mode: "catalog", url: `https://poly.pizza/search/${encodeURIComponent(query)}`, results: [] });
  }

  return NextResponse.json({
    mode: "catalog",
    url: `https://poly.pizza/search/${encodeURIComponent(query)}`,
    results: [],
    note: "Poly Pizza does not publish a stable public endpoint contract. The key remains server-side while catalog links provide a safe fallback.",
  });
}
