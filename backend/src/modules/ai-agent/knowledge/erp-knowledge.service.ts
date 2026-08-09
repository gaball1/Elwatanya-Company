import { Injectable } from '@nestjs/common';

@Injectable()
export class ErpKnowledgeService {
  private readonly knowledge: Record<string, string> = {
    boq: `**Bill of Quantities (BOQ) Workflow:**
1. **Employer BOQ** - Created from employer requirements. Defines items, quantities, and unit prices.
2. **Analytical BOQ** - Breaks down employer items into resources (materials, labour, equipment).
3. **Final BOQ** - The approved version after analysis. Includes components and their distributions.
4. **Component Distribution** - Allocates BOQ components to subcontractors.
5. **Contractor BOQ** - Each subcontractor gets their portion with their margin applied.
6. **Extracts** - Periodic progress measurements against contractor BOQ items.
7. **Payments** - Calculated based on approved extracts minus deductions.`,

    extract: `**Extract Workflow:**
1. Create an extract for a period (e.g., monthly) measuring completed work.
2. Each extract line item references a contractor BOQ item with quantity achieved.
3. Extract goes through approval workflow.
4. Once approved, payment is calculated based on the extract value.
5. Deductions (insurance, retention, taxes, advances, penalties) are applied.
6. Net payment is recorded in the treasury as a fund transaction.`,

    payment: `**Payment Workflow:**
1. Payment is generated from an approved extract.
2. Gross payment = sum of (rate × quantity achieved) for all extract items.
3. Deductions are calculated: insurance, retention, taxes, advances, penalties, previous payments.
4. Net payment = gross payment - total deductions.
5. Payment approval may be required depending on amount.
6. Approved payments update the project fund balance.`,

    attendance: `**Attendance Tracking:**
1. Employees check in using GPS at the building site.
2. The system validates the employee is within the building's geofence (latitude, longitude, allowedRadius).
3. Check-in records the time and GPS coordinates.
4. Check-out records the departure time.
5. Attendance records are used for payroll calculation.
6. Employees can request leave which goes through approval.
7. Overtime can be tracked for approved overtime-enabled shifts.`,

    approval: `**Approval Workflow:**
1. Any entity (extract, purchase, leave, fund transaction, client statement, subcontractor statement, inventory request) can require approval.
2. User submits an approval request with entity type and entity ID.
3. Request lifecycle: **Draft** → **Pending Approval** → **Approved** / **Rejected** / **Cancelled**.
4. Draft requests are saved without notifying reviewers; submitting a draft moves it to pending and notifies approvers.
5. Authorized users can approve or reject pending requests; draft or pending requests can be cancelled by the requester.
6. Approved entities proceed to the next workflow step. Rejected entities can be revised and resubmitted.
7. All actions are logged in the audit trail, timeline, and notifications.
8. Inventory approvals are tracked independently of the item's operational status (active/inactive).`,

    inventory: `**Inventory Management:**
1. **Warehouses** - Physical storage locations.
2. **Categories** - Classification of inventory items.
3. **Inventory Items** - Tracked items with quantity, min quantity, unit, price.
4. **Stock Movements** - Records of stock receiving, issuing, or transferring.
5. Low stock alerts when quantity falls below min quantity.
6. Purchases replenish inventory.
7. **Inventory Requests** - Requests for inventory items (e.g., stock, materials) go through the generic approval engine: Draft → Pending → Approved/Rejected/Cancelled. The approval state is tracked independently of the item's operational active/inactive status.`,

    'project-fund': `**Project Funds & Treasury:**
1. Each project has a fund with an initial balance.
2. Fund transactions track all financial activity: deposits, withdrawals, payments, receipts.
3. Client payments increase the fund balance.
4. Contractor payments and expenses decrease the fund balance.
5. The treasury module provides a real-time view of all project funds.
6. Negative cash flow occurs when expenses exceed available funds.`,

    'role': `**Roles & Permissions:**
1. Users are assigned roles through role assignments.
2. Each role has multiple permissions.
3. Permissions control access to specific actions (read, create, update, delete).
4. The system supports multiple role assignments per user.
5. Project assignments control which projects a user can access.
6. The permission system integrates with JWT authentication.`,
  };

