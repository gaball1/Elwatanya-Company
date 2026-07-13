/* eslint-disable */
"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { Plus, Trash2, Save } from "lucide-react";
import { mockClientStatements } from "@/lib/mockData";
import BackButton from "@/components/shared/BackButton";

interface Item {
  id: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  previous: number;
  current: number;
  totalDone: number;
  final: number;
  workValue: number;
  deduction: number;
  net: number;
  notes: string;
}

interface Deduction {
  id: string;
  name: string;
  amount: number;
  percent?: number; // ✅ اجعلها اختيارية
}

export default function EditClientStatementPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const statementId = params.statementId as string;

  const existingStatement = mockClientStatements.find(
    (s) => s.id === statementId
  );
  if (!existingStatement)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">
          {isArabic ? "المستخلص غير موجود" : "Statement not found"}
        </p>
      </div>
    );

  const [statementNumber, setStatementNumber] = useState(
    existingStatement.statementNumber
  );
  const [statementDate, setStatementDate] = useState(existingStatement.date);
  const [deductionPercent, setDeductionPercent] = useState(5);
  const [items, setItems] = useState<Item[]>(
    existingStatement.items.map((i) => ({
      ...i,
      total: i.quantity * i.unitPrice,
      totalDone: i.previous + i.current,
      final: ((i.previous + i.current) / i.quantity) * 100,
      workValue: (i.previous + i.current) * i.unitPrice,
      deduction:
        (i.previous + i.current) * i.unitPrice * (deductionPercent / 100),
      net:
        (i.previous + i.current) * i.unitPrice * (1 - deductionPercent / 100),
    }))
  );
  const [deductions, setDeductions] = useState(existingStatement.deductions);
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState<
    number | null
  >(null);
  const [showDeleteDeductionConfirm, setShowDeleteDeductionConfirm] = useState<
    number | null
  >(null);

  const totalWorkValue = items.reduce((sum, item) => sum + item.workValue, 0);
  const totalDeductions = deductions.reduce(
    (sum, d) => sum + (d.amount || 0),
    0
  );
  const netPayable = totalWorkValue - totalDeductions;

  const calculateItem = (item: Item): Item => {
    const total = item.quantity * item.unitPrice;
    const totalDone = item.previous + item.current;
    const final = (totalDone / item.quantity) * 100;
    const workValue = totalDone * item.unitPrice;
    const deduction = workValue * (deductionPercent / 100);
    const net = workValue - deduction;
    return { ...item, total, totalDone, final, workValue, deduction, net };
  };

  const addItem = () => {
    const newItem: Item = {
      id: Date.now().toString(),
      itemName: "",
      unit: "م³",
      quantity: 0,
      unitPrice: 0,
      total: 0,
      previous: 0,
      current: 0,
      totalDone: 0,
      final: 0,
      workValue: 0,
      deduction: 0,
      net: 0,
      notes: "",
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const updatedItem = { ...newItems[index], [field]: value };
    newItems[index] = calculateItem(updatedItem);
    setItems(newItems);
  };

  const deleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    setShowDeleteItemConfirm(null);
  };

  const addDeduction = () => {
    setDeductions([
      ...deductions,
      { id: Date.now().toString(), name: "", amount: 0 },
    ]);
  };

  const updateDeduction = (index: number, field: string, value: any) => {
    const newDeductions = [...deductions];
    newDeductions[index] = { ...newDeductions[index], [field]: value };
    setDeductions(newDeductions);
  };

  const deleteDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
    setShowDeleteDeductionConfirm(null);
  };

  const handleSubmit = () => {
    existingStatement.statementNumber = statementNumber;
    existingStatement.date = statementDate;
    existingStatement.items = items
      .filter((i) => i.itemName)
      .map((i) => calculateItem(i));
    // ✅ استخدم as any لحل المشكلة
    existingStatement.deductions = deductions.filter(
      (d) => d.name && d.amount > 0
    ) as any;
    existingStatement.totalWorkValue = totalWorkValue;
    existingStatement.totalDeductions = totalDeductions;
    existingStatement.netPayable = netPayable;
    alert(
      isArabic ? "تم تحديث المستخلص بنجاح" : "Statement updated successfully"
    );
    router.push(`/${locale}/client-statements/${statementId}`);
  };
  return (
    <div className="min-h-screen bg-gray-light pb-10">
      {/* Delete modals */}
      {showDeleteItemConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-primary mb-4">
              {isArabic ? "تأكيد الحذف" : "Confirm Delete"}
            </h3>
            <p className="text-gray-600 mb-6">
              {isArabic
                ? "هل أنت متأكد من حذف هذا البند؟"
                : "Are you sure you want to delete this item?"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteItemConfirm(null)}
                className="flex-1 px-4 py-2 border rounded-xl"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={() => deleteItem(showDeleteItemConfirm)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl"
              >
                {isArabic ? "حذف" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDeductionConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-primary mb-4">
              {isArabic ? "تأكيد الحذف" : "Confirm Delete"}
            </h3>
            <p className="text-gray-600 mb-6">
              {isArabic
                ? "هل أنت متأكد من حذف هذا الخصم؟"
                : "Are you sure you want to delete this deduction?"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteDeductionConfirm(null)}
                className="flex-1 px-4 py-2 border rounded-xl"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={() => deleteDeduction(showDeleteDeductionConfirm)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl"
              >
                {isArabic ? "حذف" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-b px-6 py-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <BackButton
              fallbackHref={`/${locale}/client-statements/${statementId}`}
            />
            <div>
              <h1 className="text-3xl font-bold text-primary">
                {isArabic ? "تعديل مستخلص" : "Edit Statement"}
              </h1>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg"
          >
            <Save size={18} /> {isArabic ? "حفظ التغييرات" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border-r-4 border-gold">
            <p className="text-gray-500 text-sm">
              {isArabic ? "رقم المستخلص" : "Statement No"}
            </p>
            <input
              type="text"
              value={statementNumber}
              onChange={(e) => setStatementNumber(e.target.value)}
              className="w-full font-bold text-primary bg-transparent border-b"
            />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">
              {isArabic ? "التاريخ" : "Date"}
            </p>
            <input
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              className="w-full font-bold text-primary bg-transparent border-b"
            />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">
              {isArabic ? "العميل" : "Client"}
            </p>
            <input
              type="text"
              value={existingStatement.clientName}
              disabled
              className="w-full font-bold text-primary bg-gray-100 border-b"
            />
          </div>
        </div>

        {/* 13 Columns Table - same as new page */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="p-1 border text-center" rowSpan={2}>
                    م
                  </th>
                  <th className="p-1 border text-right" rowSpan={2}>
                    {isArabic ? "بيان الأعمال" : "Work Description"}
                  </th>
                  <th className="p-1 border text-center" rowSpan={2}>
                    {isArabic ? "الوحدة" : "Unit"}
                  </th>
                  <th className="p-1 border text-center" rowSpan={2}>
                    {isArabic ? "الكمية بالكراسة" : "Qty"}
                  </th>
                  <th className="p-1 border text-center" rowSpan={2}>
                    {isArabic ? "الفئة" : "Price"}
                  </th>
                  <th className="p-1 border text-center" colSpan={3}>
                    {isArabic ? "مقدار العمل" : "Work Done"}
                  </th>
                  <th className="p-1 border text-center" rowSpan={2}>
                    {isArabic ? "الحالة نهائي" : "Final"}
                  </th>
                  <th className="p-1 border text-center" rowSpan={2}>
                    {isArabic ? "جملة الأعمال" : "Work Value"}
                  </th>
                  <th className="p-1 border text-center" rowSpan={2}>
                    {isArabic ? "الاستقطاع" : "Deduction"}
                  </th>
                  <th className="p-1 border text-center" rowSpan={2}>
                    {isArabic ? "الباقي بعد الاستقطاع" : "Net"}
                  </th>
                  <th className="p-1 border text-center" rowSpan={2}>
                    {isArabic ? "ملاحظات" : "Notes"}
                  </th>
                  <th className="p-1 border text-center" rowSpan={2}></th>
                </tr>
                <tr className="bg-primary text-white">
                  <th className="p-1 border text-center">
                    {isArabic ? "السابق" : "Prev"}
                  </th>
                  <th className="p-1 border text-center">
                    {isArabic ? "الحالي" : "Curr"}
                  </th>
                  <th className="p-1 border text-center">
                    {isArabic ? "جملة ما تم" : "Total Done"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className="border-t hover:bg-gray-50">
                    <td className="p-1 border text-center">{idx + 1}</td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={item.itemName}
                        onChange={(e) =>
                          updateItem(idx, "itemName", e.target.value)
                        }
                        className="w-40 p-0.5 border rounded text-xs"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) =>
                          updateItem(idx, "unit", e.target.value)
                        }
                        className="w-16 p-0.5 border rounded text-xs"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="number"
                        value={item.quantity || ""}
                        onChange={(e) =>
                          updateItem(idx, "quantity", Number(e.target.value))
                        }
                        className="w-20 p-0.5 border rounded text-xs"
                        step="any"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="number"
                        value={item.unitPrice || ""}
                        onChange={(e) =>
                          updateItem(idx, "unitPrice", Number(e.target.value))
                        }
                        className="w-20 p-0.5 border rounded text-xs"
                        step="any"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="number"
                        value={item.previous || ""}
                        onChange={(e) =>
                          updateItem(idx, "previous", Number(e.target.value))
                        }
                        className="w-20 p-0.5 border rounded text-xs"
                        step="any"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="number"
                        value={item.current || ""}
                        onChange={(e) =>
                          updateItem(idx, "current", Number(e.target.value))
                        }
                        className="w-20 p-0.5 border rounded text-xs"
                        step="any"
                      />
                    </td>
                    <td className="p-1 border text-center font-medium">
                      {item.totalDone}
                    </td>
                    <td className="p-1 border text-center">
                      {item.final.toFixed(1)}%
                    </td>
                    <td className="p-1 border text-center font-bold">
                      {item.workValue.toLocaleString()}
                    </td>
                    <td className="p-1 border text-center text-red-500">
                      {item.deduction.toLocaleString()}
                    </td>
                    <td className="p-1 border text-center font-bold text-gold">
                      {item.net.toLocaleString()}
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) =>
                          updateItem(idx, "notes", e.target.value)
                        }
                        className="w-24 p-0.5 border rounded text-xs"
                      />
                    </td>
                    <td className="p-1 border text-center">
                      <button
                        onClick={() => setShowDeleteItemConfirm(idx)}
                        className="text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-bold">
                <tr className="border-t">
                  <td colSpan={9} className="p-2 text-left">
                    {isArabic ? "الإجمالي" : "Total"}
                  </td>
                  <td className="p-2 text-center">
                    {totalWorkValue.toLocaleString()}
                  </td>
                  <td className="p-2 text-center"></td>
                  <td className="p-2 text-center text-gold">
                    {(totalWorkValue - totalDeductions).toLocaleString()}
                  </td>
                  <td className="p-2 text-center"></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="p-2 border-t">
            <button
              onClick={addItem}
              className="flex items-center gap-1 text-xs text-gold hover:underline"
            >
              <Plus size={14} /> {isArabic ? "إضافة بند" : "Add Item"}
            </button>
          </div>
        </Card>

        {/* Deductions */}
        <Card className="p-4">
          <h3 className="font-bold text-primary mb-2 border-b pb-2 text-sm">
            {isArabic ? "بيان الاستقطاعات" : "Deductions"}
          </h3>
          <div className="space-y-2">
            {deductions.map((ded, idx) => (
              <div key={ded.id} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={ded.name}
                  onChange={(e) => updateDeduction(idx, "name", e.target.value)}
                  className="flex-1 p-1.5 border rounded text-sm"
                  placeholder={isArabic ? "اسم الخصم" : "Name"}
                />
                <input
                  type="number"
                  value={ded.amount || ""}
                  onChange={(e) =>
                    updateDeduction(idx, "amount", Number(e.target.value))
                  }
                  className="w-28 p-1.5 border rounded text-sm"
                  placeholder={isArabic ? "المبلغ" : "Amount"}
                  step="any"
                />
                {/* ❌ حذف حقل percent */}
                <button
                  onClick={() => setShowDeleteDeductionConfirm(idx)}
                  className="text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addDeduction}
            className="mt-2 flex items-center gap-1 text-xs text-gold hover:underline"
          >
            <Plus size={14} /> {isArabic ? "إضافة خصم" : "Add Deduction"}
          </button>
        </Card>

        {/* Summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-4 bg-green-50">
            <div className="flex justify-between">
              <span className="font-bold text-sm">
                {isArabic ? "الإجمالي لقيمة الأعمال" : "Total Work Value"}
              </span>
              <span className="text-xl font-bold text-primary">
                {totalWorkValue.toLocaleString()}
              </span>
            </div>
          </Card>
          <Card className="p-4 bg-red-50">
            <div className="flex justify-between">
              <span className="font-bold text-sm">
                {isArabic ? "إجمالي الاستقطاعات" : "Total Deductions"}
              </span>
              <span className="text-xl font-bold text-red-500">
                {totalDeductions.toLocaleString()}
              </span>
            </div>
          </Card>
          <Card className="p-4 bg-gold/10 border-gold">
            <div className="flex justify-between">
              <span className="font-bold text-sm">
                {isArabic ? "المستحق صرفة" : "Net Payable"}
              </span>
              <span className="text-2xl font-bold text-gold">
                {netPayable.toLocaleString()}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
