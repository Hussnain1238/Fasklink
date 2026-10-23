import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { normalizeExpense } from "@/lib/fastlink";

type Params = { params: { id: string } };

export async function PUT(request: Request, { params }: Params) {
  try {
    const body = await request.json();
    const expense = normalizeExpense({ ...body, id: params.id });
    const client = await clientPromise;
    const db = client.db();
    await db.collection("fastlink_expenses").replaceOne({ id: params.id }, { id: expense.id, data: expense }, { upsert: true });
    return NextResponse.json({ success: true, expense });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const client = await clientPromise;
    const db = client.db();
    await db.collection("fastlink_expenses").deleteOne({ id: params.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}