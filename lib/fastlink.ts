export type FastlinkPayment = {
  id: string;
  date: string;
  amount: number;
  method: string;
  note?: string;
  cycle?: string;
};

export type FastlinkConnection = {
  id: string;
  companyId: string;
  packageName: string;
  fee: number;
  cost: number;
  startDate: string;
  paidThrough?: string;
  partial?: number;
  payments: FastlinkPayment[];
};

export type FastlinkCustomer = {
  id: string;
  name: string;
  cnic: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  notes?: string;
  status: string;
  createdAt: string;
  connections: FastlinkConnection[];
};

export type FastlinkCompany = {
  id: string;
  name: string;
};

export type FastlinkExpense = {
  id: string;
  type: string;
  amount: number;
  date: string;
  note?: string;
};

export type FastlinkSetting = {
  id: "whatsapp_payment_message";
  message: string;
};

export type FastlinkDashboard = {
  companies: FastlinkCompany[];
  customers: FastlinkCustomer[];
  expenses: FastlinkExpense[];
  setting: FastlinkSetting;
};

export const FASTLINK_SETTING_ID = "whatsapp_payment_message" as const;

export const FASTLINK_DEFAULT_MESSAGE = `Hi {name}! 👋

Your monthly package has been paid successfully for {date}.

Thank you for choosing FastLink Technology.`;

export const FASTLINK_SEED: FastlinkDashboard = {
   
  companies: [
    { id: "co_fastlink", name: "Fastlink Tech" },
    { id: "co_skynet", name: "SkyNet" },
    { id: "co_fibercore", name: "FiberCore" },
  ],
  customers: [
    {
      id: "FLT-0041",
      name: "Ali Raza",
      cnic: "35202-1234567-1",
      phone: "0300 1234567",
      whatsapp: "0300 1234567",
      address: "Gulshan e Iqbal",
      notes: "Early payment customer",
      status: "active",
      createdAt: "2026-10-01",
      connections: [
        {
          id: "CN-0184",
          companyId: "co_fastlink",
          packageName: "10Mbps",
          fee: 1500,
          cost: 1000,
          startDate: "2026-09-05",
          paidThrough: "2026-09-05",
          partial: 0,
          payments: [],
        },
      ],
    },
  ],
  expenses: [
    { id: "EXP-001", type: "Transport", amount: 1200, date: "2026-10-02", note: "Field visit" },
  ],
  setting: {
    id: FASTLINK_SETTING_ID,
    message: FASTLINK_DEFAULT_MESSAGE,
  },
};

export function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function toNumberValue(value: unknown, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function normalizeConnection(raw: any): FastlinkConnection {
  return {
    id: toStringValue(raw?.id, makeId("CN")),
    companyId: toStringValue(raw?.companyId),
    packageName: toStringValue(raw?.packageName ?? raw?.package ?? raw?.package_name),
    fee: toNumberValue(raw?.fee ?? raw?.sellingPrice),
    cost: toNumberValue(raw?.cost ?? raw?.providerCost),
    startDate: toStringValue(raw?.startDate, new Date().toISOString().slice(0, 10)),
    paidThrough: toStringValue(raw?.paidThrough),
    partial: toNumberValue(raw?.partial),
    payments: Array.isArray(raw?.payments)
      ? raw.payments.map((payment: any) => ({
          id: toStringValue(payment?.id, makeId("PAY")),
          date: toStringValue(payment?.date, new Date().toISOString().slice(0, 10)),
          amount: toNumberValue(payment?.amount),
          method: toStringValue(payment?.method, "Cash"),
          note: toStringValue(payment?.note),
          cycle: toStringValue(payment?.cycle),
        }))
      : [],
  };
}

export function normalizeCustomer(raw: any): FastlinkCustomer {
  return {
    id: toStringValue(raw?.id, makeId("FLT")),
    name: toStringValue(raw?.name),
    cnic: toStringValue(raw?.cnic),
    phone: toStringValue(raw?.phone),
    whatsapp: toStringValue(raw?.whatsapp),
    address: toStringValue(raw?.address),
    notes: toStringValue(raw?.notes),
    status: toStringValue(raw?.status, "active"),
    createdAt: toStringValue(raw?.createdAt, new Date().toISOString().slice(0, 10)),
    connections: Array.isArray(raw?.connections) ? raw.connections.map(normalizeConnection) : [],
  };
}

export function normalizeCompany(raw: any): FastlinkCompany {
  return {
    id: toStringValue(raw?.id, makeId("co")),
    name: toStringValue(raw?.name),
  };
}

export function normalizeExpense(raw: any): FastlinkExpense {
  return {
    id: toStringValue(raw?.id, makeId("EXP")),
    type: toStringValue(raw?.type),
    amount: toNumberValue(raw?.amount),
    date: toStringValue(raw?.date, new Date().toISOString().slice(0, 10)),
    note: toStringValue(raw?.note),
  };
}

export function normalizeSetting(raw: any): FastlinkSetting {
  return {
    id: FASTLINK_SETTING_ID,
    message: toStringValue(raw?.message, FASTLINK_DEFAULT_MESSAGE),
  };
}