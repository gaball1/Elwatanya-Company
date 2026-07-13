/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui";
import {
  Building2,
  TrendingUp,
  Users,
  DollarSign,
  Package,
  FileText,
  Bell,
  X,
} from "lucide-react";
import {
  mockProjects,
  mockSubcontractors,
  mockProjectFunds,
  mockInventory,
} from "@/lib/mockData";

// نوع الإشعار
interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  date: string;
  read: boolean;
}

export default function AdminDashboard() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  // إشعارات تجريبية
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

  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(
    notifications.filter((n) => !n.read).length
  );

  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.read).length);
  }, [notifications]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      default:
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  const totalProjects = mockProjects.length;
  const activeProjects = mockProjects.filter(
    (p) => p.status === "active"
  ).length;
  const totalSubcontractors = mockSubcontractors.length;
  const totalFunds = mockProjectFunds.reduce(
    (sum, f) => sum + f.currentBalance,
    0
  );
  const totalInventory = mockInventory.reduce((sum, i) => sum + i.quantity, 0);

  const stats = [
    {
      label: isArabic ? "إجمالي المشاريع" : "Total Projects",
      value: totalProjects,
      icon: <Building2 className="w-6 h-6" />,
      color: "bg-blue-500",
      link: `/${locale}/projects`,
    },
    {
      label: isArabic ? "مشاريع نشطة" : "Active Projects",
      value: activeProjects,
      icon: <TrendingUp className="w-6 h-6" />,
      color: "bg-green-500",
      link: `/${locale}/projects`,
    },
    {
      label: isArabic ? "المقاولين" : "Subcontractors",
      value: totalSubcontractors,
      icon: <Users className="w-6 h-6" />,
      color: "bg-gold",
      link: `/${locale}/subcontractors`,
    },
    {
      label: isArabic ? "إجمالي العهد" : "Total Funds",
      value: `${(totalFunds / 1000).toFixed(0)}k ج.م`,
      icon: <DollarSign className="w-6 h-6" />,
      color: "bg-purple-500",
      link: `/${locale}/projects`,
    },
    {
      label: isArabic ? "أصناف المخازن" : "Inventory Items",
      value: totalInventory,
      icon: <Package className="w-6 h-6" />,
      color: "bg-orange-500",
      link: `/${locale}/inventory`,
    },
    {
      label: isArabic ? "المستخلصات" : "Statements",
      value: "3",
      icon: <FileText className="w-6 h-6" />,
      color: "bg-red-500",
      link: `/${locale}/statements`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-light">
      {/* Header with Notifications */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {isArabic ? "لوحة التحكم" : "Dashboard"}
            </h1>
            <p className="text-gray-500 mt-1">
              {isArabic
                ? "مرحباً بك في نظام الوطنية للتنمية العمرانية"
                : "Welcome to El Wataniya Urban Development System"}
            </p>
          </div>

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-500 hover:text-primary transition rounded-full hover:bg-gray-100"
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-lg border z-50 overflow-hidden">
                <div className="flex justify-between items-center p-3 border-b bg-gray-50">
                  <h3 className="font-bold text-primary">
                    {isArabic ? "الإشعارات" : "Notifications"}
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-gold hover:underline"
                    >
                      {isArabic ? "تحديد الكل كمقروء" : "Mark all as read"}
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <Bell size={32} className="mx-auto text-gray-300 mb-2" />
                      <p>{isArabic ? "لا توجد إشعارات" : "No notifications"}</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 border-b hover:bg-gray-50 transition relative ${
                          !notif.read ? "bg-blue-50/30" : ""
                        }`}
                        onClick={() => markAsRead(notif.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-800">
                              {notif.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {notif.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notif.date).toLocaleDateString(
                                isArabic ? "ar" : "en"
                              )}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif.id);
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        {!notif.read && (
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <Link key={i} href={stat.link}>
            <Card hover className="p-4 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs">{stat.label}</p>
                  <p className="text-xl font-bold text-primary mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-2 rounded-full text-white`}>
                  {stat.icon}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Projects Analysis */}
      <div className="px-6 pb-6">
        <h2 className="text-lg font-bold text-primary mb-4">
          {isArabic ? "تحليل المشاريع" : "Projects Analysis"}
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockProjects.map((project) => (
            <Link key={project.id} href={`/${locale}/projects/${project.id}`}>
              <Card hover className="p-5 cursor-pointer">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-primary">{project.name}</h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      project.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {project.status === "active"
                      ? isArabic
                        ? "نشط"
                        : "Active"
                      : isArabic
                      ? "مكتمل"
                      : "Completed"}
                  </span>
                </div>
                <p className="text-gray-500 text-sm mb-3">{project.location}</p>
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{isArabic ? "نسبة الإنجاز" : "Progress"}</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gold rounded-full h-2"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-3">
                  <span>
                    {isArabic ? "تاريخ البدء" : "Start Date"}:{" "}
                    {project.startDate}
                  </span>
                  <span>
                    {isArabic ? "الميزانية" : "Budget"}: 2,000,000 ج.م
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
