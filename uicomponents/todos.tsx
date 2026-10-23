"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./todos.module.css";
import {
  FASTLINK_DEFAULT_MESSAGE,
  FASTLINK_SEED,
  type FastlinkCompany,
  type FastlinkConnection,
  type FastlinkCustomer,
  type FastlinkDashboard,
  type FastlinkPayment,
  makeId,
} from "@/lib/fastlink";
import {CustomerForm} from "./type";
import  {ConnectionForm} from "./type";
import {PaymentForm} from "./type";
import {CompanyForm} from "./type";
type View = "dashboard" | "customers" | "settings";
type ModalName = "company" | "customer" | "connection" | "payment" | "expense" | "message" | "confirm" | null;
type Notice = { kind: "ok" | "err"; text: string } | null;


type ExpenseForm = { id: string; type: string; amount: string; date: string; note: string };
type ConfirmState = { message: string; okLabel?: string; dangerous?: boolean; onConfirm: () => void | Promise<void> };
type MessageState = { customerId: string; connectionId: string; text: string } | null;

type Row = { customer: FastlinkCustomer; connection: FastlinkConnection };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addOneMonth(dateStr: string) {
  const source = dateStr || todayStr();
  const [year, month, day] = source.split("-").map(Number);
  const nextMonth = month + 1;
  const targetYear = nextMonth > 12 ? year + 1 : year;
  const targetMonth = nextMonth > 12 ? 1 : nextMonth;
  const lastDay = new Date(targetYear, targetMonth, 0).getDate();
  return `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

function money(value: number) {
  return `Rs ${new Intl.NumberFormat("en-PK").format(Math.max(0, Math.round(value || 0)))}`;
}

function emptyCompanyForm(): CompanyForm {
  return { id: "", name: "" };
}

function emptyCustomerForm(): CustomerForm {
  return {
    id: "",
    name: "",
    cnic: "",
    phone: "",
    whatsapp: "",
    address: "",
    notes: "",
    status: "active",
    createdAt: todayStr(),
    companyId: "",
    packageName: "",
    fee: "",
    cost: "",
    startDate: todayStr(),
    paidThrough: "",
  };
}

function emptyConnectionForm(customerId = ""): ConnectionForm {
  return {
    customerId,
    connectionId: "",
    companyId: "",
    packageName: "",
    fee: "",
    cost: "",
    startDate: todayStr(),
    paidThrough: "",
  };
}

function emptyPaymentForm(customerId = "", connectionId = "", amount = ""): PaymentForm {
  return {
    customerId,
    connectionId,
    amount,
    date: todayStr(),
    method: "Cash",
    note: "",
    settles: true,
  };
}

function emptyExpenseForm(): ExpenseForm {
  return { id: "", type: "Transport", amount: "", date: todayStr(), note: "" };
}

function normalizeWhatsAppNumber(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("92") && digits.length >= 12) return digits;
  if (digits.startsWith("03") && digits.length === 11) return `92${digits.slice(1)}`;
  if (digits.startsWith("0") && digits.length >= 10) return `92${digits.slice(1)}`;
  if (digits.startsWith("3") && digits.length === 10) return `92${digits}`;
  return digits;
}

function renderWhatsAppMessage(customer: FastlinkCustomer, connection: FastlinkConnection, paymentDate: string, template: string) {
  const dueDate = connection.paidThrough || addOneMonth(connection.startDate);
  return String(template || FASTLINK_DEFAULT_MESSAGE)
    .replace(/\{name\}/g, customer.name || "")
    .replace(/\{date\}/g, paymentDate || "")
    .replace(/\{due_date\}/g, dueDate || "");
}

function connectionDueDate(connection: FastlinkConnection) {
  return connection.paidThrough || addOneMonth(connection.startDate);
}

function connectionStatus(connection: FastlinkConnection) {
  const due = connectionDueDate(connection);
  const distance = daysBetween(todayStr(), due);
  if (distance < 0) return { label: "Overdue", tone: "overdue" as const };
  if (distance === 0) return { label: "Due today", tone: "today" as const };
  if (distance <= 7) return { label: "Due soon", tone: "soon" as const };
  return { label: "Active", tone: "active" as const };
}

function statusBadgeClass(tone: "overdue" | "today" | "soon" | "active") {
  if (tone === "overdue") return styles.badgeOverdue;
  if (tone === "today") return styles.badgeToday;
  if (tone === "soon") return styles.badgeSoon;
  return styles.badgeActive;
}

function connectionBorderClass(tone: "overdue" | "today" | "soon" | "active") {
  if (tone === "overdue") return styles.overdueBorder;
  if (tone === "today") return styles.todayBorder;
  if (tone === "soon") return styles.soonBorder;
  return styles.activeBorder;
}

function companyName(companies: FastlinkCompany[], companyId: string) {
  return companies.find((company) => company.id === companyId)?.name || "Unassigned";
}

function customerPrimaryConnection(customer?: FastlinkCustomer | null) {
  return customer?.connections?.[0] || null;
}

function buildCustomerPayload(form: CustomerForm, existing?: FastlinkCustomer): FastlinkCustomer {
  const primary = customerPrimaryConnection(existing);
  const includeConnection = Boolean(form.companyId || form.packageName || form.fee || form.cost || form.startDate || form.paidThrough || primary);
  const connection = includeConnection
    ? {
        id: primary?.id || makeId("CN"),
        companyId: form.companyId || primary?.companyId || "",
        packageName: form.packageName || primary?.packageName || "",
        fee: Number(form.fee || primary?.fee || 0),
        cost: Number(form.cost || primary?.cost || 0),
        startDate: form.startDate || primary?.startDate || todayStr(),
        paidThrough: form.paidThrough || primary?.paidThrough || "",
        partial: primary?.partial || 0,
        payments: primary?.payments || [],
      }
    : null;

  return {
    id: form.id || makeId("FLT"),
    name: form.name,
    cnic: form.cnic,
    phone: form.phone,
    whatsapp: form.whatsapp,
    address: form.address,
    notes: form.notes,
    status: form.status || existing?.status || "active",
    createdAt: existing?.createdAt || form.createdAt || todayStr(),
    connections: connection ? [connection, ...(existing?.connections || []).slice(1)] : existing?.connections || [],
  };
}

function buildConnectionPayload(form: ConnectionForm, existing?: FastlinkConnection): FastlinkConnection {
  return {
    id: form.connectionId || existing?.id || makeId("CN"),
    companyId: form.companyId,
    packageName: form.packageName,
    fee: Number(form.fee || 0),
    cost: Number(form.cost || 0),
    startDate: form.startDate || todayStr(),
    paidThrough: form.paidThrough || "",
    partial: existing?.partial || 0,
    payments: existing?.payments || [],
  };
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status})`);
  return payload as T;
}

