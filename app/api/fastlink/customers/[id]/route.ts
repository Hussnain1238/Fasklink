import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { normalizeCustomer } from "@/lib/fastlink";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;

    const client = await clientPromise;
    const db = client.db();

    const row = await db
      .collection("fastlink_customers")
      .findOne({ id });

    if (!row) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      normalizeCustomer(row.data ?? row)
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const customer = normalizeCustomer({
      ...body,
      id,
    });

    const client = await clientPromise;
    const db = client.db();

    await db.collection("fastlink_customers").replaceOne(
      { id },
      {
        id: customer.id,
        data: customer,
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { id } = await params;

    const client = await clientPromise;
    const db = client.db();

    const result = await db
      .collection("fastlink_customers")
      .deleteOne({ id });

    console.log("DELETE ID:", id);
    console.log("DELETED COUNT:", result.deletedCount);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer not found",
          id,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      id,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("DELETE ERROR:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}