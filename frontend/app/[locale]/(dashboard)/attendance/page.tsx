"use client";

import { useParams } from "next/navigation";
import NextImage from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Dialog } from "@/components/ui";
import {
  MapPin,
  Camera,
  LogIn,
  LogOut,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Smartphone,
  Building2,
  Briefcase,
  Navigation,
  RefreshCw,
  History,
  WifiOff,
  ChevronDown,
  Plus,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { attendanceService, type Attendance, type AttendanceOverride, type CheckOutData } from "@/services/attendance.service";
import { employeeService, type Employee } from "@/services/employee.service";
import { projectService } from "@/services/project.service";
import DataLoader from "@/components/shared/DataLoader";
import type { Project } from "@/services/project.service";
import { buildingService, type Building } from "@/services/building.service";
import { shiftService, type Shift } from "@/services/shift.service";
import { useToast } from "@/components/ui/Toast";

const GPS_ACCURACY_WARNING = 30;

function compressImage(dataUrl: string, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context not available')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function getDeviceInfo(): string {
  try {
    return JSON.stringify({
      browser: navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/)?.[0] ?? 'Unknown',
      os: navigator.platform,
      language: navigator.language,
      screen: `${screen.width}x${screen.height}`,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return '{}';
  }
}

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface GpsState {
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
}

interface CheckInQueueItemData {
  employeeId: string;
  date: string;
  checkInTime: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkInAddress?: string;
  checkInAccuracy?: number;
  checkInSelfie?: string;
  deviceInfo?: string;
  distanceFromSite?: number;
  projectId?: string;
  buildingId?: string;
  shiftId?: string;
  notes?: string;
}

interface CheckOutQueueItemData {
  id: string;
  body: CheckOutData;
}

type QueueItem =
  | { type: 'checkIn'; data: CheckInQueueItemData; timestamp: string }
  | { type: 'checkOut'; data: CheckOutQueueItemData; timestamp: string };

interface TamperWarning {
  clockSkew: boolean;
  vpnDetected: boolean;
}

type StepState = 'detect' | 'selfie' | 'checkin' | 'checkout' | 'complete';

export default function AttendancePage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { user } = useAuth();
  const { showToast, ToastComponent } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [todayRecord, setTodayRecord] = useState<Attendance | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [pendingOverrides, setPendingOverrides] = useState<AttendanceOverride[]>([]);
  const [loading, setLoading] = useState(true);

  const [gps, setGps] = useState<GpsState | null>(null);
  const [gettingGps, setGettingGps] = useState(false);

  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [queuedItems, setQueuedItems] = useState<QueueItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");

  const [, setStep] = useState<StepState>('detect');
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [pendingCheckInPayload, setPendingCheckInPayload] = useState<{ data: CheckInQueueItemData; overrideId?: string } | null>(null);
  const [pendingCheckOutPayload, setPendingCheckOutPayload] = useState<{ id: string; body: CheckOutData; overrideId?: string } | null>(null);
  const [, setTamperWarnings] = useState<TamperWarning>({ clockSkew: false, vpnDetected: false });

  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const isOnline = useMemo(() => typeof navigator !== 'undefined' ? navigator.onLine : true, []);

  const loadMyOverrides = useCallback(async (employeeId?: string | null) => {
    if (!employeeId) {
      setPendingOverrides([]);
      return;
    }
    try {
      const items = await attendanceService.listMyOverrides();
      setPendingOverrides(items.filter((o) => o.employeeId === employeeId));
    } catch {
      // ignore — pending state just won't be shown on error
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Non-essential lookups fail gracefully so one 403 never blocks the page.
        const loadList = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
          try {
            return await fn();
          } catch {
            return fallback;
          }
        };

        const [projs, blds, shfs] = await Promise.all([
          loadList(() => projectService.getProjects(), []),
          loadList(() => buildingService.list(), []),
          loadList(() => shiftService.list(), []),
        ]);
        setProjects(projs);
        setBuildings(blds);
        setShifts(shfs);

        // Resolve the current user's employee record. Self-service accounts
        // (linked user -> employee) use /employees/me + /attendance/me, so no
        // employees.read/attendance.read permissions are required. Privileged
        // accounts without a linked employee fall back to the full list.
        let emp: Employee | null = null;
        let records: Attendance[] = [];
        const canListEmployees =
          user?.roleNames?.includes("SUPER_ADMIN") || user?.permissions?.includes("employees.read");
        try {
          emp = await employeeService.getMe();
          records = await attendanceService.listMine();
        } catch {
          // The privileged fallback (full list) is only reachable for accounts
          // that may actually read employees; for everyone else it would 403.
          if (canListEmployees) {
            try {
              const employees = await employeeService.list();
              emp = employees.find((e) => e.userId === user?.id) ?? employees[0] ?? null;
              records = await attendanceService.list();
            } catch {
              emp = null;
              records = [];
            }
          }
        }
        setEmployee(emp);

        if (emp) {
          const todayStr = getTodayStr();
          const todays = records.filter(
            (r) => r.date.startsWith(todayStr) && r.employeeId === emp.id
          );
          setTodayRecord(todays[todays.length - 1] ?? null);
          setAttendanceHistory(records.filter((r) => r.employeeId === emp.id).slice(0, 10));
        } else {
          setAttendanceHistory(records.slice(0, 10));
        }
        void loadMyOverrides(emp?.id);

        const stored = localStorage.getItem('attendanceQueue');
        if (stored) {
          try {
            setQueuedItems(JSON.parse(stored));
          } catch { /* ignore */ }
        }

        // Anti-tampering checks
        const warnings: TamperWarning = { clockSkew: false, vpnDetected: false };
        if (typeof performance !== 'undefined' && performance.timeOrigin) {
          const originAgo = Date.now() - performance.timeOrigin;
          if (Math.abs(originAgo - performance.now()) > 5000) {
            warnings.clockSkew = true;
          }
        }
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const vpnZones = ['Asia/Kabul', 'Asia/Yerevan', 'Europe/Minsk', 'Asia/Rangoon', 'Asia/Colombo'];
          if (!navigator.onLine && vpnZones.includes(tz)) {
            warnings.vpnDetected = true;
          }
        } catch { /* ignore */ }
        setTamperWarnings(warnings);
      } catch {
        showToast(isArabic ? "خطأ في تحميل البيانات" : "Error loading data", "error");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isArabic, showToast, user?.id, loadMyOverrides, user?.permissions, user?.roleNames]);

  const todayStr = getTodayStr();
  const pendingCheckIn = useMemo(
    () =>
      pendingOverrides.find(
        (o) => o.type === 'check_in' && o.status === 'pending' && (o.date ?? '').startsWith(todayStr)
      ) ?? null,
    [pendingOverrides, todayStr]
  );
  const pendingCheckOut = useMemo(
    () =>
      pendingOverrides.find(
        (o) => o.type === 'check_out' && o.status === 'pending' && (o.date ?? '').startsWith(todayStr)
      ) ?? null,
    [pendingOverrides, todayStr]
  );

  const assignedProject = useMemo(() => {
    if (!employee || !projects.length) return null;
    const empProjectIds = user?.projectIds ?? [];
    if (selectedProjectId) return projects.find((p) => p.id === selectedProjectId) ?? null;
    if (empProjectIds.length > 0) return projects.find((p) => empProjectIds.includes(p.id)) ?? null;
    return projects[0] ?? null;
  }, [employee, projects, selectedProjectId, user]);

  const selectedBuilding = useMemo(() => {
    if (!selectedBuildingId || !buildings.length) return null;
    return buildings.find((b) => b.id === selectedBuildingId) ?? null;
  }, [buildings, selectedBuildingId]);

  // Recompute geofence status whenever GPS or the selected building changes so
  // location is never stale between steps (detect -> selfie -> check-in/out).
  const { distance, insideSite } = useMemo(() => {
    const bld = selectedBuilding;
    if (!gps || !bld || bld.latitude == null || bld.longitude == null || bld.allowedRadius == null) {
      return { distance: null, insideSite: null, geoFenceAvailable: false };
    }
    const dist = haversine(gps.latitude, gps.longitude, bld.latitude, bld.longitude);
    return {
      distance: Math.round(dist),
      insideSite: dist <= bld.allowedRadius,
      geoFenceAvailable: true,
    };
  }, [gps, selectedBuilding]);

  const openManualLocation = useCallback(() => {
    const bld = selectedBuilding;
    if (bld?.latitude != null && bld?.longitude != null) {
      setManualLat(String(bld.latitude));
      setManualLng(String(bld.longitude));
    } else {
      setManualLat("");
      setManualLng("");
    }
    setGettingGps(false);
    setShowManualLocation(true);
  }, [selectedBuilding]);

  const applyManualLocation = useCallback(() => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      showToast(isArabic ? "إحداثيات غير صالحة" : "Invalid coordinates", "error");
      return;
    }
    const gpsVal: GpsState = {
      latitude: lat,
      longitude: lng,
      accuracy: 0,
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    };
    setGps(gpsVal);

    setShowManualLocation(false);
    setStep('selfie');
    showToast(isArabic ? "تم تحديد الموقع يدوياً" : "Location set manually", "success");
  }, [manualLat, manualLng, isArabic, showToast]);

  const getGps = useCallback((retryWithLowAccuracy = false) => {
    if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost") {
      showToast(isArabic ? "تحديد الموقع يتطلب اتصالاً آمناً (HTTPS)، يمكنك إدخال الموقع يدوياً" : "Geolocation requires a secure (HTTPS) connection. You can enter your location manually.", "warning");
      openManualLocation();
      return;
    }
    if (!navigator.geolocation) {
      showToast(isArabic ? "خدمة تحديد المواقع غير متاحة، يمكنك إدخال الموقع يدوياً" : "Geolocation not available. You can enter your location manually.", "warning");
      openManualLocation();
      return;
    }
    setGettingGps(true);
    const attempt = (lowAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          let address = "";
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${locale}`,
              { signal: controller.signal }
            );
            const data = await res.json();
            address = data.display_name ?? "";
          } catch {
            address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          } finally {
            clearTimeout(timer);
          }
          setGps({ latitude, longitude, accuracy, address });

          setStep('selfie');
          setGettingGps(false);
          showToast(isArabic ? "تم تحديد الموقع" : "Location detected", "success");
        },
        () => {
          if (!lowAccuracy) {
            attempt(true);
            return;
          }
          setGettingGps(false);
          showToast(isArabic ? "فشل تحديد الموقع. يمكنك إدخال الموقع يدوياً أو المحاولة في مكان مفتوح" : "Failed to get location. You can enter it manually or move to an open area", "warning");
          openManualLocation();
        },
        lowAccuracy
          ? { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
          : { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    };
    attempt(retryWithLowAccuracy);
  }, [isArabic, locale, openManualLocation, showToast]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
      setCameraStream(stream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      showToast(isArabic ? "صلاحية الكاميرا مطلوبة" : "Camera permission required", "error");
    }
  }, [isArabic, showToast]);

  const captureSelfie = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const raw = canvas.toDataURL('image/jpeg', 0.7);
    try {
      const compressed = await compressImage(raw, 320, 0.6);
      setSelfieData(compressed);
    } catch {
      setSelfieData(raw);
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
    setStep('checkin');
    showToast(isArabic ? "تم التقاط الصورة" : "Selfie captured", "success");
  }, [cameraStream, isArabic, showToast]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  }, [cameraStream]);

  const queueForSync = useCallback((type: 'checkIn' | 'checkOut', data: CheckInQueueItemData | CheckOutQueueItemData) => {
    const timestamp = new Date().toISOString();
    const item: QueueItem = type === 'checkIn'
      ? { type, data: data as CheckInQueueItemData, timestamp }
      : { type, data: data as CheckOutQueueItemData, timestamp };
    const updated = [...queuedItems, item];
    setQueuedItems(updated);
    localStorage.setItem('attendanceQueue', JSON.stringify(updated));
    showToast(isArabic ? "تم حفظ العملية محلياً، سيتم المزامنة لاحقاً" : "Saved offline, will sync later", "info");
  }, [queuedItems, isArabic, showToast]);

  const syncQueuedItems = useCallback(async () => {
    if (!queuedItems.length) return;
    const remaining: QueueItem[] = [];
    for (const item of queuedItems) {
      try {
        if (item.type === 'checkIn') {
          await attendanceService.checkIn(item.data);
        } else if (item.type === 'checkOut') {
          await attendanceService.checkOut(item.data.id, item.data.body);
        }
      } catch {
        remaining.push(item);
      }
    }
    setQueuedItems(remaining);
    localStorage.setItem('attendanceQueue', JSON.stringify(remaining));
    if (remaining.length === 0) showToast(isArabic ? "تمت المزامنة" : "Synced", "success");
  }, [queuedItems, isArabic, showToast]);

  useEffect(() => {
    const handleOnline = () => { if (queuedItems.length) syncQueuedItems(); };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queuedItems.length, syncQueuedItems]);

  const handleCheckIn = useCallback(async () => {
    if (!employee) {
      showToast(
        isArabic
          ? "لا يوجد موظف مرتبط بهذا الحساب. يرجى التواصل مع الإدارة لربط الموظف"
          : "No employee is linked to this account. Contact your administrator to link an employee",
        "error"
      );
      return;
    }
    if (!gps) {
      showToast(isArabic ? "يرجى تحديد الموقع أولاً" : "Please detect location first", "error");
      return;
    }
    if (gps.accuracy > GPS_ACCURACY_WARNING) {
      showToast(isArabic ? "دقة الموقع ضعيفة، يرجى المحاولة في مكان مفتوح" : "Poor GPS accuracy, try in an open area", "warning");
    }
    if (insideSite === false) {
      if (selfieData) {
        setPendingCheckInPayload({
          data: {
            employeeId: employee.id,
            date: getTodayStr(),
            checkInTime: new Date().toISOString(),
            checkInLatitude: gps.latitude,
            checkInLongitude: gps.longitude,
            checkInAddress: gps.address,
            checkInAccuracy: gps.accuracy,
            checkInSelfie: selfieData,
            deviceInfo: getDeviceInfo(),
            distanceFromSite: distance ?? undefined,
            projectId: assignedProject?.id,
            buildingId: selectedBuildingId || undefined,
            shiftId: selectedShiftId || undefined,
            notes: "",
          },
        });
        setPendingCheckOutPayload(null);
        setOverrideReason("");
        setShowOverrideDialog(true);
      } else {
        showToast(isArabic ? "أنت خارج نطاق الموقع. التقط صورة شخصية لتقديم طلب تجاوز" : "You are outside the site geofence. Take a selfie to request an override", "error");
      }
      return;
    }
    if (!selfieData) {
      showToast(isArabic ? "يرجى التقاط صورة شخصية" : "Please take a selfie", "error");
      return;
    }

    setActionLoading(true);
    const payload = {
      employeeId: employee.id,
      date: getTodayStr(),
      checkInTime: new Date().toISOString(),
      checkInLatitude: gps.latitude,
      checkInLongitude: gps.longitude,
      checkInAddress: gps.address,
      checkInAccuracy: gps.accuracy,
      checkInSelfie: selfieData,
      deviceInfo: getDeviceInfo(),
      distanceFromSite: distance ?? undefined,
      projectId: assignedProject?.id,
      buildingId: selectedBuildingId || undefined,
      shiftId: selectedShiftId || undefined,
      notes: "",
    };

    try {
      if (!navigator.onLine) {
        queueForSync('checkIn', payload);
        setActionLoading(false);
        return;
      }
      const result = await attendanceService.checkIn(payload);
      if (result.requiresApproval && result.override) {
        setActionLoading(false);
        setPendingOverrides((prev) => [result.override!, ...prev]);
        showToast(isArabic ? "تم إرسال طلب الاعتماد، وسيتم تسجيل الحضور بعد موافقة الإدارة" : "Check-in submitted for approval. Attendance will be recorded after approval", "success");
        return;
      }
      setTodayRecord(result.record ?? null);
      setStep('checkout');
      showToast(isArabic ? "تم تسجيل الحضور" : "Check-in successful", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already exists")) {
        showToast(isArabic ? "تم تسجيل الحضور مسبقاً" : "Already checked in", "warning");
      } else if (!navigator.onLine) {
        queueForSync('checkIn', payload);
      } else {
        showToast(isArabic ? "فشل تسجيل الحضور" : "Check-in failed", "error");
      }
    } finally {
      setActionLoading(false);
    }
  }, [employee, gps, insideSite, selfieData, distance, assignedProject, selectedBuildingId, selectedShiftId, isArabic, showToast, queueForSync]);

  const submitOverride = useCallback(async () => {
    if (!overrideReason.trim()) return;
    setActionLoading(true);
    try {
      if (pendingCheckInPayload) {
        if (pendingCheckInPayload.overrideId) {
          // The server already created the override during check-in; update the reason.
          const override = await attendanceService.updateOverrideReason(pendingCheckInPayload.overrideId, overrideReason.trim());
          setPendingOverrides((prev) => [override, ...prev.filter((o) => o.id !== override.id)]);
        } else {
          const override = await attendanceService.requestOverride({
            requestedBy: user?.id ?? '',
            reason: overrideReason.trim(),
            type: 'check_in',
            distance: distance ?? undefined,
            snapshot: pendingCheckInPayload.data,
          });
          setPendingOverrides((prev) => [override, ...prev.filter((o) => o.id !== override.id)]);
        }
        setShowOverrideDialog(false);
        setOverrideReason("");
        setPendingCheckInPayload(null);
        setStep('complete');
        showToast(isArabic ? "تم تقديم طلب التجاوز للمدير، وسيتم تسجيل الحضور بعد الموافقة" : "Override request submitted. Attendance will be recorded after manager approval", "success");
      } else if (pendingCheckOutPayload) {
        if (pendingCheckOutPayload.overrideId) {
          const override = await attendanceService.updateOverrideReason(pendingCheckOutPayload.overrideId, overrideReason.trim());
          setPendingOverrides((prev) => [override, ...prev.filter((o) => o.id !== override.id)]);
        } else {
          const override = await attendanceService.requestOverride({
            attendanceId: pendingCheckOutPayload.id,
            requestedBy: user?.id ?? '',
            reason: overrideReason.trim(),
            type: 'check_out',
            distance: distance ?? undefined,
            snapshot: pendingCheckOutPayload.body,
          });
          setPendingOverrides((prev) => [override, ...prev.filter((o) => o.id !== override.id)]);
        }
        setShowOverrideDialog(false);
        setOverrideReason("");
        setPendingCheckOutPayload(null);
        showToast(isArabic ? "تم تقديم طلب التجاوز للمدير، وسيتم تسجيل الانصراف بعد الموافقة" : "Override request submitted. Check-out will be recorded after manager approval", "success");
      }
    } catch {
      showToast(isArabic ? "فشل تقديم الطلب" : "Failed to submit request", "error");
    } finally {
      setActionLoading(false);
    }
  }, [pendingCheckInPayload, pendingCheckOutPayload, overrideReason, distance, isArabic, showToast, user]);

  const handleCheckOut = useCallback(async () => {
    if (!todayRecord || !gps) {
      showToast(isArabic ? "لم يتم تسجيل الحضور أو تحديد الموقع" : "Not checked in or no location", "error");
      return;
    }
    if (todayRecord.attendanceStatus !== 'checkedIn') {
      showToast(isArabic ? "لم يتم تسجيل الحضور بعد" : "Not checked in yet", "error");
      return;
    }
    if (todayRecord.checkOutTime) {
      showToast(isArabic ? "تم تسجيل الانصراف مسبقاً" : "Already checked out", "warning");
      return;
    }
    if (gps.accuracy > GPS_ACCURACY_WARNING) {
      showToast(isArabic ? "دقة الموقع ضعيفة" : "Poor GPS accuracy", "warning");
    }

    setActionLoading(true);
    let selfie = selfieData;
    if (!selfie) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        canvas.getContext('2d')!.drawImage(video, 0, 0);
        const raw = canvas.toDataURL('image/jpeg', 0.7);
        try {
          selfie = await compressImage(raw, 320, 0.6);
        } catch {
          selfie = raw;
        }
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        showToast(isArabic ? "يرجى التقاط صورة شخصية" : "Please take a selfie", "error");
        setActionLoading(false);
        return;
      }
    }

    const payload = {
      checkOutTime: new Date().toISOString(),
      checkOutLatitude: gps.latitude,
      checkOutLongitude: gps.longitude,
      checkOutAddress: gps.address,
      checkOutAccuracy: gps.accuracy,
      checkOutSelfie: selfie,
      distanceFromSite: distance ?? undefined,
    };

    try {
      if (!navigator.onLine) {
        queueForSync('checkOut', { id: todayRecord.id, body: payload });
        setActionLoading(false);
        return;
      }
      const result = await attendanceService.checkOut(todayRecord.id, payload);
      if (result.requiresApproval && result.override) {
        setActionLoading(false);
        setPendingOverrides((prev) => [result.override!, ...prev]);
        showToast(isArabic ? "تم إرسال طلب الانصراف، وسيتم التسجيل بعد موافقة الإدارة" : "Check-out submitted for approval. It will be recorded after approval", "success");
        return;
      }
      setTodayRecord(result.record ?? null);
      showToast(isArabic ? "تم تسجيل الانصراف" : "Check-out successful", "success");
    } catch {
      if (!navigator.onLine) {
        queueForSync('checkOut', { id: todayRecord.id, body: payload });
      } else {
        showToast(isArabic ? "فشل تسجيل الانصراف" : "Check-out failed", "error");
      }
    } finally {
      setActionLoading(false);
    }
  }, [todayRecord, gps, selfieData, distance, isArabic, showToast, queueForSync]);

  const selectedShift = useMemo(() => {
    if (!selectedShiftId || !shifts.length) return null;
    return shifts.find((s) => s.id === selectedShiftId) ?? null;
  }, [shifts, selectedShiftId]);

  const lateMinutes = useMemo(() => {
    if (!todayRecord?.checkInTime) return 0;
    const checkIn = new Date(todayRecord.checkInTime);
    if (selectedShift) {
      const [sh, sm] = selectedShift.startTime.split(':').map(Number);
      const startWithGrace = new Date(checkIn);
      startWithGrace.setHours(sh, sm + (selectedShift.gracePeriod || 0), 0, 0);
      const diff = Math.round((checkIn.getTime() - startWithGrace.getTime()) / 60000);
      return diff > 0 ? diff : 0;
    }
    const expectedStart = new Date(checkIn);
    expectedStart.setHours(8, 0, 0, 0);
    const diff = Math.round((checkIn.getTime() - expectedStart.getTime()) / 60000);
    return diff > 0 ? diff : 0;
  }, [todayRecord, selectedShift]);

  const earlyLeave = useMemo(() => {
    if (!todayRecord?.checkOutTime) return 0;
    const checkOut = new Date(todayRecord.checkOutTime);
    if (selectedShift) {
      const [eh, em] = selectedShift.endTime.split(':').map(Number);
      const expectedEnd = new Date(checkOut);
      expectedEnd.setHours(eh, em, 0, 0);
      const diff = Math.round((expectedEnd.getTime() - checkOut.getTime()) / 60000);
      return diff > 0 ? diff : 0;
    }
    const expectedEnd = new Date(checkOut);
    expectedEnd.setHours(17, 0, 0, 0);
    const diff = Math.round((expectedEnd.getTime() - checkOut.getTime()) / 60000);
    return diff > 0 ? diff : 0;
  }, [todayRecord, selectedShift]);

  const projectBuildings = useMemo(() => {
    if (!assignedProject) return [];
    return buildings.filter((b) => b.projectId === assignedProject.id);
  }, [buildings, assignedProject]);

  // Keep the submitted check-in data visible on the page until check-out.
  const recordedSelfie = useMemo(
    () => selfieData ?? todayRecord?.checkInSelfie ?? null,
    [selfieData, todayRecord]
  );

  const recordedCheckIn = useMemo(() => {
    if (!todayRecord?.checkInTime) return null;
    return {
      latitude: todayRecord.checkInLatitude,
      longitude: todayRecord.checkInLongitude,
      address: todayRecord.checkInAddress,
    };
  }, [todayRecord]);

  // Reset today's session so the employee can record attendance again — e.g.
  // after a problem with the previous attempt or on a new day without reloading.
  const startNewRecord = useCallback(() => {
    setTodayRecord(null);
    setGps(null);
    setSelfieData(null);
    setSelectedProjectId("");
    setSelectedBuildingId("");
    setSelectedShiftId("");
    setPendingCheckInPayload(null);
    setPendingCheckOutPayload(null);
    setOverrideReason("");
    setStep('detect');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(isArabic ? "ابدأ تسجيل حضور جديد" : "Start a new attendance record", "info");
  }, [isArabic, showToast]);

  if (loading) {
    return <DataLoader fullPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 space-y-6">
      {ToastComponent}

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-3 flex items-center gap-3 text-amber-700 dark:text-amber-300 text-sm">
          <WifiOff size={18} />
          <span>{isArabic ? "أنت غير متصل بالإنترنت. سيتم حفظ البيانات محلياً." : "You are offline. Data will be saved locally."}</span>
          {queuedItems.length > 0 && (
            <span className="font-bold">{queuedItems.length} {isArabic ? "معلقة" : "pending"}</span>
          )}
        </div>
      )}

      {/* Queued items banner */}
      {queuedItems.length > 0 && isOnline && (
        <div className="bg-info-light dark:bg-info/15 border border-info-light dark:border-info/30 rounded-xl p-3 flex items-center gap-3 text-info dark:text-info-light text-sm">
          <RefreshCw size={18} />
          <span>{queuedItems.length} {isArabic ? "عملية في انتظار المزامنة" : "items waiting to sync"}</span>
          <button onClick={syncQueuedItems} className="px-3 py-1 bg-info text-white rounded-lg text-xs font-medium">
            {isArabic ? "مزامنة" : "Sync"}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isArabic ? "الحضور والانصراف" : "Attendance"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {employee?.fullName ?? user?.name ?? ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(todayRecord || pendingCheckIn || pendingCheckOut) && (
            <button
              onClick={startNewRecord}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 transition"
            >
              <Plus size={16} />
              {isArabic ? "تسجيل جديد" : "New Record"}
            </button>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <History size={16} />
            {isArabic ? "السجل" : "History"}
            <ChevronDown size={14} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Today's active record summary */}
      {todayRecord && todayRecord.attendanceStatus === 'checkedIn' && (
        <Card className="p-4 border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                {isArabic ? "مسجل الحضور" : "Checked In"}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {todayRecord.checkInTime
                  ? new Date(todayRecord.checkInTime).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                  : todayRecord.checkIn}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* History Section */}
      {showHistory && (
        <Card className="p-4 max-h-60 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {isArabic ? "آخر السجلات" : "Recent Records"}
          </h3>
          {attendanceHistory.length === 0 ? (
            <p className="text-sm text-gray-400">{isArabic ? "لا توجد سجلات" : "No records"}</p>
          ) : (
            <div className="space-y-2">
              {attendanceHistory.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">{r.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{r.checkIn || "—"}</span>
                    <span className="text-xs text-gray-400">→</span>
                    <span className="text-xs text-gray-500">{r.checkOut || "—"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.attendanceStatus === 'checkedOut' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : r.attendanceStatus === 'checkedIn' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {r.attendanceStatus === 'checkedOut' ? (isArabic ? 'مغادر' : 'Out')
                      : r.attendanceStatus === 'checkedIn' ? (isArabic ? 'حاضر' : 'In')
                      : (isArabic ? 'معلق' : '—')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Main Grid: Assignment + Location + Distance + Selfie */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 1. Today's Assignment */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isArabic ? "مهمة اليوم" : "Today's Assignment"}
            </h2>
          </div>
          {assignedProject ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building2 size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isArabic ? "المشروع" : "Project"}
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {assignedProject.name}
                  </p>
                </div>
              </div>
              {assignedProject.location && (
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isArabic ? "موقع العمل" : "Work Location"}
                    </p>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {assignedProject.location}
                    </p>
                  </div>
                </div>
              )}
              {projects.length > 1 && (
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setSelectedBuildingId("");
                  }}
                  className="w-full mt-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  <option value="">{isArabic ? "اختر مشروعاً" : "Select project"}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
              {projectBuildings.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {isArabic ? "المبنى / الموقع" : "Building / Site"}
                  </label>
                  <select
                    value={selectedBuildingId}
                    onChange={(e) => setSelectedBuildingId(e.target.value)}
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">{isArabic ? "اختر المبنى" : "Select building"}</option>
                    {projectBuildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                        {b.allowedRadius != null ? ` (${b.allowedRadius}m)` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {shifts.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {isArabic ? "الوردية" : "Shift"}
                  </label>
                  <select
                    value={selectedShiftId}
                    onChange={(e) => setSelectedShiftId(e.target.value)}
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">{isArabic ? "الوردية الافتراضية" : "Default shift"}</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isArabic ? "موعد الدوام" : "Shift"}
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {selectedShift ? `${selectedShift.startTime} - ${selectedShift.endTime}` : "08:00 - 17:00"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              {isArabic ? "لا توجد مشاريع مخصصة" : "No assigned projects"}
            </p>
          )}
        </Card>

        {/* 2. Current Location */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isArabic ? "الموقع الحالي" : "Current Location"}
            </h2>
          </div>
          <button
            onClick={() => getGps()}
            disabled={gettingGps}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition disabled:opacity-50 font-medium"
          >
            <Navigation size={20} />
            {gettingGps ? (isArabic ? "جاري التحديد..." : "Detecting...") : (isArabic ? "تحديد موقعي" : "Detect My Location")}
          </button>
          {gps && (
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{isArabic ? "خط العرض" : "Latitude"}</span>
                <span className="font-mono text-gray-800 dark:text-gray-200">{gps.latitude.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{isArabic ? "خط الطول" : "Longitude"}</span>
                <span className="font-mono text-gray-800 dark:text-gray-200">{gps.longitude.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{isArabic ? "الدقة" : "Accuracy"}</span>
                <span className={`font-mono ${gps.accuracy > GPS_ACCURACY_WARNING ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                  {gps.accuracy.toFixed(1)} {isArabic ? "متر" : "m"}
                </span>
              </div>
              {gps.address && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {isArabic ? "العنوان" : "Address"}
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{gps.address}</p>
                </div>
              )}
            </div>
          )}
          {!gps && recordedCheckIn && (
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {isArabic ? "موقع الحضور المسجل" : "Recorded Check-in Location"}
              </p>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{isArabic ? "خط العرض" : "Latitude"}</span>
                <span className="font-mono text-gray-800 dark:text-gray-200">
                  {recordedCheckIn.latitude != null ? recordedCheckIn.latitude.toFixed(6) : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{isArabic ? "خط الطول" : "Longitude"}</span>
                <span className="font-mono text-gray-800 dark:text-gray-200">
                  {recordedCheckIn.longitude != null ? recordedCheckIn.longitude.toFixed(6) : "—"}
                </span>
              </div>
              {recordedCheckIn.address && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {isArabic ? "العنوان" : "Address"}
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{recordedCheckIn.address}</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* 3. Distance Verification */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isArabic ? "التحقق من المسافة" : "Distance Verification"}
          </h2>
        </div>
        {distance !== null ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isArabic ? "المسافة" : "Distance"}
              </p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{distance} <span className="text-sm font-normal">{isArabic ? "م" : "m"}</span></p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isArabic ? "النطاق المسموح" : "Allowed Radius"}
              </p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{selectedBuilding?.allowedRadius ?? 100} <span className="text-sm font-normal">{isArabic ? "م" : "m"}</span></p>
            </div>
            <div className={`text-center p-3 rounded-xl ${insideSite ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isArabic ? "الحالة" : "Status"}
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                {insideSite ? (
                  <><CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" /><span className="text-sm font-bold text-green-600 dark:text-green-400">{isArabic ? "داخل الموقع" : "Inside Site"}</span></>
                ) : (
                  <><XCircle className="w-5 h-5 text-red-600 dark:text-red-400" /><span className="text-sm font-bold text-red-600 dark:text-red-400">{isArabic ? "خارج الموقع" : "Outside Site"}</span></>
                )}
              </div>
            </div>
          </div>
        ) : gps ? (
          <p className="text-sm text-gray-400 text-center py-4">
            {isArabic ? "لم يتم تحديد نطاق جغرافي لهذا المبنى" : "No geofence configured for this building"}
          </p>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">
            {isArabic ? "يرجى تحديد الموقع أولاً" : "Please detect location first"}
          </p>
        )}
        {gps && gps.accuracy > GPS_ACCURACY_WARNING && (
          <div className="mt-3 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
            <AlertTriangle size={14} />
            {isArabic ? "دقة GPS منخفضة (>30م)، قد تؤثر على دقة التحقق" : "Low GPS accuracy (>30m), may affect verification"}
          </div>
        )}
      </Card>

      {/* 4. Selfie */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isArabic ? "الصورة الشخصية" : "Selfie"}
          </h2>
        </div>
        {showCamera ? (
          <div className="space-y-3">
            <div className="relative bg-black rounded-xl overflow-hidden">
              <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              {gps && (
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded">
                  {gps.latitude.toFixed(4)}, {gps.longitude.toFixed(4)}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={captureSelfie} className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition font-medium">
                {isArabic ? "التقاط" : "Capture"}
              </button>
              <button onClick={stopCamera} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        ) : recordedSelfie ? (
          <div className="space-y-3">
            <div className="relative w-48 h-48 mx-auto rounded-xl overflow-hidden border-2 border-green-400">
              <NextImage src={recordedSelfie} alt="Selfie" fill className="object-cover" sizes="192px" />
              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
                {todayRecord?.checkInTime
                  ? new Date(todayRecord.checkInTime).toLocaleTimeString(isArabic ? "ar-EG" : "en-US")
                  : new Date().toLocaleTimeString(isArabic ? "ar-EG" : "en-US")}
              </div>
            </div>
            {todayRecord?.checkInTime ? (
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                {isArabic ? "صورة الحضور المسجلة" : "Recorded check-in selfie"}
              </p>
            ) : (
              <div className="flex gap-2 justify-center">
                <button onClick={() => { setSelfieData(null); startCamera(); }} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  {isArabic ? "إعادة" : "Retake"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={startCamera} className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary transition">
            <Camera size={24} />
            <span>{isArabic ? "التقاط صورة شخصية" : "Take a Selfie"}</span>
          </button>
        )}
      </Card>

      {/* 5. Attendance Summary */}
      {todayRecord && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isArabic ? "ملخص الحضور" : "Attendance Summary"}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {isArabic ? "الحضور" : "Check In"}
              </p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {todayRecord.checkInTime
                  ? new Date(todayRecord.checkInTime).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                  : todayRecord.checkIn || "—"}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {isArabic ? "الانصراف" : "Check Out"}
              </p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {todayRecord.checkOutTime
                  ? new Date(todayRecord.checkOutTime).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                  : todayRecord.checkOut || "—"}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {isArabic ? "ساعات العمل" : "Worked"}
              </p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {todayRecord.workedMinutes ? formatDuration(todayRecord.workedMinutes) : (todayRecord.hoursWorked ? `${todayRecord.hoursWorked}h` : "—")}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {isArabic ? "الحالة" : "Status"}
              </p>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full mt-1 ${
                todayRecord.attendanceStatus === 'checkedOut' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : todayRecord.attendanceStatus === 'checkedIn' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {todayRecord.attendanceStatus === 'checkedOut' ? <CheckCircle2 size={12} /> : todayRecord.attendanceStatus === 'checkedIn' ? <Clock size={12} /> : null}
                {todayRecord.attendanceStatus === 'checkedOut' ? (isArabic ? 'مكتمل' : 'Completed')
                : todayRecord.attendanceStatus === 'checkedIn' ? (isArabic ? 'حاضر' : 'Active')
                : (isArabic ? 'معلق' : 'Pending')}
              </span>
            </div>
          </div>
          {(todayRecord.checkInAddress || todayRecord.checkOutAddress ||
            todayRecord.checkInLatitude != null || todayRecord.checkOutLatitude != null) && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2 text-xs text-gray-500 dark:text-gray-400">
              {(todayRecord.checkInAddress || todayRecord.checkInLatitude != null) && (
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">{isArabic ? "موقع الحضور" : "Check-in location"}: </span>
                    {todayRecord.checkInAddress || (todayRecord.checkInLatitude?.toFixed(5) + ", " + todayRecord.checkInLongitude?.toFixed(5))}
                  </div>
                </div>
              )}
              {(todayRecord.checkOutAddress || todayRecord.checkOutLatitude != null) && (
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">{isArabic ? "موقع الانصراف" : "Check-out location"}: </span>
                    {todayRecord.checkOutAddress || (todayRecord.checkOutLatitude?.toFixed(5) + ", " + todayRecord.checkOutLongitude?.toFixed(5))}
                  </div>
                </div>
              )}
            </div>
          )}
          {(lateMinutes > 0 || earlyLeave > 0) && (
            <div className="mt-3 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
              {lateMinutes > 0 && (
                <span className="flex items-center gap-1">
                  <AlertTriangle size={12} className="text-amber-500" />
                  {isArabic ? `تأخر ${lateMinutes} دقيقة` : `${lateMinutes} min late`}
                </span>
              )}
              {earlyLeave > 0 && (
                <span className="flex items-center gap-1">
                  <AlertTriangle size={12} className="text-amber-500" />
                  {isArabic ? `خروج مبكر ${earlyLeave} دقيقة` : `${earlyLeave} min early leave`}
                </span>
              )}
            </div>
          )}
        </Card>
      )}

      {/* 6. Check-In / Check-Out Buttons */}
      {(pendingCheckIn || pendingCheckOut) && (
        <Card className={`p-4 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40`}>
          <div className="flex items-start gap-3">
            <Clock size={20} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                {pendingCheckIn && pendingCheckOut
                  ? isArabic ? "بانتظار موافقة الإدارة على الحضور والانصراف" : "Waiting for manager approval on check-in & check-out"
                  : pendingCheckIn
                    ? isArabic ? "بانتظار موافقة الإدارة على تسجيل الحضور" : "Waiting for manager approval on check-in"
                    : isArabic ? "بانتظار موافقة الإدارة على تسجيل الانصراف" : "Waiting for manager approval on check-out"}
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                {isArabic
                  ? "تم إرسال طلبك وسيتم تسجيل الوقت تلقائياً بعد الموافقة."
                  : "Your request was submitted and will be recorded automatically once approved."}
              </p>
              {(pendingCheckIn || pendingCheckOut) && (
                <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-2 flex items-center gap-1">
                  <Clock size={12} />
                  {new Date((pendingCheckIn ?? pendingCheckOut)!.createdAt).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleCheckIn}
          disabled={actionLoading || !!todayRecord?.checkInTime || !!pendingCheckIn || !gps || gettingGps}
          className="flex flex-col items-center justify-center gap-2 px-6 py-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl hover:from-green-600 hover:to-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
        >
          <LogIn size={32} />
          <span className="text-lg font-bold">{isArabic ? "تسجيل الحضور" : "Check In"}</span>
          {todayRecord?.checkInTime && (
            <span className="text-xs text-green-100">
              {new Date(todayRecord.checkInTime).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </button>
        <button
          onClick={handleCheckOut}
          disabled={actionLoading || !todayRecord || todayRecord.attendanceStatus !== 'checkedIn' || !!todayRecord.checkOutTime || !!pendingCheckOut || !gps || gettingGps}
          className="flex flex-col items-center justify-center gap-2 px-6 py-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl hover:from-amber-600 hover:to-orange-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
        >
          <LogOut size={32} />
          <span className="text-lg font-bold">{isArabic ? "تسجيل الانصراف" : "Check Out"}</span>
          {todayRecord?.checkOutTime && (
            <span className="text-xs text-amber-100">
              {new Date(todayRecord.checkOutTime).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </button>
      </div>

      {/* Device Info */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="w-4 h-4 text-gray-400" />
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {isArabic ? "معلومات الجهاز" : "Device Info"}
          </h3>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate">
          {navigator.userAgent}
        </p>
      </Card>

      {/* Manual Location Dialog */}
      {showManualLocation && (
        <Dialog
          open={showManualLocation}
          onClose={() => setShowManualLocation(false)}
          title={isArabic ? "إدخال الموقع يدوياً" : "Enter Location Manually"}
          size="sm"
        >
          <div className="space-y-4">
            {selectedBuilding && selectedBuilding.latitude != null && selectedBuilding.longitude != null && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                <AlertTriangle size={14} className="inline mr-1" />
                {isArabic
                  ? "تم تعبئة إحداثيات المبنى المحدد. تأكد من أنك داخل موقع العمل قبل الاعتماد."
                  : "Prefilled with the selected building coordinates. Verify you are at the site before confirming."}
              </div>
            )}
            <div>
              <label className="block text-xs text-text-muted mb-1">
                {isArabic ? "خط العرض" : "Latitude"}
              </label>
              <input
                type="number"
                step="any"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="w-full p-3 border border-border rounded-xl text-sm bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-gold"
                placeholder="29.9652"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">
                {isArabic ? "خط الطول" : "Longitude"}
              </label>
              <input
                type="number"
                step="any"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                className="w-full p-3 border border-border rounded-xl text-sm bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-gold"
                placeholder="32.5498"
              />
            </div>
            <div className="flex gap-3 pt-3 border-t">
              <button
                onClick={() => setShowManualLocation(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface-secondary"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={applyManualLocation}
                className="flex-1 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark"
              >
                {isArabic ? "تأكيد" : "Confirm"}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Override Request Dialog */}
      {showOverrideDialog && (
        <Dialog
          open={showOverrideDialog}
          onClose={() => setShowOverrideDialog(false)}
          title={isArabic ? "طلب تجاوز خارج الموقع" : "Outside Site Override Request"}
          size="sm"
        >
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>
                {isArabic
                  ? "أنت خارج نطاق الموقع المسموح. سيتم إرسال طلب تجاوز للمدير للموافقة على تسجيل الحضور."
                  : "You are outside the allowed site radius. An override request will be sent to a manager for approval."}
              </span>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">
                {isArabic ? "سبب التجاوز" : "Override Reason"}
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
                className="w-full p-3 border border-border rounded-xl text-sm bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-gold"
                placeholder={isArabic ? "اكتب سبب التواجد خارج الموقع..." : "Describe why you are outside the site..."}
              />
            </div>
            <div className="flex gap-3 pt-3 border-t">
              <button
                onClick={() => setShowOverrideDialog(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface-secondary"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={submitOverride}
                disabled={!overrideReason.trim() || actionLoading}
                className="flex-1 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isArabic ? "إرسال الطلب" : "Submit Request"}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
