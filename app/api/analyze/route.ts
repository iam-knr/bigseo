import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "Missing ?url parameter" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    url,
    message: "Analysis endpoint is wired. Logic will be added in Phase 1.",
  });
}
