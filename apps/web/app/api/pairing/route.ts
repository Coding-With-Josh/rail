import { NextResponse } from "next/server";
import { api } from "@/lib/api";

// GET /api/pairing — list pending pairing sessions
export async function GET() {
  try {
    const data = await api.pairing.pending();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
