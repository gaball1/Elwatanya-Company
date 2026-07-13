import { NextResponse } from "next/server";
import type { Project } from "@/types/project";

const MOCK_PROJECTS: Project[] = [
  {
    id: "1",
    name: "مجمع سكني - الرياض",
    description: "مشروع مجمع سكني متكامل",
    location: "الرياض",
    status: "active",
    startDate: "2024-01-15",
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
    budget: 25000000,
    createdAt: "2025-01-01",
  },
];

export async function GET() {
  return NextResponse.json({ projects: MOCK_PROJECTS });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const project: Project = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString(),
    };
    return NextResponse.json({ project }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
