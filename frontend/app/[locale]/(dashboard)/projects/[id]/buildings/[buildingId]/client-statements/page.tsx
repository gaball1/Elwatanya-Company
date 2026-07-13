/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { DollarSign, Plus, Eye } from "lucide-react";
import { mockClientStatements } from "@/lib/mockData";
import UploadFromDeviceButton, {
  type UploadedFileInfo,
} from "@/components/shared/UploadFromDeviceButton";

function EmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto text-gray-300 mb-3">{icon}</div>
      <p className="text-gray-500">{message}</p>
    </Card>
  );
}

function ClientStatementCard({
  statement,
  isArabic,
  locale,
}: {
  statement: any;
  isArabic: boolean;
  locale: string;
}) {
  const amount =
    statement?.netPayable ||
    statement?.totalWorkValue ||
    statement?.amount ||
    0;
  const date = statement?.date || "";
  const number = statement?.statementNumber || statement?.number || "—";
  const status = statement?.status || "draft";

  const statusConfig: Record<string, { label: string; className: string }> = {
    approved: {
      label: isArabic ? "معتمد" : "Approved",
      className: "bg-green-100 text-green-800",
    },
    pending: {
      label: isArabic ? "قيد الانتظار" : "Pending",
      className: "bg-yellow-100 text-yellow-800",
    },
    paid: {
      label: isArabic ? "مدفوع" : "Paid",
      className: "bg-blue-100 text-blue-800",
    },
    draft: {
      label: isArabic ? "مسودة" : "Draft",
      className: "bg-gray-100 text-gray-600",
    },
  };

  const badge = statusConfig[status] || statusConfig.draft;

  return (
    <Card hover className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-primary">{number}</h3>
          <p className="text-sm text-gray-500">{date}</p>
          <span
            className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gold">
            {amount.toLocaleString()} ج.م
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Link href={`/${locale}/client-statements/${statement.id}`}>
          <button className="text-gold text-sm hover:underline flex items-center gap-1">
            <Eye size={14} />
            {isArabic ? "عرض التفاصيل" : "View Details"}
          </button>
        </Link>
      </div>
    </Card>
  );
}

export default function BuildingClientStatementsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;

  const [statements, setStatements] = useState(
    mockClientStatements.filter((s) => s.buildingId === buildingId)
  );

  const handleUpload = (file: UploadedFileInfo) => {
    const newStatement = {
      id: Date.now().toString(),
      statementNumber: `CS-UP-${Date.now()}`,
      projectId,
      projectName: "",
      buildingId,
      buildingName: "",
      clientId: "",
      clientName: file.name.replace(/\.[^/.]+$/, ""),
      date: new Date().toISOString().split("T")[0],
      status: "draft",
      totalWorkValue: 0,
      totalDeductions: 0,
      netPayable: 0,
      items: [],
      deductions: [],
      signatures: [],
      fileName: file.name,
      fileUrl: file.url,
    };
    setStatements((prev) => [...prev, newStatement]);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-primary">
          {isArabic ? "مستخلصات جهة الإسناد" : "Client Statements"}
        </h2>
        <div className="flex gap-2 flex-wrap">
          <UploadFromDeviceButton
            isArabic={isArabic}
            onUpload={handleUpload}
            label={isArabic ? "رفع من الجهاز" : "Upload from Device"}
          />
          <Link
            href={`/${locale}/client-statements/new?projectId=${projectId}&buildingId=${buildingId}`}
          >
            <button className="flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition">
              <Plus size={16} />
              {isArabic ? "إضافة مستخلص" : "Add Statement"}
            </button>
          </Link>
        </div>
      </div>

      {statements.length === 0 ? (
        <EmptyState
          icon={<DollarSign size={48} />}
          message={
            isArabic
              ? "لا توجد مستخلصات من جهة الإسناد"
              : "No client statements found"
          }
        />
      ) : (
        <div className="space-y-3">
          {statements.map((statement) => (
            <ClientStatementCard
              key={statement.id}
              statement={statement}
              isArabic={isArabic}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
