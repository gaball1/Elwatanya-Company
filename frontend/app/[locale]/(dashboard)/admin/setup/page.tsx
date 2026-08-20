/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { setupWizardService, type SetupStatus } from "@/services/setup-wizard.service";
import {
  Building2, Palette, DollarSign, UserPlus, Clock, CheckCircle2,
  ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";

const STEPS = [
  { key: "company", icon: Building2 },
  { key: "branding", icon: Palette },
  { key: "finance", icon: DollarSign },
  { key: "admin", icon: UserPlus },
  { key: "schedule", icon: Clock },
  { key: "complete", icon: CheckCircle2 },
];

export default function SetupWizardPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  const [company, setCompany] = useState({ name: "", arabicName: "", address: "", phone: "", email: "", taxNumber: "", commercialRegister: "", currency: "EGP" });
  const [branding, setBranding] = useState({ primaryColor: "#1e40af", secondaryColor: "#64748b", font: "Inter" });
  const [finance, setFinance] = useState({ defaultInsurancePercent: 5, maxInsurancePercent: 10, taxRate: 0, decimalPlaces: 2 });
  const [admin, setAdmin] = useState({ name: "", email: "", password: "", phone: "" });
  const [schedule, setSchedule] = useState({ checkInTime: "08:00", checkOutTime: "17:00", overtimeEnabled: true });

  useEffect(() => {
    setupWizardService.getStatus().then((s) => {
      if (s.isComplete) setSetupComplete(true);
    }).catch(() => {});
  }, []);

  const stepLabels = isArabic
    ? ["بيانات الشركة", "العلامة التجارية", "الإعدادات المالية", "إنشاء مدير", "جدول العمل", "الانتهاء"]
    : ["Company Info", "Branding", "Finance", "Administrator", "Work Schedule", "Complete"];

  const handleNext = async () => {
    setSaving(true);
    try {
      switch (currentStep) {
        case 0:
          await setupWizardService.saveCompany(company);
          break;
        case 1:
          await setupWizardService.saveBranding(branding);
          break;
        case 2:
          await setupWizardService.saveFinance(finance);
          break;
        case 3:
          await setupWizardService.createAdmin(admin);
          break;
        case 4:
          await setupWizardService.saveSchedule(schedule);
          break;
        case 5:
          await setupWizardService.complete();
          showToast(isArabic ? "تم إعداد النظام بنجاح" : "Setup completed successfully", "success");
          router.push(`/${locale}/admin`);
          return;
      }
      setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch (err: any) {
      showToast(err?.message || (isArabic ? "فشل الحفظ" : "Failed to save"), "error");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface text-text-primary focus:border-gold outline-none";

  if (setupComplete) {
    return (
      <div className="space-y-6">
        {ToastComponent}
        <Card className="p-12 text-center max-w-lg mx-auto mt-12">
          <CheckCircle2 size={64} className="text-success mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">
            {isArabic ? "تم الإعداد بالفعل" : "Setup Already Complete"}
          </h2>
          <p className="text-text-secondary mb-6">
            {isArabic ? "تم إعداد النظام بنجاح. يمكنك تغيير الإعدادات من صفحة إعدادات الشركة." : "System setup is complete. You can change settings from Company Settings."}
          </p>
          <Button onClick={() => router.push(`/${locale}/admin/settings`)}>
            {isArabic ? "إعدادات الشركة" : "Company Settings"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {ToastComponent}

      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {isArabic ? "معالج الإعداد الأولي" : "Setup Wizard"}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {isArabic ? "إعداد النظام خطوة بخطوة" : "Set up the system step by step"}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((step, i) => {
          const StepIcon = step.icon;
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          return (
            <div key={step.key} className="flex items-center">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                isActive ? "bg-primary text-white" : isDone ? "bg-success/10 text-success" : "bg-surface text-text-muted"
              }`}>
                {isDone ? <CheckCircle2 size={14} /> : <StepIcon size={14} />}
                {stepLabels[i]}
              </div>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="p-6">
        {/* Step 0: Company */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">{isArabic ? "بيانات الشركة" : "Company Information"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "اسم الشركة (إنجليزي)" : "Company Name (English)"} *</label>
                <input className={inputClass} value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "اسم الشركة (عربي)" : "Company Name (Arabic)"} *</label>
                <input className={inputClass} value={company.arabicName} onChange={(e) => setCompany({ ...company, arabicName: e.target.value })} dir="rtl" />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "البريد الإلكتروني" : "Email"}</label>
                <input className={inputClass} type="email" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "الهاتف" : "Phone"}</label>
                <input className={inputClass} value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "العنوان" : "Address"}</label>
                <input className={inputClass} value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "الرقم الضريبي" : "Tax Number"}</label>
                <input className={inputClass} value={company.taxNumber} onChange={(e) => setCompany({ ...company, taxNumber: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "السجل التجاري" : "Commercial Register"}</label>
                <input className={inputClass} value={company.commercialRegister} onChange={(e) => setCompany({ ...company, commercialRegister: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Branding */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">{isArabic ? "العلامة التجارية" : "Branding"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "اللون الرئيسي" : "Primary Color"}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={branding.primaryColor} onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                  <input className={inputClass} value={branding.primaryColor} onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "اللون الثانوي" : "Secondary Color"}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={branding.secondaryColor} onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                  <input className={inputClass} value={branding.secondaryColor} onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="p-3 bg-surface rounded-lg">
              <p className="text-xs text-text-muted">{isArabic ? "يمكنك تحميل الشعار والختم من صفحة إعدادات الشركة لاحقاً." : "You can upload logos and stamps from Company Settings later."}</p>
            </div>
          </div>
        )}

        {/* Step 2: Finance */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">{isArabic ? "الإعدادات المالية" : "Finance Defaults"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "نسبة التأمين الافتراضية %" : "Default Insurance %"}</label>
                <input className={inputClass} type="number" min="0" max="100" value={finance.defaultInsurancePercent} onChange={(e) => setFinance({ ...finance, defaultInsurancePercent: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "الحد الأقصى للتأمين %" : "Max Insurance %"}</label>
                <input className={inputClass} type="number" min="0" max="100" value={finance.maxInsurancePercent} onChange={(e) => setFinance({ ...finance, maxInsurancePercent: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "معدل الضريبة %" : "Tax Rate %"}</label>
                <input className={inputClass} type="number" min="0" max="100" value={finance.taxRate} onChange={(e) => setFinance({ ...finance, taxRate: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "الكسور العشرية" : "Decimal Places"}</label>
                <input className={inputClass} type="number" min="0" max="6" value={finance.decimalPlaces} onChange={(e) => setFinance({ ...finance, decimalPlaces: Number(e.target.value) })} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Admin */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">{isArabic ? "إنشاء حساب المدير" : "Create Administrator"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "الاسم" : "Name"} *</label>
                <input className={inputClass} value={admin.name} onChange={(e) => setAdmin({ ...admin, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "البريد الإلكتروني" : "Email"} *</label>
                <input className={inputClass} type="email" value={admin.email} onChange={(e) => setAdmin({ ...admin, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "كلمة المرور" : "Password"} *</label>
                <input className={inputClass} type="password" value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "الهاتف" : "Phone"}</label>
                <input className={inputClass} value={admin.phone} onChange={(e) => setAdmin({ ...admin, phone: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Schedule */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">{isArabic ? "جدول العمل" : "Work Schedule"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "وقت الحضور" : "Check-in Time"}</label>
                <input className={inputClass} type="time" value={schedule.checkInTime} onChange={(e) => setSchedule({ ...schedule, checkInTime: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">{isArabic ? "وقت الانصراف" : "Check-out Time"}</label>
                <input className={inputClass} type="time" value={schedule.checkOutTime} onChange={(e) => setSchedule({ ...schedule, checkOutTime: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={schedule.overtimeEnabled} onChange={(e) => setSchedule({ ...schedule, overtimeEnabled: e.target.checked })} className="w-4 h-4 rounded border-border" />
                  <span className="text-sm text-text-primary">{isArabic ? "تفعيل العمل الإضافي" : "Enable Overtime"}</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Complete */}
        {currentStep === 5 && (
          <div className="text-center py-8">
            <CheckCircle2 size={64} className="text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold text-text-primary mb-2">
              {isArabic ? "جاهز للإنهاء!" : "Ready to Finish!"}
            </h2>
            <p className="text-text-secondary max-w-md mx-auto">
              {isArabic
                ? "تم حفظ جميع الإعدادات. اضغط \"إنهاء\" لإتمام المعالج والبدء في استخدام النظام."
                : "All settings have been saved. Click \"Finish\" to complete the wizard and start using the system."}
            </p>
          </div>
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm disabled:opacity-40 hover:bg-surface transition"
        >
          {isArabic ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {isArabic ? "السابق" : "Back"}
        </button>
        <button
          onClick={handleNext}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition disabled:opacity-60"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {currentStep === 5
            ? (isArabic ? "إنهاء" : "Finish")
            : (isArabic ? "التالي" : "Next")}
          {currentStep < 5 && (isArabic ? <ChevronLeft size={16} /> : <ChevronRight size={16} />)}
        </button>
      </div>
    </div>
  );
}
