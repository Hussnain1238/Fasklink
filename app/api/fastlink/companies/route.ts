import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { normalizeCompany } from "@/lib/fastlink";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const data = await db.collection("fastlink_companies").find().toArray();
    return NextResponse.json(data.map((row) => normalizeCompany(row.data ?? row)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const company = normalizeCompany(body);
    const client = await clientPromise;
    const db = client.db();
    await db.collection("fastlink_companies").replaceOne({ id: company.id }, { id: company.id, data: company }, { upsert: true });
    return NextResponse.json({ success: true, company }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}