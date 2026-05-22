import { NextResponse } from "next/server";
import { api } from "@/lib/api";

export async function GET() {
  try {
    const data = await api.devices.list();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
