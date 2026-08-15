/* eslint-disable */
"use client";

import { useToast } from "@/components/ui/Toast";
import { useParams } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui";
import { Can } from '@/components/Can';
import {
  ArrowUpDown,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Filter,
  Download,
  Printer,
  Package,
  ArrowRightLeft,
} from "lucide-react";
import { stockMovementService, type StockMovement, type CreateStockMovementData } from "@/services/stock-movement.service";
import { inventoryItemService, type InventoryItem } from "@/services/inventory-item.service";
import { printAsPDF } from "@/lib/printUtils";

export default function StockMovementsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "type">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [form, setForm] = useState({
    itemId: "",
    type: "ISSUE",
    quantity: "0",
    date: new Date().toISOString().split("T")[0],
    reference: "",
    notes: "",
    reason: "",
    issuedTo: "",
    supplier: "",
    fromWarehouse: "",
    toWarehouse: "",
  });

  const typeOptions = [
    { value: "all", label: isArabic ? "الكل" : "All" },
    { value: "ISSUE", label: isArabic ? "صرف" : "Issue" },
    { value: "RECEIVE", label: isArabic ? "استلام" : "Receive" },
    { value: "TRANSFER", label: isArabic ? "تحويل" : "Transfer" },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [movementsData, itemsData] = await Promise.all([
        stockMovementService.list(),
        inventoryItemService.list(),
      ]);
      setMovements(movementsData);
      setItems(itemsData);
    } catch {
      showToast(isArabic ? "خطأ في تحميل البيانات" : "Error loading data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getItemName = (itemId: string) => items.find((i) => i.id === itemId)?.name || itemId;

  const filteredAndSorted = useMemo(() => {
    let filtered = [...movements];
    if (typeFilter !== "all") filtered = filtered.filter((m) => m.type === typeFilter);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((m) => getItemName(m.itemId).toLowerCase().includes(term) || m.reference.toLowerCase().includes(term));
    }
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "date") comparison = a.date.localeCompare(b.date);
      else if (sortBy === "type") comparison = a.type.localeCompare(b.type);
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return filtered;
  }, [movements, searchTerm, typeFilter, sortBy, sortOrder]);

  const openAddModal = () => {
    setEditingMovement(null);
    setForm({ itemId: "", type: "ISSUE", quantity: "0", date: new Date().toISOString().split("T")[0], reference: "", notes: "", reason: "", issuedTo: "", supplier: "", fromWarehouse: "", toWarehouse: "" });
    setShowModal(true);
  };

  const openEditModal = (movement: StockMovement) => {
    setEditingMovement(movement);
    setForm({
      itemId: movement.itemId,
      type: movement.type,
      quantity: movement.quantity.toString(),
      date: movement.date.split("T")[0],
      reference: movement.reference,
      notes: movement.notes,
      reason: movement.reason,
      issuedTo: movement.issuedTo,
      supplier: movement.supplier,
      fromWarehouse: movement.fromWarehouse,
      toWarehouse: movement.toWarehouse,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.itemId || !form.quantity) { showToast(isArabic ? "يرجى ملء الحقول المطلوبة" : "Please fill required fields", "error"); return; }
    try {
      const payload: CreateStockMovementData = {
        itemId: form.itemId,
        type: form.type,
        quantity: parseFloat(form.quantity) || 0,
        date: form.date,
        reference: form.reference,
        notes: form.notes,
        reason: form.reason,
        issuedTo: form.issuedTo,
        supplier: form.supplier,
        fromWarehouse: form.fromWarehouse,
        toWarehouse: form.toWarehouse,
      };
      if (editingMovement) {
        await stockMovementService.update(editingMovement.id, payload);
        showToast(isArabic ? "تم تحديث الحركة" : "Movement updated", "success");
      } else {
        await stockMovementService.create(payload);
        showToast(isArabic ? "تم إضافة الحركة" : "Movement added", "success");
      }
      setShowModal(false);
      setEditingMovement(null);
      await fetchData();
    } catch (error: any) {
      showToast(error?.message || (isArabic ? "خطأ في حفظ البيانات" : "Error saving data"), "error");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await stockMovementService.remove(deletingId);
      showToast(isArabic ? "تم حذف الحركة" : "Movement deleted", "success");
      setShowDeleteConfirm(false);
      setDeletingId(null);
      await fetchData();
    } catch (error: any) {
      showToast(error?.message || (isArabic ? "خطأ في الحذف" : "Error deleting"), "error");
    }
  };

  const exportToCsv = () => {
    const headers = [isArabic ? "الصنف" : "Item", isArabic ? "النوع" : "Type", isArabic ? "الكمية" : "Quantity", isArabic ? "التاريخ" : "Date", isArabic ? "المرجع" : "Reference", isArabic ? "السبب" : "Reason", isArabic ? "ملاحظات" : "Notes"];
    const rows = filteredAndSorted.map((m) => [getItemName(m.itemId), m.type, m.quantity, m.date, m.reference, m.reason, m.notes]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `stock-movements_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم التصدير" : "Exported", "success");
  };

  const handlePrintPDF = () => {
    const headers = [isArabic ? "الصنف" : "Item", isArabic ? "النوع" : "Type", isArabic ? "الكمية" : "Qty", isArabic ? "التاريخ" : "Date", isArabic ? "المرجع" : "Ref", isArabic ? "السبب" : "Reason", isArabic ? "ملاحظات" : "Notes"];
    const rows = filteredAndSorted.map((m) => [getItemName(m.itemId), m.type, m.quantity.toString(), m.date, m.reference, m.reason, m.notes]);
    printAsPDF(rows, headers, isArabic ? "حركات المخزون" : "Stock Movements Report", isArabic);
  };

  const typeBadgeClass = (type: string) => {
    switch (type) {
      case "RECEIVE": return "bg-success/10 text-success";
      case "ISSUE": return "bg-danger/10 text-danger";
      case "TRANSFER": return "bg-info/10 text-info";
      default: return "bg-surface-tertiary text-text-primary";
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {ToastComponent}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{isArabic ? "حركات المخزون" : "Stock Movements"}</h1>
          <p className="text-sm text-text-muted mt-1">{isArabic ? "إدارة حركات الصرف والاستلام والتحويل" : "Manage issue, receive, and transfer movements"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrintPDF} className="flex items-center gap-2 px-4 py-2 border border-info text-info rounded-lg hover:bg-info hover:text-white transition"><Printer size={18} /> PDF</button>
          <button onClick={exportToCsv} className="flex items-center gap-2 px-4 py-2 border border-success text-success rounded-lg hover:bg-success hover:text-white transition"><Download size={18} /> CSV</button>
          <Can permission="stock-movements.create">
            <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"><Plus size={18} /> {isArabic ? "حركة جديدة" : "New Movement"}</button>
          </Can>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" placeholder={isArabic ? "بحث..." : "Search..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pr-9 pl-4 py-2 border border-border rounded-lg focus:outline-none focus:border-gold bg-surface text-text-primary" />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="pr-9 pl-4 py-2 border border-border rounded-lg appearance-none bg-surface text-text-primary">
              {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-20 text-text-muted">{isArabic ? "جاري التحميل..." : "Loading..."}</div>
      ) : filteredAndSorted.length === 0 ? (
        <Card className="p-12 text-center">
          <ArrowRightLeft size={48} className="mx-auto text-text-muted mb-4 opacity-50" />
          <p className="text-text-secondary">{isArabic ? "لا توجد حركات مطابقة" : "No matching movements"}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAndSorted.map((movement) => (
            <Card key={movement.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${typeBadgeClass(movement.type)}`}>
                    <ArrowRightLeft size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{getItemName(movement.itemId)}</p>
                    <p className="text-xs text-text-muted">{movement.reference || movement.type} — {new Date(movement.date).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}</p>
                    {movement.reason && <p className="text-xs text-text-secondary mt-0.5">{movement.reason}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-text-primary">{movement.quantity}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadgeClass(movement.type)}`}>
                      {typeOptions.find((o) => o.value === movement.type)?.label || movement.type}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Can permission="stock-movements.update">
                      <button onClick={() => openEditModal(movement)} className="p-1 text-text-muted hover:text-text-primary"><Edit2 size={14} /></button>
                    </Can>
                    <Can permission="stock-movements.delete">
                      <button onClick={() => { setDeletingId(movement.id); setShowDeleteConfirm(true); }} className="p-1 text-text-muted hover:text-danger"><Trash2 size={14} /></button>
                    </Can>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold">{editingMovement ? (isArabic ? "تعديل الحركة" : "Edit Movement") : (isArabic ? "حركة جديدة" : "New Movement")}</h2>
              <button onClick={() => setShowModal(false)}><X size={24} className="text-text-muted" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <select value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })} className="w-full p-3 border rounded-xl" required>
                <option value="">{isArabic ? "اختر الصنف" : "Select Item"}</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
              </select>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full p-3 border rounded-xl">
                <option value="ISSUE">{isArabic ? "صرف" : "Issue"}</option>
                <option value="RECEIVE">{isArabic ? "استلام" : "Receive"}</option>
                <option value="TRANSFER">{isArabic ? "تحويل" : "Transfer"}</option>
              </select>
              <input type="number" step="0.01" placeholder={isArabic ? "الكمية" : "Quantity"} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full p-3 border rounded-xl" required />
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full p-3 border rounded-xl" />
              <input type="text" placeholder={isArabic ? "المرجع" : "Reference"} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="w-full p-3 border rounded-xl" />
              <input type="text" placeholder={isArabic ? "السبب (وصف العملية)" : "Reason"} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full p-3 border rounded-xl" />
              <textarea placeholder={isArabic ? "ملاحظات" : "Notes"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full p-3 border rounded-xl resize-none" rows={2} />
              {form.type === "ISSUE" && <input type="text" placeholder={isArabic ? "صرف إلى" : "Issued To"} value={form.issuedTo} onChange={(e) => setForm({ ...form, issuedTo: e.target.value })} className="w-full p-3 border rounded-xl" />}
              {form.type === "TRANSFER" && (
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder={isArabic ? "من مستودع" : "From Warehouse"} value={form.fromWarehouse} onChange={(e) => setForm({ ...form, fromWarehouse: e.target.value })} className="w-full p-3 border rounded-xl" />
                  <input type="text" placeholder={isArabic ? "إلى مستودع" : "To Warehouse"} value={form.toWarehouse} onChange={(e) => setForm({ ...form, toWarehouse: e.target.value })} className="w-full p-3 border rounded-xl" />
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-xl">{editingMovement ? (isArabic ? "تحديث" : "Update") : (isArabic ? "حفظ" : "Save")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="p-5 border-b"><h2 className="text-xl font-bold text-danger">{isArabic ? "تأكيد الحذف" : "Confirm Delete"}</h2></div>
            <div className="p-5">
              <p className="text-text-secondary">{isArabic ? "هل أنت متأكد من حذف هذه الحركة؟" : "Are you sure you want to delete this movement?"}</p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-danger text-white rounded-xl">{isArabic ? "حذف" : "Delete"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
