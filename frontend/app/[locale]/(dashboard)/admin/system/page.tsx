/* eslint-disable */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { Can } from "@/components/Can";
import DataLoader from "@/components/shared/DataLoader";
import { recycleBinService, type RecycleBinItem, type EntityStats } from "@/services/recycleBin.service";
import {
  Database, Trash2, RotateCcw, AlertTriangle, RefreshCw,
  HardDrive, Shield, Server,
} from "lucide-react";

const ENTITY_LABELS: Record<string, { ar: string; en: string }> = {
  project: { ar: "المشاريع", en: "Projects" },
  building: { ar: "المباني", en: "Buildings" },
  client: { ar: "العملاء", en: "Clients" },
  supplier: { ar: "الموردين", en: "Suppliers" },
  employee: { ar: "الموظفين", en: "Employees" },
  department: { ar: "الأقسام", en: "Departments" },
  "employee-role": { ar: "أدوار الموظفين", en: "Employee Roles" },
  attendance: { ar: "الحضور والانصراف", en: "Attendance" },
  leave: { ar: "الإجازات", en: "Leaves" },
  holiday: { ar: "العطل الرسمية", en: "Holidays" },
  warehouse: { ar: "المستودعات", en: "Warehouses" },
  category: { ar: "التصنيفات", en: "Categories" },
  "inventory-item": { ar: "أصناف المخزون", en: "Inventory Items" },
  "stock-movement": { ar: "حركات المخزون", en: "Stock Movements" },
  "project-fund": { ar: "صناديق المشاريع", en: "Project Funds" },
  "fund-transaction": { ar: "المعاملات المالية", en: "Fund Transactions" },
  miscellaneous: { ar: "المصروفات المتنوعة", en: "Miscellaneous" },
  notification: { ar: "الإشعارات", en: "Notifications" },
  "project-board": { ar: "لوحات المشروع", en: "Project Boards" },
  "client-statement": { ar: "بيانات حساب العملاء", en: "Client Statements" },
  "subcontractor-statement": { ar: "بيانات حساب المقاولين", en: "Subcontractor Statements" },
  finalboq: { ar: "المقايسة النهائية", en: "Final BOQ" },
  contractorboq: { ar: "مقايسة المقاول", en: "Contractor BOQ" },
};

