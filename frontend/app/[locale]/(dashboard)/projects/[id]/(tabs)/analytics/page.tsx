/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { Card } from "@/components/ui";
import { mockProjects } from "@/lib/mockData";

export default function ProjectAnalyticsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;

  const project = mockProjects.find((p) => p.id === projectId);

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
          <div className="w-full bg-gray-200 rounded-full h-3">
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
            <span className="text-gray-500">
              {isArabic ? "تاريخ البدء" : "Start Date"}
            </span>
            <span className="font-medium">{project.startDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">
              {isArabic ? "تاريخ الانتهاء المتوقع" : "Expected End Date"}
            </span>
            <span className="font-medium">2024-12-31</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
