"use client";

import { useCallback, useEffect, useState } from "react";
import type { Project } from "@/types/project";
import { safeFetch } from "@/lib/api/fetchTransport";

const MOCK_PROJECTS: Project[] = [
  {
    id: "1",
    name: "مجمع سكني - الرياض",
    description: "مشروع مجمع سكني متكامل",
    location: "الرياض",
    status: "active",
    startDate: "2024-01-15",
    plannedDurationMonths: 24,
    budget: 5000000,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "برج تجاري - جدة",
    description: "برج تجاري متعدد الطوابق",
    location: "جدة",
    status: "completed",
    startDate: "2023-06-01",
    plannedDurationMonths: 18,
    endDate: "2025-03-01",
    budget: 12000000,
    createdAt: "2023-05-01",
  },
  {
    id: "3",
    name: "مستشفى - الدمام",
    description: "مستشفى حديث بسعة 200 سرير",
    location: "الدمام",
    status: "planning",
    startDate: "2025-09-01",
    plannedDurationMonths: 36,
    budget: 25000000,
    createdAt: "2025-01-01",
  },
];

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await safeFetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.items ?? MOCK_PROJECTS);
      } else {
        setProjects(MOCK_PROJECTS);
      }
    } catch {
      setProjects(MOCK_PROJECTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await fetchProjects();
    };
    run();
  }, [fetchProjects]);

  return { projects, loading, error, refetch: fetchProjects };
}