function ModalShell({
  title,
  description,
  wide,
  onClose,
  children,
  actions,
}: {
  title: string;
  description?: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
      <div className={`${styles.modalPanel} ${wide ? styles.modalPanelWide : ""}`} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleBlock}>
            <h3 className={styles.modalTitle}>{title}</h3>
            {description ? <p className={styles.modalDescription}>{description}</p> : null}
          </div>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            Close
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
        {actions ? <div className={styles.modalActions}>{actions}</div> : null}
      </div>
    </div>
  );
}

export default function Todos() {
  const [data, setData] = useState<FastlinkDashboard>(FASTLINK_SEED);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [view, setView] = useState<View>("dashboard");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("all");
  const [modal, setModal] = useState<ModalName>(null);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompanyForm());
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm());
  const [connectionForm, setConnectionForm] = useState<ConnectionForm>(emptyConnectionForm());
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm());
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm());
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [messageState, setMessageState] = useState<MessageState>(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState(FASTLINK_DEFAULT_MESSAGE);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const payload = await apiJson<FastlinkDashboard>("/api/fastlink/dashboard");
    setData(payload);
    setWhatsappTemplate(payload.setting?.message || FASTLINK_DEFAULT_MESSAGE);
  }

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch (error) {
        setNotice({ kind: "err", text: error instanceof Error ? error.message : String(error) });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rows = useMemo<Row[]>(() => {
    const output: Row[] = [];
    data.customers.forEach((customer) => {
      (customer.connections || []).forEach((connection) => output.push({ customer, connection }));
    });
    return output;
  }, [data.customers]);

  const visibleRows = useMemo(() => {
    let filtered = companyFilter === "ALL" ? rows : rows.filter((row) => row.connection.companyId === companyFilter);
    const keyword = search.trim().toLowerCase();
    if (activeFilter !== "all") {
      filtered = filtered.filter(({ connection }) => {
        const tone = connectionStatus(connection).tone;
        if (activeFilter === "paid") return tone === "active";
        if (activeFilter === "overdue") return tone === "overdue";
        if (activeFilter === "today") return tone === "today";
        if (activeFilter === "soon") return tone === "soon";
        return true;
      });
    }
    if (!keyword) return filtered;
    return filtered.filter(({ customer, connection }) => {
      return [customer.name, customer.cnic, customer.phone, customer.id, connection.packageName, connection.id, companyName(data.companies, connection.companyId)].join(" ").toLowerCase().includes(keyword);
    });
  }, [rows, companyFilter, activeFilter, search, data.companies]);

  const stats = useMemo(() => {
    const today = todayStr();
    const month = today.slice(0, 7);
    let todayReceipts = 0;
    let monthReceipts = 0;
    let overdue = 0;
    let receivable = 0;
    let net = 0;
    let expensesMonth = 0;

    rows.forEach(({ connection }) => {
      connection.payments.forEach((payment) => {
        if (payment.date === today) todayReceipts += Number(payment.amount) || 0;
        if (payment.date?.slice(0, 7) === month) monthReceipts += Number(payment.amount) || 0;
      });
      if (connectionStatus(connection).tone === "overdue") overdue += 1;
      receivable += Math.max(0, (Number(connection.fee) || 0) - (Number(connection.partial) || 0));
      net += (Number(connection.fee) || 0) - (Number(connection.cost) || 0);
    });

    data.expenses.forEach((expense) => {
      if (expense.date?.slice(0, 7) === month) expensesMonth += Number(expense.amount) || 0;
    });

    return { todayReceipts, monthReceipts, overdue, receivable, net: net - expensesMonth };
  }, [rows, data.expenses]);

  function closeModal() {
    setModal(null);
  }

  function openCompanyModal(company?: FastlinkCompany) {
    setCompanyForm(company ? { id: company.id, name: company.name } : emptyCompanyForm());
    setModal("company");
  }

  function openCustomerModal(customer?: FastlinkCustomer) {
    const primary = customer ? customerPrimaryConnection(customer) : null;
    setCustomerForm(
      customer
        ? {
            id: customer.id,
            name: customer.name,
            cnic: customer.cnic,
            phone: customer.phone,
            whatsapp: customer.whatsapp || "",
            address: customer.address || "",
            notes: customer.notes || "",
            status: customer.status || "active",
            createdAt: customer.createdAt || todayStr(),
            companyId: primary?.companyId || "",
            packageName: primary?.packageName || "",
            fee: primary?.fee ? String(primary.fee) : "",
            cost: primary?.cost ? String(primary.cost) : "",
            startDate: primary?.startDate || todayStr(),
            paidThrough: primary?.paidThrough || "",
          }
        : emptyCustomerForm(),
    );
    setModal("customer");
  }

  function openConnectionModal(customerId: string, connection?: FastlinkConnection) {
    setConnectionForm(
      connection
        ? {
            customerId,
            connectionId: connection.id,
            companyId: connection.companyId,
            packageName: connection.packageName,
            fee: String(connection.fee || ""),
            cost: String(connection.cost || ""),
            startDate: connection.startDate || todayStr(),
            paidThrough: connection.paidThrough || "",
          }
        : emptyConnectionForm(customerId),
    );
    setModal("connection");
  }

  function openPaymentModal(customerId: string, connection: FastlinkConnection) {
    setPaymentForm({
      customerId,
      connectionId: connection.id,
      amount: String(Math.max(0, (Number(connection.fee) || 0) - (Number(connection.partial) || 0))),
      date: todayStr(),
      method: "Cash",
      note: "",
      settles: true,
    });
    setModal("payment");
  }

  function openMessageModal(customerId: string, connection: FastlinkConnection) {
    const customer = data.customers.find((item) => item.id === customerId);
    if (!customer) return;
    const number = normalizeWhatsAppNumber(customer.whatsapp || customer.phone);
    if (!number) {
      setNotice({ kind: "err", text: "Customer WhatsApp number is missing or invalid." });
      return;
    }
    setMessageState({ customerId, connectionId: connection.id, text: renderWhatsAppMessage(customer, connection, todayStr(), whatsappTemplate) });
    setModal("message");
  }

  function openConfirm(message: string, onConfirm: () => void | Promise<void>, okLabel = "Confirm", dangerous = true) {
    setConfirmState({ message, onConfirm, okLabel, dangerous });
    setModal("confirm");
  }

  async function saveCompany() {
    const name = companyForm.name.trim();
    if (!name) return;
    setSaving(true);
    try {
      const payload = { id: companyForm.id || makeId("co"), name };
      if (companyForm.id) await apiJson(`/api/fastlink/companies/${companyForm.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await apiJson("/api/fastlink/companies", { method: "POST", body: JSON.stringify(payload) });
      await refresh();
      setNotice({ kind: "ok", text: "Company saved." });
      closeModal();
    } catch (error) {
      setNotice({ kind: "err", text: error instanceof Error ? error.message : String(error) });
    } finally {
      setSaving(false);
    }
  }

  async function saveCustomer() {
    const payload = buildCustomerPayload(customerForm, data.customers.find((item) => item.id === customerForm.id));
    if (!payload.name.trim()) return;
    setSaving(true);
    try {
      if (customerForm.id) await apiJson(`/api/fastlink/customers/${customerForm.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await apiJson("/api/fastlink/customers", { method: "POST", body: JSON.stringify(payload) });
      await refresh();
      setNotice({ kind: "ok", text: "Customer saved." });
      closeModal();
    } catch (error) {
      setNotice({ kind: "err", text: error instanceof Error ? error.message : String(error) });
    } finally {
      setSaving(false);
    }
  }

  async function saveConnection() {
    const customer = data.customers.find((item) => item.id === connectionForm.customerId);
    if (!customer) return;
    const nextConnection = buildConnectionPayload(connectionForm, customer.connections.find((item) => item.id === connectionForm.connectionId));
    const connections = customer.connections.some((item) => item.id === nextConnection.id)
      ? customer.connections.map((item) => (item.id === nextConnection.id ? nextConnection : item))
      : [...customer.connections, nextConnection];
    setSaving(true);
    try {
      await apiJson(`/api/fastlink/customers/${customer.id}`, { method: "PUT", body: JSON.stringify({ ...customer, connections }) });
      await refresh();
      setNotice({ kind: "ok", text: "Connection saved." });
      closeModal();
    } catch (error) {
      setNotice({ kind: "err", text: error instanceof Error ? error.message : String(error) });
    } finally {
      setSaving(false);
    }
  }

  async function savePayment() {
    const customer = data.customers.find((item) => item.id === paymentForm.customerId);
    const connection = customer?.connections.find((item) => item.id === paymentForm.connectionId);
    if (!customer || !connection) return;
    const amount = Number(paymentForm.amount || 0);
    const payment: FastlinkPayment = {
      id: makeId("PAY"),
      date: paymentForm.date || todayStr(),
      amount,
      method: paymentForm.method || "Cash",
      note: paymentForm.note || undefined,
    };
    const nextConnection: FastlinkConnection = {
      ...connection,
      payments: [...connection.payments, payment],
      partial: paymentForm.settles ? Number(connection.fee) || amount : Math.min(Number(connection.fee) || 0, (Number(connection.partial) || 0) + amount),
      paidThrough: paymentForm.settles ? addOneMonth(payment.date) : connection.paidThrough,
    };
    const connections = customer.connections.map((item) => (item.id === nextConnection.id ? nextConnection : item));
    setSaving(true);
    try {
      await apiJson(`/api/fastlink/customers/${customer.id}`, { method: "PUT", body: JSON.stringify({ ...customer, connections }) });
      await refresh();
      setNotice({ kind: "ok", text: "Payment added." });
      closeModal();
    } catch (error) {
      setNotice({ kind: "err", text: error instanceof Error ? error.message : String(error) });
    } finally {
      setSaving(false);
    }
  }

  async function saveExpense() {
    const payload = { id: expenseForm.id || makeId("EXP"), type: expenseForm.type, amount: Number(expenseForm.amount || 0), date: expenseForm.date || todayStr(), note: expenseForm.note || "" };
    if (!payload.type.trim()) return;
    setSaving(true);
    try {
      if (expenseForm.id) await apiJson(`/api/fastlink/expenses/${expenseForm.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await apiJson("/api/fastlink/expenses", { method: "POST", body: JSON.stringify(payload) });
      await refresh();
      setNotice({ kind: "ok", text: "Expense saved." });
      closeModal();
    } catch (error) {
      setNotice({ kind: "err", text: error instanceof Error ? error.message : String(error) });
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await apiJson("/api/fastlink/settings", { method: "PUT", body: JSON.stringify({ id: "whatsapp_payment_message", message: whatsappTemplate }) });
      await refresh();
      setNotice({ kind: "ok", text: "WhatsApp template saved." });
    } catch (error) {
      setNotice({ kind: "err", text: error instanceof Error ? error.message : String(error) });
    } finally {
      setSaving(false);
    }
  }

  function removeCompany(id: string) {
    openConfirm(`Delete company ${id}?`, async () => {
      await apiJson(`/api/fastlink/companies/${id}`, { method: "DELETE" });
      await refresh();
      setNotice({ kind: "ok", text: "Company deleted." });
    }, "Delete");
  }

  function removeCustomer(id: string) {
    openConfirm(`Delete customer ${id}?`, async () => {
      await apiJson(`/api/fastlink/customers/${id}`, { method: "DELETE" });
      await refresh();
      setNotice({ kind: "ok", text: "Customer deleted." });
    }, "Delete");
  }

  function removeConnection(customer: FastlinkCustomer, connectionId: string) {
    openConfirm(`Delete connection ${connectionId}?`, async () => {
      const connections = customer.connections.filter((item) => item.id !== connectionId);
      await apiJson(`/api/fastlink/customers/${customer.id}`, { method: "DELETE", body: JSON.stringify({ ...customer, connections }) });
      await refresh();
      setNotice({ kind: "ok", text: "Connection deleted." });
    }, "Delete");
  }


  const companyOptions = data.companies.length ? data.companies : FASTLINK_SEED.companies;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroGlowA} />
          <div className={styles.heroGlowB} />
          <div className={styles.heroRow}>
            <div className={styles.heroLogo}>FL</div>
            <div>
              <h1 className={styles.heroTitle}>FastLink Dashboard</h1>
              <p className={styles.heroSubtitle}>Customers, connections, payments, expenses, and message templates in one place.</p>
            </div>
          </div>
        </header>

        <nav className={styles.tabDock}>
          <div className={styles.tabGrid}>
            <button className={`${styles.tabButton} ${view === "dashboard" ? styles.tabButtonActive : styles.tabButtonIdle}`} onClick={() => setView("dashboard")} type="button">Dashboard</button>
            <button className={`${styles.tabButton} ${view === "customers" ? styles.tabButtonActive : styles.tabButtonIdle}`} onClick={() => setView("customers")} type="button">Customers</button>
            <button className={`${styles.tabButton} ${view === "settings" ? styles.tabButtonActive : styles.tabButtonIdle}`} onClick={() => setView("settings")} type="button">Settings</button>
          </div>
        </nav>

        <main className={styles.sectionStack}>
          {notice ? <div className={notice.kind === "ok" ? styles.successBox : styles.alertBox}>{notice.text}</div> : null}
          {loading ? <div className={styles.statCard}>Loading dashboard...</div> : null}

          {view === "dashboard" ? (
            <>
              <section className={styles.statsGrid}>
                <div className={styles.statCard}><div className={styles.statValue}>{money(stats.todayReceipts)}</div><div className={styles.statLabel}>Today receipts</div></div>
                <div className={styles.statCard}><div className={styles.statValue}>{money(stats.monthReceipts)}</div><div className={styles.statLabel}>Month receipts</div></div>
                <div className={styles.statCard}><div className={`${styles.statValue} ${styles.statAccentRose}`}>{stats.overdue}</div><div className={styles.statLabel}>Overdue connections</div></div>
                <div className={styles.statCard}><div className={`${styles.statValue} ${styles.statAccentCyan}`}>{money(stats.receivable)}</div><div className={styles.statLabel}>Outstanding receivable</div></div>
                <div className={styles.statCard}><div className={`${styles.statValue} ${styles.statAccentEmerald}`}>{money(stats.net)}</div><div className={styles.statLabel}>Net profit</div></div>
              </section>

              <section className={styles.searchCard}>
                <input className={styles.searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers, packages, phones, or ids" />
                <div className={styles.searchActions}>
                  <button className={styles.primaryButton} type="button" onClick={() => openCompanyModal()}>Add company</button>
                  <button className={styles.secondaryButton} type="button" onClick={() => openCustomerModal()}>Add customer</button>
                </div>
              </section>

              <section>
                <div className={styles.rowScroll}>
                  <button className={`${styles.pill} ${companyFilter === "ALL" ? styles.pillActive : styles.pillIdle}`} onClick={() => setCompanyFilter("ALL")} type="button">All companies</button>
                  {data.companies.map((company) => (
                    <button key={company.id} className={`${styles.pill} ${companyFilter === company.id ? styles.pillActive : styles.pillIdle}`} onClick={() => setCompanyFilter(company.id)} type="button">
                      {company.name}
                    </button>
                  ))}
                </div>
                <div className={styles.rowScroll}>
                  {[
                    ["all", "All"],
                    ["overdue", "Overdue"],
                    ["today", "Due today"],
                    ["soon", "Due soon"],
                    ["paid", "Active"],
                  ].map(([key, label]) => (
                    <button key={key} className={`${styles.filterPill} ${activeFilter === key ? styles.filterAllActive : styles.filterIdle}`} onClick={() => setActiveFilter(key)} type="button">
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className={styles.connectionList}>
                {visibleRows.map(({ customer, connection }) => {
                  const status = connectionStatus(connection);
                  const outstanding = Math.max(0, (Number(connection.fee) || 0) - (Number(connection.partial) || 0));
                  return (
                    <article key={`${customer.id}-${connection.id}`} className={`${styles.connectionCard} ${connectionBorderClass(status.tone)}`}>
                      <div className={styles.cardHeader}>
                        <div>
                          <div className={styles.cardTitleRow}>
                            <h3 className={styles.cardTitle}>{customer.name}</h3>
                            <span className={`${styles.badge} ${statusBadgeClass(status.tone)}`}>{status.label}</span>
                          </div>
                          <p className={styles.cardMeta}>{connection.packageName || "Package not set"} - {companyName(data.companies, connection.companyId)} - {customer.phone}</p>
                          <p className={styles.cardMeta}>CNIC {customer.cnic || "N/A"} - Due {connectionDueDate(connection)}</p>
                        </div>
                        <div className={styles.cardMeta}>{money(outstanding)} outstanding</div>
                      </div>
                      <div className={styles.actionRow}>
                        <button className={styles.primaryButton} type="button" onClick={() => openPaymentModal(customer.id, connection)}>Add payment</button>
                        <button className={styles.secondaryButton} type="button" onClick={() => openMessageModal(customer.id, connection)}>WhatsApp</button>
                        <button className={styles.secondaryButton} type="button" onClick={() => openConnectionModal(customer.id, connection)}>Edit connection</button>
                        <button className={styles.destructiveButton} type="button" onClick={() => removeConnection(customer, connection.id)}>Delete connection</button>
                      </div>
                    </article>
                  );
                })}
                {!visibleRows.length ? <div className={styles.customerCard}>No matching connections found.</div> : null}
              </section>

              <section className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead className={styles.tableHead}>
                    <tr>
                      <th className={styles.tableHeadCell}>Company</th>
                      <th className={styles.tableHeadCell}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyOptions.map((company) => (
                      <tr key={company.id} className={styles.tableRow}>
                        <td className={`${styles.tableCell} ${styles.tableCellStrong}`}>{company.name}</td>
                        <td className={styles.tableCell}>
                          <div className={styles.tableActions}>
                            <button className={styles.ghostButton} type="button" onClick={() => openCompanyModal(company)}>Edit</button>
                            <button className={styles.destructiveButton} type="button" onClick={() => removeCompany(company.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          ) : null}

          {view === "customers" ? (
            <section className={styles.customerGrid}>
              {data.customers.map((customer) => {
                const primary = customerPrimaryConnection(customer);
                const status = primary ? connectionStatus(primary) : null;
                return (
                  <article key={customer.id} className={styles.customerCard}>
                    <div className={styles.customerHeader}>
                      <div>
                        <h3 className={styles.customerName}>{customer.name}</h3>
                        <p className={styles.customerMeta}>{customer.phone || customer.whatsapp || "No phone"}</p>
                        <p className={styles.customerMeta}>{customer.cnic || "CNIC not set"}</p>
                      </div>
                      {status ? <span className={`${styles.badge} ${statusBadgeClass(status.tone)}`}>{status.label}</span> : null}
                    </div>
                    <p className={styles.customerMeta}>{customer.address || "No address"}</p>
                    <p className={styles.customerMeta}>Connections: {customer.connections.length}</p>
                    <div className={styles.actionRow}>
                      <button className={styles.primaryButton} type="button" onClick={() => openCustomerModal(customer)}>Edit customer</button>
                      <button className={styles.secondaryButton} type="button" onClick={() => openConnectionModal(customer.id)}>Add connection</button>
                      <button className={styles.destructiveButton} type="button" onClick={() => removeCustomer(customer.id)}>Delete customer</button>
                    </div>
                    {customer.connections.length ? (
                      <div className={styles.tableWrap}>
                        <table className={styles.table}>
                          <thead className={styles.tableHead}>
                            <tr>
                              <th className={styles.tableHeadCell}>Package</th>
                              <th className={styles.tableHeadCell}>Due</th>
                              <th className={styles.tableHeadCell}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customer.connections.map((connection) => {
                              const statusInfo = connectionStatus(connection);
                              return (
                                <tr key={connection.id} className={styles.tableRow}>
                                  <td className={`${styles.tableCell} ${styles.tableCellStrong}`}>{connection.packageName || "Package"}</td>
                                  <td className={styles.tableCell}>{connectionDueDate(connection)} - {statusInfo.label}</td>
                                  <td className={styles.tableCell}>
                                    <div className={styles.tableActions}>
                                      <button className={styles.ghostButton} type="button" onClick={() => openConnectionModal(customer.id, connection)}>Edit</button>
                                      <button className={styles.primaryButton} type="button" onClick={() => openPaymentModal(customer.id, connection)}>Pay</button>
                                      <button className={styles.secondaryButton} type="button" onClick={() => openMessageModal(customer.id, connection)}>WhatsApp</button>
                                      <button className={styles.destructiveButton} type="button" onClick={() => removeConnection(customer, connection.id)}>Delete</button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          ) : null}

          {view === "settings" ? (
            <section className={styles.customerCard}>
              <h2 className={styles.customerName}>WhatsApp payment template</h2>
              <p className={styles.customerMeta}>Use {"{name}"}, {"{date}"}, and {"{due_date}"} in the message.</p>
              <textarea className={styles.fieldTextarea} value={whatsappTemplate} onChange={(event) => setWhatsappTemplate(event.target.value)} />
              <div className={styles.actionRow}>
                <button className={styles.primaryButton} type="button" onClick={saveSettings} disabled={saving}>Save template</button>
              </div>
            </section>
          ) : null}
        </main>
      </div>

      <button className={styles.fab} type="button" onClick={() => openCustomerModal()}>+</button>

      {modal === "company" ? (
        <ModalShell title={companyForm.id ? "Edit company" : "Add company"} description="Create or update a company record." onClose={closeModal} actions={
          <>
            <button className={styles.secondaryButton} type="button" onClick={closeModal}>Cancel</button>
            <button className={styles.primaryButton} type="button" onClick={saveCompany} disabled={saving}>Save company</button>
          </>
        }>
          <div className={styles.fieldGrid}>
            <label className={styles.field}><span className={styles.fieldLabel}>Company name</span><input className={styles.fieldInput} value={companyForm.name} onChange={(event) => setCompanyForm({ ...companyForm, name: event.target.value })} /></label>
            <label className={`${styles.field} ${styles.fieldFull}`}><span className={styles.fieldLabel}>Company id</span><input className={styles.fieldInput} value={companyForm.id} onChange={(event) => setCompanyForm({ ...companyForm, id: event.target.value })} placeholder="Auto-generated if blank" /></label>
          </div>
        </ModalShell>
      ) : null}

      {modal === "customer" ? (
        <ModalShell wide title={customerForm.id ? "Edit customer" : "Add customer"} description="Customer data plus the first connection can be edited here." onClose={closeModal} actions={
          <>
            <button className={styles.secondaryButton} type="button" onClick={closeModal}>Cancel</button>
            <button className={styles.primaryButton} type="button" onClick={saveCustomer} disabled={saving}>Save customer</button>
          </>
        }>
          <div className={styles.fieldGrid}>
            <label className={styles.field}><span className={styles.fieldLabel}>Name</span><input className={styles.fieldInput} value={customerForm.name} onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>CNIC</span><input className={styles.fieldInput} value={customerForm.cnic} onChange={(event) => setCustomerForm({ ...customerForm, cnic: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Phone</span><input className={styles.fieldInput} value={customerForm.phone} onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>WhatsApp</span><input className={styles.fieldInput} value={customerForm.whatsapp} onChange={(event) => setCustomerForm({ ...customerForm, whatsapp: event.target.value })} /></label>
            <label className={`${styles.field} ${styles.fieldFull}`}><span className={styles.fieldLabel}>Address</span><textarea className={styles.fieldTextarea} value={customerForm.address} onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })} /></label>
            <label className={`${styles.field} ${styles.fieldFull}`}><span className={styles.fieldLabel}>Notes</span><textarea className={styles.fieldTextarea} value={customerForm.notes} onChange={(event) => setCustomerForm({ ...customerForm, notes: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Status</span><input className={styles.fieldInput} value={customerForm.status} onChange={(event) => setCustomerForm({ ...customerForm, status: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Created date</span><input className={styles.fieldInput} type="date" value={customerForm.createdAt} onChange={(event) => setCustomerForm({ ...customerForm, createdAt: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Company</span><select className={styles.fieldSelect} value={customerForm.companyId} onChange={(event) => setCustomerForm({ ...customerForm, companyId: event.target.value })}><option value="">Select company</option>{data.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Package</span><input className={styles.fieldInput} value={customerForm.packageName} onChange={(event) => setCustomerForm({ ...customerForm, packageName: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Fee</span><input className={styles.fieldInput} type="number" value={customerForm.fee} onChange={(event) => setCustomerForm({ ...customerForm, fee: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Cost</span><input className={styles.fieldInput} type="number" value={customerForm.cost} onChange={(event) => setCustomerForm({ ...customerForm, cost: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Start date</span><input className={styles.fieldInput} type="date" value={customerForm.startDate} onChange={(event) => setCustomerForm({ ...customerForm, startDate: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Paid through</span><input className={styles.fieldInput} type="date" value={customerForm.paidThrough} onChange={(event) => setCustomerForm({ ...customerForm, paidThrough: event.target.value })} /></label>
          </div>
        </ModalShell>
      ) : null}

      {modal === "connection" ? (
        <ModalShell wide title={connectionForm.connectionId ? "Edit connection" : "Add connection"} description="Create or update a customer connection." onClose={closeModal} actions={
          <>
            <button className={styles.secondaryButton} type="button" onClick={closeModal}>Cancel</button>
            <button className={styles.primaryButton} type="button" onClick={saveConnection} disabled={saving}>Save connection</button>
          </>
        }>
          <div className={styles.fieldGrid}>
            <label className={styles.field}><span className={styles.fieldLabel}>Company</span><select className={styles.fieldSelect} value={connectionForm.companyId} onChange={(event) => setConnectionForm({ ...connectionForm, companyId: event.target.value })}><option value="">Select company</option>{data.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Package</span><input className={styles.fieldInput} value={connectionForm.packageName} onChange={(event) => setConnectionForm({ ...connectionForm, packageName: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Fee</span><input className={styles.fieldInput} type="number" value={connectionForm.fee} onChange={(event) => setConnectionForm({ ...connectionForm, fee: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Cost</span><input className={styles.fieldInput} type="number" value={connectionForm.cost} onChange={(event) => setConnectionForm({ ...connectionForm, cost: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Start date</span><input className={styles.fieldInput} type="date" value={connectionForm.startDate} onChange={(event) => setConnectionForm({ ...connectionForm, startDate: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Paid through</span><input className={styles.fieldInput} type="date" value={connectionForm.paidThrough} onChange={(event) => setConnectionForm({ ...connectionForm, paidThrough: event.target.value })} /></label>
          </div>
        </ModalShell>
      ) : null}

      {modal === "payment" ? (
        <ModalShell title="Add payment" description="This payment is appended to the selected connection." onClose={closeModal} actions={
          <>
            <button className={styles.secondaryButton} type="button" onClick={closeModal}>Cancel</button>
            <button className={styles.primaryButton} type="button" onClick={savePayment} disabled={saving}>Save payment</button>
          </>
        }>
          <div className={styles.fieldGrid}>
            <label className={styles.field}><span className={styles.fieldLabel}>Amount</span><input className={styles.fieldInput} type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Date</span><input className={styles.fieldInput} type="date" value={paymentForm.date} onChange={(event) => setPaymentForm({ ...paymentForm, date: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Method</span><input className={styles.fieldInput} value={paymentForm.method} onChange={(event) => setPaymentForm({ ...paymentForm, method: event.target.value })} /></label>
            <label className={`${styles.field} ${styles.fieldFull}`}><span className={styles.fieldLabel}>Note</span><textarea className={styles.fieldTextarea} value={paymentForm.note} onChange={(event) => setPaymentForm({ ...paymentForm, note: event.target.value })} /></label>
            <label className={`${styles.field} ${styles.fieldFull}`}><span className={styles.fieldLabel}>Settles the full balance</span><input type="checkbox" checked={paymentForm.settles} onChange={(event) => setPaymentForm({ ...paymentForm, settles: event.target.checked })} /></label>
          </div>
        </ModalShell>
      ) : null}

      {modal === "expense" ? (
        <ModalShell title={expenseForm.id ? "Edit expense" : "Add expense"} description="Keep monthly expenses separate from receipts." onClose={closeModal} actions={
          <>
            <button className={styles.secondaryButton} type="button" onClick={closeModal}>Cancel</button>
            <button className={styles.primaryButton} type="button" onClick={saveExpense} disabled={saving}>Save expense</button>
          </>
        }>
          <div className={styles.fieldGrid}>
            <label className={styles.field}><span className={styles.fieldLabel}>Type</span><input className={styles.fieldInput} value={expenseForm.type} onChange={(event) => setExpenseForm({ ...expenseForm, type: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Amount</span><input className={styles.fieldInput} type="number" value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} /></label>
            <label className={styles.field}><span className={styles.fieldLabel}>Date</span><input className={styles.fieldInput} type="date" value={expenseForm.date} onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })} /></label>
            <label className={`${styles.field} ${styles.fieldFull}`}><span className={styles.fieldLabel}>Note</span><textarea className={styles.fieldTextarea} value={expenseForm.note} onChange={(event) => setExpenseForm({ ...expenseForm, note: event.target.value })} /></label>
          </div>
        </ModalShell>
      ) : null}

      {modal === "message" && messageState ? (
        <ModalShell title="WhatsApp message" description="Review the generated payment reminder." onClose={closeModal} actions={
          <>
            <button className={styles.secondaryButton} type="button" onClick={closeModal}>Close</button>
            <button className={styles.primaryButton} type="button" onClick={() => {
              const customer = data.customers.find((item) => item.id === messageState.customerId);
              const connection = customer?.connections.find((item) => item.id === messageState.connectionId);
              const number = normalizeWhatsAppNumber(customer?.whatsapp || customer?.phone || "");
              if (!customer || !connection || !number) return;
              window.open(`https://wa.me/${number}?text=${encodeURIComponent(messageState.text)}`, "_blank", "noopener,noreferrer");
            }}>
              Open WhatsApp
            </button>
          </>
        }>
          <textarea className={styles.fieldTextarea} value={messageState.text} onChange={(event) => setMessageState({ ...messageState, text: event.target.value })} />
        </ModalShell>
      ) : null}

      {modal === "confirm" && confirmState ? (
        <ModalShell title="Confirm action" description={confirmState.message} onClose={closeModal} actions={
          <>
            <button className={styles.secondaryButton} type="button" onClick={closeModal}>Cancel</button>
            <button className={confirmState.dangerous ? styles.destructiveButton : styles.primaryButton} type="button" onClick={async () => {
              await confirmState.onConfirm();
              await refresh();
              closeModal();
            }}>
              {confirmState.okLabel || "Confirm"}
            </button>
          </>
        }>
          <div className={styles.fieldHint}>This cannot be undone from the UI.</div>
        </ModalShell>
      ) : null}
    </div>
  );
}
