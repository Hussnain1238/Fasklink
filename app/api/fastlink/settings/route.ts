import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { FASTLINK_DEFAULT_MESSAGE, FASTLINK_SETTING_ID, normalizeSetting } from "@/lib/fastlink";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const row = await db.collection("fastlink_settings").findOne({ id: FASTLINK_SETTING_ID });
    return NextResponse.json(row ? normalizeSetting(row.data ?? row) : { id: FASTLINK_SETTING_ID, message: FASTLINK_DEFAULT_MESSAGE });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const setting = normalizeSetting(body);
    const client = await clientPromise;
    const db = client.db();
    await db.collection("fastlink_settings").replaceOne({ id: FASTLINK_SETTING_ID }, { id: FASTLINK_SETTING_ID, data: setting }, { upsert: true });
    return NextResponse.json({ success: true, setting });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}