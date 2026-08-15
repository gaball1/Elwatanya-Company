/* eslint-disable */
"use client";

import { useToast } from "@/components/ui/Toast";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui";
import { Can } from '@/components/Can';
import {
  Wallet,
  Plus,
  Edit2,
  Trash2,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
} from "lucide-react";
import { projectFundService, type ProjectFund } from "@/services/project-fund.service";
import { fundTransactionService, type FundTransaction } from "@/services/fund-transaction.service";
import { projectService, type Project } from "@/services/project.service";

export default function TreasuryPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [funds, setFunds] = useState<ProjectFund[]>([]);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [showFundModal, setShowFundModal] = useState(false);
  const [showTransModal, setShowTransModal] = useState(false);
  const [editingFund, setEditingFund] = useState<ProjectFund | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [fundForm, setFundForm] = useState({ projectId: "", initialBalance: "0" });
  const [transForm, setTransForm] = useState({ fundId: "", type: "add", amount: "0", description: "", notes: "", category: "general" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fundsData, transData, projectsData] = await Promise.all([
        projectFundService.list(),
        fundTransactionService.list(),
        projectService.getProjects(),
      ]);
      setFunds(fundsData);
      setTransactions(transData);
      setProjects(projectsData);
    } catch {
      showToast(isArabic ? "فشل تحميل البيانات" : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getProjectName = (projectId: string) => projects.find((p) => p.id === projectId)?.name || projectId;

  const totalBalance = funds.reduce((s, f) => s + f.currentBalance, 0);
  const recentTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  const handleCreateFund = async () => {
    if (!fundForm.projectId) { showToast(isArabic ? "يرجى اختيار مشروع" : "Please select a project", "error"); return; }
    try {
      await projectFundService.create({ projectId: fundForm.projectId, initialBalance: parseFloat(fundForm.initialBalance) || 0 });
      showToast(isArabic ? "تم إنشاء العهدة" : "Fund created", "success");
      setShowFundModal(false);
      setFundForm({ projectId: "", initialBalance: "0" });
      await loadData();
    } catch {
      showToast(isArabic ? "فشل إنشاء العهدة" : "Failed to create fund", "error");
    }
  };

  const handleCreateTransaction = async () => {
    if (!transForm.fundId || !transForm.amount) { showToast(isArabic ? "يرجى ملء الحقول" : "Please fill all fields", "error"); return; }
    try {
      await fundTransactionService.create({
        fundId: transForm.fundId,
        type: transForm.type,
        amount: parseFloat(transForm.amount) || 0,
        description: transForm.description,
        notes: transForm.notes,
        category: transForm.category,
        status: "approved",
      });
      showToast(isArabic ? "تم تسجيل المعاملة" : "Transaction recorded", "success");
      setShowTransModal(false);
      setTransForm({ fundId: "", type: "add", amount: "0", description: "", notes: "", category: "general" });
      await loadData();
    } catch {
      showToast(isArabic ? "فشل تسجيل المعاملة" : "Failed to record transaction", "error");
    }
  };

  const handleDeleteFund = async () => {
    if (!deletingId) return;
    try {
      await projectFundService.remove(deletingId);
      showToast(isArabic ? "تم حذف العهدة" : "Fund deleted", "success");
      setShowDeleteConfirm(false);
      setDeletingId(null);
      await loadData();
    } catch {
      showToast(isArabic ? "فشل حذف العهدة" : "Failed to delete fund", "error");
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-text-muted">{isArabic ? "جاري التحميل..." : "Loading..."}</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {ToastComponent}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{isArabic ? "الخزينة" : "Treasury"}</h1>
          <p className="text-sm text-text-muted mt-1">{isArabic ? "إدارة العهد والمعاملات المالية" : "Manage funds and financial transactions"}</p>
        </div>
        <div className="flex gap-2">
          <Can permission="project-funds.create">
            <button onClick={() => setShowFundModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
              <Plus size={18} /> {isArabic ? "عهدة جديدة" : "New Fund"}
            </button>
          </Can>
          <Can permission="fund-transactions.create">
            <button onClick={() => setShowTransModal(true)} className="flex items-center gap-2 px-4 py-2 border border-gold text-gold rounded-lg hover:bg-gold hover:text-white transition">
              <Plus size={18} /> {isArabic ? "معاملة جديدة" : "New Transaction"}
            </button>
          </Can>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10"><Wallet size={24} className="text-primary" /></div>
            <div>
              <p className="text-xs text-text-muted">{isArabic ? "إجمالي العهد" : "Total Funds"}</p>
              <p className="text-xl font-bold text-text-primary">{totalBalance.toLocaleString()} {isArabic ? "ج.م" : "EGP"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-success/10"><TrendingUp size={24} className="text-success" /></div>
            <div>
              <p className="text-xs text-text-muted">{isArabic ? "عدد العهد" : "Fund Count"}</p>
              <p className="text-xl font-bold text-text-primary">{funds.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-info/10"><TrendingDown size={24} className="text-info" /></div>
            <div>
              <p className="text-xs text-text-muted">{isArabic ? "المعاملات" : "Transactions"}</p>
              <p className="text-xl font-bold text-text-primary">{transactions.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">{isArabic ? "العهد" : "Funds"}</h2>
          {funds.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <Wallet size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">{isArabic ? "لا توجد عهد" : "No funds"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {funds.map((fund) => (
                <div key={fund.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-secondary transition-colors">
                  <div className="flex items-center gap-3">
                    <Building2 size={16} className="text-text-muted" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{getProjectName(fund.projectId)}</p>
                      <p className="text-xs text-text-muted">{isArabic ? "الرصيد" : "Balance"}: {fund.currentBalance.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Can permission="project-funds.delete">
                      <button onClick={() => { setDeletingId(fund.id); setShowDeleteConfirm(true); }} className="p-1 text-text-muted hover:text-danger transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </Can>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">{isArabic ? "آخر المعاملات" : "Recent Transactions"}</h2>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">{isArabic ? "لا توجد معاملات" : "No transactions"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-secondary transition-colors text-sm">
                  <div className="flex items-center gap-2">
                    {t.type === "add" ? <TrendingUp size={14} className="text-success" /> : <TrendingDown size={14} className="text-danger" />}
                    <div>
                      <p className="text-text-primary font-medium">{t.description || t.type}</p>
                      <p className="text-xs text-text-muted">{new Date(t.date).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}</p>
                    </div>
                  </div>
                  <span className={`font-medium ${t.type === "add" ? "text-success" : "text-danger"}`}>
                    {t.type === "add" ? "+" : "-"}{t.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {showFundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold">{isArabic ? "عهدة جديدة" : "New Fund"}</h2>
              <button onClick={() => setShowFundModal(false)}><X size={24} className="text-text-muted" /></button>
            </div>
            <div className="p-5 space-y-4">
              <select value={fundForm.projectId} onChange={(e) => setFundForm({ ...fundForm, projectId: e.target.value })} className="w-full p-3 border rounded-xl">
                <option value="">{isArabic ? "اختر المشروع" : "Select Project"}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" placeholder={isArabic ? "الرصيد الابتدائي" : "Initial Balance"} value={fundForm.initialBalance} onChange={(e) => setFundForm({ ...fundForm, initialBalance: e.target.value })} className="w-full p-3 border rounded-xl" />
              <div className="flex gap-3">
                <button onClick={() => setShowFundModal(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button onClick={handleCreateFund} className="flex-1 px-4 py-2 bg-primary text-white rounded-xl">{isArabic ? "إنشاء" : "Create"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTransModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold">{isArabic ? "معاملة جديدة" : "New Transaction"}</h2>
              <button onClick={() => setShowTransModal(false)}><X size={24} className="text-text-muted" /></button>
            </div>
            <div className="p-5 space-y-4">
              <select value={transForm.fundId} onChange={(e) => setTransForm({ ...transForm, fundId: e.target.value })} className="w-full p-3 border rounded-xl">
                <option value="">{isArabic ? "اختر العهدة" : "Select Fund"}</option>
                {funds.map((f) => <option key={f.id} value={f.id}>{getProjectName(f.projectId)}</option>)}
              </select>
              <select value={transForm.type} onChange={(e) => setTransForm({ ...transForm, type: e.target.value })} className="w-full p-3 border rounded-xl">
                <option value="add">{isArabic ? "إيداع" : "Deposit"}</option>
                <option value="deduct">{isArabic ? "سحب" : "Withdrawal"}</option>
              </select>
              <input type="number" placeholder={isArabic ? "المبلغ" : "Amount"} value={transForm.amount} onChange={(e) => setTransForm({ ...transForm, amount: e.target.value })} className="w-full p-3 border rounded-xl" />
              <input type="text" placeholder={isArabic ? "الوصف" : "Description"} value={transForm.description} onChange={(e) => setTransForm({ ...transForm, description: e.target.value })} className="w-full p-3 border rounded-xl" />
              <input type="text" placeholder={isArabic ? "ملاحظات" : "Notes"} value={transForm.notes} onChange={(e) => setTransForm({ ...transForm, notes: e.target.value })} className="w-full p-3 border rounded-xl" />
              <div className="flex gap-3">
                <button onClick={() => setShowTransModal(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button onClick={handleCreateTransaction} className="flex-1 px-4 py-2 bg-primary text-white rounded-xl">{isArabic ? "تسجيل" : "Record"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="p-5 border-b"><h2 className="text-xl font-bold text-danger">{isArabic ? "تأكيد الحذف" : "Confirm Delete"}</h2></div>
            <div className="p-5">
              <p className="text-text-secondary">{isArabic ? "هل أنت متأكد من حذف هذه العهدة؟" : "Are you sure you want to delete this fund?"}</p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button onClick={handleDeleteFund} className="flex-1 px-4 py-2 bg-danger text-white rounded-xl">{isArabic ? "حذف" : "Delete"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
