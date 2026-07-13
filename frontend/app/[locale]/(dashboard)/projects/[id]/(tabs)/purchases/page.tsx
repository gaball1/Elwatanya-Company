/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
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
  Package,
  DollarSign,
  Upload,
  FileText,
  X,
  Eye,
} from "lucide-react";
import { mockProjectFunds } from "@/lib/mockData";
import { financeApi } from "@/lib/api/financeApi";
import type { ProjectFund } from "@/types/finance";
import { useToast } from "@/components/ui/Toast";
import { sanitizeInput, isValidAmount } from "@/lib/security";
import React from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "@/components/ui/Pagination";
import {
  getPurchases,
  addPurchase as addPurchaseStore,
  deletePurchase as deletePurchaseStore,
  updatePurchase as updatePurchaseStore,
  markPurchaseAddedToInventory,
  addItemToInventoryFromPurchase,
  type PurchaseStoreItem,
} from "@/lib/mockData";

export default function ProjectPurchasesPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const { showToast, ToastComponent } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ State - جلب البيانات من الـ Store
  const [purchases, setPurchases] = useState<PurchaseStoreItem[]>(() =>
    getPurchases(projectId)
  );
  const [projectFund, setProjectFund] = useState<ProjectFund | undefined>(
    mockProjectFunds.find((f) => f.projectId === projectId)
  );

  // ✅ تحميل العهدة من الـ API
  useEffect(() => {
    financeApi
      .getFund(projectId)
      .then(({ fund }) => setProjectFund(fund))
      .catch(() => {});
  }, [projectId]);

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PurchaseStoreItem | null>(
    null
  );
  const [showAddToInventoryModal, setShowAddToInventoryModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] =
    useState<PurchaseStoreItem | null>(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] =
    useState<PurchaseStoreItem | null>(null);
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
          p.name.toLowerCase().includes(term) ||
          (p.supplier && p.supplier.toLowerCase().includes(term))
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
        invoiceData = {
          name: invoiceFile.name,
          url: base64,
          size: invoiceFile.size,
          type: invoiceFile.type,
          uploadedAt: new Date().toISOString(),
        };
      }

      // ✅ حفظ في الـ Store
      const saved = addPurchaseStore(projectId, {
        name: sanitizeInput(name),
        quantity,
        unit: sanitizeInput(unit),
        price,
        total,
        date: new Date().toISOString().split("T")[0],
        supplier: sanitizeInput(supplier),
        notes: sanitizeInput(notes),
        addedToInventory: false,
        invoiceFile: invoiceData,
      });

      setPurchases([saved, ...purchases]);

      // ✅ تحديث العهدة
      try {
        const { fund } = await financeApi.recordPurchase({
          id: saved.id,
          projectId,
          name: saved.name,
          quantity: saved.quantity,
          unit: saved.unit,
          price: saved.price,
          total: saved.total,
          date: saved.date,
          supplier: saved.supplier,
          notes: saved.notes,
        });
        setProjectFund(fund);
      } catch (err) {
        // ✅ لو فشل، نرجع المشتريات
        setPurchases(purchases);
        deletePurchaseStore(projectId, saved.id);
        showToast(
          err instanceof Error
            ? err.message
            : isArabic
            ? "فشل الخصم من العهدة"
            : "Fund deduction failed",
          "error"
        );
        return;
      }

      showToast(isArabic ? "تم إضافة المشتريات" : "Purchase added", "success");
      setShowAddModal(false);
      resetForm();
    },
    [
      purchases,
      projectId,
      fundBalance,
      formData,
      showToast,
      isArabic,
      fileToBase64,
    ]
  );

  // ✅ حذف مشتريات
  const handleDelete = useCallback(
    (id: string) => {
      if (confirm(isArabic ? "هل أنت متأكد من الحذف؟" : "Are you sure?")) {
        // ✅ حذف من الـ Store
        deletePurchaseStore(projectId, id);
        setPurchases(purchases.filter((p) => p.id !== id));
        showToast(isArabic ? "تم الحذف" : "Deleted", "success");
      }
    },
    [purchases, projectId, showToast, isArabic]
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
  const openEditModal = useCallback((item: PurchaseStoreItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      supplier: item.supplier || "",
      notes: item.notes || "",
      invoiceFile: null,
    });
    setShowAddModal(true);
  }, []);

  // ✅ عرض الفاتورة
  const viewInvoice = useCallback(
    (purchase: PurchaseStoreItem) => {
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

  // ✅ إضافة المشتريات إلى المخزن
  const handleAddToInventory = useCallback((purchase: PurchaseStoreItem) => {
    setSelectedPurchase(purchase);
    setShowAddToInventoryModal(true);
  }, []);

  // ✅ تأكيد إضافة المشتريات للمخزن (دالة واحدة)
  const confirmAddToInventory = useCallback(() => {
    if (!selectedPurchase) return;

    const result = addItemToInventoryFromPurchase(
      projectId,
      selectedPurchase.id,
      {
        code: selectedPurchase.name.substring(0, 4).toUpperCase(),
        name: selectedPurchase.name,
        category: "مواد بناء",
        unit: selectedPurchase.unit,
        price: selectedPurchase.price,
        location: "مخزن رئيسي",
        minQuantity: 10,
        previousBalance: 0,
      }
    );

    if (result) {
      setPurchases(
        purchases.map((p) =>
          p.id === selectedPurchase.id
            ? { ...p, addedToInventory: true, inventoryItemId: result.id }
            : p
        )
      );
      showToast(
        isArabic ? "تم إضافة الصنف إلى المخزن" : "Item added to inventory",
        "success"
      );
    } else {
      showToast(
        isArabic ? "فشل إضافة الصنف للمخزن" : "Failed to add item to inventory",
        "error"
      );
    }

    setShowAddToInventoryModal(false);
    setSelectedPurchase(null);
  }, [selectedPurchase, purchases, projectId, showToast, isArabic]);

  // ✅ طلب زيادة العهدة
  const handleRequestFund = useCallback(
    (e: React.FormEvent) => {
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

      if (projectFund) {
        const updatedFund = {
          ...projectFund,
          transactions: [
            ...projectFund.transactions,
            {
              id: `pft-${Date.now()}`,
              type: "request" as const,
              category: "purchase" as const,
              amount,
              description: `طلب زيادة عهدة مشتريات: ${reason}`,
              date: new Date().toISOString().split("T")[0],
              status: "pending" as const,
            },
          ],
        };
        setProjectFund(updatedFund);
      }

      showToast(
        isArabic ? "تم إرسال طلب زيادة العهدة" : "Fund increase request sent",
        "success"
      );
      setShowRequestModal(false);
    },
    [projectFund, showToast, isArabic]
  );

  // ✅ إضافة رصيد للعهدة
  const handleAddFund = useCallback(
    (amount: number) => {
      if (projectFund) {
        const updatedFund = {
          ...projectFund,
          initialBalance: projectFund.initialBalance + amount,
          currentBalance: projectFund.currentBalance + amount,
          lastUpdated: new Date().toISOString().split("T")[0],
          transactions: [
            ...projectFund.transactions,
            {
              id: `pft-${Date.now()}`,
              type: "add" as const,
              category: "purchase" as const,
              amount,
              description: "زيادة عهدة مشتريات (معتمدة)",
              date: new Date().toISOString().split("T")[0],
            },
          ],
        };
        setProjectFund(updatedFund);
        showToast(
          isArabic ? "تم إضافة الرصيد للعهدة" : "Fund balance added",
          "success"
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
          <p className="text-gray-500 text-sm">
            {isArabic ? "رصيد العهدة" : "Fund Balance"}
          </p>
          <p className="text-2xl font-bold text-gold">
            {fundBalance.toLocaleString()} ج.م
          </p>
        </Card>
        <Card
          className="p-4 border-r-4 border-red-500"
          suppressHydrationWarning
        >
          <p className="text-gray-500 text-sm">
            {isArabic ? "إجمالي المشتريات" : "Total Purchases"}
          </p>
          <p className="text-2xl font-bold text-red-500">
            {totalSpent.toLocaleString()} ج.م
          </p>
        </Card>
        <Card
          className="p-4 border-r-4 border-blue-500"
          suppressHydrationWarning
        >
          <p className="text-gray-500 text-sm">
            {isArabic ? "عدد المشتريات" : "Items Count"}
          </p>
          <p className="text-2xl font-bold text-blue-500">{purchases.length}</p>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3" suppressHydrationWarning>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-medium"
          suppressHydrationWarning
        >
          <Plus size={18} />
          {isArabic ? "إضافة مشتريات" : "Add Purchase"}
        </button>
        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium"
          suppressHydrationWarning
        >
          <DollarSign size={18} />
          {isArabic ? "طلب زيادة عهدة" : "Request Fund Increase"}
        </button>
        <button
          onClick={() => setShowFundModal(true)}
          className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition text-sm font-medium"
          suppressHydrationWarning
        >
          <Plus size={18} />
          {isArabic ? "إضافة رصيد للعهدة" : "Add Fund"}
        </button>
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-lg shadow-sm"
        suppressHydrationWarning
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={isArabic ? "بحث..." : "Search..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 pl-4 py-2 border border-gray-200 rounded-lg w-full text-sm focus:outline-none focus:border-gold"
            suppressHydrationWarning
          />
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
                  <td colSpan={10} className="p-8 text-center text-gray-500">
                    {isArabic ? "لا توجد مشتريات" : "No purchases"}
                  </td>
                </tr>
              ) : (
                currentItems.map((item, idx) => (
                  <tr key={item.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-center">{idx + 1}</td>
                    <td className="p-3">{item.name}</td>
                    <td className="p-3 text-center">{item.quantity}</td>
                    <td className="p-3 text-center">{item.unit}</td>
                    <td className="p-3 text-center">
                      {item.price.toLocaleString()}
                    </td>
                    <td className="p-3 text-center font-bold text-gold">
                      {item.total.toLocaleString()} ج.م
                    </td>
                    <td className="p-3 text-center">{item.date}</td>
                    <td className="p-3 text-center">
                      {item.invoiceFile ? (
                        <button
                          onClick={() => viewInvoice(item)}
                          className="text-blue-500 hover:text-blue-700 transition p-1"
                          title={isArabic ? "عرض الفاتورة" : "View Invoice"}
                        >
                          <FileText size={16} />
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {isArabic ? "لا توجد" : "No invoice"}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {item.addedToInventory ? (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          {isArabic
                            ? "تم الإضافة للمخزن"
                            : "Added to Inventory"}
                        </span>
                      ) : (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          {isArabic ? "قيد الانتظار" : "Pending"}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        {!item.addedToInventory && (
                          <button
                            onClick={() => handleAddToInventory(item)}
                            className="text-green-500 hover:text-green-700 transition p-1"
                            title={
                              isArabic ? "إضافة للمخزن" : "Add to Inventory"
                            }
                          >
                            <Package size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-blue-500 hover:text-blue-700 transition p-1"
                          title={isArabic ? "تعديل" : "Edit"}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-500 hover:text-red-700 transition p-1"
                          title={isArabic ? "حذف" : "Delete"}
                        >
                          <Trash2 size={16} />
                        </button>
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
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white">
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
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddPurchase} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "اسم الصنف" : "Item Name"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  required
                  suppressHydrationWarning
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? "الكمية" : "Qty"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.quantity || ""}
                    onChange={(e) =>
                      updateForm("quantity", Number(e.target.value))
                    }
                    min="1"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    required
                    suppressHydrationWarning
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? "الوحدة" : "Unit"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => updateForm("unit", e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    required
                    suppressHydrationWarning
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? "السعر" : "Price"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.price || ""}
                    onChange={(e) =>
                      updateForm("price", Number(e.target.value))
                    }
                    min="0"
                    step="any"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    required
                    suppressHydrationWarning
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "المورد" : "Supplier"}
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => updateForm("supplier", e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  suppressHydrationWarning
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "ملاحظات" : "Notes"}
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  suppressHydrationWarning
                />
              </div>

              {/* رفع الفاتورة */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "رفع الفاتورة" : "Upload Invoice"}{" "}
                  <span className="text-red-500">*</span>
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
                        ? "border-green-500 text-green-500 bg-green-50 hover:bg-green-100"
                        : "border-red-400 text-red-500 hover:bg-red-50"
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
                    <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-lg">
                      <FileText size={14} className="text-green-600" />
                      <span className="text-xs text-gray-600 truncate max-w-[150px]">
                        {formData.invoiceFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-red-500 mt-1">
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
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

      {/* Add to Inventory Modal */}
      {showAddToInventoryModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "إضافة إلى المخزن" : "Add to Inventory"}
              </h2>
              <button
                onClick={() => {
                  setShowAddToInventoryModal(false);
                  setSelectedPurchase(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <p className="text-gray-600 mb-4">
                {isArabic
                  ? `هل أنت متأكد من إضافة "${selectedPurchase.name}" إلى المخزن؟`
                  : `Are you sure you want to add "${selectedPurchase.name}" to inventory?`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddToInventoryModal(false);
                    setSelectedPurchase(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={confirmAddToInventory}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
                >
                  {isArabic ? "تأكيد" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {showInvoiceModal && selectedInvoice?.invoiceFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "فاتورة المشتريات" : "Purchase Invoice"}
              </h2>
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedInvoice(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-bold">
                    {isArabic ? "اسم الملف:" : "File:"}
                  </span>{" "}
                  {selectedInvoice.invoiceFile.name}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-bold">
                    {isArabic ? "الحجم:" : "Size:"}
                  </span>{" "}
                  {(selectedInvoice.invoiceFile.size / 1024).toFixed(2)} KB
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-bold">
                    {isArabic ? "تاريخ الرفع:" : "Uploaded:"}
                  </span>{" "}
                  {selectedInvoice.invoiceFile.uploadedAt}
                </p>
              </div>
              <div className="border rounded-lg p-4 min-h-[300px] flex items-center justify-center">
                {selectedInvoice.invoiceFile.type.startsWith("image/") ? (
                  <img
                    src={selectedInvoice.invoiceFile.url}
                    alt={selectedInvoice.invoiceFile.name}
                    className="max-w-full max-h-[500px] object-contain"
                  />
                ) : selectedInvoice.invoiceFile.type === "application/pdf" ? (
                  <iframe
                    src={selectedInvoice.invoiceFile.url}
                    className="w-full h-[500px]"
                    title={selectedInvoice.invoiceFile.name}
                  />
                ) : (
                  <div className="text-center">
                    <FileText
                      size={64}
                      className="mx-auto text-gray-300 mb-3"
                    />
                    <p className="text-gray-500">
                      {isArabic
                        ? "لا يمكن عرض هذا النوع من الملفات"
                        : "Cannot preview this file type"}
                    </p>
                    <a
                      href={selectedInvoice.invoiceFile.url}
                      download={selectedInvoice.invoiceFile.name}
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
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary">
                {isArabic
                  ? "طلب زيادة عهدة المشتريات"
                  : "Request Purchase Fund Increase"}
              </h2>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRequestFund} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "المبلغ المطلوب" : "Requested Amount"}
                </label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1"
                  step="any"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder={isArabic ? "أدخل المبلغ" : "Enter amount"}
                  suppressHydrationWarning
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "السبب" : "Reason"}
                </label>
                <input
                  type="text"
                  name="reason"
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition"
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
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "إضافة رصيد للعهدة" : "Add Fund"}
              </h2>
              <button
                onClick={() => setShowFundModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <p className="text-gray-600 mb-4">
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
                    handleAddFund(amount);
                    setShowFundModal(false);
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? "المبلغ المضاف" : "Amount to Add"}
                  </label>
                  <input
                    type="number"
                    name="amount"
                    required
                    min="1"
                    step="any"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder={isArabic ? "أدخل المبلغ" : "Enter amount"}
                    suppressHydrationWarning
                  />
                </div>
                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowFundModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                  >
                    {isArabic ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
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
