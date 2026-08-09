/* eslint-disable */
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui";
import SignaturePad from "@/components/signature/SignaturePad";
import { profileService } from "@/services/profile.service";
import { Pen, Upload, Trash2, Check, Image } from "lucide-react";

export default function SignaturesPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPad, setShowPad] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    profileService.getSignature()
      .then((data) => setSignatureUrl(data.signatureUrl || ""))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePadSave = async (dataUrl: string) => {
    setSaving(true);
    try {
      await profileService.saveSignature(dataUrl);
      setSignatureUrl(dataUrl);
      setShowPad(false);
      showToast(isArabic ? "تم حفظ التوقيع" : "Signature saved", "success");
    } catch {
      showToast(isArabic ? "فشل حفظ التوقيع" : "Failed to save signature", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setSaving(true);
      try {
        await profileService.saveSignature(dataUrl);
        setSignatureUrl(dataUrl);
        showToast(isArabic ? "تم رفع التوقيع" : "Signature uploaded", "success");
      } catch {
        showToast(isArabic ? "فشل رفع التوقيع" : "Upload failed", "error");
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await profileService.clearSignature();
      setSignatureUrl("");
      showToast(isArabic ? "تم حذف التوقيع" : "Signature deleted", "success");
    } catch {
      showToast(isArabic ? "فشل حذف التوقيع" : "Delete failed", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-surface rounded animate-pulse" />
        <Card className="p-6">
          <div className="h-40 bg-surface rounded animate-pulse" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {ToastComponent}
      <PageHeader
        title={isArabic ? "التوقيعات" : "Signatures"}
        description={isArabic ? "إدارة توقيعك الرقمي" : "Manage your digital signature"}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Pen className="w-5 h-5 text-gold" />
            <h2 className="text-lg font-semibold text-text-primary">
              {isArabic ? "التوقيع الحالي" : "Current Signature"}
            </h2>
          </div>

          {signatureUrl ? (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-white flex items-center justify-center min-h-[120px]">
                <img src={signatureUrl} alt="Signature" className="max-h-24 object-contain" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" icon={<Upload className="w-4 h-4" />} onClick={() => fileRef.current?.click()}>
                  {isArabic ? "استبدال" : "Replace"}
                </Button>
                <Button variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={handleDelete} loading={saving}>
                  {isArabic ? "حذف" : "Delete"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Pen className="w-12 h-12 text-text-secondary mx-auto mb-3" />
              <p className="text-text-secondary mb-4">
                {isArabic ? "لم تقم بحفظ توقيع بعد" : "No signature saved yet"}
              </p>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </Card>

        {!showPad ? (
          <Card className="p-6 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Button
                variant="primary"
                size="lg"
                icon={<Pen className="w-5 h-5" />}
                onClick={() => setShowPad(true)}
              >
                {isArabic ? "إنشاء توقيع جديد" : "Create New Signature"}
              </Button>
              <p className="text-sm text-text-secondary">
                {isArabic ? "ارسم توقيعك باستخدام الماوس أو اللمس" : "Draw your signature using mouse or touch"}
              </p>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary">
                {isArabic ? "ارسم توقيعك" : "Draw Your Signature"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowPad(false)}>
                {isArabic ? "إلغاء" : "Cancel"}
              </Button>
            </div>
            <SignaturePad onSave={handlePadSave} />
          </Card>
        )}
      </div>
    </div>
  );
}
