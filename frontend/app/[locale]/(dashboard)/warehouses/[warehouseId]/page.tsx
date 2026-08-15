"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { ArrowRight, Package, MapPin, Hash, Warehouse as WarehouseIcon, ArrowRightLeft, AlertTriangle, Boxes } from "lucide-react";
import { warehouseService, type Warehouse } from "@/services/warehouse.service";
import { inventoryItemService, type InventoryItem } from "@/services/inventory-item.service";
import { stockMovementService, type StockMovement } from "@/services/stock-movement.service";
import { useToast } from "@/components/ui/Toast";

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? "ar";
  const warehouseId = params.warehouseId as string;
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!warehouseId) return;
    Promise.all([
      warehouseService.get(warehouseId).catch(() => null),
      inventoryItemService.list(undefined, warehouseId).catch(() => []),
      stockMovementService.list().catch(() => []),
    ])
      .then(([wh, its, movs]) => {
        if (!wh) {
          showToast(isArabic ? "المخزن غير موجود" : "Warehouse not found", "error");
          router.replace(`/${locale}/warehouses`);
          return;
        }
        setWarehouse(wh);
        setItems(its);
        const itemIds = new Set(its.map((i) => i.id));
        setMovements(movs.filter((m) => itemIds.has(m.itemId)));
      })
      .finally(() => setLoading(false));
  }, [warehouseId, locale, isArabic, router, showToast]);

  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
  const lowStockCount = items.filter((i) => i.quantity < i.minQuantity).length;

  const itemName = (itemId: string) => items.find((i) => i.id === itemId)?.name ?? itemId;

  const typeLabel = (type: string) => {
    switch (type) {
      case "RECEIVE": return isArabic ? "استلام" : "Receive";
      case "ISSUE": return isArabic ? "صرف" : "Issue";
      case "TRANSFER": return isArabic ? "تحويل" : "Transfer";
      default: return type;
    }
  };

  const recentMovements = useMemo(
    () => [...movements].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [movements],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-light flex items-center justify-center">
        <p className="text-text-muted">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
      </div>
    );
  }

  if (!warehouse) return null;

  return (
    <div className="min-h-screen bg-gray-light">
      {ToastComponent}
      <div className="bg-surface border-b px-6 py-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/${locale}/warehouses`)}
              className="flex items-center gap-1 text-text-muted hover:text-primary transition"
            >
              <ArrowRight size={18} />
              {isArabic ? "المخازن" : "Warehouses"}
            </button>
            <h1 className="text-2xl font-bold text-primary">{warehouse.name}</h1>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full ${warehouse.status === "active" ? "bg-success-light text-success-dark" : "bg-surface-tertiary text-text-secondary"}`}>
            {warehouse.status === "active" ? (isArabic ? "نشط" : "Active") : (isArabic ? "غير نشط" : "Inactive")}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Hash className="w-4 h-4 text-gold" />
            {isArabic ? "الكود" : "Code"}: <span className="font-medium text-text-primary">{warehouse.code}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <MapPin className="w-4 h-4 text-gold" />
            {warehouse.location || (isArabic ? "لا يوجد موقع" : "No location")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Boxes className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">{isArabic ? "عدد الأصناف" : "Items"}</p>
            <p className="text-2xl font-bold text-primary">{items.length}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
            <Package className="w-6 h-6 text-teal-700" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">{isArabic ? "إجمالي الكميات" : "Total Quantity"}</p>
            <p className="text-2xl font-bold text-teal-700">{totalQuantity}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${lowStockCount > 0 ? "bg-danger-light" : "bg-emerald-50"}`}>
            <AlertTriangle className={`w-6 h-6 ${lowStockCount > 0 ? "text-danger" : "text-emerald-700"}`} />
          </div>
          <div>
            <p className="text-sm text-text-secondary">{isArabic ? "أصناف منخفضة المخزون" : "Low Stock Items"}</p>
            <p className={`text-2xl font-bold ${lowStockCount > 0 ? "text-danger" : "text-emerald-700"}`}>{lowStockCount}</p>
          </div>
        </Card>
      </div>

      <div className="px-6 pb-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-primary">{isArabic ? "أصناف المخزن" : "Warehouse Items"}</h2>
            <Link href={`/${locale}/inventory?warehouse=${warehouse.id}`} className="text-sm text-gold hover:underline">
              {isArabic ? "عرض الكل" : "View all"}
            </Link>
          </div>
          {items.length === 0 ? (
            <Card className="p-8 text-center">
              <Package size={48} className="mx-auto text-text-muted mb-3 opacity-50" />
              <p className="text-text-secondary">{isArabic ? "لا توجد أصناف في هذا المخزن" : "No items in this warehouse"}</p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-secondary">
                    <tr>
                      <th className="p-3 text-right">{isArabic ? "الكود" : "Code"}</th>
                      <th className="p-3 text-right">{isArabic ? "الاسم" : "Name"}</th>
                      <th className="p-3 text-center">{isArabic ? "الوحدة" : "Unit"}</th>
                      <th className="p-3 text-center">{isArabic ? "الكمية" : "Qty"}</th>
                      <th className="p-3 text-center">{isArabic ? "الحالة" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const low = item.quantity < item.minQuantity;
                      return (
                        <tr key={item.id} className="border-t border-border-light hover:bg-surface-secondary transition">
                          <td className="p-3 text-gold font-medium">{item.code}</td>
                          <td className="p-3 font-medium text-text-primary">
                            {item.name}
                            {low && (
                              <span className="mr-2 inline-flex items-center gap-1 text-xs text-danger bg-danger-light px-1.5 py-0.5 rounded">
                                <AlertTriangle size={11} />
                                {isArabic ? "منخفض" : "Low"}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center text-text-secondary">{item.unit || "—"}</td>
                          <td className={`p-3 text-center font-bold ${low ? "text-danger" : "text-text-primary"}`}>{item.quantity}</td>
                          <td className="p-3 text-center">
                            <span className={`text-xs px-2 py-1 rounded-full ${item.status === "active" ? "bg-success-light text-success-dark" : "bg-surface-tertiary text-text-secondary"}`}>
                              {item.status === "active" ? (isArabic ? "نشط" : "Active") : (isArabic ? "غير نشط" : "Inactive")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-primary">{isArabic ? "آخر الحركات" : "Recent Movements"}</h2>
            <Link href={`/${locale}/stock-movements`} className="text-sm text-gold hover:underline">
              {isArabic ? "عرض الكل" : "View all"}
            </Link>
          </div>
          {recentMovements.length === 0 ? (
            <Card className="p-8 text-center">
              <WarehouseIcon size={48} className="mx-auto text-text-muted mb-3 opacity-50" />
              <p className="text-text-secondary">{isArabic ? "لا توجد حركات" : "No movements"}</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentMovements.map((m) => (
                <Card key={m.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ArrowRightLeft size={16} className={m.type === "RECEIVE" ? "text-success-dark" : m.type === "ISSUE" ? "text-danger" : "text-info"} />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{itemName(m.itemId)}</p>
                      <p className="text-xs text-text-muted">{typeLabel(m.type)} — {new Date(m.date).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${m.type === "RECEIVE" ? "text-success-dark" : m.type === "ISSUE" ? "text-danger" : "text-text-primary"}`}>
                      {m.type === "RECEIVE" ? "+" : m.type === "ISSUE" ? "−" : ""}{m.quantity}
                    </p>
                    {m.reason && <p className="text-xs text-text-muted">{m.reason}</p>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
