import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { api } from "@/lib/api";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { pairingCode, assignedUserId } = await req.json();
    const organizationId = (session.user as any).organizationId;

    const data = await api.pairing.approve({ pairingCode, organizationId, assignedUserId });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
