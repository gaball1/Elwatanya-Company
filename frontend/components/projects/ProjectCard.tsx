/* eslint-disable */
"use client";

import { Card } from "@/components/ui";
import type { Project } from "@/types/project";
import { MapPin, Calendar } from "lucide-react";

const statusColors: Record<Project["status"], string> = {
  planning: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  on_hold: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<Project["status"], string> = {
  planning: "تخطيط",
  active: "نشط",
  completed: "مكتمل",
  on_hold: "متوقف",
};

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card hover className="h-full">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-bold text-primary">{project.name}</h3>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            statusColors[project.status]
          }`}
        >
          {statusLabels[project.status]}
        </span>
      </div>
      <p className="text-gray-500 text-sm mb-4 line-clamp-2">
        {project.description}
      </p>
      <div className="space-y-2 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-gold" />
          <span>{project.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gold" />
          <span>{project.startDate}</span>
        </div>
      </div>
    </Card>
  );
}
