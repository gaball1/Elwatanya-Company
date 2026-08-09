/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { Card } from "@/components/ui";
import { useEffect, useState } from "react";
import { projectService } from '@/services/project.service';

export default function ProjectAnalyticsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;

  const [projects, setProjects] = useState<any[]>([]);
  useEffect(() => {
    projectService.getProjects().then(setProjects).catch(console.error);
  }, []);
  const project = projects.find((p) => p.id === projectId);

  if (!project) return null;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-5">
        <h3 className="font-bold text-primary mb-3">
          {isArabic ? "نسبة الإنجاز" : "Progress"}
        </h3>
        <div className="text-center">
          <div className="text-5xl font-bold text-gold mb-2">
            {project.progress}%
          </div>
          <div className="w-full bg-surface-tertiary rounded-full h-3">
            <div
              className="bg-gold rounded-full h-3"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="font-bold text-primary mb-3">
          {isArabic ? "الجدول الزمني" : "Timeline"}
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-text-secondary">
              {isArabic ? "تاريخ البدء" : "Start Date"}
            </span>
            <span className="font-medium">
              {project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">
              {isArabic ? "تاريخ الانتهاء المتوقع" : "Expected End Date"}
            </span>
            <span className="font-medium">—</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