  private readonly knowledgeAr: Record<string, string> = {
    boq: `**بنود الكميات (BOQ):**
1. **بند صاحب العمل** - يُنشأ من متطلبات صاحب العمل ويحدد البنود والكميات والأسعار.
2. **البند التحليلي** - يفكك بنود صاحب العمل إلى موارد (خامات، عمالة، معدات).
3. **البند النهائي** - النسخة المعتمدة بعد التحليل وتشمل المكونات وتوزيعاتها.
4. **توزيع المكونات** - تخصيص مكونات البنود للمقاولين من الباطن.
5. **بند المقاول** - يحصل كل مقاول على نصيبه مع هامش ربحه.
6. **المستخلصات** - قياسات دورية للتقدم مقابل بنود المقاول.
7. **الدفعات** - تُحسب بناءً على المستخلصات المعتمدة بعد الخصومات.`,

    extract: `**المستخلصات:**
1. يُنشأ مستخلص عن فترة (مثال: شهري) يقيس الأعمال المنفذة.
2. كل بند في المستخلص يشير إلى بند كميات لدى المقاول مع الكمية المنفذة.
3. يمر المستخلص بسير عمل الموافقات.
4. بعد الاعتماد تُحسب الدفعة بناءً على قيمة المستخلص.
5. تُطبق الخصومات (تأمين، احتجازات، ضرائب، سلف، غرامات).
6. يُسجل صافي الدفعة في الخزنة كحركة صندوق.`,

    payment: `**الدفعات:**
1. تنشأ الدفعة من مستخلص معتمد.
2. إجمالي الدفعة = مجموع (السعر × الكمية المنفذة) لكل بنود المستخلص.
3. تُحسب الخصومات: تأمين، احتجازات، ضرائب، سلف، غرامات، دفعات سابقة.
4. صافي الدفعة = إجمالي الدفعة - إجمالي الخصومات.
5. قد يتطلب اعتماد الدفعة حسب قيمتها.
6. الدفعات المعتمدة تحدّث رصيد صندوق المشروع.`,

    attendance: `**الحضور:**
1. يسجل الموظف حضوره عبر GPS في موقع البناء.
2. يتحقق النظام من أن الموظف داخل النطاق الجغرافي للمبنى (خط الطول، خط العرض، نصف القطر المسموح).
3. تسجيل الدخول يثبت الوقت وإحداثيات GPS.
4. تسجيل الخروج يثبت وقت المغادرة.
5. تُستخدم سجلات الحضور في حساب المرتبات.
6. يمكن للموظف طلب إجازة تمر عبر الموافقات.
7. يمكن تتبع العمل الإضافي للمناوبات المفعلة.`,

    approval: `**الموافقات:**
1. أي كيان (مستخلص، شراء، إجازة، حركة صندوق، بيان عميل، بيان مقاول من الباطن، طلب مخزون) قد يتطلب موافقة.
2. يقدم المستخدم طلب موافقة مع نوع الكيان ومعرّفه.
3. دورة الطلب: **مسودة** → **بانتظار الموافقة** → **معتمد** / **مرفوض** / **ملغي**.
4. تُحفظ المسودات دون إخطار المراجعين؛ وإرسال المسودة ينقلها إلى قيد الانتظار ويُخطر المعتمدين.
5. يمكن للمستخدمين المصرح لهم الاعتماد أو الرفض.
6. الكيانات المعتمدة تستكمل الخطوة التالية، والمرفوضة يمكن مراجعتها وإعادة إرسالها.
7. تُسجل كل الإجراءات في سجل التدقيق والجدول الزمني والإشعارات.`,

    inventory: `**المخزون:**
1. **المخازن** - مواقع التخزين الفعلية.
2. **التصنيفات** - تصنيف أصناف المخزون.
3. **أصناف المخزون** - متابعة الكمية والحد الأدنى والوحدة والسعر.
4. **الحركات** - سجلات استلام وصرف وتحويل المخزون.
5. تنبيهات انخفاض المخزون عند نزول الكمية عن الحد الأدنى.
6. المشتريات تعيد تزويد المخزون.
7. **طلبات المخزون** تمر عبر محرك الموافقات العام: مسودة → بانتظار → معتمد/مرفوض/ملغي.`,

    'project-fund': `**صناديق المشاريع والخزنة:**
1. لكل مشروع صندوق برصيد ابتدائي.
2. حركات الصندوق تتبع كل النشاط المالي: إيداعات، سحوبات، دفعات، تحصيلات.
3. دفعات العملاء تزيد رصيد الصندوق.
4. دفعات المقاولين والمصروفات تقلل الرصيد.
5. توفر وحدة الخزنة رؤية لحظية لصناديق المشاريع.
6. يحدث التدفق النقدي السالب عندما تتجاوز المصروفات الأموال المتاحة.`,

    role: `**الأدوار والصلاحيات:**
1. يُعيّن المستخدمون في أدوار عبر تعيينات الأدوار.
2. لكل دور صلاحيات متعددة.
3. تتحكم الصلاحيات في الوصول إلى إجراءات محددة (قراءة، إنشاء، تعديل، حذف).
4. يدعم النظام تعيينات أدوار متعددة لكل مستخدم.
5. تحدد تعيينات المشاريع المشاريع التي يمكن للمستخدم الوصول إليها.
6. يتكامل نظام الصلاحيات مع مصادقة JWT.`,
  };

  explain(topic: string, lang: 'ar' | 'en' = 'en'): string {
    const normalized = topic.toLowerCase().trim();
    const source = lang === 'ar' ? this.knowledgeAr : this.knowledge;
    for (const [key, value] of Object.entries(source)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
    if (lang === 'ar') {
      return `وحدة **${topic}** تدير العمليات المرتبطة بها في نظام تخطيط موارد المؤسسات. لمزيد من التفاصيل اسأل عن: بنود الكميات، المستخلصات، الدفعات، الحضور، الموافقات، المخزون، الصناديق، أو الأدوار والصلاحيات.`;
    }
    return `The **${topic}** module handles related business operations in the ERP system. For specific details, please ask about: BOQ, Extracts, Payments, Attendance, Approvals, Inventory, Project Funds, or Roles & Permissions.`;
  }

  getAllTopics(): string[] {
    return Object.keys(this.knowledge);
  }

  getSummary(): string {
    const topics = this.getAllTopics();
    return `I can explain these ERP topics:\n${topics.map((t) => `  • ${t}`).join('\n')}\n\nJust ask "Explain [topic]" or "How does [topic] work?"`;
  }
}
