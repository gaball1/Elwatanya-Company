/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { DollarSign, Plus, Eye } from "lucide-react";
import { clientStatementService, type ClientStatement } from "@/services/client-statement.service";
import UploadFromDeviceButton, {
  type UploadedFileInfo,
} from "@/components/shared/UploadFromDeviceButton";
import { Can } from "@/components/Can";

function EmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto text-text-muted mb-3">{icon}</div>
      <p className="text-text-secondary">{message}</p>
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
      className: "bg-success-light text-success-dark",
    },
    pending: {
      label: isArabic ? "قيد الانتظار" : "Pending",
      className: "bg-warning-light text-warning-dark",
    },
    paid: {
      label: isArabic ? "مدفوع" : "Paid",
      className: "bg-info-light text-info-dark",
    },
    draft: {
      label: isArabic ? "مسودة" : "Draft",
      className: "bg-surface-tertiary text-text-secondary",
    },
  };

  const badge = statusConfig[status] || statusConfig.draft;

  return (
    <Card hover className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-primary">{number}</h3>
          <p className="text-sm text-text-secondary">{date}</p>
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

  const [statements, setStatements] = useState<ClientStatement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientStatementService.list()
      .then((data) => setStatements(data.filter((s) => s.buildingId === buildingId)))
      .catch((err) => console.error("[ClientStatements] Failed to load:", err))
      .finally(() => setLoading(false));
  }, [buildingId]);

  const handleUpload = async (file: UploadedFileInfo) => {
    try {
      await clientStatementService.create({
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
      });
      const data = await clientStatementService.list();
      setStatements(data.filter((s) => s.buildingId === buildingId));
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-primary">
          {isArabic ? "مستخلصات جهة الإسناد" : "Client Statements"}
        </h2>
        <div className="flex gap-2 flex-wrap">
          <Can permission="client-statements.create">
            <UploadFromDeviceButton
              isArabic={isArabic}
              onUpload={handleUpload}
              label={isArabic ? "رفع من الجهاز" : "Upload from Device"}
            />
          </Can>
          <Can permission="client-statements.create">
            <Link
              href={`/${locale}/client-statements/new?projectId=${projectId}&buildingId=${buildingId}`}
            >
              <button className="flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition">
                <Plus size={16} />
                {isArabic ? "إضافة مستخلص" : "Add Statement"}
              </button>
            </Link>
          </Can>
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
