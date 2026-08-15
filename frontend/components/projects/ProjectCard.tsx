"use client";

import { Card } from "@/components/ui";
import type { Project } from "@/types/project";
import { MapPin, Calendar } from "lucide-react";

const statusColors: Record<Project["status"], string> = {
  planning: "bg-warning-light text-warning-dark",
  active: "bg-success-light text-success-dark",
  completed: "bg-info-light text-info-dark",
  on_hold: "bg-surface-tertiary text-text-secondary",
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
      <p className="text-text-secondary text-sm mb-4 line-clamp-2">
        {project.description}
      </p>
      <div className="space-y-2 text-sm text-text-secondary">
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
