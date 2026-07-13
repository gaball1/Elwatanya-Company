/* eslint-disable */
"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { Plus, Trash2, Save } from "lucide-react";
import { mockSubcontractorStatements } from "@/lib/mockData";
import BackButton from "@/components/shared/BackButton";

interface Item {
  id: string;
  itemName: string;
  unit: string;
  previous: number;
  current: number;
  executionPercent: number;
  count: number;
  quantity: number;
  price: number;
  totalAmount: number;
  insuranceAmount: number;
  netAmount: number;
}

interface Deduction {
  id: string;
  name: string;
  amount: number;
  percent: number;
}

export default function EditStatementPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const statementId = params.id as string;

  const existingStatement = mockSubcontractorStatements.find(
    (s) => s.id === statementId
  );

  if (!existingStatement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">
          {isArabic ? "المستخلص غير موجود" : "Statement not found"}
        </p>
      </div>
    );
  }

  // Basic Info
  const [statementNumber, setStatementNumber] = useState(
    existingStatement.statementNumber || ""
  );
  const [statementDate, setStatementDate] = useState(
    existingStatement.date || ""
  );
  const [blockNumber, setBlockNumber] = useState(
    existingStatement.blockNumber || ""
  );
  const [formNumber, setFormNumber] = useState(
    existingStatement.formNumber || ""
  );
  const [insurancePercent, setInsurancePercent] = useState(
    existingStatement.insurancePercent || 5
  );
  const [subcontractorName, setSubcontractorName] = useState(
    existingStatement.subcontractorName || ""
  );
  const [workType, setWorkType] = useState(existingStatement.workType || "");

  // Items - تحويل البيانات الموجودة إلى الشكل المطلوب
  const [items, setItems] = useState<Item[]>(
    existingStatement.items?.map((item: any, idx: number) => ({
      id: item.id || Date.now().toString() + idx,
      itemName: item.itemName || "",
      unit: item.unit || "",
      previous: item.previous || 0,
      current: item.current || 0,
      executionPercent: item.executionPercent || 100,
      count: item.count || 1,
      quantity: item.quantity || 0,
      price: item.price || 0,
      totalAmount: item.totalAmount || item.quantity * item.price || 0,
      insuranceAmount: item.insuranceAmount || 0,
      netAmount: item.netAmount || 0,
    })) || []
  );

  // Deductions
  const [deductions, setDeductions] = useState<Deduction[]>(
    existingStatement.deductions?.map((d: any) => ({
      id: d.id || Date.now().toString(),
      name: d.name || "",
      amount: d.amount || 0,
      percent: d.percent || 0,
    })) || []
  );

  // Delete confirmation modals
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState<
    number | null
  >(null);
  const [showDeleteDeductionConfirm, setShowDeleteDeductionConfirm] = useState<
    number | null
  >(null);

  // حساب الإجماليات
  const calculateItemTotals = (itemsList: Item[]) => {
    return itemsList.map((item) => {
      const totalAmount = item.quantity * item.price;
      const insuranceAmount = totalAmount * (insurancePercent / 100);
      const netAmount = totalAmount - insuranceAmount;
      return { ...item, totalAmount, insuranceAmount, netAmount };
    });
  };

  const updateAllItems = (newItems: Item[]) => {
    const updatedItems = calculateItemTotals(newItems);
    setItems(updatedItems);
  };

  const totalWorkValue = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  const totalInsurance = items.reduce(
    (sum, item) => sum + item.quantity * item.price * (insurancePercent / 100),
    0
  );
  const totalDeductions = deductions.reduce(
    (sum, d) => sum + (d.amount || 0),
    0
  );
  const netPayable = totalWorkValue - totalInsurance - totalDeductions;

  // Item handlers
  const addItem = () => {
    const newItems = [
      ...items,
      {
        id: Date.now().toString(),
        itemName: "",
        unit: "",
        previous: 0,
        current: 0,
        executionPercent: 100,
        count: 1,
        quantity: 0,
        price: 0,
        totalAmount: 0,
        insuranceAmount: 0,
        netAmount: 0,
      },
    ];
    updateAllItems(newItems);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    updateAllItems(newItems);
  };

  const confirmDeleteItem = (index: number) => {
    setShowDeleteItemConfirm(index);
  };

  const deleteItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    updateAllItems(newItems);
    setShowDeleteItemConfirm(null);
  };

  // Deduction handlers
  const addDeduction = () => {
    setDeductions([
      ...deductions,
      { id: Date.now().toString(), name: "", amount: 0, percent: 0 },
    ]);
  };

  const updateDeduction = (index: number, field: string, value: any) => {
    const newDeductions = [...deductions];
    newDeductions[index] = { ...newDeductions[index], [field]: value };
    setDeductions(newDeductions);
  };

  const confirmDeleteDeduction = (index: number) => {
    setShowDeleteDeductionConfirm(index);
  };

  const deleteDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
    setShowDeleteDeductionConfirm(null);
  };

  // حفظ التعديلات
  const handleSubmit = () => {
    const updatedItems = items
      .filter((i) => i.itemName)
      .map((i, idx) => ({
        id: i.id,
        model: (idx + 1).toString(),
        itemName: i.itemName,
        unit: i.unit,
        previous: i.previous,
        current: i.current,
        executionPercent: i.executionPercent,
        count: i.count,
        quantity: i.quantity,
        price: i.price,
        totalAmount: i.quantity * i.price,
        insuranceAmount: i.quantity * i.price * (insurancePercent / 100),
        netAmount: i.quantity * i.price * (1 - insurancePercent / 100),
      }));

    existingStatement.statementNumber = statementNumber;
    existingStatement.date = statementDate;
    existingStatement.blockNumber = blockNumber;
    existingStatement.formNumber = formNumber;
    existingStatement.insurancePercent = insurancePercent;
    existingStatement.subcontractorName = subcontractorName;
    existingStatement.workType = workType;
    existingStatement.items = updatedItems;
    existingStatement.deductions = deductions.filter(
      (d) => d.name && d.amount > 0
    );
    existingStatement.totalWorkValue = totalWorkValue;
    existingStatement.totalInsurance = totalInsurance;
    existingStatement.totalDeductions = totalDeductions;
    existingStatement.netPayable = netPayable;

    alert(
      isArabic ? "تم تحديث المستخلص بنجاح" : "Statement updated successfully"
    );
    router.push(`/${locale}/statements/${statementId}`);
  };

  return (
    <div className="min-h-screen bg-gray-light pb-10">
      {/* Delete Item Confirmation Modal */}
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

      {/* Delete Deduction Confirmation Modal */}
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

      {/* Header */}
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <BackButton fallbackHref={`/${locale}/statements/${statementId}`} />
            <div>
              <h1 className="text-3xl font-bold text-primary">
                {isArabic
                  ? "تعديل مستخلص أعمال جاري"
                  : "Edit Current Work Statement"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {statementDate} | {isArabic ? "رقم المستخلص" : "Statement No"}:{" "}
                {statementNumber}
              </p>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
          >
            <Save size={18} /> {isArabic ? "حفظ التغييرات" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border-r-4 border-gold">
            <p className="text-gray-500 text-sm">
              {isArabic ? "رقم المستخلص" : "Statement No"}
            </p>
            <input
              type="text"
              value={statementNumber}
              onChange={(e) => setStatementNumber(e.target.value)}
              className="w-full font-bold text-primary bg-transparent border-b border-gray-200 focus:border-gold outline-none"
              placeholder="B-T-B-9"
            />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">
              {isArabic ? "رقم القطعة" : "Block No"}
            </p>
            <input
              type="text"
              value={blockNumber}
              onChange={(e) => setBlockNumber(e.target.value)}
              className="w-full font-bold text-primary bg-transparent border-b border-gray-200 focus:border-gold outline-none"
              placeholder="B-T-B-9"
            />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">
              {isArabic ? "النموذج" : "Form"}
            </p>
            <input
              type="text"
              value={formNumber}
              onChange={(e) => setFormNumber(e.target.value)}
              className="w-full font-bold text-primary bg-transparent border-b border-gray-200 focus:border-gold outline-none"
              placeholder="B-T-B-9"
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
              className="w-full font-bold text-primary bg-transparent border-b border-gray-200 focus:border-gold outline-none"
            />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">
              {isArabic ? "نسبة التأمين" : "Insurance %"}
            </p>
            <input
              type="number"
              value={insurancePercent}
              onChange={(e) => setInsurancePercent(Number(e.target.value))}
              className="w-full font-bold text-primary bg-transparent border-b border-gray-200 focus:border-gold outline-none"
              step="any"
            />
          </div>
        </div>

        {/* Subcontractor Info */}
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">
              {isArabic ? "اسم المقاول" : "Subcontractor"}
            </p>
            <input
              type="text"
              value={subcontractorName}
              onChange={(e) => setSubcontractorName(e.target.value)}
              className="w-full font-bold text-primary bg-transparent border-b border-gray-200 focus:border-gold outline-none"
            />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">
              {isArabic ? "البند الأساسي" : "Main Item"}
            </p>
            <input
              type="text"
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              className="w-full font-bold text-primary bg-transparent border-b border-gray-200 focus:border-gold outline-none"
            />
          </div>
        </div>

        {/* Items Table - Full 13 columns like new page */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="p-2 border text-center" rowSpan={2}>
                    م
                  </th>
                  <th className="p-2 border text-right" rowSpan={2}>
                    {isArabic ? "بيان الأعمال" : "Work Description"}
                  </th>
                  <th className="p-2 border text-center" rowSpan={2}>
                    {isArabic ? "الوحدة" : "Unit"}
                  </th>
                  <th className="p-2 border text-center" colSpan={2}>
                    {isArabic ? "الأعمال" : "Work"}
                  </th>
                  <th className="p-2 border text-center" rowSpan={2}>
                    {isArabic ? "نسبة التنفيذ" : "Exec. %"}
                  </th>
                  <th className="p-2 border text-center" rowSpan={2}>
                    {isArabic ? "عدد النماذج" : "Count"}
                  </th>
                  <th className="p-2 border text-center" rowSpan={2}>
                    {isArabic ? "الكمية المنفذة" : "Quantity"}
                  </th>
                  <th className="p-2 border text-center" rowSpan={2}>
                    {isArabic ? "الفئة" : "Price"}
                  </th>
                  <th className="p-2 border text-center" rowSpan={2}>
                    {isArabic ? "قيمة الأعمال" : "Value"}
                  </th>
                  <th className="p-2 border text-center" colSpan={2}>
                    {isArabic ? "التأمين" : "Insurance"}
                  </th>
                  <th className="p-2 border text-center" rowSpan={2}>
                    {isArabic ? "الإجمالي بعد التأمين" : "Net"}
                  </th>
                  <th className="p-2 border text-center" rowSpan={2}></th>
                </tr>
                <tr className="bg-primary text-white">
                  <th className="p-2 border text-center">
                    {isArabic ? "السابق" : "Previous"}
                  </th>
                  <th className="p-2 border text-center">
                    {isArabic ? "الحالي" : "Current"}
                  </th>
                  <th className="p-2 border text-center">%</th>
                  <th className="p-2 border text-center">
                    {isArabic ? "المبلغ" : "Amount"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const totalAmount = item.quantity * item.price;
                  const insuranceAmount =
                    totalAmount * (insurancePercent / 100);
                  const netAmount = totalAmount - insuranceAmount;
                  return (
                    <tr key={item.id} className="border-t hover:bg-gray-50">
                      <td className="p-2 border text-center">{idx + 1}</td>
                      <td className="p-2 border">
                        <input
                          type="text"
                          value={item.itemName}
                          onChange={(e) =>
                            updateItem(idx, "itemName", e.target.value)
                          }
                          className="w-48 p-1 border rounded text-sm"
                          placeholder="اسم البند"
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) =>
                            updateItem(idx, "unit", e.target.value)
                          }
                          className="w-20 p-1 border rounded text-sm"
                          placeholder="وحدة"
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          value={item.previous || ""}
                          onChange={(e) =>
                            updateItem(idx, "previous", Number(e.target.value))
                          }
                          className="w-24 p-1 border rounded text-sm"
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          value={item.current || ""}
                          onChange={(e) =>
                            updateItem(idx, "current", Number(e.target.value))
                          }
                          className="w-24 p-1 border rounded text-sm"
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          value={item.executionPercent || ""}
                          onChange={(e) =>
                            updateItem(
                              idx,
                              "executionPercent",
                              Number(e.target.value)
                            )
                          }
                          className="w-20 p-1 border rounded text-sm"
                          step="any"
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          value={item.count || ""}
                          onChange={(e) =>
                            updateItem(idx, "count", Number(e.target.value))
                          }
                          className="w-20 p-1 border rounded text-sm"
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateItem(idx, "quantity", Number(e.target.value))
                          }
                          className="w-24 p-1 border rounded text-sm"
                          step="any"
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          value={item.price || ""}
                          onChange={(e) =>
                            updateItem(idx, "price", Number(e.target.value))
                          }
                          className="w-24 p-1 border rounded text-sm"
                          step="any"
                        />
                      </td>
                      <td className="p-2 border text-center font-bold">
                        {totalAmount.toLocaleString()}
                      </td>
                      <td className="p-2 border text-center">
                        {insurancePercent}%
                      </td>
                      <td className="p-2 border text-center text-red-500">
                        {insuranceAmount.toLocaleString()}
                      </td>
                      <td className="p-2 border text-center font-bold text-gold">
                        {netAmount.toLocaleString()}
                      </td>
                      <td className="p-2 border text-center">
                        <button
                          onClick={() => confirmDeleteItem(idx)}
                          className="text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
                  <td className="p-2 text-center">
                    {totalInsurance.toLocaleString()}
                  </td>
                  <td className="p-2 text-center text-gold">
                    {(totalWorkValue - totalInsurance).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="p-3 border-t">
            <button
              onClick={addItem}
              className="flex items-center gap-1 text-sm text-gold hover:underline"
            >
              <Plus size={16} /> {isArabic ? "إضافة بند" : "Add Item"}
            </button>
          </div>
        </Card>

        {/* Deductions Table */}
        <Card className="p-5">
          <h3 className="font-bold text-primary mb-3 border-b pb-2">
            {isArabic ? "بيان الاستقطاعات" : "Deductions Statement"}
          </h3>
          <div className="space-y-2">
            {deductions.map((ded, idx) => (
              <div key={ded.id} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={ded.name}
                  onChange={(e) => updateDeduction(idx, "name", e.target.value)}
                  className="flex-1 p-2 border rounded-lg text-sm"
                  placeholder={isArabic ? "اسم الخصم" : "Name"}
                />
                {ded.percent > 0 && (
                  <span className="text-gray-500">{ded.percent}%</span>
                )}
                <input
                  type="number"
                  value={ded.amount || ""}
                  onChange={(e) =>
                    updateDeduction(idx, "amount", Number(e.target.value))
                  }
                  className="w-32 p-2 border rounded-lg text-sm"
                  placeholder={isArabic ? "المبلغ" : "Amount"}
                  step="any"
                />
                <input
                  type="number"
                  value={ded.percent || ""}
                  onChange={(e) =>
                    updateDeduction(idx, "percent", Number(e.target.value))
                  }
                  className="w-20 p-2 border rounded-lg text-sm"
                  placeholder="%"
                  step="any"
                />
                <button
                  onClick={() => confirmDeleteDeduction(idx)}
                  className="text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addDeduction}
            className="mt-3 flex items-center gap-1 text-sm text-gold hover:underline"
          >
            <Plus size={16} /> {isArabic ? "إضافة خصم" : "Add Deduction"}
          </button>
        </Card>

        {/* Summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-5 bg-green-50">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-700">
                {isArabic ? "الإجمالي لقيمة الأعمال" : "Total Work Value"}
              </span>
              <span className="text-2xl font-bold text-primary">
                {totalWorkValue.toLocaleString()}
              </span>
            </div>
          </Card>
          <Card className="p-5 bg-red-50">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-700">
                {isArabic ? "خصم الاستقطاعات" : "Deductions"}
              </span>
              <span className="text-2xl font-bold text-red-500">
                {totalDeductions.toLocaleString()}
              </span>
            </div>
          </Card>
          <Card className="p-5 bg-gold/10 border-gold">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-700">
                {isArabic ? "المستحق صرفة" : "Net Payable"}
              </span>
              <span className="text-3xl font-bold text-gold">
                {netPayable.toLocaleString()}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
