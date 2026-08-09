/* eslint-disable */
"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Card } from "@/components/ui";
import {
  Plus,
  Printer,
  Download,
  Filter,
  Search,
  ExternalLink,
} from "lucide-react";

import { projectFundService } from "@/services/project-fund.service";
import { fundTransactionService } from "@/services/fund-transaction.service";
import type { TreasuryTransaction, TreasurySourceType } from "@/types/finance";
import { useToast } from "@/components/ui/Toast";
import { sanitizeInput, isValidAmount } from "@/lib/security";
import React from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "@/components/ui/Pagination";
import { Can } from "@/components/Can";
import { printHtmlDocument } from "@/lib/printUtils";

function buildTreasuryHref(locale: string, projectId: string, tx: TreasuryTransaction): string | null {
  const base = `/${locale}/projects/${projectId}`;
  if (tx.sourceType === "extract" && tx.metadata?.buildingId && tx.metadata?.contractorId) {
    return `${base}/buildings/${tx.metadata.buildingId}/subcontractors/${tx.metadata.contractorId}/extracts/${tx.sourceId}`;
  }
  if (tx.sourceType === "purchase") return `${base}/purchases`;
  if (tx.sourceType === "miscellaneous") return `${base}/miscellaneous`;
  return null;
}

const TransactionItem = React.memo(
  ({
    transaction,
    isArabic,
    getTypeLabel,
    getTypeColor,
    href,
    onNavigate,
  }: {
    transaction: TreasuryTransaction;
    isArabic: boolean;
    getTypeLabel: (type: TreasurySourceType) => string;
    getTypeColor: (type: TreasurySourceType) => string;
    href: string | null;
    onNavigate: (href: string) => void;
  }) => {
    const inner = (
      <>
        <div className="flex items-center gap-4 flex-1">
          <div className="text-center min-w-[80px]">
            <p className="text-xs text-text-muted">{transaction.date}</p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(
                transaction.sourceType
              )}`}
            >
              {getTypeLabel(transaction.sourceType)}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-medium text-text-primary">
              {sanitizeInput(transaction.description)}
            </p>
            {transaction.metadata?.extractLabel && (
              <p className="text-xs text-text-muted">
                {transaction.metadata.extractLabel}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p
            className={`font-bold ${
              transaction.amount > 0 ? "text-success-dark" : "text-danger"
            }`}
          >
            {transaction.amount > 0 ? "+" : ""}
            {transaction.amount.toLocaleString()} ج.م
          </p>
          {href && <ExternalLink size={16} className="text-gold shrink-0" />}
        </div>
      </>
    );

    if (href) {
      return (
        <button
          type="button"
          onClick={() => onNavigate(href)}
          className="w-full bg-surface p-4 rounded-lg shadow-sm flex justify-between items-center hover:shadow-md hover:bg-gold/5 transition text-right border border-transparent hover:border-gold/30"
        >
          {inner}
        </button>
      );
    }

    return (
      <div className="bg-surface p-4 rounded-lg shadow-sm flex justify-between items-center">
        {inner}
      </div>
    );
  }
);

TransactionItem.displayName = "TransactionItem";

export default function ProjectTreasuryPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const { showToast, ToastComponent } = useToast();

  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<TreasurySourceType | "all">(
    "all"
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [fundId, setFundId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const isMounted = useRef(true);

  const loadTreasury = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    try {
      const funds = await projectFundService.list();
      if (!isMounted.current) return;
      const fund = funds.find((f) => f.projectId === projectId);
      if (fund) {
        setFundId(fund.id);
        const allTx = await fundTransactionService.list();
        const fundTransactions = allTx.filter((tx) => tx.fundId === fund.id);
        const mapped: TreasuryTransaction[] = fundTransactions.map((tx) => {
          let metadata: TreasuryTransaction["metadata"];
          try {
            if (tx.notes && (tx.notes.startsWith("{") || tx.notes.startsWith('{"'))) {
              metadata = JSON.parse(tx.notes);
            }
          } catch {}
          return {
            id: tx.id,
            projectId,
            sourceType: (tx.category === "purchase"
              ? "purchase"
              : tx.category === "miscellaneous"
              ? "miscellaneous"
              : tx.category === "extract"
              ? "extract"
              : "adjustment") as TreasurySourceType,
            sourceId: tx.referenceId || tx.id,
            amount: tx.type === "deduct" ? -Math.abs(tx.amount) : Math.abs(tx.amount),
            description: tx.description,
            date: tx.date,
            notes: tx.notes || undefined,
            metadata,
          };
        });
        const income = mapped
          .filter((t) => t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0);
        const expenses = mapped
          .filter((t) => t.amount < 0)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        setTransactions(mapped);
        setTotalIncome(income);
        setTotalExpenses(expenses);
        setCurrentBalance(fund.currentBalance);
      } else {
        setTransactions([]);
        setTotalIncome(0);
        setTotalExpenses(0);
        setCurrentBalance(0);
      }
    } catch {
      // Error handled by parent
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    isMounted.current = true;
    loadTreasury();
    return () => {
      isMounted.current = false;
    };
  }, [loadTreasury]);

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    if (typeFilter !== "all") {
      filtered = filtered.filter((t) => t.sourceType === typeFilter);
    }
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      filtered = filtered.filter((t) =>
        t.description.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [transactions, debouncedSearch, typeFilter]);

  const { currentItems, currentPage, totalPages, goToPage } = usePagination(
    filteredTransactions,
    10
  );

  const getTypeLabel = useCallback(
    (type: TreasurySourceType) => {
      const labels: Record<TreasurySourceType, string> = {
        initial: isArabic ? "رصيد ابتدائي" : "Initial",
        purchase: isArabic ? "مشتريات" : "Purchase",
        miscellaneous: isArabic ? "نثريات" : "Miscellaneous",
        extract: isArabic ? "مستخلص مقاول" : "Extract",
        adjustment: isArabic ? "تعديل رصيد" : "Adjustment",
      };
      return labels[type] || type;
    },
    [isArabic]
  );

  const getTypeColor = useCallback((type: TreasurySourceType) => {
    const colors: Record<TreasurySourceType, string> = {
      initial: "text-success-dark bg-success-light",
      purchase: "text-info-dark bg-info-light",
      miscellaneous: "text-warning-dark bg-warning-light",
      extract: "text-purple-600 bg-purple-50",
      adjustment: "text-warning-dark bg-warning-light",
    };
    return colors[type] || "text-text-secondary bg-gray-50";
  }, []);

  const handleAddBalance = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const amountInput = form.elements.namedItem("amount") as HTMLInputElement;
      const descriptionInput = form.elements.namedItem(
        "description"
      ) as HTMLInputElement;

      const amount = Number(amountInput.value);
      const description = sanitizeInput(descriptionInput.value);

      if (!isValidAmount(amount)) {
        showToast(isArabic ? "المبلغ غير صحيح" : "Invalid amount", "error");
        return;
      }

      if (!fundId) {
        showToast(isArabic ? "لم يتم العثور على العهدة" : "Fund not found", "error");
        return;
      }

      try {
        await fundTransactionService.create({
          fundId,
          type: "add",
          category: "miscellaneous",
          amount: Math.abs(amount),
          description,
          status: "approved",
        });
        showToast(
          isArabic ? "تم إضافة الرصيد بنجاح" : "Balance added successfully",
          "success"
        );
        setShowAddModal(false);
        loadTreasury();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Error", "error");
      }
    },
    [fundId, showToast, isArabic, loadTreasury]
  );

  // ✅ طباعة PDF محسنة
  const handlePrint = useCallback(() => {
    const title = isArabic ? "تقرير الخزنة" : "Treasury Report";
    const projectName = projectId ? `المشروع: ${projectId}` : "";
    const date = new Date().toLocaleDateString(isArabic ? "ar-EG" : "en-US");

    const rows = filteredTransactions
      .map(
        (t) => `
      <tr>
        <td>${t.date}</td>
        <td style="text-align:right">${t.description}</td>
        <td><span style="background:${
          getTypeColor(t.sourceType).split(" ")[0]
        };padding:2px 8px;border-radius:4px;font-size:11px;">${getTypeLabel(
          t.sourceType
        )}</span></td>
        <td style="color:${
          t.amount > 0 ? "#2e7d32" : "#c62828"
        };font-weight:700;text-align:center;">${
          t.amount > 0 ? "+" : ""
        }${t.amount.toLocaleString()}</td>
      </tr>
    `
      )
      .join("");

    const income = filteredTransactions.reduce(
      (sum, t) => (t.amount > 0 ? sum + t.amount : sum),
      0
    );
    const expenses = filteredTransactions.reduce(
      (sum, t) => (t.amount < 0 ? sum + Math.abs(t.amount) : sum),
      0
    );
    const net = income - expenses;

    const htmlContent = `
    <!DOCTYPE html>
    <html dir="${isArabic ? "rtl" : "ltr"}">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Cairo', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; color: #1e3a5f; }
        .print-container { max-width: 1200px; margin: 0 auto; padding: 30px; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 3px solid #c9a03d; }
        .header h1 { font-size: 28px; font-weight: 900; color: #1e3a5f; margin: 0; }
        .header .subtitle { font-size: 14px; color: #666; margin-top: 8px; }
        .header .date { font-size: 12px; color: #999; margin-top: 5px; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
        .summary-box { padding: 15px; border-radius: 8px; text-align: center; }
        .summary-box .label { font-size: 12px; color: #666; font-weight: 600; }
        .summary-box .value { font-size: 20px; font-weight: 900; margin-top: 5px; }
        .bg-green-light { background: #e8f5e9; }
        .bg-red-light { background: #ffebee; }
        .bg-gold-light { background: #fff8e1; border: 1px solid #c9a03d; }
        .text-green { color: #2e7d32; }
        .text-red { color: #c62828; }
        .text-gold { color: #c9a03d; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 15px; }
        th { background-color: #1e3a5f; color: white; font-weight: 700; padding: 10px 8px; border: 1px solid #1e3a5f; text-align: center; }
        td { padding: 8px; border: 1px solid #ddd; text-align: center; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .total-row { font-weight: 700; background: #f2f2f2 !important; }
        .total-row td { border-top: 2px solid #1e3a5f; }
        .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; font-size: 10px; color: #999; }
        @media print { body { background: white; padding: 10px; } .print-container { box-shadow: none; padding: 10px; } }
      </style>
    </head>
    <body>
      <div class="print-container">
        <div class="header">
          <h1>${title}</h1>
          <div class="subtitle">الوطنية للتنمية العمرانية</div>
          <div class="subtitle" style="font-size:13px;color:#666;">${projectName}</div>
          <div class="date">تاريخ التقرير: ${date}</div>
        </div>
        <div class="summary-grid">
          <div class="summary-box bg-green-light">
            <div class="label">إجمالي الإيرادات</div>
            <div class="value text-green">${income.toLocaleString()} ج.م</div>
          </div>
          <div class="summary-box bg-red-light">
            <div class="label">إجمالي المصروفات</div>
            <div class="value text-red">${expenses.toLocaleString()} ج.م</div>
          </div>
          <div class="summary-box bg-gold-light">
            <div class="label">الرصيد الحالي</div>
            <div class="value text-gold">${net.toLocaleString()} ج.م</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th style="text-align:right">البيان</th>
              <th>النوع</th>
              <th>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            ${
              rows ||
              `<tr><td colspan="4" style="text-align:center;padding:20px;color:#999;">لا توجد معاملات</td></tr>`
            }
            ${
              filteredTransactions.length > 0
                ? `
            <tr class="total-row">
              <td colspan="3" style="text-align:left;font-size:14px;">الإجمالي الكلي</td>
              <td style="font-size:16px;color:#c9a03d;text-align:center;">${net.toLocaleString()} ج.م</td>
            </tr>`
                : ""
            }
          </tbody>
        </table>
        <div class="footer">
          تم إنشاء هذا التقرير بواسطة النظام الآلي - الوطنية للتنمية العمرانية
        </div>
      </div>
    </body>
    </html>
    `;

    printHtmlDocument(title, htmlContent, `${title}.pdf`);
  }, [filteredTransactions, isArabic, getTypeLabel, getTypeColor, projectId]);

  // ✅ تصدير Excel محسن
  const exportToExcel = useCallback(() => {
    if (filteredTransactions.length === 0) {
      showToast(
        isArabic ? "لا توجد بيانات للتصدير" : "No data to export",
        "error"
      );
      return;
    }

    const income = filteredTransactions.reduce(
      (sum, t) => (t.amount > 0 ? sum + t.amount : sum),
      0
    );
    const expenses = filteredTransactions.reduce(
      (sum, t) => (t.amount < 0 ? sum + Math.abs(t.amount) : sum),
      0
    );
    const net = income - expenses;

    const headers = ["التاريخ", "البيان", "النوع", "المبلغ"];
    const rows = filteredTransactions.map((t) => [
      t.date,
      t.description,
      getTypeLabel(t.sourceType),
      t.amount,
    ]);

    const totalRow = ["", "", "الإجمالي الكلي", net];
    const allRows = [headers, ...rows, [], totalRow];
    const csvContent = allRows.map((row) => row.join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      "download",
      `treasury_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(
      isArabic ? "تم تصدير البيانات بنجاح" : "Data exported successfully",
      "success"
    );
  }, [filteredTransactions, showToast, isArabic, getTypeLabel]);

  return (
    <div className="space-y-6">
      {ToastComponent}

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5 text-center border-r-4 border-success">
          <p className="text-text-secondary text-sm mb-1">
            {isArabic ? "إجمالي الإيرادات" : "Total Income"}
          </p>
          <p className="text-2xl font-bold text-success-dark">
            {totalIncome.toLocaleString()} ج.م
          </p>
        </Card>
        <Card className="p-5 text-center border-r-4 border-danger">
          <p className="text-text-secondary text-sm mb-1">
            {isArabic ? "إجمالي المصروفات" : "Total Expenses"}
          </p>
          <p className="text-2xl font-bold text-danger">
            {totalExpenses.toLocaleString()} ج.م
          </p>
        </Card>
        <Card className="p-5 text-center border-r-4 border-gold">
          <p className="text-text-secondary text-sm mb-1">
            {isArabic ? "الرصيد الحالي" : "Current Balance"}
          </p>
          <p className="text-3xl font-bold text-gold">
            {currentBalance.toLocaleString()} ج.م
          </p>
        </Card>
      </div>

      <p className="text-xs text-text-secondary">
        {isArabic
          ? "اضغط على أي معاملة للانتقال إلى مصدرها (مستخلص / مشتريات / نثريات)"
          : "Click any transaction to navigate to its source"}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Can permission="fund-transactions.create">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-success-dark text-white rounded-lg hover:bg-success-dark transition text-sm font-medium"
          >
            <Plus size={18} />
            {isArabic ? "إضافة رصيد" : "Add Balance"}
          </button>
        </Can>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 border border-success-dark text-success-dark rounded-lg hover:bg-success-dark hover:text-white transition text-sm font-medium"
        >
          <Download size={18} />
          {isArabic ? "تصدير Excel" : "Export Excel"}
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Printer size={18} />
          {isArabic ? "طباعة PDF" : "Print PDF"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-surface p-3 rounded-lg shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
          <input
            type="text"
            placeholder={isArabic ? "بحث..." : "Search..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 pl-4 py-2 border border-border rounded-lg w-full text-sm focus:outline-none focus:border-gold"
          />
        </div>
        <div className="relative min-w-[150px]">
          <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as TreasurySourceType | "all")
            }
            className="pr-10 pl-4 py-2 border border-border rounded-lg appearance-none text-sm focus:outline-none focus:border-gold w-full"
          >
            <option value="all">{isArabic ? "الكل" : "All"}</option>
            <option value="initial">
              {isArabic ? "رصيد ابتدائي" : "Initial"}
            </option>
            <option value="extract">
              {isArabic ? "مستخلصات" : "Extracts"}
            </option>
            <option value="purchase">
              {isArabic ? "مشتريات" : "Purchase"}
            </option>
            <option value="miscellaneous">
              {isArabic ? "نثريات" : "Miscellaneous"}
            </option>
            <option value="adjustment">
              {isArabic ? "تعديل رصيد" : "Adjustment"}
            </option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {loading ? (
          <Card className="p-8 text-center text-text-muted">
            {isArabic ? "جاري التحميل..." : "Loading..."}
          </Card>
        ) : currentItems.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-text-secondary">
              {isArabic ? "لا توجد معاملات" : "No transactions"}
            </p>
          </Card>
        ) : (
          currentItems.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              isArabic={isArabic}
              getTypeLabel={getTypeLabel}
              getTypeColor={getTypeColor}
              href={buildTreasuryHref(locale, projectId, transaction)}
              onNavigate={router.push}
            />
          ))
        )}
      </div>

      {filteredTransactions.length > 10 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          isArabic={isArabic}
        />
      )}

      {/* Add Balance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "إضافة رصيد" : "Add Balance"}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-text-muted hover:text-text-secondary text-xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddBalance} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "المبلغ" : "Amount"}
                </label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1"
                  step="any"
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder={isArabic ? "أدخل المبلغ" : "Enter amount"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "البيان" : "Description"}
                </label>
                <input
                  type="text"
                  name="description"
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder={isArabic ? "سبب الإضافة" : "Reason for addition"}
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary transition"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-success-dark text-white rounded-xl hover:bg-success-dark transition"
                >
                  {isArabic ? "إضافة" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
