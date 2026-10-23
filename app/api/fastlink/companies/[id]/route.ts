import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { normalizeCompany } from "@/lib/fastlink";

type Params = { params: { id: string } };

export async function PUT(request: Request, { params }: Params) {
  try {
    const body = await request.json();
    const company = normalizeCompany({ ...body, id: params.id });
    const client = await clientPromise;
    const db = client.db();
    await db.collection("fastlink_companies").replaceOne({ id: params.id }, { id: company.id, data: company }, { upsert: true });
    return NextResponse.json({ success: true, company });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
        const { id } = await params;

    const client = await clientPromise;
    const db = client.db();
    await db.collection("fastlink_companies").deleteOne({id});
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}