/* eslint-disable */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { useUser } from "@/hooks/useUser";
import {
  User, Mail, Shield, FolderKanban, Building2, Calendar, KeyRound, Save, Camera,
} from "lucide-react";
import { apiClient } from "@/lib/api/apiClient";

export default function ProfilePage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();
  const { user, refresh } = useUser();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiClient<any>('/profile', { method: 'GET' });
      setProfile(data);
      setName(data.name ?? user.name);
    } catch {
      showToast(isArabic ? "فشل تحميل الملف الشخصي" : "Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSaveProfile = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await apiClient('/profile', { method: 'PATCH', body: { name } });
      showToast(isArabic ? "تم تحديث الملف الشخصي" : "Profile updated", "success");
      await refresh();
    } catch {
      showToast(isArabic ? "فشل تحديث الملف الشخصي" : "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      showToast(isArabic ? "يرجى ملء جميع الحقول" : "Please fill all fields", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(isArabic ? "كلمة المرور الجديدة غير متطابقة" : "Passwords do not match", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast(isArabic ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters", "error");
      return;
    }
    setChangingPwd(true);
    try {
      await apiClient('/profile/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      showToast(isArabic ? "تم تغيير كلمة المرور" : "Password changed", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      showToast(isArabic ? "فشل تغيير كلمة المرور" : "Failed to change password", "error");
    } finally {
      setChangingPwd(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-surface-secondary rounded" />
          <div className="h-64 bg-surface-secondary rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {ToastComponent}

      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {isArabic ? "الملف الشخصي" : "Profile"}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {isArabic ? "عرض وتحديث معلوماتك الشخصية" : "View and update your personal information"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info Card */}
        <Card className="lg:col-span-1 p-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative w-24 h-24 rounded-full bg-gold/20 flex items-center justify-center mb-4">
              <span className="text-3xl font-bold text-gold">
                {profile.name?.charAt(0).toUpperCase() ?? "U"}
              </span>
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gold text-white flex items-center justify-center shadow-md hover:bg-gold/90 transition-colors">
                <Camera size={14} />
              </button>
            </div>
            <h2 className="text-lg font-bold text-text-primary">{profile.name}</h2>
            <p className="text-sm text-text-muted">{profile.email}</p>
            <div className="mt-4 w-full space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">{isArabic ? "الحالة" : "Status"}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  profile.status === "ACTIVE"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {profile.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">{isArabic ? "الدور" : "Role"}</span>
                <span className="text-text-primary font-medium">{profile.role}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">{isArabic ? "تاريخ التسجيل" : "Joined"}</span>
                <span className="text-text-primary">
                  {new Date(profile.createdAt).toLocaleDateString(isArabic ? "ar" : "en")}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Profile */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <User size={18} /> {isArabic ? "المعلومات الشخصية" : "Personal Information"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  {isArabic ? "الاسم" : "Name"}
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  {isArabic ? "البريد الإلكتروني" : "Email"}
                </label>
                <Input value={profile.email} disabled className="opacity-60" />
                <p className="text-xs text-text-muted mt-1">
                  {isArabic ? "لا يمكن تغيير البريد الإلكتروني" : "Email cannot be changed"}
                </p>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving}>
                <Save size={16} /> {saving
                  ? (isArabic ? "جاري الحفظ..." : "Saving...")
                  : (isArabic ? "حفظ التغييرات" : "Save Changes")
                }
              </Button>
            </div>
          </Card>

          {/* Change Password */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <KeyRound size={18} /> {isArabic ? "تغيير كلمة المرور" : "Change Password"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  {isArabic ? "كلمة المرور الحالية" : "Current Password"}
                </label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  {isArabic ? "كلمة المرور الجديدة" : "New Password"}
                </label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  {isArabic ? "تأكيد كلمة المرور" : "Confirm New Password"}
                </label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button onClick={handleChangePassword} disabled={changingPwd}>
                <KeyRound size={16} /> {changingPwd
                  ? (isArabic ? "جاري التغيير..." : "Changing...")
                  : (isArabic ? "تغيير كلمة المرور" : "Change Password")
                }
              </Button>
            </div>
          </Card>

          {/* Roles & Projects */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <Shield size={18} /> {isArabic ? "الصلاحيات والمشاريع" : "Roles & Projects"}
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-text-muted mb-2">{isArabic ? "الصلاحيات" : "Roles"}</p>
                <div className="flex flex-wrap gap-2">
                  {profile.roles?.map((role: any) => (
                    <span key={role.id} className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {role.name}
                    </span>
                  ))}
                  {(!profile.roles || profile.roles.length === 0) && (
                    <span className="text-sm text-text-muted">{isArabic ? "لا توجد صلاحيات" : "No roles assigned"}</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-text-muted mb-2">{isArabic ? "المشاريع" : "Projects"}</p>
                <div className="flex flex-wrap gap-2">
                  {profile.projects?.map((project: any) => (
                    <span key={project.id} className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                      {project.name}
                    </span>
                  ))}
                  {(!profile.projects || profile.projects.length === 0) && (
                    <span className="text-sm text-text-muted">{isArabic ? "لا توجد مشاريع" : "No projects assigned"}</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
