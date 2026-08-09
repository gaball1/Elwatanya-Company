/* eslint-disable */
"use client";

import { useState } from "react";
import { Input, Button } from "@/components/ui";
import type { Project, ProjectStatus } from "@/types/project";

interface ProjectFormProps {
  onSubmit: (data: Omit<Project, "id" | "createdAt">) => void;
  initial?: Partial<Project>;
}

export default function ProjectForm({ onSubmit, initial }: ProjectFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [status, setStatus] = useState<ProjectStatus>(
    initial?.status ?? "planning"
  );
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description, location, status, startDate });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="اسم المشروع"
        id="project-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        label="الموقع"
        id="project-location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        required
      />
      <Input
        label="تاريخ البدء"
        id="project-start"
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        required
      />
      <div>
        <label
          htmlFor="project-status"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          الحالة
        </label>
        <select
          id="project-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          className="w-full rounded-lg border border-border px-4 py-2.5 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
        >
          <option value="planning">تخطيط</option>
          <option value="active">نشط</option>
          <option value="completed">مكتمل</option>
          <option value="on_hold">متوقف</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="project-desc"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          الوصف
        </label>
        <textarea
          id="project-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 resize-none"
        />
      </div>
      <Button type="submit" className="w-full">
        حفظ المشروع
      </Button>
    </form>
  );
}
