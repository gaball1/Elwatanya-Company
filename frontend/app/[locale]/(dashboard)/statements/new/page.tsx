/* eslint-disable */
"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { Plus, Trash2, Save, X } from "lucide-react";
import { mockProjects, mockBuildings, mockSubcontractors, mockSubcontractorStatements } from "@/lib/mockData";
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
}

interface Deduction {
  id: string;
  name: string;
  amount: number;
  percent: number;
}

export default function NewStatementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-light">
          <p className="text-gray-500">...</p>
        </div>
      }
    >
      <NewStatementPageContent />
    </Suspense>
  );
}

function NewStatementPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  // Read from URL params (when navigated from a building)
  const prefilledProjectId = searchParams.get("projectId") || "";
  const prefilledBuildingId = searchParams.get("buildingId") || "";
  const isPreFilled = !!(prefilledProjectId && prefilledBuildingId);

  // Basic Info
  const [projectId, setProjectId] = useState(prefilledProjectId);
  const [buildingId, setBuildingId] = useState(prefilledBuildingId);
  const [subcontractorId, setSubcontractorId] = useState("");
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split("T")[0]);
  const [statementNumber, setStatementNumber] = useState("");
  const [blockNumber, setBlockNumber] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [insurancePercent, setInsurancePercent] = useState(5);

  // Items
  const [items, setItems] = useState<Item[]>([
    { id: Date.now().toString(), itemName: "", unit: "", previous: 0, current: 0, executionPercent: 100, count: 1, quantity: 0, price: 0 }
  ]);

  // Deductions
  const [deductions, setDeductions] = useState<Deduction[]>([
    { id: Date.now().toString(), name: "", amount: 0, percent: 0 }
  ]);

  // Delete confirmation modals
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState<number | null>(null);
  const [showDeleteDeductionConfirm, setShowDeleteDeductionConfirm] = useState<number | null>(null);

  const selectedProject = mockProjects.find(p => p.id === projectId);
  const selectedBuilding = mockBuildings.find(b => b.id === buildingId);
  const selectedSubcontractor = mockSubcontractors.find(s => s.id === subcontractorId);
  const availableBuildings = mockBuildings.filter(b => b.projectId === projectId);

  // حساب الإجماليات
  const totalWorkValue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const totalInsurance = totalWorkValue * (insurancePercent / 100);
  const totalDeductions = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);
  const netPayable = totalWorkValue - totalInsurance - totalDeductions;

  // Item handlers
  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), itemName: "", unit: "", previous: 0, current: 0, executionPercent: 100, count: 1, quantity: 0, price: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const confirmDeleteItem = (index: number) => {
    setShowDeleteItemConfirm(index);
  };

  const deleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    setShowDeleteItemConfirm(null);
  };

  // Deduction handlers
  const addDeduction = () => {
    setDeductions([...deductions, { id: Date.now().toString(), name: "", amount: 0, percent: 0 }]);
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

  // حفظ المستخلص
  const handleSubmit = () => {
    if (!projectId || !buildingId || !subcontractorId) {
      alert(isArabic ? "يرجى اختيار المشروع والمبنى والمقاول" : "Please select project, building and subcontractor");
      return;
    }

    const newId = (mockSubcontractorStatements.length + 1).toString();
    const newStatement = {
      id: newId,
      statementNumber: statementNumber || `ST-${new Date().getFullYear()}-${newId}`,
      projectId,
      projectName: selectedProject?.name || "",
      buildingId,
      buildingName: selectedBuilding?.name || "",
      subcontractorId,
      subcontractorName: selectedSubcontractor?.name || "",
      workType: selectedSubcontractor?.workType || "",
      date: statementDate,
      status: "draft",
      blockNumber: blockNumber || `BLK-${newId}`,
      formNumber: formNumber || `FRM-${newId}`,
      insurancePercent,
      totalWorkValue,
      totalInsurance,
      totalDeductions,
      previousPaid: 0,
      netPayable,
      runningNumber: mockSubcontractorStatements.length + 1,
      items: items.filter(i => i.itemName).map((i, idx) => ({
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
        insuranceAmount: (i.quantity * i.price) * (insurancePercent / 100),
        netAmount: (i.quantity * i.price) * (1 - insurancePercent / 100),
      })),
      deductions: deductions.filter(d => d.name && d.amount > 0),
      signatures: [],
    };

    mockSubcontractorStatements.push(newStatement);
    alert(isArabic ? "تم حفظ المستخلص بنجاح" : "Statement saved successfully");
    // Return to building statements page if navigated from building, else go to statements list
    if (isPreFilled) {
      router.push(`/${locale}/projects/${projectId}/buildings/${buildingId}/statements`);
    } else {
      router.push(`/${locale}/statements`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-light pb-10">
      {/* Delete Item Confirmation Modal */}
      {showDeleteItemConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-primary mb-4">{isArabic ? "تأكيد الحذف" : "Confirm Delete"}</h3>
            <p className="text-gray-600 mb-6">{isArabic ? "هل أنت متأكد من حذف هذا البند؟" : "Are you sure you want to delete this item?"}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteItemConfirm(null)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
              <button onClick={() => deleteItem(showDeleteItemConfirm)} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl">{isArabic ? "حذف" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Deduction Confirmation Modal */}
      {showDeleteDeductionConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-primary mb-4">{isArabic ? "تأكيد الحذف" : "Confirm Delete"}</h3>
            <p className="text-gray-600 mb-6">{isArabic ? "هل أنت متأكد من حذف هذا الخصم؟" : "Are you sure you want to delete this deduction?"}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteDeductionConfirm(null)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
              <button onClick={() => deleteDeduction(showDeleteDeductionConfirm)} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl">{isArabic ? "حذف" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <BackButton
              fallbackHref={
                isPreFilled
                  ? `/${locale}/projects/${projectId}/buildings/${buildingId}/statements`
                  : `/${locale}/statements`
              }
            />
            <div>
              <h1 className="text-3xl font-bold text-primary">{isArabic ? "مستخلص أعمال جاري" : "Current Work Statement"}</h1>
              <p className="text-sm text-gray-500 mt-1">{statementDate} | {isArabic ? "اسم المشروع" : "Project"}: {selectedProject?.name || "---"}</p>
            </div>
          </div>
          <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
            <Save size={18} /> {isArabic ? "حفظ" : "Save"}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Project and Contractor Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border-r-4 border-gold">
            <p className="text-gray-500 text-sm">{isArabic ? "النموذج" : "Form"}</p>
            <input type="text" value={formNumber} onChange={(e) => setFormNumber(e.target.value)} placeholder="B-T-B-9" className="w-full font-bold text-primary bg-transparent border-b border-gray-200 focus:border-gold outline-none" />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">{isArabic ? "اسم المقاول" : "Subcontractor"}</p>
            <select value={subcontractorId} onChange={(e) => setSubcontractorId(e.target.value)} className="w-full font-bold text-primary bg-transparent border-b border-gray-200 focus:border-gold outline-none">
              <option value="">{isArabic ? "-- اختر --" : "-- Select --"}</option>
              {mockSubcontractors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">{isArabic ? "البند الأساسي" : "Main Item"}</p>
            <input type="text" value={selectedSubcontractor?.workType || ""} readOnly className="w-full font-bold text-primary bg-transparent" />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">{isArabic ? "رقم القطعة" : "Block No"}</p>
            <input type="text" value={blockNumber} onChange={(e) => setBlockNumber(e.target.value)} placeholder="B-T-B-9" className="w-full font-bold text-primary bg-transparent border-b border-gray-200 focus:border-gold outline-none" />
          </div>
        </div>

        {/* Show project/building info if pre-filled (read-only) */}
        {isPreFilled && (
          <div className="flex gap-3 flex-wrap">
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 text-sm">
              <span className="text-gray-500">{isArabic ? "المشروع:" : "Project:"} </span>
              <span className="font-bold text-primary">{selectedProject?.name || projectId}</span>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 text-sm">
              <span className="text-gray-500">{isArabic ? "المبنى:" : "Building:"} </span>
              <span className="font-bold text-primary">{selectedBuilding?.name || buildingId}</span>
            </div>
          </div>
        )}

        {/* Items Table - Full like second image */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="p-2 border text-center" rowSpan={2}>م</th>
                  <th className="p-2 border text-right" rowSpan={2}>{isArabic ? "بيان الأعمال" : "Work Description"}</th>
                  <th className="p-2 border text-center" rowSpan={2}>{isArabic ? "الوحدة" : "Unit"}</th>
                  <th className="p-2 border text-center" colSpan={2}>{isArabic ? "الأعمال" : "Work"}</th>
                  <th className="p-2 border text-center" rowSpan={2}>{isArabic ? "نسبة التنفيذ" : "Exec. %"}</th>
                  <th className="p-2 border text-center" rowSpan={2}>{isArabic ? "عدد النماذج" : "Count"}</th>
                  <th className="p-2 border text-center" rowSpan={2}>{isArabic ? "الكمية المنفذة" : "Quantity"}</th>
                  <th className="p-2 border text-center" rowSpan={2}>{isArabic ? "الفئة" : "Price"}</th>
                  <th className="p-2 border text-center" rowSpan={2}>{isArabic ? "قيمة الأعمال" : "Value"}</th>
                  <th className="p-2 border text-center" colSpan={2}>{isArabic ? "التأمين" : "Insurance"}</th>
                  <th className="p-2 border text-center" rowSpan={2}>{isArabic ? "الإجمالي بعد التأمين" : "Net"}</th>
                  <th className="p-2 border text-center" rowSpan={2}></th>
                </tr>
                <tr className="bg-primary text-white">
                  <th className="p-2 border text-center">{isArabic ? "السابق" : "Previous"}</th>
                  <th className="p-2 border text-center">{isArabic ? "الحالي" : "Current"}</th>
                  <th className="p-2 border text-center">%</th>
                  <th className="p-2 border text-center">{isArabic ? "المبلغ" : "Amount"}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const totalAmount = item.quantity * item.price;
                  const insuranceAmount = totalAmount * (insurancePercent / 100);
                  const netAmount = totalAmount - insuranceAmount;
                  return (
                    <tr key={item.id} className="border-t hover:bg-gray-50">
                      <td className="p-2 border text-center">{idx + 1}</td>
                      <td className="p-2 border"><input type="text" value={item.itemName} onChange={(e) => updateItem(idx, "itemName", e.target.value)} className="w-48 p-1 border rounded text-sm" placeholder="اسم البند" /></td>
                      <td className="p-2 border"><input type="text" value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} className="w-20 p-1 border rounded text-sm" placeholder="وحدة" /></td>
                      <td className="p-2 border"><input type="number" value={item.previous || ""} onChange={(e) => updateItem(idx, "previous", Number(e.target.value))} className="w-24 p-1 border rounded text-sm" /></td>
                      <td className="p-2 border"><input type="number" value={item.current || ""} onChange={(e) => updateItem(idx, "current", Number(e.target.value))} className="w-24 p-1 border rounded text-sm" /></td>
                      <td className="p-2 border"><input type="number" value={item.executionPercent || ""} onChange={(e) => updateItem(idx, "executionPercent", Number(e.target.value))} className="w-20 p-1 border rounded text-sm" step="any" /></td>
                      <td className="p-2 border"><input type="number" value={item.count || ""} onChange={(e) => updateItem(idx, "count", Number(e.target.value))} className="w-20 p-1 border rounded text-sm" /></td>
                      <td className="p-2 border"><input type="number" value={item.quantity || ""} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="w-24 p-1 border rounded text-sm" step="any" /></td>
                      <td className="p-2 border"><input type="number" value={item.price || ""} onChange={(e) => updateItem(idx, "price", Number(e.target.value))} className="w-24 p-1 border rounded text-sm" step="any" /></td>
                      <td className="p-2 border text-center font-bold">{totalAmount.toLocaleString()}</td>
                      <td className="p-2 border text-center">{insurancePercent}%</td>
                      <td className="p-2 border text-center text-red-500">{insuranceAmount.toLocaleString()}</td>
                      <td className="p-2 border text-center font-bold text-gold">{netAmount.toLocaleString()}</td>
                      <td className="p-2 border text-center"><button onClick={() => confirmDeleteItem(idx)} className="text-red-500"><Trash2 size={16} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-100 font-bold">
                <tr className="border-t">
                  <td colSpan={9} className="p-2 text-left">{isArabic ? "الإجمالي" : "Total"}</td>
                  <td className="p-2 text-center">{totalWorkValue.toLocaleString()}</td>
                  <td className="p-2 text-center"></td>
                  <td className="p-2 text-center">{totalInsurance.toLocaleString()}</td>
                  <td className="p-2 text-center text-gold">{(totalWorkValue - totalInsurance).toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="p-3 border-t">
            <button onClick={addItem} className="flex items-center gap-1 text-sm text-gold hover:underline"><Plus size={16} /> {isArabic ? "إضافة بند" : "Add Item"}</button>
          </div>
        </Card>

        {/* Deductions Table */}
        <Card className="p-5">
          <h3 className="font-bold text-primary mb-3 border-b pb-2">{isArabic ? "بيان الاستقطاعات" : "Deductions Statement"}</h3>
          <div className="space-y-2">
            {deductions.map((ded, idx) => (
              <div key={ded.id} className="flex gap-2 items-center">
                <input type="text" value={ded.name} onChange={(e) => updateDeduction(idx, "name", e.target.value)} className="flex-1 p-2 border rounded-lg text-sm" placeholder={isArabic ? "اسم الخصم" : "Name"} />
                {ded.percent > 0 && <span className="text-gray-500">{ded.percent}%</span>}
                <input type="number" value={ded.amount || ""} onChange={(e) => updateDeduction(idx, "amount", Number(e.target.value))} className="w-32 p-2 border rounded-lg text-sm" placeholder={isArabic ? "المبلغ" : "Amount"} step="any" />
                <input type="number" value={ded.percent || ""} onChange={(e) => updateDeduction(idx, "percent", Number(e.target.value))} className="w-20 p-2 border rounded-lg text-sm" placeholder="%" step="any" />
                <button onClick={() => confirmDeleteDeduction(idx)} className="text-red-500"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <button onClick={addDeduction} className="mt-3 flex items-center gap-1 text-sm text-gold hover:underline"><Plus size={16} /> {isArabic ? "إضافة خصم" : "Add Deduction"}</button>
        </Card>

        {/* Summary - Last image */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-5 bg-green-50">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-700">{isArabic ? "الإجمالي لقيمة الأعمال" : "Total Work Value"}</span>
              <span className="text-2xl font-bold text-primary">{totalWorkValue.toLocaleString()}</span>
            </div>
          </Card>
          <Card className="p-5 bg-red-50">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-700">{isArabic ? "خصم الاستقطاعات" : "Deductions"}</span>
              <span className="text-2xl font-bold text-red-500">{totalDeductions.toLocaleString()}</span>
            </div>
          </Card>
          <Card className="p-5 bg-gold/10 border-gold">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-700">{isArabic ? "المستحق صرفة" : "Net Payable"}</span>
              <span className="text-3xl font-bold text-gold">{netPayable.toLocaleString()}</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}