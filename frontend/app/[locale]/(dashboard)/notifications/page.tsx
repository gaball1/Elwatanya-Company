/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  CheckCheck,
} from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
  date: string;
  read: boolean;
}

export default function NotificationsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: isArabic ? "مقايسة جديدة" : "New Estimate",
      message: isArabic
        ? "تم إضافة مقايسة تحليلية جديدة لمشروع الأندلس"
        : "New analytical estimate added for Al-Andalus project",
      type: "info",
      date: new Date().toISOString(),
      read: false,
    },
    {
      id: "2",
      title: isArabic ? "مستخلص قيد الانتظار" : "Pending Statement",
      message: isArabic
        ? "مستخلص المقاول محمد أبو كريم ينتظر الموافقة"
        : "Subcontractor Mohamed Abu Kareem statement pending approval",
      type: "warning",
      date: new Date(Date.now() - 86400000).toISOString(),
      read: false,
    },
    {
      id: "3",
      title: isArabic ? "مخزون منخفض" : "Low Stock",
      message: isArabic
        ? "الأسمنت المتبقي 50 كيس فقط - أقل من الحد الأدنى"
        : "Only 50 cement bags remaining - below minimum level",
      type: "error",
      date: new Date(Date.now() - 172800000).toISOString(),
      read: false,
    },
    {
      id: "4",
      title: isArabic ? "اكتمال مشروع" : "Project Completed",
      message: isArabic
        ? "تم الانتهاء من مشروع برج النيل التجاري بنجاح"
        : "Nile Tower commercial project completed successfully",
      type: "success",
      date: new Date(Date.now() - 259200000).toISOString(),
      read: true,
    },
  ]);

  const [filter, setFilter] = useState<"all" | "unread">("all");

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "error":
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const filteredNotifications = notifications.filter((n) =>
    filter === "all" ? true : !n.read
  );
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="min-h-screen bg-gray-light">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {isArabic ? "الإشعارات" : "Notifications"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isArabic
                ? "آخر التحديثات والإشعارات"
                : "Latest updates and notifications"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gold border border-gold rounded-lg hover:bg-gold hover:text-white transition"
            >
              <CheckCheck size={18} />
              {isArabic ? "تحديد الكل كمقروء" : "Mark all as read"}
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-6">
          <button
            onClick={() => setFilter("all")}
            className={`py-3 border-b-2 transition-colors ${
              filter === "all"
                ? "border-gold text-gold"
                : "border-transparent text-gray-500 hover:text-primary"
            }`}
          >
            {isArabic ? "الكل" : "All"} ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`py-3 border-b-2 transition-colors ${
              filter === "unread"
                ? "border-gold text-gold"
                : "border-transparent text-gray-500 hover:text-primary"
            }`}
          >
            {isArabic ? "غير مقروء" : "Unread"} ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="p-6">
        {filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {isArabic ? "لا توجد إشعارات" : "No notifications"}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.read && markAsRead(notif.id)}
                className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer ${
                  !notif.read ? "border-r-4 border-gold" : ""
                }`}
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0">{getIcon(notif.type)}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3
                        className={`font-bold ${
                          !notif.read ? "text-primary" : "text-gray-600"
                        }`}
                      >
                        {notif.title}
                      </h3>
                      <span className="text-xs text-gray-400">
                        {new Date(notif.date).toLocaleDateString(
                          isArabic ? "ar" : "en"
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {notif.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
