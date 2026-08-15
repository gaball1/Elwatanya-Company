/* eslint-disable */
"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui";
import { Can } from '@/components/Can';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  CheckCheck,
  Plus,
  Trash2,
} from "lucide-react";
import { notificationService, type Notification } from "@/services/notification.service";
import { useToast } from "@/components/ui/Toast";
import { refreshUnreadCount } from "@/hooks/useNotifications";
import { resolveNotificationHref } from "@/lib/notificationLink";

export default function NotificationsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", titleEn: "", message: "", messageEn: "", type: "info", targetRoles: "", targetPermissions: "" });

  const parseTargets = (raw: string) =>
    raw
      .split(/[,،\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s, i, arr) => arr.indexOf(s) === i);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationService.list();
      setNotifications(data);
    } catch (error) {
      showToast(isArabic ? "حدث خطأ في تحميل الإشعارات" : "Failed to load notifications", "error");
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const filteredNotifications = useMemo(() => notifications.filter((n) => filter === "all" || !n.read), [notifications, filter]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      await refreshUnreadCount();
    } catch { }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await refreshUnreadCount();
      showToast(isArabic ? "تم تحديد الكل كمقروء" : "All marked as read", "success");
    } catch { }
  }, [isArabic]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await notificationService.create({
        title: form.title,
        titleEn: form.titleEn,
        message: form.message,
        messageEn: form.messageEn,
        type: form.type,
        targetRoles: parseTargets(form.targetRoles),
        targetPermissions: parseTargets(form.targetPermissions),
      });
      showToast(isArabic ? "تم إنشاء الإشعار" : "Notification created", "success");
      await fetchNotifications();
      setShowModal(false);
      setForm({ title: "", titleEn: "", message: "", messageEn: "", type: "info", targetRoles: "", targetPermissions: "" });
    } catch (error: any) {
      showToast(error?.message || (isArabic ? "حدث خطأ" : "Error"), "error");
    }
  }, [form, isArabic, fetchNotifications, parseTargets]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await notificationService.remove(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await refreshUnreadCount();
      showToast(isArabic ? "تم حذف الإشعار" : "Notification deleted", "success");
    } catch { }
  }, [isArabic]);

  const getIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle className="w-5 h-5 text-success" />;
      case "warning": return <AlertCircle className="w-5 h-5 text-warning" />;
      case "error": return <X className="w-5 h-5 text-danger" />;
      default: return <Info className="w-5 h-5 text-info" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-light">
      {ToastComponent}
      <div className="bg-surface border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">{isArabic ? "الإشعارات" : "Notifications"}</h1>
            <p className="text-sm text-text-secondary mt-1">{isArabic ? "آخر التحديثات والإشعارات" : "Latest updates and notifications"}</p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="flex items-center gap-2 px-4 py-2 text-sm text-gold border border-gold rounded-lg hover:bg-gold hover:text-white transition">
                <CheckCheck size={18} /> {isArabic ? "تحديد الكل كمقروء" : "Mark all as read"}
              </button>
            )}
            <Can permission="notifications.create">
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
                <Plus size={18} /> {isArabic ? "إضافة إشعار" : "Add Notification"}
              </button>
            </Can>
          </div>
        </div>
      </div>

      <div className="bg-surface border-b px-6">
        <div className="flex gap-6">
          <button onClick={() => setFilter("all")} className={`py-3 border-b-2 transition-colors ${filter === "all" ? "border-gold text-gold" : "border-transparent text-text-secondary hover:text-primary"}`}>
            {isArabic ? "الكل" : "All"} ({notifications.length})
          </button>
          <button onClick={() => setFilter("unread")} className={`py-3 border-b-2 transition-colors ${filter === "unread" ? "border-gold text-gold" : "border-transparent text-text-secondary hover:text-primary"}`}>
            {isArabic ? "غير مقروء" : "Unread"} ({unreadCount})
          </button>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <Card className="p-12 text-center"><p className="text-text-secondary">{isArabic ? "جاري التحميل..." : "Loading..."}</p></Card>
        ) : filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell size={64} className="mx-auto text-text-muted mb-4" />
            <p className="text-text-secondary">{isArabic ? "لا توجد إشعارات" : "No notifications"}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              const href = resolveNotificationHref(notif, locale);
              return (
                <div
                  key={notif.id}
                  onClick={href ? () => router.push(href) : undefined}
                  className={`bg-surface rounded-xl p-4 shadow-sm hover:shadow-md transition ${href ? "cursor-pointer" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">{getIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className={`font-bold ${!notif.read ? "text-primary" : "text-text-secondary"}`}>
                          {notif.title}
                        </h3>
                        <span className="text-xs text-text-muted whitespace-nowrap">{new Date(notif.date).toLocaleDateString(isArabic ? "ar" : "en")}</span>
                      </div>
                      <p className="text-sm text-text-secondary mt-1">{notif.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {!notif.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                        className="text-xs text-gold hover:underline transition"
                      >
                        {isArabic ? "تحديد كمقروء" : "Mark read"}
                      </button>
                    )}
                    <Can permission="notifications.delete">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}
                        className="text-text-muted hover:text-danger transition p-1"
                        title={isArabic ? "حذف" : "Delete"}
                      >
                        <Trash2 size={16} />
                      </button>
                    </Can>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-primary">{isArabic ? "إضافة إشعار جديد" : "Add New Notification"}</h2>
              <button onClick={() => setShowModal(false)}><X size={24} className="text-text-muted" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <input name="title" placeholder={isArabic ? "العنوان (عربي)" : "Title (Arabic)"} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full p-3 border rounded-xl" required />
              <input name="titleEn" placeholder={isArabic ? "العنوان (إنجليزي)" : "Title (English)"} value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} className="w-full p-3 border rounded-xl" />
              <textarea name="message" placeholder={isArabic ? "الرسالة (عربي)" : "Message (Arabic)"} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full p-3 border rounded-xl" required />
              <textarea name="messageEn" placeholder={isArabic ? "الرسالة (إنجليزي)" : "Message (English)"} value={form.messageEn} onChange={(e) => setForm({ ...form, messageEn: e.target.value })} className="w-full p-3 border rounded-xl" />
              <select name="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full p-3 border rounded-xl">
                <option value="info">{isArabic ? "معلومات" : "Info"}</option>
                <option value="success">{isArabic ? "نجاح" : "Success"}</option>
                <option value="warning">{isArabic ? "تحذير" : "Warning"}</option>
                <option value="error">{isArabic ? "خطأ" : "Error"}</option>
              </select>
              <input name="targetRoles" placeholder={isArabic ? "الأدوار المستهدفة (افصل بينها بفواصل) — اتركها فارغة للجميع" : "Target roles (comma separated) — leave empty for everyone"} value={form.targetRoles} onChange={(e) => setForm({ ...form, targetRoles: e.target.value })} className="w-full p-3 border rounded-xl" />
              <input name="targetPermissions" placeholder={isArabic ? "الصلاحيات المستهدفة (افصل بينها بفواصل)" : "Target permissions (comma separated)"} value={form.targetPermissions} onChange={(e) => setForm({ ...form, targetPermissions: e.target.value })} className="w-full p-3 border rounded-xl" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-xl">{isArabic ? "إلغاء" : "Cancel"}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-xl">{isArabic ? "حفظ" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
