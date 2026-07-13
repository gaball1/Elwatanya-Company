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
  Printer,
  Download,
  Edit2,
  Trash2,
  X,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { sanitizeInput } from "@/lib/security";
import React from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "@/components/ui/Pagination";
import {
  getInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  type InventoryStoreItem,
} from "@/lib/mockData";

export default function ProjectInventoryPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const { showToast, ToastComponent } = useToast();

  // ✅ State - جلب البيانات من الـ Store
  const [items, setItems] = useState<InventoryStoreItem[]>(() =>
    getInventoryItems(projectId)
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryStoreItem | null>(
    null
  );
  const [transactionType, setTransactionType] = useState<"in" | "out">("in");
  const [transactionQuantity, setTransactionQuantity] = useState(0);
  const [editingItem, setEditingItem] = useState<InventoryStoreItem | null>(
    null
  );
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

  const debouncedSearch = useDebounce(searchTerm, 300);

  // ✅ الحصول على التصنيفات الفريدة
  const categories = useMemo(() => {
    const cats = new Set(items.map((item) => item.category));
    return Array.from(cats);
  }, [items]);

  // ✅ فلترة الأصناف
  const filteredItems = useMemo(() => {
    let filtered = [...items];
    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.category === categoryFilter);
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
  const openEditModal = useCallback((item: InventoryStoreItem) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      category: item.category,
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
    (item: InventoryStoreItem, type: "in" | "out") => {
      setSelectedItem(item);
      setTransactionType(type);
      setTransactionQuantity(0);
      setShowTransactionModal(true);
    },
    []
  );

  // ✅ حفظ الحركة (وارد/منصرف)
  const handleTransactionSubmit = useCallback(() => {
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

    // ✅ تحديث في الـ Store
    const updated = updateInventoryItem(selectedItem.id, {
      quantity: newQuantity,
      total: newTotal,
      incoming: newIncoming,
      outgoing: newOutgoing,
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
    });

    if (updated) {
      setItems(
        items.map((item) => (item.id === selectedItem.id ? updated : item))
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
    (e: React.FormEvent) => {
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
        const updated = updateInventoryItem(editingItem.id, {
          code,
          name,
          category,
          quantity,
          unit,
          price,
          location,
          minQuantity,
          previousBalance,
          total: previousBalance + editingItem.incoming - editingItem.outgoing,
        });

        if (updated) {
          setItems(
            items.map((item) => (item.id === editingItem.id ? updated : item))
          );
          showToast(
            isArabic ? "تم تعديل الصنف بنجاح" : "Item updated successfully",
            "success"
          );
        }
      } else {
        // ✅ إضافة جديدة
        const newItem = addInventoryItem({
          code,
          name,
          category,
          quantity: previousBalance,
          unit,
          price,
          location,
          minQuantity,
          previousBalance,
          incoming: 0,
          outgoing: 0,
          total: previousBalance,
        });

        setItems([newItem, ...items]);
        showToast(
          isArabic ? "تم إضافة الصنف بنجاح" : "Item added successfully",
          "success"
        );
      }
      setShowAddModal(false);
      setEditingItem(null);
    },
    [items, editingItem, formData, showToast, isArabic, checkDuplicate]
  );

  // ✅ حذف صنف
  const handleDelete = useCallback(
    (id: string) => {
      if (
        confirm(
          isArabic
            ? "هل أنت متأكد من حذف هذا الصنف؟"
            : "Are you sure you want to delete this item?"
        )
      ) {
        if (deleteInventoryItem(id)) {
          setItems(items.filter((item) => item.id !== id));
          showToast(
            isArabic ? "تم حذف الصنف بنجاح" : "Item deleted successfully",
            "success"
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
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {ToastComponent}

      {/* Stats Cards - 5 بطاقات */}
      <div
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
        suppressHydrationWarning
      >
        <Card
          className="p-4 border-r-4 border-blue-500"
          suppressHydrationWarning
        >
          <p className="text-gray-500 text-sm">
            {isArabic ? "إجمالي الأصناف" : "Total Items"}
          </p>
          <p className="text-2xl font-bold text-blue-500">{stats.totalItems}</p>
        </Card>
        <Card
          className="p-4 border-r-4 border-green-500"
          suppressHydrationWarning
        >
          <p className="text-gray-500 text-sm">
            {isArabic ? "إجمالي الوارد" : "Total Incoming"}
          </p>
          <p className="text-2xl font-bold text-green-600">
            {stats.totalIncoming.toLocaleString()}
          </p>
        </Card>
        <Card
          className="p-4 border-r-4 border-orange-500"
          suppressHydrationWarning
        >
          <p className="text-gray-500 text-sm">
            {isArabic ? "إجمالي المنصرف" : "Total Outgoing"}
          </p>
          <p className="text-2xl font-bold text-orange-500">
            {stats.totalOutgoing.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4 border-r-4 border-gold" suppressHydrationWarning>
          <p className="text-gray-500 text-sm">
            {isArabic ? "إجمالي الكميات" : "Total Quantity"}
          </p>
          <p className="text-2xl font-bold text-gold">
            {stats.totalQuantity.toLocaleString()}
          </p>
        </Card>
        <Card
          className="p-4 border-r-4 border-red-500"
          suppressHydrationWarning
        >
          <p className="text-gray-500 text-sm">
            {isArabic ? "أصناف منخفضة" : "Low Stock"}
          </p>
          <p className="text-2xl font-bold text-red-500">
            {stats.lowStockItems}
          </p>
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
          {isArabic ? "إضافة صنف" : "Add Item"}
        </button>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition text-sm font-medium"
          suppressHydrationWarning
        >
          <Download size={18} />
          {isArabic ? "تصدير Excel" : "Export Excel"}
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-medium"
          suppressHydrationWarning
        >
          <Printer size={18} />
          {isArabic ? "طباعة PDF" : "Print PDF"}
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
            placeholder={
              isArabic ? "بحث بالاسم أو الكود..." : "Search by name or code..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 pl-4 py-2 border border-gray-200 rounded-lg w-full text-sm focus:outline-none focus:border-gold"
            suppressHydrationWarning
          />
        </div>
        <div className="relative min-w-[150px]">
          <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="pr-10 pl-4 py-2 border border-gray-200 rounded-lg appearance-none text-sm focus:outline-none focus:border-gold w-full"
            suppressHydrationWarning
          >
            <option value="all">
              {isArabic ? "كل التصنيفات" : "All Categories"}
            </option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ✅ Table - الشكل الجديد (دفتر العهدة) */}
      <div
        className="bg-white rounded-lg shadow-sm overflow-hidden"
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
                  <td colSpan={12} className="p-8 text-center text-gray-500">
                    <Package size={48} className="mx-auto text-gray-300 mb-3" />
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
                      <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {item.previousBalance.toLocaleString()}
                    </td>
                    <td className="p-3 text-center text-green-600 font-bold">
                      {item.incoming.toLocaleString()}
                    </td>
                    <td className="p-3 text-center text-orange-500 font-bold">
                      {item.outgoing.toLocaleString()}
                    </td>
                    <td
                      className={`p-3 text-center font-bold ${
                        item.quantity < item.minQuantity
                          ? "text-red-500"
                          : "text-gray-800"
                      }`}
                    >
                      {item.quantity.toLocaleString()}
                      {item.quantity < item.minQuantity && (
                        <span className="block text-xs text-red-500">
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
                        <button
                          onClick={() => openTransactionModal(item, "in")}
                          className="text-green-500 hover:text-green-700 transition p-1"
                          title={isArabic ? "وارد" : "Incoming"}
                          suppressHydrationWarning
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          onClick={() => openTransactionModal(item, "out")}
                          className="text-orange-500 hover:text-orange-700 transition p-1"
                          title={isArabic ? "منصرف" : "Outgoing"}
                          suppressHydrationWarning
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-blue-500 hover:text-blue-700 transition p-1"
                          title={isArabic ? "تعديل" : "Edit"}
                          suppressHydrationWarning
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-500 hover:text-red-700 transition p-1"
                          title={isArabic ? "حذف" : "Delete"}
                          suppressHydrationWarning
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
            className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            suppressHydrationWarning
          >
            <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white">
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
                className="text-gray-400 hover:text-gray-600 text-xl"
                suppressHydrationWarning
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? "الكود" : "Code"}
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => updateForm("code", e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    required
                    suppressHydrationWarning
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? "الاسم" : "Name"}
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
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "التصنيف" : "Category"}
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => updateForm("category", e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                  required
                  suppressHydrationWarning
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? "السابق" : "Previous"}
                  </label>
                  <input
                    type="number"
                    value={formData.previousBalance || ""}
                    onChange={(e) =>
                      updateForm("previousBalance", Number(e.target.value))
                    }
                    min="0"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    required
                    suppressHydrationWarning
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? "الوحدة" : "Unit"}
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
                    {isArabic ? "السعر" : "Price"}
                  </label>
                  <input
                    type="number"
                    value={formData.price || ""}
                    onChange={(e) =>
                      updateForm("price", Number(e.target.value))
                    }
                    min="0"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    required
                    suppressHydrationWarning
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? "الموقع" : "Location"}
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => updateForm("location", e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
                    required
                    suppressHydrationWarning
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? "الحد الأدنى" : "Min Qty"}
                  </label>
                  <input
                    type="number"
                    value={formData.minQuantity || ""}
                    onChange={(e) =>
                      updateForm("minQuantity", Number(e.target.value))
                    }
                    min="0"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
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

      {/* Transaction Modal (وارد/منصرف) */}
      {showTransactionModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
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
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-gray-600">
                  {isArabic ? "الصنف:" : "Item:"}{" "}
                  <span className="font-bold text-primary">
                    {selectedItem.name}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  {isArabic ? "الرصيد الحالي:" : "Current Balance:"}{" "}
                  <span className="font-bold">
                    {selectedItem.quantity.toLocaleString()}
                  </span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "الكمية" : "Quantity"}
                </label>
                <input
                  type="number"
                  value={transactionQuantity || ""}
                  onChange={(e) =>
                    setTransactionQuantity(Number(e.target.value))
                  }
                  min="1"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold"
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={handleTransactionSubmit}
                  className={`flex-1 px-4 py-2 rounded-xl text-white transition ${
                    transactionType === "in"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-orange-500 hover:bg-orange-600"
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
