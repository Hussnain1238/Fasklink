import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { normalizeCustomer } from "@/lib/fastlink";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const data = await db.collection("fastlink_customers").find().toArray();
    return NextResponse.json(data.map((row) => normalizeCustomer(row.data ?? row)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customer = normalizeCustomer(body);
    const client = await clientPromise;
    const db = client.db();
    await db.collection("fastlink_customers").replaceOne({ id: customer.id }, { id: customer.id, data: customer }, { upsert: true });
    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}