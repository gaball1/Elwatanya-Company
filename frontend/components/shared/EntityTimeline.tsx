/* eslint-disable */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Clock, User, ArrowRight, Plus, Edit2, Trash2, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { timelineService, type TimelineEvent } from "@/services/timeline.service";

const EVENT_ICONS: Record<string, any> = {
  create: Plus,
  update: Edit2,
  delete: Trash2,
  status_change: ArrowRight,
  approve: CheckCircle,
  reject: XCircle,
  restore: RotateCcw,
};

const EVENT_COLORS: Record<string, string> = {
  create: "text-success bg-success/10",
  update: "text-info bg-info/10",
  delete: "text-danger bg-danger/10",
  status_change: "text-warning bg-warning/10",
  approve: "text-success bg-success/10",
  reject: "text-danger bg-danger/10",
  restore: "text-info bg-info/10",
};

interface EntityTimelineProps {
  entityType: string;
  entityId: string;
}

export default function EntityTimeline({ entityType, entityId }: EntityTimelineProps) {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await timelineService.getTimeline(entityType, entityId, 30);
      setEvents(data);
    } catch {} finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (d: string) => new Date(d).toLocaleString(isArabic ? "ar-EG" : "en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  if (loading) return <p className="text-xs text-text-muted text-center py-2">{isArabic ? "جاري التحميل..." : "Loading..."}</p>;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <Clock size={16} />
        {isArabic ? "النشاط" : "Activity"} ({events.length})
      </h3>
      {events.length === 0 ? (
        <p className="text-xs text-text-muted text-center py-2">{isArabic ? "لا يوجد نشاط" : "No activity yet"}</p>
      ) : (
        <div className="relative">
          <div className="absolute right-4 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-3">
            {events.map((event) => {
              const Icon = EVENT_ICONS[event.eventType] || Edit2;
              const color = EVENT_COLORS[event.eventType] || "text-text-muted bg-surface-secondary";
              return (
                <div key={event.id} className="flex items-start gap-3 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 bg-surface-secondary rounded-lg p-3">
                    <p className="text-sm text-text-primary">{event.title}</p>
                    {event.description && <p className="text-xs text-text-secondary mt-0.5">{event.description}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      {event.userName && (
                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                          <User size={10} /> {event.userName}
                        </span>
                      )}
                      <span className="text-[10px] text-text-muted">{formatDate(event.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
