/* eslint-disable */
"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Card } from "@/components/ui";
import {
  Plus,
  Printer,
  Download,
  Search,
  Filter,
  Trash2,
  Edit2,
  DollarSign,
  Upload,
  FileText,
  X,
  Eye,
} from "lucide-react";
import type { ProjectFund } from "@/types/finance";
import { projectFundService } from "@/services/project-fund.service";
import { fundTransactionService } from "@/services/fund-transaction.service";
import { approvalService } from "@/services/approval.service";
import { purchaseService, type Purchase } from "@/services/purchase.service";
import { useToast } from "@/components/ui/Toast";
import { sanitizeInput, isValidAmount } from "@/lib/security";
import { shortRef } from "@/lib/formatRef";
import React from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "@/components/ui/Pagination";
import { Can } from "@/components/Can";
import { useAuth } from "@/hooks/useAuth";

export default function ProjectPurchasesPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const { user } = useAuth();
  const { showToast, ToastComponent } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ State - جلب البيانات من الـ API
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [projectFund, setProjectFund] = useState<ProjectFund | undefined>();
  const [loading, setLoading] = useState(true);

  // ✅ تحميل البيانات من الـ API
  useEffect(() => {
    Promise.all([
      purchaseService.list(projectId),
      projectFundService.list(),
    ])
      .then(([purchasesData, funds]) => {
        setPurchases(purchasesData);
        const fund = funds.find((f) => f.projectId === projectId);
        if (fund) setProjectFund({ ...fund, transactions: [] } as ProjectFund);
      })
      .catch(() => {
        showToast(isArabic ? "فشل تحميل البيانات" : "Failed to load data", "error");
      })
      .finally(() => setLoading(false));
  }, [projectId, showToast, isArabic]);

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Purchase | null>(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Purchase | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // ✅ Form State
  const [formData, setFormData] = useState({
    name: "",
    quantity: 1,
    unit: "",
    price: 0,
    supplier: "",
    notes: "",
    invoiceFile: null as File | null,
  });

  const debouncedSearch = useDebounce(searchTerm, 300);

  const filteredPurchases = useMemo(() => {
    let filtered = [...purchases];
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.itemName.toLowerCase().includes(term) ||
          (p.supplierName && p.supplierName.toLowerCase().includes(term))
      );
    }
    return filtered;
  }, [purchases, debouncedSearch]);

  const { currentItems, currentPage, totalPages, goToPage } = usePagination(
    filteredPurchases,
    10
  );

  const totalSpent = purchases.reduce((sum, p) => sum + p.total, 0);
  const fundBalance = projectFund?.currentBalance || 0;

  // ✅ معالج رفع الملف
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          showToast(
            isArabic
              ? "حجم الملف كبير جداً (الحد الأقصى 5 ميجابايت)"
              : "File too large (max 5MB)",
            "error"
          );
          e.target.value = "";
          return;
        }
        setFormData((prev) => ({ ...prev, invoiceFile: file }));
      }
    },
    [showToast, isArabic]
  );

  // ✅ إزالة الملف
  const removeFile = useCallback(() => {
    setFormData((prev) => ({ ...prev, invoiceFile: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // ✅ حفظ الملف كـ Base64
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }, []);

  // ✅ إضافة مشتريات جديدة
  const handleAddPurchase = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const { name, quantity, unit, price, supplier, notes, invoiceFile } =
        formData;
      const total = quantity * price;

      if (!name || quantity <= 0 || !unit || price <= 0) {
        showToast(
          isArabic
            ? "يرجى ملء جميع الحقول المطلوبة"
            : "Please fill all required fields",
          "error"
        );
        return;
      }

      // ✅ التحقق من رفع الفاتورة (إجباري)
      if (!invoiceFile) {
        showToast(
          isArabic
            ? "يرجى رفع الفاتورة (إلزامي)"
            : "Please upload the invoice (required)",
          "error"
        );
        return;
      }

      if (total > fundBalance) {
        showToast(
          isArabic ? "رصيد العهدة غير كافٍ" : "Insufficient fund balance",
          "error"
        );
        return;
      }

      let invoiceData = undefined;
      if (invoiceFile) {
        const base64 = await fileToBase64(invoiceFile);
        invoiceData = base64;
      }

      try {
        if (editingItem) {
          const updated = await purchaseService.update(editingItem.id, {
            itemName: sanitizeInput(name),
            quantity,
            unit: sanitizeInput(unit),
            unitPrice: price,
            supplierName: sanitizeInput(supplier),
            notes: sanitizeInput(notes),
            invoiceFile: invoiceData,
            createdBy: user?.id ?? '',
          });
          setPurchases(purchases.map((p) => (p.id === editingItem.id ? updated : p)));
          showToast(isArabic ? "تم تحديث المشتريات" : "Purchase updated", "success");
        } else {
          const saved = await purchaseService.create({
            projectId,
            itemName: sanitizeInput(name),
            quantity,
            unit: sanitizeInput(unit),
            unitPrice: price,
            date: new Date().toISOString().split("T")[0],
            supplierName: sanitizeInput(supplier),
            notes: sanitizeInput(notes),
            invoiceFile: invoiceData,
            createdBy: user?.id ?? '',
          });
          setPurchases([saved, ...purchases]);
          showToast(isArabic ? "تم إضافة المشتريات" : "Purchase added", "success");
        }

        setShowAddModal(false);
        resetForm();
      } catch {
        showToast(isArabic ? "فشل حفظ المشتريات" : "Failed to save purchase", "error");
      }
    },
    [purchases, projectId, fundBalance, formData, editingItem, user, showToast, isArabic, fileToBase64]
  );

  // ✅ حذف مشتريات
  const handleDelete = useCallback(
    async (id: string) => {
      if (confirm(isArabic ? "هل أنت متأكد من الحذف؟" : "Are you sure?")) {
        try {
          await purchaseService.remove(id);
          setPurchases(purchases.filter((p) => p.id !== id));
          showToast(isArabic ? "تم الحذف" : "Deleted", "success");
        } catch {
          showToast(isArabic ? "فشل الحذف" : "Failed to delete", "error");
        }
      }
    },
    [purchases, showToast, isArabic]
  );

  // ✅ إعادة تعيين الفورم
  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      quantity: 1,
      unit: "",
      price: 0,
      supplier: "",
      notes: "",
      invoiceFile: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setEditingItem(null);
  }, []);

  // ✅ فتح مودال الإضافة
  const openAddModal = useCallback(() => {
    resetForm();
    setShowAddModal(true);
  }, [resetForm]);

  // ✅ فتح مودال التعديل
  const openEditModal = useCallback((item: Purchase) => {
    setEditingItem(item);
    setFormData({
      name: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      price: item.unitPrice,
      supplier: item.supplierName ?? "",
      notes: item.notes ?? "",
      invoiceFile: null,
    });
    setShowAddModal(true);
  }, []);

  // ✅ عرض الفاتورة
  const viewInvoice = useCallback(
    (purchase: Purchase) => {
      if (purchase.invoiceFile) {
        setSelectedInvoice(purchase);
        setShowInvoiceModal(true);
      } else {
        showToast(
          isArabic ? "لا توجد فاتورة مرفقة" : "No invoice attached",
          "info"
        );
      }
    },
    [showToast, isArabic]
  );

  // ✅ تحديث الفورم
  const updateForm = useCallback((field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ✅ طلب زيادة العهدة
  const handleRequestFund = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const amount = Number(
        (form.elements.namedItem("amount") as HTMLInputElement).value
      );
      const reason = (form.elements.namedItem("reason") as HTMLInputElement)
        .value;

      if (!isValidAmount(amount)) {
        showToast(isArabic ? "المبلغ غير صحيح" : "Invalid amount", "error");
        return;
      }

      if (!projectFund) {
        showToast(
          isArabic ? "لم يتم العثور على العهدة" : "Fund not found",
          "error"
        );
        return;
      }

      try {
        const tx = await fundTransactionService.create({
          fundId: projectFund.id,
          type: "request",
          category: "purchase",
          amount,
          description: `طلب زيادة عهدة مشتريات: ${reason}`,
        });
        await approvalService.request({
          entityType: "fund-transaction",
          entityId: tx.id,
          comment: reason,
        });
        const updatedFund = {
          ...projectFund,
          transactions: [
            ...projectFund.transactions,
            {
              id: tx.id,
              type: "request" as const,
              category: "purchase" as const,
              amount,
              description: `طلب زيادة عهدة مشتريات: ${reason}`,
              date: tx.date.split("T")[0],
              status: "pending" as const,
            },
          ],
        };
        setProjectFund(updatedFund);
        showToast(
          isArabic
            ? "تم إرسال طلب زيادة العهدة للموافقة"
            : "Fund increase request sent for approval",
          "success"
        );
        setShowRequestModal(false);
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Error",
          "error"
        );
      }
    },
    [projectFund, showToast, isArabic]
  );

  // ✅ إضافة رصيد للعهدة
  const handleAddFund = useCallback(
    async (amount: number) => {
      if (!projectFund) {
        showToast(
          isArabic ? "لم يتم العثور على العهدة" : "Fund not found",
          "error"
        );
        return;
      }
      try {
        const tx = await fundTransactionService.create({
          fundId: projectFund.id,
          type: "add",
          category: "purchase",
          amount,
          description: "زيادة عهدة مشتريات (معتمدة)",
          status: "approved",
        });
        const updatedFund = {
          ...projectFund,
          initialBalance: projectFund.initialBalance + amount,
          currentBalance: projectFund.currentBalance + amount,
          lastUpdated: new Date().toISOString().split("T")[0],
          transactions: [
            ...projectFund.transactions,
            {
              id: tx.id,
              type: "add" as const,
              category: "purchase" as const,
              amount,
              description: "زيادة عهدة مشتريات (معتمدة)",
              date: tx.date.split("T")[0],
              status: "approved" as const,
            },
          ],
        };
        setProjectFund(updatedFund);
        showToast(
          isArabic ? "تم إضافة الرصيد للعهدة" : "Fund balance added",
          "success"
        );
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Error",
          "error"
        );
      }
    },
    [projectFund, showToast, isArabic]
  );

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {ToastComponent}

      {/* Fund Cards */}
      <div className="grid md:grid-cols-3 gap-4" suppressHydrationWarning>
        <Card className="p-4 border-r-4 border-gold" suppressHydrationWarning>
          <p className="text-text-secondary text-sm">
            {isArabic ? "رصيد العهدة" : "Fund Balance"}
          </p>
          <p className="text-2xl font-bold text-gold">
            {fundBalance.toLocaleString()} ج.م
          </p>
        </Card>
        <Card
          className="p-4 border-r-4 border-danger"
          suppressHydrationWarning
        >
          <p className="text-text-secondary text-sm">
            {isArabic ? "إجمالي المشتريات" : "Total Purchases"}
          </p>
          <p className="text-2xl font-bold text-danger">
            {totalSpent.toLocaleString()} ج.م
          </p>
        </Card>
        <Card
          className="p-4 border-r-4 border-info"
          suppressHydrationWarning
        >
          <p className="text-text-secondary text-sm">
            {isArabic ? "عدد المشتريات" : "Items Count"}
          </p>
          <p className="text-2xl font-bold text-info">{purchases.length}</p>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3" suppressHydrationWarning>
        <Can permission="purchases.create">
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-medium"
            suppressHydrationWarning
          >
            <Plus size={18} />
            {isArabic ? "إضافة مشتريات" : "Add Purchase"}
          </button>
        </Can>
        <Can permission="purchases.create">
          <button
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-warning-dark text-white rounded-lg hover:bg-warning-dark transition text-sm font-medium"
            suppressHydrationWarning
          >
            <DollarSign size={18} />
            {isArabic ? "طلب زيادة عهدة" : "Request Fund Increase"}
          </button>
        </Can>
        <Can permission="purchases.create">
          <button
            onClick={() => setShowFundModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-success-dark text-success-dark rounded-lg hover:bg-success-dark hover:text-white transition text-sm font-medium"
            suppressHydrationWarning
          >
            <Plus size={18} />
            {isArabic ? "إضافة رصيد للعهدة" : "Add Fund"}
          </button>
        </Can>
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap gap-3 items-center bg-surface p-3 rounded-lg shadow-sm"
        suppressHydrationWarning
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
          <input
            type="text"
            placeholder={isArabic ? "بحث..." : "Search..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 pl-4 py-2 border border-border rounded-lg w-full text-sm focus:outline-none focus:border-gold"
            suppressHydrationWarning
          />
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-center">#</th>
                <th className="p-3 text-right">
                  {isArabic ? "الصنف" : "Item"}
                </th>
                <th className="p-3 text-center">
                  {isArabic ? "الكمية" : "Qty"}
                </th>
                <th className="p-3 text-center">
                  {isArabic ? "الوحدة" : "Unit"}
                </th>
                <th className="p-3 text-center">
                  {isArabic ? "السعر" : "Price"}
                </th>
                <th className="p-3 text-center">
                  {isArabic ? "الإجمالي" : "Total"}
                </th>
                <th className="p-3 text-center">
                  {isArabic ? "التاريخ" : "Date"}
                </th>
                <th className="p-3 text-center">
                  {isArabic ? "الفاتورة" : "Invoice"}
                </th>
                <th className="p-3 text-center">
                  {isArabic ? "الحالة" : "Status"}
                </th>
                <th className="p-3 text-center">
                  {isArabic ? "إجراءات" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-text-secondary">
                    {isArabic ? "لا توجد مشتريات" : "No purchases"}
                  </td>
                </tr>
              ) : (
                currentItems.map((item, idx) => (
                  <tr key={item.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-center">{idx + 1}</td>
                    <td className="p-3">{item.itemName}</td>
                    <td className="p-3 text-center">{item.quantity}</td>
                    <td className="p-3 text-center">{item.unit}</td>
                    <td className="p-3 text-center">
                      {item.unitPrice.toLocaleString()}
                    </td>
                    <td className="p-3 text-center font-bold text-gold">
                      {item.total.toLocaleString()} ج.م
                    </td>
                    <td className="p-3 text-center">{item.date}</td>
                    <td className="p-3 text-center">
                      {item.invoiceFile ? (
                        <button
                          onClick={() => viewInvoice(item)}
                          className="text-info hover:text-info-dark transition p-1"
                          title={isArabic ? "عرض الفاتورة" : "View Invoice"}
                        >
                          <FileText size={16} />
                        </button>
                      ) : (
                        <span className="text-xs text-text-muted">
                          {isArabic ? "لا توجد" : "No invoice"}
                        </span>
                      )}
                    </td>
                      <td className="p-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.status === 'approved' ? 'bg-success-light text-success-dark'
                            : item.status === 'received' ? 'bg-info-light text-info-dark'
                            : item.status === 'cancelled' ? 'bg-danger-light text-danger-dark'
                            : 'bg-warning-light text-warning-dark'
                        }`}>
                          {item.status === 'approved' ? (isArabic ? 'معتمد' : 'Approved')
                            : item.status === 'received' ? (isArabic ? 'مستلم' : 'Received')
                            : item.status === 'cancelled' ? (isArabic ? 'ملغي' : 'Cancelled')
                            : isArabic ? 'قيد الانتظار' : 'Pending'}
                        </span>
                      </td>
                    <td className="p-3 text-center">
                          <div className="flex justify-center gap-1">
                            {item.status === 'pending' && (
                              <Can permission="purchases.update">
                                <button
                                  onClick={async () => {
                                    try {
                                      const updated = await purchaseService.updateStatus(item.id, 'approved');
                                      setPurchases(purchases.map((p) => (p.id === item.id ? updated : p)));
                                      showToast(isArabic ? "تم اعتماد المشتريات" : "Purchase approved", "success");
                                    } catch { showToast(isArabic ? "فشل الاعتماد" : "Approval failed", "error"); }
                                  }}
                                  className="text-success-dark hover:text-success transition p-1"
                                  title={isArabic ? "اعتماد" : "Approve"}
                                >
                                  <Eye size={16} />
                                </button>
                              </Can>
                            )}
                            {item.status === 'approved' && (
                              <Can permission="purchases.update">
                                <button
                                  onClick={async () => {
                                    try {
                                      const updated = await purchaseService.updateStatus(item.id, 'received');
                                      setPurchases(purchases.map((p) => (p.id === item.id ? updated : p)));
                                      showToast(isArabic ? "تم استلام المشتريات وإضافتها للمخزون" : "Purchase received and added to inventory", "success");
                                    } catch { showToast(isArabic ? "فشل الاستلام" : "Receive failed", "error"); }
                                  }}
                                  className="text-info hover:text-info-dark transition p-1"
                                  title={isArabic ? "استلام" : "Receive"}
                                >
                                  <Download size={16} />
                                </button>
                              </Can>
                            )}
                            {item.status !== 'cancelled' && item.status !== 'received' && (
                              <Can permission="purchases.update">
                                <button
                                  onClick={async () => {
                                    try {
                                      const updated = await purchaseService.updateStatus(item.id, 'cancelled');
                                      setPurchases(purchases.map((p) => (p.id === item.id ? updated : p)));
                                      showToast(isArabic ? "تم إلغاء المشتريات" : "Purchase cancelled", "success");
                                    } catch { showToast(isArabic ? "فشل الإلغاء" : "Cancel failed", "error"); }
                                  }}
                                  className="text-danger hover:text-danger-dark transition p-1"
                                  title={isArabic ? "إلغاء" : "Cancel"}
                                >
                                  <X size={16} />
                                </button>
                              </Can>
                            )}
                            <Can permission="purchases.update">
                              <button
                                onClick={() => openEditModal(item)}
                                disabled={item.status !== 'pending'}
                                title={
                                  item.status !== 'pending'
                                    ? (isArabic ? "لا يمكن تعديل معتمدة/مستلمة/ملغية" : "Approved/Received/Cancelled purchases are locked")
                                    : (isArabic ? "تعديل" : "Edit")
                                }
                                className={`text-info hover:text-info-dark transition p-1 ${item.status !== 'pending' ? 'opacity-40 cursor-not-allowed' : ''}`}
                              >
                                <Edit2 size={16} />
                              </button>
                            </Can>
                            <Can permission="purchases.delete">
                              <button
                                onClick={() => handleDelete(item.id)}
                                disabled={item.status !== 'pending'}
                                title={
                                  item.status !== 'pending'
                                    ? (isArabic ? "لا يمكن حذف معتمدة/مستلمة/ملغية" : "Approved/Received/Cancelled purchases cannot be deleted")
                                    : (isArabic ? "حذف" : "Delete")
                                }
                                className={`text-danger hover:text-danger-dark p-1 ${item.status !== 'pending' ? 'opacity-40 cursor-not-allowed' : ''}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </Can>
                          </div>
                        </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredPurchases.length > 10 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          isArabic={isArabic}
        />
      )}

      {/* Add Purchase Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-surface">
              <h2 className="text-xl font-bold text-primary">
                {editingItem
                  ? isArabic
                    ? "تعديل مشتريات"
                    : "Edit Purchase"
                  : isArabic
                  ? "إضافة مشتريات جديدة"
                  : "New Purchase"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-text-muted hover:text-text-secondary text-xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddPurchase} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "اسم الصنف" : "Item Name"}{" "}
                  <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  required
                  suppressHydrationWarning
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {isArabic ? "الكمية" : "Qty"}{" "}
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.quantity ?? ""}
                    onChange={(e) =>
                      updateForm("quantity", Number(e.target.value))
                    }
                    min="1"
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    required
                    suppressHydrationWarning
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {isArabic ? "الوحدة" : "Unit"}{" "}
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => updateForm("unit", e.target.value)}
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    required
                    suppressHydrationWarning
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {isArabic ? "السعر" : "Price"}{" "}
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.price ?? ""}
                    onChange={(e) =>
                      updateForm("price", Number(e.target.value))
                    }
                    min="0"
                    step="any"
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    required
                    suppressHydrationWarning
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "المورد" : "Supplier"}
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => updateForm("supplier", e.target.value)}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  suppressHydrationWarning
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "ملاحظات" : "Notes"}
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  suppressHydrationWarning
                />
              </div>

              {/* رفع الفاتورة */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "رفع الفاتورة" : "Upload Invoice"}{" "}
                  <span className="text-danger">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    suppressHydrationWarning
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition text-sm font-medium ${
                      formData.invoiceFile
                        ? "border-success text-success bg-success-light hover:bg-success-light"
                        : "border-danger text-danger hover:bg-danger-light"
                    }`}
                  >
                    <Upload size={16} />
                    {formData.invoiceFile
                      ? isArabic
                        ? "تم رفع الملف"
                        : "File Uploaded"
                      : isArabic
                      ? "اختر ملف (إلزامي)"
                      : "Choose File (Required)"}
                  </button>
                  {formData.invoiceFile && (
                    <div className="flex items-center gap-2 bg-success-light px-3 py-1 rounded-lg">
                      <FileText size={14} className="text-success-dark" />
                      <span className="text-xs text-text-secondary truncate max-w-[150px]">
                        {formData.invoiceFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="text-danger hover:text-danger-dark"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-danger mt-1">
                  {isArabic
                    ? "رفع الفاتورة إلزامي"
                    : "Invoice upload is required"}
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary transition"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition"
                >
                  {isArabic ? "حفظ" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {showInvoiceModal && selectedInvoice?.invoiceFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-surface">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "فاتورة المشتريات" : "Purchase Invoice"}
              </h2>
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedInvoice(null);
                }}
                className="text-text-muted hover:text-text-secondary text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-text-secondary">
                  <span className="font-bold">
                    {isArabic ? "رقم المشتريات:" : "Purchase Ref:"}
                  </span>{" "}
                  {shortRef(selectedInvoice.id)}
                </p>
              </div>
              <div className="border rounded-lg p-4 min-h-[300px] flex items-center justify-center">
                {selectedInvoice.invoiceFile.startsWith("data:image/") ? (
                  <img
                    src={selectedInvoice.invoiceFile}
                    alt={selectedInvoice.itemName}
                    className="max-w-full max-h-[500px] object-contain"
                  />
                ) : selectedInvoice.invoiceFile.startsWith("data:application/pdf") || selectedInvoice.invoiceFile.startsWith("data:application/pdf") ? (
                  <iframe
                    src={selectedInvoice.invoiceFile}
                    className="w-full h-[500px]"
                    title={selectedInvoice.itemName}
                  />
                ) : (
                  <div className="text-center">
                    <FileText
                      size={64}
                      className="mx-auto text-text-muted mb-3"
                    />
                    <p className="text-text-secondary">
                      {isArabic
                        ? "لا يمكن عرض هذا النوع من الملفات"
                        : "Cannot preview this file type"}
                    </p>
                    <a
                      href={selectedInvoice.invoiceFile}
                      download={selectedInvoice.itemName}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
                    >
                      <Download size={16} />
                      {isArabic ? "تحميل الملف" : "Download File"}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Fund Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary">
                {isArabic
                  ? "طلب زيادة عهدة المشتريات"
                  : "Request Purchase Fund Increase"}
              </h2>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-text-muted hover:text-text-secondary text-xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRequestFund} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "المبلغ المطلوب" : "Requested Amount"}
                </label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1"
                  step="any"
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder={isArabic ? "أدخل المبلغ" : "Enter amount"}
                  suppressHydrationWarning
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "السبب" : "Reason"}
                </label>
                <input
                  type="text"
                  name="reason"
                  required
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder={
                    isArabic ? "سبب طلب الزيادة" : "Reason for increase"
                  }
                  suppressHydrationWarning
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary transition"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-warning-dark text-white rounded-xl hover:bg-warning-dark transition"
                >
                  {isArabic ? "إرسال الطلب" : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Fund Modal */}
      {showFundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "إضافة رصيد للعهدة" : "Add Fund"}
              </h2>
              <button
                onClick={() => setShowFundModal(false)}
                className="text-text-muted hover:text-text-secondary text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <p className="text-text-secondary mb-4">
                {isArabic
                  ? "المبلغ الحالي في العهدة:"
                  : "Current fund balance:"}
                <span className="font-bold text-gold block text-xl">
                  {fundBalance.toLocaleString()} ج.م
                </span>
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const amount = Number(
                    (form.elements.namedItem("amount") as HTMLInputElement)
                      .value
                  );
                  if (isValidAmount(amount)) {
                    handleAddFund(amount).then(() => setShowFundModal(false));
                  } else {
                    showToast(
                      isArabic ? "المبلغ غير صحيح" : "Invalid amount",
                      "error"
                    );
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {isArabic ? "المبلغ المضاف" : "Amount to Add"}
                  </label>
                  <input
                    type="number"
                    name="amount"
                    required
                    min="1"
                    step="any"
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder={isArabic ? "أدخل المبلغ" : "Enter amount"}
                    suppressHydrationWarning
                  />
                </div>
                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowFundModal(false)}
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
        </div>
      )}
    </div>
  );
}
