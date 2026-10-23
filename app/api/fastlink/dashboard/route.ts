import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { FASTLINK_DEFAULT_MESSAGE, FASTLINK_SETTING_ID, normalizeCompany, normalizeCustomer, normalizeExpense, normalizeSetting } from "@/lib/fastlink";

async function loadCollection(name: string) {
  const client = await clientPromise;
  const db = client.db();
  return db.collection(name).find().toArray();
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const [companyRows, customerRows, expenseRows, settingRow] = await Promise.all([
      loadCollection("fastlink_companies"),
      loadCollection("fastlink_customers"),
      loadCollection("fastlink_expenses"),
      db.collection("fastlink_settings").findOne({ id: FASTLINK_SETTING_ID }),
    ]);

    const companies = companyRows.map((row) => normalizeCompany(row.data ?? row));
    const customers = customerRows.map((row) => normalizeCustomer(row.data ?? row));
    const expenses = expenseRows.map((row) => normalizeExpense(row.data ?? row));
    const setting = settingRow ? normalizeSetting(settingRow.data ?? settingRow) : { id: FASTLINK_SETTING_ID, message: FASTLINK_DEFAULT_MESSAGE };

    return NextResponse.json({ companies, customers, expenses, setting });
  } catch (error) {
    console.error("Dashboard GET Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}