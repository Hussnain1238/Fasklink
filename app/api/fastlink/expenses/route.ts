import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { normalizeExpense } from "@/lib/fastlink";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const data = await db.collection("fastlink_expenses").find().toArray();
    return NextResponse.json(data.map((row) => normalizeExpense(row.data ?? row)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const expense = normalizeExpense(body);
    const client = await clientPromise;
    const db = client.db();
    await db.collection("fastlink_expenses").replaceOne({ id: expense.id }, { id: expense.id, data: expense }, { upsert: true });
    return NextResponse.json({ success: true, expense }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}