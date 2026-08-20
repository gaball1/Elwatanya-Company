/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui";
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  X,
  ArrowDown,
  ArrowUp,
  ClipboardCheck,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { sanitizeInput } from "@/lib/security";
import React from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "@/components/ui/Pagination";
import { inventoryItemService, type InventoryItem } from "@/services/inventory-item.service";
import { categoryService, type Category } from "@/services/category.service";
import { approvalService } from "@/services/approval.service";
import { Can } from "@/components/Can";
import DataLoader from "@/components/shared/DataLoader";
import PrintPdfButton from "@/components/shared/PrintPdfButton";
import { printAsPDF } from "@/lib/printUtils";

interface InventoryItemExtended extends InventoryItem {
  previousBalance: number;
  incoming: number;
  outgoing: number;
  total: number;
  location: string;
  category: string;
  transactions: { id: string; type: "in" | "out"; quantity: number; date: string; notes: string }[];
}

const mapApiToLocal = (item: InventoryItem): InventoryItemExtended => ({
  ...item,
  previousBalance: 0,
  incoming: 0,
  outgoing: 0,
  total: item.quantity || 0,
  location: item.warehouseId ?? "",
  category: item.categoryName ?? item.categoryId ?? "",
  transactions: [],
});

export default function ProjectInventoryPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const { showToast, ToastComponent } = useToast();

  // ✅ State - جلب البيانات من API
  const [items, setItems] = useState<InventoryItemExtended[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItemExtended | null>(
    null
  );
  const [transactionType, setTransactionType] = useState<"in" | "out">("in");
  const [transactionQuantity, setTransactionQuantity] = useState(0);
  const [editingItem, setEditingItem] = useState<InventoryItemExtended | null>(
    null
  );
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalItem, setApprovalItem] = useState<InventoryItemExtended | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<"draft" | "pending">("pending");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "",
    quantity: 0,
    unit: "",
    price: 0,
    location: "",
    minQuantity: 0,
    previousBalance: 0,
  });

  // ✅ Fetch items from API
  const fetchItems = useCallback(async () => {
    try {
      const data = await inventoryItemService.list();
      setItems(data.map(mapApiToLocal));
    } catch {
      showToast(isArabic ? "فشل تحميل الأصناف" : "Failed to load items", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, isArabic]);

  useEffect(() => {
    fetchItems();
    categoryService
      .list()
      .then(setAllCategories)
      .catch(() => {});
  }, [fetchItems]);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // ✅ الحصول على اسم تصنيف معرّف
  const getCategoryName = useCallback(
    (id?: string | null) => {
      if (!id) return "";
      const found = allCategories.find((cat) => cat.id === id);
      if (found) return found.name;
      const fromItem = items.find((item) => item.categoryId === id);
      return fromItem?.categoryName ?? "";
    },
    [allCategories, items]
  );

  // ✅ فلترة الأصناف
  const filteredItems = useMemo(() => {
    let filtered = [...items];
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (item) => (item.categoryId ?? "") === categoryFilter
      );
    }
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.code.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [items, debouncedSearch, categoryFilter]);

  // ✅ Pagination
  const { currentItems, currentPage, totalPages, goToPage } = usePagination(
    filteredItems,
    10
  );

  // ✅ إحصائيات
  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockItems = items.filter(
      (item) => item.quantity < item.minQuantity
    ).length;
    const totalIncoming = items.reduce((sum, item) => sum + item.incoming, 0);
    const totalOutgoing = items.reduce((sum, item) => sum + item.outgoing, 0);
    return {
      totalItems,
      totalQuantity,
      lowStockItems,
      totalIncoming,
      totalOutgoing,
    };
  }, [items]);

  // ✅ فتح مودال الإضافة
  const openAddModal = useCallback(() => {
    setEditingItem(null);
    setFormData({
      code: "",
      name: "",
      category: "",
      quantity: 0,
      unit: "",
      price: 0,
      location: "",
      minQuantity: 0,
      previousBalance: 0,
    });
    setShowAddModal(true);
  }, []);

  // ✅ فتح مودال التعديل
  const openEditModal = useCallback((item: InventoryItemExtended) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      category: item.categoryId ?? "",
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      location: item.location,
      minQuantity: item.minQuantity,
      previousBalance: item.previousBalance,
    });
    setShowAddModal(true);
  }, []);

  // ✅ فتح مودال إضافة حركة (وارد/منصرف)
  const openTransactionModal = useCallback(
    (item: InventoryItemExtended, type: "in" | "out") => {
      setSelectedItem(item);
      setTransactionType(type);
      setTransactionQuantity(0);
      setShowTransactionModal(true);
    },
    []
  );

  // ✅ حفظ الحركة (وارد/منصرف)
  const handleTransactionSubmit = useCallback(async () => {
    if (!selectedItem) return;
    if (transactionQuantity <= 0) {
      showToast(
        isArabic
          ? "الكمية يجب أن تكون أكبر من صفر"
          : "Quantity must be greater than zero",
        "error"
      );
      return;
    }

    if (
      transactionType === "out" &&
      transactionQuantity > selectedItem.quantity
    ) {
      showToast(
        isArabic
          ? "الكمية المطلوبة أكبر من المتاح"
          : "Requested quantity exceeds available",
        "error"
      );
      return;
    }

    // ✅ حساب القيم الجديدة
    const newQuantity =
      transactionType === "in"
        ? selectedItem.quantity + transactionQuantity
        : selectedItem.quantity - transactionQuantity;

    const newTotal =
      transactionType === "in"
        ? selectedItem.total + transactionQuantity
        : selectedItem.total;

    const newIncoming =
      transactionType === "in"
        ? selectedItem.incoming + transactionQuantity
        : selectedItem.incoming;

    const newOutgoing =
      transactionType === "out"
        ? selectedItem.outgoing + transactionQuantity
        : selectedItem.outgoing;

    // ✅ تحديث في الـ API
    try {
      const updated = await inventoryItemService.update(selectedItem.id, {
        quantity: newQuantity,
      });

      const mapped: InventoryItemExtended = {
        ...mapApiToLocal(updated),
        previousBalance: selectedItem.previousBalance,
        incoming: newIncoming,
        outgoing: newOutgoing,
        total: newTotal,
        location: selectedItem.location,
        category: selectedItem.category,
        transactions: [
          ...selectedItem.transactions,
          {
            id: `tx-${Date.now()}`,
            type: transactionType,
            quantity: transactionQuantity,
            date: new Date().toISOString().split("T")[0],
            notes: transactionType === "in" ? "وارد" : "منصرف",
          },
        ],
      };

      setItems(
        items.map((item) => (item.id === selectedItem.id ? mapped : item))
      );
      showToast(
        isArabic
          ? transactionType === "in"
            ? "تم إضافة الوارد بنجاح"
            : "تم تسجيل الصرف بنجاح"
          : transactionType === "in"
          ? "Incoming added successfully"
          : "Outgoing recorded successfully",
        "success"
      );
    } catch {
      showToast(
        isArabic ? "فشل تحديث الكمية" : "Failed to update quantity",
        "error"
      );
    }

    setShowTransactionModal(false);
    setSelectedItem(null);
    setTransactionQuantity(0);
  }, [
    selectedItem,
    transactionType,
    transactionQuantity,
    items,
    showToast,
    isArabic,
  ]);

  // ✅ فتح مودال طلب الموافقة
  const openApprovalModal = useCallback((item: InventoryItemExtended) => {
    setApprovalItem(item);
    setApprovalComment("");
    setApprovalStatus("pending");
    setShowApprovalModal(true);
  }, []);

  // ✅ إرسال طلب موافقة للمخزون
  const handleApprovalSubmit = useCallback(async () => {
    if (!approvalItem) return;
    try {
      await approvalService.request({
        entityType: "inventory",
        entityId: approvalItem.id,
        comment: approvalComment || undefined,
        status: approvalStatus,
      });
      showToast(
        approvalStatus === "draft"
          ? isArabic
            ? "تم حفظ الطلب كمسودة"
            : "Request saved as draft"
          : isArabic
          ? "تم إرسال طلب الموافقة"
          : "Approval request submitted",
        "success"
      );
      setShowApprovalModal(false);
      setApprovalItem(null);
    } catch (error: any) {
      showToast(
        error?.message || (isArabic ? "فشل إرسال الطلب" : "Failed to submit request"),
        "error"
      );
    }
  }, [approvalItem, approvalComment, approvalStatus, showToast, isArabic]);

  // ✅ دالة التحقق من التكرار
  const checkDuplicate = useCallback(
    (code: string, name: string, excludeId?: string) => {
      const trimmedCode = code.toLowerCase().trim();
      const trimmedName = name.toLowerCase().trim();

      const codeExists = items.some(
        (item) =>
          item.code.toLowerCase().trim() === trimmedCode &&
          item.id !== excludeId
      );
      if (codeExists) {
        showToast(
          isArabic ? "هذا الكود موجود بالفعل" : "This code already exists",
          "error"
        );
        return true;
      }

      const nameExists = items.some(
        (item) =>
          item.name.toLowerCase().trim() === trimmedName &&
          item.id !== excludeId
      );
      if (nameExists) {
        showToast(
          isArabic ? "هذا الاسم موجود بالفعل" : "This name already exists",
          "error"
        );
        return true;
      }

      return false;
    },
    [items, showToast, isArabic]
  );

  // ✅ حفظ صنف (إضافة/تعديل)
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const {
        code,
        name,
        category,
        quantity,
        unit,
        price,
        location,
        minQuantity,
        previousBalance,
      } = formData;

      if (checkDuplicate(code, name, editingItem?.id)) {
        return;
      }

      if (editingItem) {
        // ✅ تعديل
        try {
          const updated = await inventoryItemService.update(editingItem.id, {
            code,
            name,
            categoryId: category,
            unit,
            price,
            warehouseId: location,
            minQuantity,
            quantity,
          });

          const mapped: InventoryItemExtended = {
            ...mapApiToLocal(updated),
            previousBalance: editingItem.previousBalance,
            incoming: editingItem.incoming,
            outgoing: editingItem.outgoing,
            total: previousBalance + editingItem.incoming - editingItem.outgoing,
            location: location,
            category: getCategoryName(category) || category,
            transactions: editingItem.transactions,
          };

          setItems(
            items.map((item) => (item.id === editingItem.id ? mapped : item))
          );
          showToast(
            isArabic ? "تم تعديل الصنف بنجاح" : "Item updated successfully",
            "success"
          );
        } catch {
          showToast(
            isArabic ? "فشل تعديل الصنف" : "Failed to update item",
            "error"
          );
        }
      } else {
        // ✅ إضافة جديدة
        try {
          const newItem = await inventoryItemService.create({
            code,
            name,
            categoryId: category,
            unit,
            price,
            warehouseId: location,
            minQuantity,
            quantity: previousBalance,
          });

          const mapped = mapApiToLocal(newItem);
          mapped.previousBalance = previousBalance;
          mapped.total = previousBalance;
          mapped.location = location;
          mapped.category = getCategoryName(category) || category;

          setItems([mapped, ...items]);
          showToast(
            isArabic ? "تم إضافة الصنف بنجاح" : "Item added successfully",
            "success"
          );
        } catch {
          showToast(
            isArabic ? "فشل إضافة الصنف" : "Failed to add item",
            "error"
          );
        }
      }
      setShowAddModal(false);
      setEditingItem(null);
    },
    [items, editingItem, formData, showToast, isArabic, checkDuplicate, getCategoryName]
  );

  // ✅ حذف صنف
  const handleDelete = useCallback(
    async (id: string) => {
      if (
        confirm(
          isArabic
            ? "هل أنت متأكد من حذف هذا الصنف؟"
            : "Are you sure you want to delete this item?"
        )
      ) {
        try {
          await inventoryItemService.remove(id);
          setItems(items.filter((item) => item.id !== id));
          showToast(
            isArabic ? "تم حذف الصنف بنجاح" : "Item deleted successfully",
            "success"
          );
        } catch {
          showToast(
            isArabic ? "فشل حذف الصنف" : "Failed to delete item",
            "error"
          );
        }
      }
    },
    [items, showToast, isArabic]
  );

  // ✅ تحديث الفورم
  const updateForm = useCallback(
    (field: keyof typeof formData, value: string | number) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // ✅ تصدير Excel
  const exportToExcel = useCallback(() => {
    if (filteredItems.length === 0) {
      showToast(
        isArabic ? "لا توجد بيانات للتصدير" : "No data to export",
        "error"
      );
      return;
    }
    const headers = [
      "الكود",
      "الاسم",
      "التصنيف",
      "السابق",
      "الوارد",
      "المنصرف",
      "الباقي",
      "الإجمالي",
      "الوحدة",
      "الموقع",
    ];
    const rows = filteredItems.map((item) => [
      item.code,
      item.name,
      item.category,
      item.previousBalance,
      item.incoming,
      item.outgoing,
      item.quantity,
      item.total,
      item.unit,
      item.location,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      "download",
      `inventory_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم تصدير البيانات" : "Data exported", "success");
  }, [filteredItems, showToast, isArabic]);

  // ✅ طباعة
  const handlePrint = useCallback((logoUrl?: string) => {
    if (filteredItems.length === 0) {
      showToast(
        isArabic ? "لا توجد بيانات للطباعة" : "No data to print",
        "error"
      );
      return;
    }
    const headers = [
      isArabic ? "الكود" : "Code",
      isArabic ? "الاسم" : "Name",
      isArabic ? "التصنيف" : "Category",
      isArabic ? "السابق" : "Previous",
      isArabic ? "الوارد" : "Incoming",
      isArabic ? "المنصرف" : "Outgoing",
      isArabic ? "الباقي" : "Remaining",
      isArabic ? "الإجمالي" : "Total",
      isArabic ? "الوحدة" : "Unit",
      isArabic ? "الموقع" : "Location",
    ];
    const rows = filteredItems.map((item) => [
      item.code,
      item.name,
      item.category,
      item.previousBalance,
      item.incoming,
      item.outgoing,
      item.quantity,
      item.total,
      item.unit,
      item.location,
    ]);
    printAsPDF(
      rows,
      headers,
      isArabic ? "تقرير المخزون" : "Inventory Report",
      isArabic
    );
  }, [filteredItems, showToast, isArabic]);

  if (loading) {
    return <DataLoader />;
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {ToastComponent}

      {/* Stats Cards - 5 بطاقات */}
      <div
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
        suppressHydrationWarning
      >
        <Card
          className="p-4 border-r-4 border-info"
          suppressHydrationWarning
        >
          <p className="text-text-secondary text-sm">
            {isArabic ? "إجمالي الأصناف" : "Total Items"}
          </p>
          <p className="text-2xl font-bold text-info">{stats.totalItems}</p>
        </Card>
        <Card
          className="p-4 border-r-4 border-success"
          suppressHydrationWarning
        >
          <p className="text-text-secondary text-sm">
            {isArabic ? "إجمالي الوارد" : "Total Incoming"}
          </p>
          <p className="text-2xl font-bold text-success-dark">
            {stats.totalIncoming.toLocaleString()}
          </p>
        </Card>
        <Card
          className="p-4 border-r-4 border-warning"
          suppressHydrationWarning
        >
          <p className="text-text-secondary text-sm">
            {isArabic ? "إجمالي المنصرف" : "Total Outgoing"}
          </p>
          <p className="text-2xl font-bold text-warning">
            {stats.totalOutgoing.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4 border-r-4 border-gold" suppressHydrationWarning>
          <p className="text-text-secondary text-sm">
            {isArabic ? "إجمالي الكميات" : "Total Quantity"}
          </p>
          <p className="text-2xl font-bold text-gold">
            {stats.totalQuantity.toLocaleString()}
          </p>
        </Card>
        <Card
          className="p-4 border-r-4 border-danger"
          suppressHydrationWarning
        >
          <p className="text-text-secondary text-sm">
            {isArabic ? "أصناف منخفضة" : "Low Stock"}
          </p>
          <p className="text-2xl font-bold text-danger">
            {stats.lowStockItems}
          </p>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3" suppressHydrationWarning>
        <Can permission="inventory.create">
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-medium"
            suppressHydrationWarning
          >
            <Plus size={18} />
            {isArabic ? "إضافة صنف" : "Add Item"}
          </button>
        </Can>
        <Can permission="approvals.create">
          <button
            onClick={() => setShowApprovalModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gold text-gold rounded-lg hover:bg-gold hover:text-white transition text-sm font-medium"
            suppressHydrationWarning
          >
            <ClipboardCheck size={18} />
            {isArabic ? "طلب موافقة" : "Request Approval"}
          </button>
        </Can>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 border border-success-dark text-success-dark rounded-lg hover:bg-success-dark hover:text-white transition text-sm font-medium"
          suppressHydrationWarning
        >
          <Download size={18} />
          {isArabic ? "تصدير Excel" : "Export Excel"}
        </button>
        <PrintPdfButton
          label={isArabic ? "طباعة PDF" : "Print PDF"}
          onPrint={handlePrint}
          className="text-sm font-medium"
        />
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
            placeholder={
              isArabic ? "بحث بالاسم أو الكود..." : "Search by name or code..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 pl-4 py-2 border border-border rounded-lg w-full text-sm focus:outline-none focus:border-gold"
            suppressHydrationWarning
          />
        </div>
        <div className="relative min-w-[150px]">
          <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="pr-10 pl-4 py-2 border border-border rounded-lg appearance-none text-sm focus:outline-none focus:border-gold w-full"
            suppressHydrationWarning
          >
            <option value="all">
              {isArabic ? "كل التصنيفات" : "All Categories"}
            </option>
            {allCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ✅ Table - الشكل الجديد (دفتر العهدة) */}
      <div
        className="bg-surface rounded-lg shadow-sm overflow-hidden"
        suppressHydrationWarning
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-center">#</th>
                <th className="p-3 text-right">
                  {isArabic ? "الكود" : "Code"}
                </th>
                <th className="p-3 text-right">
                  {isArabic ? "الاسم" : "Name"}
                </th>
                <th className="p-3 text-center">
                  {isArabic ? "التصنيف" : "Category"}
                </th>
                <th className="p-3 text-center">
                  {isArabic ? "السابق" : "Previous"}
                </th>
                <th className="p-3 text-center">
                  {isArabic ? "الوارد" : "Incoming"}
                </th>
                <th className="p-3 text-center">
                  {isArabic ? "المنصرف" : "Outgoing"}
                </th>
                <th className="p-3 text-center">
                  {isArabic ? "الباقي" : "Balance"}
                </th>
                <th className="p-3 text-center">
                  {isArabic ? "الإجمالي" : "Total"}
                </th>
                <th className="p-3 text-center">
                  {isArabic ? "الوحدة" : "Unit"}
                </th>
                <th className="p-3 text-center">
                  {isArabic ? "الموقع" : "Location"}
                </th>
                <th className="p-3 text-center">
                  {isArabic ? "إجراءات" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-text-secondary">
                    <Package size={48} className="mx-auto text-text-muted mb-3" />
                    {isArabic ? "لا توجد أصناف" : "No items"}
                  </td>
                </tr>
              ) : (
                currentItems.map((item, idx) => (
                  <tr key={item.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-center">{idx + 1}</td>
                    <td className="p-3 font-mono">{item.code}</td>
                    <td className="p-3">{item.name}</td>
                    <td className="p-3 text-center">
                      <span className="bg-surface-tertiary px-2 py-1 rounded-full text-xs">
                        {item.category}
                      </span>                    </td>
                    <td className="p-3 text-center">
                      {item.previousBalance.toLocaleString()}
                    </td>
                    <td className="p-3 text-center text-success-dark font-bold">
                      {item.incoming.toLocaleString()}
                    </td>
                    <td className="p-3 text-center text-warning font-bold">
                      {item.outgoing.toLocaleString()}
                    </td>
                    <td
                      className={`p-3 text-center font-bold ${
                        item.quantity < item.minQuantity
                          ? "text-danger"
                          : "text-text-primary"
                      }`}
                    >
                      {item.quantity.toLocaleString()}
                      {item.quantity < item.minQuantity && (
                        <span className="block text-xs text-danger">
                          ⚠️ {isArabic ? "منخفض" : "Low"}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center font-bold text-gold">
                      {item.total.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">{item.unit}</td>
                    <td className="p-3 text-center">{item.location}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1 flex-wrap">
                        <Can permission="approvals.create">
                          <button
                            onClick={() => openApprovalModal(item)}
                            className="text-gold hover:text-gold-dark transition p-1"
                            title={isArabic ? "طلب موافقة" : "Request Approval"}
                            suppressHydrationWarning
                          >
                            <ClipboardCheck size={16} />
                          </button>
                        </Can>
                        <Can permission="inventory.update">
                          <button
                            onClick={() => openTransactionModal(item, "in")}
                            className="text-success hover:text-success-dark transition p-1"
                            title={isArabic ? "وارد" : "Incoming"}
                            suppressHydrationWarning
                          >
                            <ArrowDown size={16} />
                          </button>
                        </Can>
                        <Can permission="inventory.update">
                          <button
                            onClick={() => openTransactionModal(item, "out")}
                            className="text-warning hover:text-warning-dark transition p-1"
                            title={isArabic ? "منصرف" : "Outgoing"}
                            suppressHydrationWarning
                          >
                            <ArrowUp size={16} />
                          </button>
                        </Can>
                        <Can permission="inventory.update">
                          <button
                            onClick={() => openEditModal(item)}
                            className="text-info hover:text-info-dark transition p-1"
                            title={isArabic ? "تعديل" : "Edit"}
                            suppressHydrationWarning
                          >
                            <Edit2 size={16} />
                          </button>
                        </Can>
                        <Can permission="inventory.delete">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-danger hover:text-danger-dark transition p-1"
                            title={isArabic ? "حذف" : "Delete"}
                            suppressHydrationWarning
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
      {filteredItems.length > 10 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          isArabic={isArabic}
        />
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-surface rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            suppressHydrationWarning
          >
            <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-surface">
              <h2 className="text-xl font-bold text-primary">
                {editingItem
                  ? isArabic
                    ? "تعديل صنف"
                    : "Edit Item"
                  : isArabic
                  ? "إضافة صنف جديد"
                  : "New Item"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                }}
                className="text-text-muted hover:text-text-secondary text-xl"
                suppressHydrationWarning
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {isArabic ? "الكود" : "Code"}
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => updateForm("code", e.target.value)}
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    required
                    suppressHydrationWarning
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {isArabic ? "الاسم" : "Name"}
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
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "التصنيف" : "Category"}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => updateForm("category", e.target.value)}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  required
                  suppressHydrationWarning
                >
                  <option value="">
                    {isArabic ? "— بدون تصنيف —" : "— No category —"}
                  </option>
                  {allCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {isArabic ? "السابق" : "Previous"}
                  </label>
                  <input
                    type="number"
                    value={formData.previousBalance ?? ""}
                    onChange={(e) =>
                      updateForm("previousBalance", Number(e.target.value))
                    }
                    min="0"
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    required
                    suppressHydrationWarning
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {isArabic ? "الوحدة" : "Unit"}
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
                    {isArabic ? "السعر" : "Price"}
                  </label>
                  <input
                    type="number"
                    value={formData.price ?? ""}
                    onChange={(e) =>
                      updateForm("price", Number(e.target.value))
                    }
                    min="0"
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    required
                    suppressHydrationWarning
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {isArabic ? "الموقع" : "Location"}
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => updateForm("location", e.target.value)}
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    required
                    suppressHydrationWarning
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {isArabic ? "الحد الأدنى" : "Min Qty"}
                  </label>
                  <input
                    type="number"
                    value={formData.minQuantity ?? ""}
                    onChange={(e) =>
                      updateForm("minQuantity", Number(e.target.value))
                    }
                    min="0"
                    className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    required
                    suppressHydrationWarning
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                  }}
                  className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary transition"
                  suppressHydrationWarning
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition"
                  suppressHydrationWarning
                >
                  {isArabic ? "حفظ" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Request Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "طلب موافقة مخزون" : "Inventory Approval Request"}
              </h2>
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setApprovalItem(null);
                }}
                className="text-text-muted hover:text-text-secondary text-xl"
                suppressHydrationWarning
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "الصنف" : "Item"}
                </label>
                <select
                  value={approvalItem?.id ?? ""}
                  onChange={(e) => {
                    const item = items.find((i) => i.id === e.target.value);
                    setApprovalItem(item ?? null);
                  }}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  required
                  suppressHydrationWarning
                >
                  <option value="">
                    {isArabic ? "اختر صنفاً..." : "Select an item..."}
                  </option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} - {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "نوع الإرسال" : "Submission Type"}
                </label>
                <select
                  value={approvalStatus}
                  onChange={(e) =>
                    setApprovalStatus(e.target.value as "draft" | "pending")
                  }
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  suppressHydrationWarning
                >
                  <option value="pending">
                    {isArabic ? "إرسال مباشر" : "Submit directly"}
                  </option>
                  <option value="draft">
                    {isArabic ? "حفظ كمسودة" : "Save as draft"}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "ملاحظات" : "Comment"}
                </label>
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  rows={3}
                  placeholder={
                    isArabic ? "ملاحظات اختيارية" : "Optional comment"
                  }
                  suppressHydrationWarning
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovalItem(null);
                  }}
                  className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary transition"
                  suppressHydrationWarning
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={handleApprovalSubmit}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition"
                  suppressHydrationWarning
                >
                  {approvalStatus === "draft"
                    ? isArabic
                      ? "حفظ مسودة"
                      : "Save Draft"
                    : isArabic
                    ? "إرسال"
                    : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal (وارد/منصرف) */}
      {showTransactionModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary">
                {transactionType === "in"
                  ? isArabic
                    ? "إضافة وارد"
                    : "Add Incoming"
                  : isArabic
                  ? "تسجيل منصرف"
                  : "Record Outgoing"}
              </h2>
              <button
                onClick={() => {
                  setShowTransactionModal(false);
                  setSelectedItem(null);
                }}
                className="text-text-muted hover:text-text-secondary text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-text-secondary">
                  {isArabic ? "الصنف:" : "Item:"}{" "}
                  <span className="font-bold text-primary">
                    {selectedItem.name}
                  </span>
                </p>
                <p className="text-sm text-text-secondary">
                  {isArabic ? "الرصيد الحالي:" : "Current Balance:"}{" "}
                  <span className="font-bold">
                    {selectedItem.quantity.toLocaleString()}
                  </span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "الكمية" : "Quantity"}
                </label>
                <input
                  type="number"
                  value={transactionQuantity ?? ""}
                  onChange={(e) =>
                    setTransactionQuantity(Number(e.target.value))
                  }
                  min="1"
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  suppressHydrationWarning
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransactionModal(false);
                    setSelectedItem(null);
                  }}
                  className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary transition"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={handleTransactionSubmit}
                  className={`flex-1 px-4 py-2 rounded-xl text-white transition ${
                    transactionType === "in"
                      ? "bg-success-dark hover:bg-success-dark"
                      : "bg-warning hover:bg-warning-dark"
                  }`}
                >
                  {transactionType === "in"
                    ? isArabic
                      ? "إضافة"
                      : "Add"
                    : isArabic
                    ? "تسجيل"
                    : "Record"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
