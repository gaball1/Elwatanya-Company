import type { Notification } from "@/services/notification.service";

const LINK_REWRITES: Array<{ pattern: RegExp; to: string }> = [
  { pattern: /^\/leaves\//, to: "/holidays" },
  { pattern: /^\/settings\/?$/, to: "/admin/settings" },
  { pattern: /^\/inventory\/[^/]+$/, to: "/inventory" },
];

const ENTITY_ROUTES: Record<string, (id?: string | null) => string> = {
  attendance_override: () => "/attendance/overrides",
  project: (id) => (id ? `/projects/${id}` : "/projects"),
  leave: () => "/holidays",
  supplier: () => "/suppliers",
  subcontractor: () => "/subcontractors",
  employee: () => "/employees",
  company: () => "/admin/settings",
  fund_transaction: () => "/treasury",
  stock_movement: () => "/inventory",
  purchase: () => "/projects",
  extract: () => "/statements",
  contractor_boq: () => "/projects",
  employer_boq: () => "/projects",
};

export function resolveNotificationHref(notification: Notification, locale: string): string | null {
  let path: string | null = null;

  if (notification.link) {
    path = notification.link;
    for (const rewrite of LINK_REWRITES) {
      if (rewrite.pattern.test(path)) {
        path = rewrite.to;
        break;
      }
    }
  } else if (notification.entityType && ENTITY_ROUTES[notification.entityType]) {
    path = ENTITY_ROUTES[notification.entityType](notification.entityId);
  }

  if (!path) return null;
  return `/${locale}${path}`;
}
