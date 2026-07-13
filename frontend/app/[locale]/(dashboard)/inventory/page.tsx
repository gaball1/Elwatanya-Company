/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useCallback } from "react";
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
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  sanitizeInput,
  isDuplicateName,
  isDuplicateCode,
} from "@/lib/security";
import React from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "@/components/ui/Pagination";

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  location: string;
  minQuantity: number;
}

// ✅ بيانات وهمية
const MOCK_ITEMS: InventoryItem[] = [
  {
    id: "1",
    code: "A104",
    name: "حديد",
    category: "حديد",
    quantity: 2054,
    unit: "كجم",
    price: 45,
    location: "مخزن 1",
    minQuantity: 500,
  },
  {
    id: "2",
    code: "B201",
    name: "سيراميك",
    category: "سيراميك",
    quantity: 46,
    unit: "م²",
    price: 120,
    location: "مخزن 2",
    minQuantity: 100,
  },
  {
    id: "3",
    code: "C301",
    name: "أسمنت",
    category: "أسمنت",
    quantity: 850,
    unit: "شيكارة",
    price: 180,
    location: "مخزن 1",
    minQuantity: 200,
  },
  {
    id: "4",
    code: "D401",
    name: "دهانات",
    category: "دهانات",
    quantity: 32,
    unit: "جالون",
    price: 350,
    location: "مخزن 3",
    minQuantity: 50,
  },
];

export default function ProjectInventoryPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  // ✅ State
  const [items, setItems] = useState<InventoryItem[]>(MOCK_ITEMS);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "",
    quantity: 0,
    unit: "",
    price: 0,
    location: "",
    minQuantity: 0,
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
    return { totalItems, totalQuantity, lowStockItems };
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
    });
    setShowAddModal(true);
  }, []);

  // ✅ فتح مودال التعديل
  const openEditModal = useCallback((item: InventoryItem) => {
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
    });
    setShowAddModal(true);
  }, []);

  // ✅ حفظ الصنف (إضافة أو تعديل)
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
      } = formData;

      // ✅ التحقق من عدم تكرار الاسم (مع استثناء العنصر الحالي في حالة التعديل)
      const nameExists = items.some(
        (item) =>
          item.name.toLowerCase() === name.toLowerCase() &&
          item.id !== (editingItem?.id || "")
      );

      if (nameExists) {
        showToast(
          isArabic ? "هذا الاسم موجود بالفعل" : "This name already exists",
          "error"
        );
        return;
      }

      // ✅ التحقق من عدم تكرار الكود (مع استثناء العنصر الحالي في حالة التعديل)
      const codeExists = items.some(
        (item) =>
          item.code.toLowerCase() === code.toLowerCase() &&
          item.id !== (editingItem?.id || "")
      );

      if (codeExists) {
        showToast(
          isArabic ? "هذا الكود موجود بالفعل" : "This code already exists",
          "error"
        );
        return;
      }

      if (editingItem) {
        // ✅ تعديل - تحديث العنصر الموجود
        const updatedItems = items.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                code,
                name,
                category,
                quantity,
                unit,
                price,
                location,
                minQuantity,
              }
            : item
        );
        setItems(updatedItems);
        showToast(
          isArabic ? "تم تعديل الصنف بنجاح" : "Item updated successfully",
          "success"
        );
      } else {
        // ✅ إضافة جديدة
        const newItem: InventoryItem = {
          id: Date.now().toString(),
          code,
          name,
          category,
          quantity,
          unit,
          price,
          location,
          minQuantity,
        };
        setItems([newItem, ...items]);
        showToast(
          isArabic ? "تم إضافة الصنف بنجاح" : "Item added successfully",
          "success"
        );
      }
      setShowAddModal(false);
      setEditingItem(null);
    },
    [items, editingItem, formData, showToast, isArabic]
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
        setItems(items.filter((item) => item.id !== id));
        showToast(
          isArabic ? "تم حذف الصنف بنجاح" : "Item deleted successfully",
          "success"
        );
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

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {ToastComponent}

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4 border-r-4 border-blue-500">
          <p className="text-gray-500 text-sm">
            {isArabic ? "إجمالي الأصناف" : "Total Items"}
          </p>
          <p className="text-2xl font-bold text-blue-500">{stats.totalItems}</p>
        </Card>
        <Card className="p-4 border-r-4 border-gold">
          <p className="text-gray-500 text-sm">
            {isArabic ? "إجمالي الكميات" : "Total Quantity"}
          </p>
          <p className="text-2xl font-bold text-gold">
            {stats.totalQuantity.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4 border-r-4 border-red-500">
          <p className="text-gray-500 text-sm">
            {isArabic ? "أصناف منخفضة" : "Low Stock"}
          </p>
          <p className="text-2xl font-bold text-red-500">
            {stats.lowStockItems}
          </p>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Plus size={18} />
          {isArabic ? "إضافة صنف" : "Add Item"}
        </button>
        <button
          onClick={() => {
            // تصدير Excel بسيط
            const headers = [
              "الكود",
              "الاسم",
              "التصنيف",
              "الكمية",
              "الوحدة",
              "الموقع",
            ];
            const rows = filteredItems.map((item) => [
              item.code,
              item.name,
              item.category,
              item.quantity,
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
            showToast(
              isArabic ? "تم تصدير البيانات" : "Data exported",
              "success"
            );
          }}
          className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition text-sm font-medium"
        >
          <Download size={18} />
          {isArabic ? "تصدير Excel" : "Export Excel"}
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Printer size={18} />
          {isArabic ? "طباعة PDF" : "Print PDF"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-lg shadow-sm">
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

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
                  {isArabic ? "الكمية" : "Qty"}
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
                  <td colSpan={8} className="p-8 text-center text-gray-500">
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
                    <td
                      className={`p-3 text-center font-bold ${
                        item.quantity < item.minQuantity
                          ? "text-red-500"
                          : "text-gray-800"
                      }`}
                    >
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">{item.unit}</td>
                    <td className="p-3 text-center">{item.location}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
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
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                    {isArabic ? "الكمية" : "Qty"}
                  </label>
                  <input
                    type="number"
                    value={formData.quantity || ""}
                    onChange={(e) =>
                      updateForm("quantity", Number(e.target.value))
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
    </div>
  );
}
