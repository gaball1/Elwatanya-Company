/* eslint-disable */
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { Can } from "@/components/Can";
import { companyService, type Company } from "@/services/company.service";
import {
  Building2, Upload, Camera, Save, Image,
  Palette, MapPin, DollarSign, Clock,
} from "lucide-react";

export default function SettingsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  const { showToast, ToastComponent } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    arabicName: "",
    primaryColor: "#1e40af",
    secondaryColor: "#64748b",
    font: "Inter",
    address: "",
    taxNumber: "",
    commercialRegister: "",
    phone: "",
    email: "",
    website: "",
    currency: "EGP",
    timezone: "Africa/Cairo",
    language: "ar",
  });

  const [logoPreview, setLogoPreview] = useState<string>("");
  const [smallLogoPreview, setSmallLogoPreview] = useState<string>("");
  const [watermarkPreview, setWatermarkPreview] = useState<string>("");
  const [stampPreview, setStampPreview] = useState<string>("");
  const [signaturePreview, setSignaturePreview] = useState<string>("");

  const logoRef = useRef<HTMLInputElement>(null);
  const smallLogoRef = useRef<HTMLInputElement>(null);
  const watermarkRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    companyService.get()
      .then((c) => {
        setCompany(c);
        setForm({
          name: c.name || "",
          arabicName: c.arabicName || "",
          primaryColor: c.primaryColor || "#1e40af",
          secondaryColor: c.secondaryColor || "#64748b",
          font: c.font || "Inter",
          address: c.address || "",
          taxNumber: c.taxNumber || "",
          commercialRegister: c.commercialRegister || "",
          phone: c.phone || "",
          email: c.email || "",
          website: c.website || "",
          currency: c.currency || "EGP",
          timezone: c.timezone || "Africa/Cairo",
          language: c.language || "ar",
        });
        setLogoPreview(c.logo || "");
        setSmallLogoPreview(c.smallLogo || "");
        setWatermarkPreview(c.watermark || "");
        setStampPreview(c.stamp || "");
        setSignaturePreview(c.signature || "");
      })
      .catch((err) => setError(err?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const updated = await companyService.update(form);
      setCompany(updated);
      showToast(isArabic ? "تم الحفظ بنجاح" : "Saved successfully", "success");
    } catch (err: any) {
      showToast(err?.message || (isArabic ? "فشل الحفظ" : "Save failed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (field: string, file: File | undefined) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (field === "logo") setLogoPreview(e.target?.result as string);
      else if (field === "smallLogo") setSmallLogoPreview(e.target?.result as string);
      else if (field === "watermark") setWatermarkPreview(e.target?.result as string);
      else if (field === "stamp") setStampPreview(e.target?.result as string);
      else if (field === "signature") setSignaturePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      let updated: Company;
      if (field === "logo") updated = await companyService.uploadLogo(file);
      else if (field === "smallLogo") updated = await companyService.uploadSmallLogo(file);
      else if (field === "watermark") updated = await companyService.uploadWatermark(file);
      else if (field === "stamp") updated = await companyService.uploadStamp(file);
      else updated = await companyService.uploadSignature(file);

      setCompany(updated);
      showToast(isArabic ? "تم رفع الصورة بنجاح" : "Image uploaded", "success");
    } catch (err: any) {
      showToast(err?.message || (isArabic ? "فشل رفع الصورة" : "Upload failed"), "error");
    }
  };

  const currencyOptions = [
    { value: "EGP", label: isArabic ? "جنيه مصري" : "EGP (Egyptian Pound)" },
    { value: "USD", label: "USD (US Dollar)" },
    { value: "SAR", label: isArabic ? "ريال سعودي" : "SAR (Saudi Riyal)" },
    { value: "AED", label: isArabic ? "درهم إماراتي" : "AED (UAE Dirham)" },
    { value: "EUR", label: "EUR (Euro)" },
  ];

  const languageOptions = [
    { value: "ar", label: isArabic ? "العربية" : "Arabic" },
    { value: "en", label: isArabic ? "الإنجليزية" : "English" },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-surface rounded animate-pulse" />
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="h-6 w-32 bg-surface rounded animate-pulse mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-10 bg-surface rounded animate-pulse" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {isArabic ? "حدث خطأ" : "Something went wrong"}
          </h3>
          <p className="text-text-secondary mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            {isArabic ? "إعادة المحاولة" : "Retry"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {ToastComponent}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {isArabic ? "إعدادات الشركة" : "Company Settings"}
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {isArabic ? "إدارة معلومات الشركة والعلامة التجارية" : "Manage company information and branding"}
          </p>
        </div>
        <Can permission="company.write">
          <Button onClick={handleSubmit} loading={saving} icon={<Save size={18} />}>
            {isArabic ? "حفظ" : "Save"}
          </Button>
        </Can>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-gold" />
              <h2 className="text-lg font-semibold text-text-primary">
                {isArabic ? "معلومات الشركة" : "Company Information"}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={isArabic ? "الاسم (بالعربية)" : "Arabic Name"}
                value={form.arabicName}
                onChange={(e) => handleChange("arabicName", e.target.value)}
                placeholder={isArabic ? "اسم الشركة بالعربية" : "Company name in Arabic"}
              />
              <Input
                label={isArabic ? "الاسم (بالإنجليزية)" : "English Name"}
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder={isArabic ? "اسم الشركة بالإنجليزية" : "Company name in English"}
              />
              <Input
                label={isArabic ? "رقم الضريبة" : "Tax Number"}
                value={form.taxNumber}
                onChange={(e) => handleChange("taxNumber", e.target.value)}
              />
              <Input
                label={isArabic ? "السجل التجاري" : "Commercial Register"}
                value={form.commercialRegister}
                onChange={(e) => handleChange("commercialRegister", e.target.value)}
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-gold" />
              <h2 className="text-lg font-semibold text-text-primary">
                {isArabic ? "معلومات الاتصال" : "Contact Information"}
              </h2>
            </div>
            <div className="space-y-4">
              <Input
                label={isArabic ? "العنوان" : "Address"}
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={isArabic ? "الهاتف" : "Phone"}
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
                <Input
                  label={isArabic ? "البريد الإلكتروني" : "Email"}
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>
              <Input
                label={isArabic ? "الموقع الإلكتروني" : "Website"}
                value={form.website}
                onChange={(e) => handleChange("website", e.target.value)}
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-gold" />
              <h2 className="text-lg font-semibold text-text-primary">
                {isArabic ? "العلامة التجارية" : "Branding"}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {isArabic ? "اللون الأساسي" : "Primary Color"}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => handleChange("primaryColor", e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={(e) => handleChange("primaryColor", e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {isArabic ? "اللون الثانوي" : "Secondary Color"}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondaryColor}
                    onChange={(e) => handleChange("secondaryColor", e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <Input
                    value={form.secondaryColor}
                    onChange={(e) => handleChange("secondaryColor", e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <Input
                label={isArabic ? "الخط" : "Font"}
                value={form.font}
                onChange={(e) => handleChange("font", e.target.value)}
                placeholder="Inter"
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-gold" />
              <h2 className="text-lg font-semibold text-text-primary">
                {isArabic ? "الإعدادات المحلية" : "Localization"}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {isArabic ? "العملة" : "Currency"}
                </label>
                <select
                  value={form.currency}
                  onChange={(e) => handleChange("currency", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-text-primary focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all duration-150"
                >
                  {currencyOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {isArabic ? "اللغة" : "Language"}
                </label>
                <select
                  value={form.language}
                  onChange={(e) => handleChange("language", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-text-primary focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all duration-150"
                >
                  {languageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <Input
                label={isArabic ? "المنطقة الزمنية" : "Timezone"}
                value={form.timezone}
                onChange={(e) => handleChange("timezone", e.target.value)}
                placeholder="Africa/Cairo"
              />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-5 h-5 text-gold" />
              <h2 className="text-lg font-semibold text-text-primary">
                {isArabic ? "الشعارات" : "Logos"}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {isArabic ? "الشعار الرئيسي" : "Main Logo"}
                </label>
                <div className="relative">
                  <div className="w-full aspect-video rounded-lg border-2 border-dashed border-border bg-surface/50 flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <Camera className="w-8 h-8 text-text-secondary" />
                    )}
                  </div>
                  <Can permission="company.write">
                    <input
                      ref={logoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload("logo", e.target.files?.[0])}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      icon={<Upload className="w-4 h-4" />}
                      onClick={() => logoRef.current?.click()}
                    >
                      {isArabic ? "رفع" : "Upload"}
                    </Button>
                  </Can>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {isArabic ? "الشعار الصغير" : "Small Logo"}
                </label>
                <div className="relative">
                  <div className="w-full aspect-video rounded-lg border-2 border-dashed border-border bg-surface/50 flex items-center justify-center overflow-hidden">
                    {smallLogoPreview ? (
                      <img src={smallLogoPreview} alt="Small Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <Camera className="w-8 h-8 text-text-secondary" />
                    )}
                  </div>
                  <Can permission="company.write">
                    <input
                      ref={smallLogoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload("smallLogo", e.target.files?.[0])}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      icon={<Upload className="w-4 h-4" />}
                      onClick={() => smallLogoRef?.current?.click()}
                    >
                      {isArabic ? "رفع" : "Upload"}
                    </Button>
                  </Can>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-5 h-5 text-gold" />
              <h2 className="text-lg font-semibold text-text-primary">
                {isArabic ? "العلامة المائية والختم" : "Watermark & Stamp"}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {isArabic ? "العلامة المائية" : "Watermark"}
                </label>
                <div className="relative">
                  <div className="w-full aspect-video rounded-lg border-2 border-dashed border-border bg-surface/50 flex items-center justify-center overflow-hidden">
                    {watermarkPreview ? (
                      <img src={watermarkPreview} alt="Watermark" className="w-full h-full object-contain p-2" />
                    ) : (
                      <Camera className="w-8 h-8 text-text-secondary" />
                    )}
                  </div>
                  <Can permission="company.write">
                    <input
                      ref={watermarkRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload("watermark", e.target.files?.[0])}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      icon={<Upload className="w-4 h-4" />}
                      onClick={() => watermarkRef.current?.click()}
                    >
                      {isArabic ? "رفع" : "Upload"}
                    </Button>
                  </Can>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {isArabic ? "الختم" : "Stamp"}
                </label>
                <div className="relative">
                  <div className="w-full aspect-video rounded-lg border-2 border-dashed border-border bg-surface/50 flex items-center justify-center overflow-hidden">
                    {stampPreview ? (
                      <img src={stampPreview} alt="Stamp" className="w-full h-full object-contain p-2" />
                    ) : (
                      <Camera className="w-8 h-8 text-text-secondary" />
                    )}
                  </div>
                  <Can permission="company.write">
                    <input
                      ref={stampRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload("stamp", e.target.files?.[0])}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      icon={<Upload className="w-4 h-4" />}
                      onClick={() => stampRef.current?.click()}
                    >
                      {isArabic ? "رفع" : "Upload"}
                    </Button>
                  </Can>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {isArabic ? "التوقيع" : "Signature"}
                </label>
                <div className="relative">
                  <div className="w-full aspect-video rounded-lg border-2 border-dashed border-border bg-surface/50 flex items-center justify-center overflow-hidden">
                    {signaturePreview ? (
                      <img src={signaturePreview} alt="Signature" className="w-full h-full object-contain p-2" />
                    ) : (
                      <Camera className="w-8 h-8 text-text-secondary" />
                    )}
                  </div>
                  <Can permission="company.write">
                    <input
                      ref={signatureRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload("signature", e.target.files?.[0])}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      icon={<Upload className="w-4 h-4" />}
                      onClick={() => signatureRef.current?.click()}
                    >
                      {isArabic ? "رفع" : "Upload"}
                    </Button>
                  </Can>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