export default function AdminSystemPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, EntityStats>>({});
  const [deletedItems, setDeletedItems] = useState<RecycleBinItem[]>([]);
  const [activeTab, setActiveTab] = useState<"stats" | "recycle">("stats");
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [statsData, binData] = await Promise.all([
        recycleBinService.getStats(),
        recycleBinService.listDeleted(),
      ]);
      setStats(statsData);
      setDeletedItems(binData.items);
    } catch (err) {
      showToast(err instanceof Error ? err.message : (isArabic ? "خطأ" : "Error"), "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRestore = async (entity: string, id: string, name: string) => {
    if (!window.confirm(isArabic ? `استعادة "${name}"؟` : `Restore "${name}"?`)) return;
    try {
      await recycleBinService.restore(entity, id);
      showToast(isArabic ? "تمت الاستعادة" : "Restored", "success");
      loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : (isArabic ? "خطأ" : "Error"), "error");
    }
  };

  const handlePermanentDelete = async (entity: string, id: string, name: string) => {
    if (!window.confirm(isArabic ? `حذف نهائي لـ "${name}"؟ لا يمكن التراجع!` : `Permanently delete "${name}"? This cannot be undone!`)) return;
    try {
      await recycleBinService.permanentDelete(entity, id);
      showToast(isArabic ? "تم الحذف نهائيًا" : "Permanently deleted", "success");
      loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : (isArabic ? "خطأ" : "Error"), "error");
    }
  };

  if (loading) return <DataLoader />;

  const totalRecords = Object.values(stats).reduce((s, v) => s + v.total, 0);
  const totalDeleted = Object.values(stats).reduce((s, v) => s + v.deleted, 0);
  const entitiesWithData = Object.entries(stats).filter(([, v]) => v.total > 0 || v.deleted > 0);

  return (
    <div className="space-y-6">
      {ToastComponent}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Server size={24} />
            {isArabic ? "إدارة النظام" : "System Management"}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {isArabic ? "إحصائيات قاعدة البيانات وسلة المحذوفات" : "Database statistics and recycle bin"}
          </p>
        </div>
        <button
          onClick={() => { setRefreshing(true); loadData(); }}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-surface-secondary transition text-sm"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          {isArabic ? "تحديث" : "Refresh"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Database size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{totalRecords.toLocaleString()}</p>
              <p className="text-xs text-text-secondary">{isArabic ? "إجمالي السجلات" : "Total Records"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
              <Trash2 size={20} className="text-danger" />
            </div>
            <div>
              <p className="text-2xl font-bold text-danger">{totalDeleted.toLocaleString()}</p>
              <p className="text-xs text-text-secondary">{isArabic ? "سجلات محذوفة" : "Deleted Records"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <HardDrive size={20} className="text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{entitiesWithData.length}</p>
              <p className="text-xs text-text-secondary">{isArabic ? "جداول نشطة" : "Active Tables"}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("stats")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
            activeTab === "stats" ? "bg-primary text-white" : "text-text-secondary hover:bg-surface-secondary"
          }`}
        >
          <Database size={16} className="inline ml-1" />
          {isArabic ? "إحصائيات الجداول" : "Table Stats"}
        </button>
        <button
          onClick={() => setActiveTab("recycle")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
            activeTab === "recycle" ? "bg-primary text-white" : "text-text-secondary hover:bg-surface-secondary"
          }`}
        >
          <Trash2 size={16} className="inline ml-1" />
          {isArabic ? `سلة المحذوفات (${deletedItems.length})` : `Recycle Bin (${deletedItems.length})`}
        </button>
      </div>

      {/* Stats Tab */}
      {activeTab === "stats" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="px-4 py-3 text-start">{isArabic ? "الكيان" : "Entity"}</th>
                  <th className="px-4 py-3 text-center">{isArabic ? "السجلات" : "Records"}</th>
                  <th className="px-4 py-3 text-center">{isArabic ? "محذوف" : "Deleted"}</th>
                  <th className="px-4 py-3 text-center">{isArabic ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {entitiesWithData.map(([key, value]) => (
                  <tr key={key} className="border-b border-border-light hover:bg-surface-secondary/50">
                    <td className="px-4 py-3 font-medium">
                      {isArabic ? ENTITY_LABELS[key]?.ar ?? key : ENTITY_LABELS[key]?.en ?? key}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">{value.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center font-mono">
                      {value.deleted > 0 ? (
                        <span className="text-danger font-semibold">{value.deleted.toLocaleString()}</span>
                      ) : (
                        <span className="text-text-muted">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {value.deleted > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-danger/10 text-danger">
                          <AlertTriangle size={12} />
                          {isArabic ? "يحتوي محذوفات" : "Has deleted"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-success/10 text-success">
                          <Shield size={12} />
                          {isArabic ? "نظيف" : "Clean"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Recycle Bin Tab */}
      {activeTab === "recycle" && (
        <Card>
          {deletedItems.length === 0 ? (
            <div className="p-12 text-center">
              <Trash2 size={48} className="mx-auto text-text-muted mb-3" />
              <p className="text-text-secondary">
                {isArabic ? "سلة المحذوفات فارغة" : "Recycle bin is empty"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="px-4 py-3 text-start">{isArabic ? "الاسم" : "Name"}</th>
                    <th className="px-4 py-3 text-start">{isArabic ? "النوع" : "Type"}</th>
                    <th className="px-4 py-3 text-start">{isArabic ? "تاريخ الحذف" : "Deleted At"}</th>
                    <th className="px-4 py-3 text-center">{isArabic ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedItems.map((item) => (
                    <tr key={`${item.entity}-${item.id}`} className="border-b border-border-light hover:bg-surface-secondary/50">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-surface-secondary text-text-secondary">
                          {isArabic ? ENTITY_LABELS[item.entity]?.ar ?? item.entity : ENTITY_LABELS[item.entity]?.en ?? item.entity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs">
                        {new Date(item.deletedAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Can permission="recycle-bin.restore">
                          <button
                            onClick={() => handleRestore(item.entity, item.id, item.name)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-success hover:bg-success-light rounded-lg mr-1"
                            title={isArabic ? "استعادة" : "Restore"}
                          >
                            <RotateCcw size={14} />
                          </button>
                        </Can>
                        <Can permission="recycle-bin.delete">
                          <button
                            onClick={() => handlePermanentDelete(item.entity, item.id, item.name)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-danger hover:bg-danger-light rounded-lg"
                            title={isArabic ? "حذف نهائي" : "Permanent Delete"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </Can>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
