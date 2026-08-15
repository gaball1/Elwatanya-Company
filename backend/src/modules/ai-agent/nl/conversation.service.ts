import { Injectable } from '@nestjs/common';
import { ContextEngineService } from '../context/context-engine.service';
import { ToolResult } from '../dto/agent-response.dto';
import { EvaluationResult } from '../evaluation/self-evaluation.service';
import { formatMoney, sanitizeUuids } from '../tools/resolution.utils';
import { formatDuesSummary } from '../tools/erp-resolution.tools';

@Injectable()
export class ConversationService {
  constructor(private readonly context: ContextEngineService) {}

  formatResponse(
    intent: string,
    result: ToolResult,
    conversationId: string,
    evaluation?: EvaluationResult,
    lang: 'ar' | 'en' = 'en',
  ): string {
    if (!result.success) {
      return this.formatError(intent, result.error || 'An error occurred', lang === 'ar');
    }

    const ar = lang === 'ar';
    const parts: string[] = [];

    if (intent.startsWith('explain')) {
      return result.data?.explanation || (ar ? 'هذه هي المعلومات المتاحة.' : 'Here is the information.');
    }

    // Structured, human-readable answers for contractor resolution tools
    if (intent === 'list_contractor_extracts' || intent === 'list_extracts') {
      return sanitizeUuids(ar ? this.formatContractorExtractsAr(result.data) : this.formatContractorExtracts(result.data));
    }
    if (intent === 'find_extract') {
      return sanitizeUuids(ar ? this.formatFindExtractAr(result.data) : this.formatFindExtract(result.data));
    }
    if (intent === 'list_extract_payments' || intent === 'list_payments') {
      return sanitizeUuids(ar ? this.formatPaymentsAr(result.data) : this.formatPayments(result.data));
    }
    if (intent === 'list_extract_approvals') {
      return sanitizeUuids(ar ? this.formatApprovalsAr(result.data) : this.formatApprovals(result.data));
    }
    if (intent === 'get_contractor_dues') {
      return sanitizeUuids(ar ? this.formatDuesSummaryAr(result.data) : formatDuesSummary(result.data));
    }
    if (intent === 'find_contractor') {
      return sanitizeUuids(ar ? this.formatFoundContractorAr(result.data) : this.formatFoundContractor(result.data));
    }
    if (intent === 'find_project') {
      return sanitizeUuids(ar ? this.formatFoundProjectAr(result.data) : this.formatFoundProject(result.data));
    }
    if (intent === 'find_building') {
      return sanitizeUuids(ar ? this.formatFoundBuildingAr(result.data) : this.formatFoundBuilding(result.data));
    }
    if (intent === 'list_project_buildings') {
      return sanitizeUuids(ar ? this.formatProjectBuildingsAr(result.data) : this.formatProjectBuildings(result.data));
    }

    // Arabic analytical responses
    if (ar) {
      if (intent === 'get_project_profitability') return this.formatProfitabilityAr(result.data);
      if (intent === 'get_project_risks') return this.formatRisksAr(result.data);
      if (intent === 'get_contractor_analysis') return this.formatContractorAnalysisAr(result.data);
      if (intent === 'get_boq_analysis') return this.formatBoqAnalysisAr(result.data);
      if (intent === 'list_inventory_items') return this.formatInventoryAr(result.data);
      if (intent === 'get_project_summary' || intent === 'get_project_dashboard') return this.formatDashboardAr(result.data);
      if (intent === 'get_attendance_analysis') return this.formatAttendanceAr(result.data);
    }

    if (intent.startsWith('list_') || intent.startsWith('show_') || intent === 'search') {
      const showFull = (this.context.get(conversationId) as any)._showFullList === true;
      parts.push(ar ? this.formatListResultAr(intent, result.data, showFull) : this.formatListResult(intent, result.data, showFull));
    }

    if (intent === 'get_attendance_analysis') {
      parts.push(ar ? this.formatAttendanceAr(result.data) : this.formatAttendance(result.data));
    }

    if (intent.startsWith('create_')) {
      parts.push(ar ? this.formatCreateResultAr(intent, result.data) : this.formatCreateResult(intent, result.data));
    }

    if (intent.startsWith('update_')) {
      parts.push(ar ? this.formatUpdateResultAr(intent) : this.formatUpdateResult(intent));
    }

    if (intent.includes('summary') || intent.includes('stats')) {
      parts.push(ar ? this.formatSummaryResultAr(intent, result.data) : this.formatSummaryResult(intent, result.data));
    }

    if (intent === 'approve_request') {
      parts.push(ar ? 'تمت الموافقة على الطلب بنجاح.' : 'The request has been approved successfully.');
    }

    if (intent === 'reject_request') {
      parts.push(ar ? 'تم رفض الطلب.' : 'The request has been rejected.');
    }

    // Add evaluation-based suggestions
    if (evaluation?.suggestedNextAction) {
      parts.push(`\n💡 ${evaluation.suggestedNextAction}`);
    }

    // Add context summary for complex operations
    const ctxSummary = this.context.getContextSummary(conversationId);
    if (ctxSummary !== 'General conversation' && ctxSummary !== 'No context yet.') {
      parts.push(ar ? `\n_السياق: ${ctxSummary}_` : `\n_Context: ${ctxSummary}_`);
    }

    return parts.join('\n') || (ar ? 'تم.' : 'Done.');
  }

  private formatContractorExtracts(data: any): string {
    if (!data?.contractor) return 'Contractor not found.';
    const name = data.contractor.name;
    const items = data.items || [];
    if (items.length === 0) {
      return data.note || `No extracts found for ${name}.`;
    }
    const lines: string[] = [`**${name}** — ${items.length} extract(s), total net payable ${formatMoney(data.totalNetPayable)} EGP:`];
    for (const e of items.slice(0, 20)) {
      const ref = e.runningNumber ? `#${e.runningNumber}` : '';
      const when = e.date ? String(e.date).slice(0, 10) : '';
      const where = e.buildingName ? ` (${e.buildingName})` : '';
      lines.push(`• Extract ${ref}${where} — ${when}, ${e.status}, net payable ${formatMoney(e.netPayable)} EGP`);
    }
    if (items.length > 20) lines.push(`… and ${items.length - 20} more.`);
    return lines.join('\n');
  }

  private formatFindExtract(data: any): string {
    if (!data?.found) {
      return data.note || 'Extract not found.';
    }
    const e = data.extract;
    const ref = e.runningNumber ? `Extract #${e.runningNumber}` : 'Extract';
    const lines: string[] = [];
    lines.push(`**${ref}** for ${data.contractor.name} — ${e.buildingName || 'building'}, ${String(e.date).slice(0, 10)} (${e.status}).`);
    lines.push(`• Net payable: ${formatMoney(e.netPayable)} EGP | Paid: ${formatMoney(data.paidAmount)} EGP | Remaining: ${formatMoney(data.remaining)} EGP`);
    if (data.payments?.length) {
      lines.push(`• ${data.payments.length} payment(s) linked to this extract (${formatMoney(data.payments.reduce((s: number, p: any) => s + p.amount, 0))} EGP total).`);
    }
    if (data.approvals?.length) {
      const statuses = data.approvals.map((a: any) => a.status).join(', ');
      lines.push(`• Approval status: ${statuses}.`);
    } else {
      lines.push('• No approval records for this extract.');
    }
    return lines.join('\n');
  }

  private formatPayments(data: any): string {
    if (!data?.contractor) return 'Contractor not found.';
    const name = data.contractor.name;
    const items = data.items || [];
    if (items.length === 0) {
      return `No payment records found for ${name}.`;
    }
    const lines: string[] = [`**${name}** — ${items.length} payment(s) totalling ${formatMoney(data.totalPaid)} EGP:`];
    for (const p of items.slice(0, 20)) {
      const when = p.date ? String(p.date).slice(0, 10) : '';
      const where = p.buildingName ? ` (${p.buildingName})` : '';
      lines.push(`• ${when} — ${formatMoney(p.amount)} EGP${where}`);
    }
    return lines.join('\n');
  }

  private formatApprovals(data: any): string {
    const items = data?.items || [];
    if (items.length === 0) return 'No extract approval records found.';
    const lines: string[] = [`${items.length} extract approval record(s):`];
    for (const a of items.slice(0, 20)) {
      const when = a.createdAt ? String(a.createdAt).slice(0, 10) : '';
      lines.push(`• ${a.entityType} — ${a.status}${when ? ` (${when})` : ''}${a.comment ? ` — ${a.comment}` : ''}`);
    }
    return lines.join('\n');
  }

  private formatFoundContractor(data: any): string {
    if (!data?.name) return 'Contractor not found.';
    let s = `Found contractor: **${data.name}**`;
    if (data.workType) s += ` (${data.workType})`;
    if (data.status) s += ` — status ${data.status}`;
    return s;
  }

  private formatFoundProject(data: any): string {
    if (!data?.name && !data?.code) return 'Project not found.';
    return `Found project: **${data.code || ''}${data.code && data.name ? ' — ' : ''}${data.name || ''}**${data.status ? ` (${data.status})` : ''}`;
  }

  private formatFoundBuilding(data: any): string {
    if (data?.items && data.ambiguous) {
      return data.items.length > 0
        ? `This project has ${data.items.length} buildings: ${data.items.map((b: any) => b.name).join(', ')}. Which one do you mean?`
        : 'This project has no buildings.';
    }
    if (!data?.name) return 'Building not found.';
    return `Found building: **${data.name}**${data.code ? ` (${data.code})` : ''}`;
  }

  private formatProjectBuildings(data: any): string {
    const items = data?.items || [];
    if (items.length === 0) return 'This project has no buildings.';
    return `Project **${data.projectName || ''}** has ${items.length} building(s): ${items.map((b: any) => b.name).join(', ')}.`;
  }

  private formatError(intent: string, error: string, ar = false): string {
    if (error.includes('permission') || error.includes('Permission') || error.includes('Forbidden')) {
      return ar
        ? `ليس لديك صلاحية للقيام بهذا الإجراء. يرجى التواصل مع المسؤول لتفعيل الصلاحيات.`
        : `I don't have permission to do that. Please contact your administrator to grant access.`;
    }
    if (error.includes('not found') || error.includes('Not Found') || error.includes('No ')) {
      return ar
        ? `لم أجد ما تبحث عنه. يرجى التحقق من الاسم أو المحاولة بصيغة مختلفة.`
        : `I couldn't find what you're looking for. Please check the ID or try a different search.`;
    }
    if (error.includes('employeeId')) {
      return ar
        ? `أحتاج معرفة الموظف أولاً. هل يمكنك ذكر اسمه؟`
        : `I need the employee's ID to look up their details. Could you provide it?`;
    }
    if (error.includes('projectId')) {
      return ar
        ? `أحتاج معرفة المشروع أولاً. هل يمكنك ذكر اسمه؟`
        : `I need the project ID to proceed. Could you provide it?`;
    }
    if (error.includes('buildingId')) {
      return ar
        ? `أحتاج معرفة المبنى أولاً. هل يمكنك ذكر اسمه؟`
        : `I need the building ID to proceed. Could you provide it?`;
    }
    if (error.includes('contractorId') || error.includes('contractor')) {
      return ar
        ? `أحتاج معرفة المقاول أولاً. هل يمكنك ذكر اسمه؟`
        : `I need the contractor ID to proceed. Could you provide it?`;
    }
    if (error.includes('query')) {
      return ar
        ? `أحتاج فهم ما تبحث عنه بشكل أوضح. جرّب إعادة صياغة السؤال.`
        : `I need to understand what you're looking for. Could you rephrase?`;
    }
    return ar ? `واجهت مشكلة: ${error}` : `I ran into an issue: ${error}`;
  }

  private formatListResult(intent: string, data: any, showFull = false): string {
    const items = Array.isArray(data) ? data : data?.items || data?.projects || [];
    const entity = intent.replace('list_', '').replace('show_', '').replace(/_/g, ' ');

    if (items.length === 0) {
      return `There are no ${entity} at the moment.`;
    }

    if (items.length <= 3 || showFull) {
      const names = items.slice(0, 30).map((i: any) => i.name || i.fullName || i.code || `record ${items.indexOf(i) + 1}`).join(', ');
      return `I found ${items.length} ${entity}: ${names}.`;
    }

    return `I found ${items.length} ${entity}. Would you like me to show you the full list?`;
  }

  private formatCreateResult(intent: string, data: any): string {
    const entity = intent.replace('create_', '').replace(/_/g, ' ');
    const name = data?.name || data?.fullName || data?.code || '';
    if (name) {
      return `The ${entity} "${name}" has been created and is now active in the system.`;
    }
    return `The ${entity} has been created successfully.`;
  }

  private formatUpdateResult(intent: string): string {
    const entity = intent.replace('update_', '').replace(/_/g, ' ');
    return `The ${entity} has been updated with the new information.`;
  }

  private formatSummaryResult(intent: string, data: any): string {
    if (!data) return 'No data available for summary.';

    if (data.total !== undefined) {
      const parts: string[] = [];
      parts.push(`**Summary**: ${data.total} total`);
      if (data.active !== undefined) parts.push(`${data.active} active`);
      if (data.completed !== undefined) parts.push(`${data.completed} completed`);
      if (data.onHold !== undefined) parts.push(`${data.onHold} on hold`);
      if (data.lowStock !== undefined) parts.push(`${data.lowStock} items low on stock`);
      if (data.remaining !== undefined) {
        parts.push(`💰 Remaining budget: ${data.remaining}`);
      }
      return parts.join(' | ');
    }

    return JSON.stringify(data);
  }

  // =========================================================================
  // Arabic / Egyptian response formatters
  // =========================================================================

  private formatMoneyAr(value: number | undefined | null): string {
    const v = Number(value ?? 0);
    return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(Math.round(v));
  }

  private statusAr(status?: string): string {
    const map: Record<string, string> = {
      approved: 'معتمد', rejected: 'مرفوض', pending: 'قيد الانتظار', draft: 'مسودة',
      cancelled: 'ملغي', running: 'جاري', paid: 'مدفوع', unpaid: 'غير مدفوع',
      completed: 'مكتمل', active: 'نشط', 'on_hold': 'متوقف', in_progress: 'قيد التنفيذ',
      delayed: 'متأخر', low: 'منخفض',
    };
    return map[String(status).toLowerCase()] || String(status);
  }

  private formatContractorExtractsAr(data: any): string {
    if (!data?.contractor) return 'لم يتم العثور على المقاول.';
    const name = data.contractor.name;
    const items = data.items || [];
    if (items.length === 0) {
      return data.note || `لا توجد مستخلصات للمقاول ${name}.`;
    }
    const lines: string[] = [`**${name}** — ${items.length} مستخلص، إجمالي صافي المستحق ${this.formatMoneyAr(data.totalNetPayable)} ج.م:`];
    for (const e of items.slice(0, 20)) {
      const ref = e.runningNumber ? `رقم ${e.runningNumber}` : '';
      const when = e.date ? String(e.date).slice(0, 10) : '';
      const where = e.buildingName ? ` (${e.buildingName})` : '';
      lines.push(`• مستخلص ${ref}${where} — ${when}، الحالة: ${this.statusAr(e.status)}، صافي المستحق ${this.formatMoneyAr(e.netPayable)} ج.م`);
    }
    if (items.length > 20) lines.push(`… و${items.length - 20} مستخلصات أخرى.`);
    return lines.join('\n');
  }

  private formatFindExtractAr(data: any): string {
    if (!data?.found) {
      return data.note || 'لم يتم العثور على المستخلص.';
    }
    const e = data.extract;
    const ref = e.runningNumber ? `مستخلص رقم ${e.runningNumber}` : 'مستخلص';
    const lines: string[] = [];
    lines.push(`**${ref}** للمقاول ${data.contractor.name} — ${e.buildingName || 'مبنى'}، ${String(e.date).slice(0, 10)} (${this.statusAr(e.status)}).`);
    lines.push(`• صافي المستحق: ${this.formatMoneyAr(e.netPayable)} ج.م | المدفوع: ${this.formatMoneyAr(data.paidAmount)} ج.م | المتبقي: ${this.formatMoneyAr(data.remaining)} ج.م`);
    if (data.payments?.length) {
      const total = data.payments.reduce((s: number, p: any) => s + p.amount, 0);
      lines.push(`• ${data.payments.length} دفعة مرتبطة بهذا المستخلص (إجمالي ${this.formatMoneyAr(total)} ج.م).`);
    }
    if (data.approvals?.length) {
      const statuses = data.approvals.map((a: any) => this.statusAr(a.status)).join(', ');
      lines.push(`• حالة الموافقات: ${statuses}.`);
    } else {
      lines.push('• لا توجد سجلات موافقة لهذا المستخلص.');
    }
    return lines.join('\n');
  }

  private formatPaymentsAr(data: any): string {
    if (!data?.contractor) return 'لم يتم العثور على المقاول.';
    const name = data.contractor.name;
    const items = data.items || [];
    if (items.length === 0) {
      return `لا توجد دفعات مسجلة للمقاول ${name}.`;
    }
    const lines: string[] = [`**${name}** — ${items.length} دفعة بإجمالي ${this.formatMoneyAr(data.totalPaid)} ج.م:`];
    for (const p of items.slice(0, 20)) {
      const when = p.date ? String(p.date).slice(0, 10) : '';
      const where = p.buildingName ? ` (${p.buildingName})` : '';
      lines.push(`• ${when} — ${this.formatMoneyAr(p.amount)} ج.م${where}`);
    }
    return lines.join('\n');
  }

  private formatApprovalsAr(data: any): string {
    const items = data?.items || [];
    if (items.length === 0) return 'لا توجد سجلات موافقة على المستخلصات.';
    const lines: string[] = [`${items.length} سجل موافقة:`];
    for (const a of items.slice(0, 20)) {
      const when = a.createdAt ? String(a.createdAt).slice(0, 10) : '';
      lines.push(`• ${a.entityType || 'مستخلص'} — ${this.statusAr(a.status)}${when ? ` (${when})` : ''}${a.comment ? ` — ${a.comment}` : ''}`);
    }
    return lines.join('\n');
  }

  private formatDuesSummaryAr(data: any): string {
    if (!data?.contractor) return 'لم يتم العثور على المقاول.';
    const s = data.summary;
    const name = data.contractor.name;
    const lines: string[] = [];
    lines.push(`**${name}** — المركز المالي:`);
    lines.push(`• المستخلصات: ${s.extractCount} (إجمالي الأعمال ${this.formatMoneyAr(s.totalWorkValue)} ج.م، صافي المستحق ${this.formatMoneyAr(s.totalNetPayable)} ج.م)`);
    lines.push(`• المدفوع: ${this.formatMoneyAr(s.totalPaid)} ج.م`);
    lines.push(`• المتبقي على المقاول: ${this.formatMoneyAr(s.remaining)} ج.م`);
    if (s.outstandingCount > 0) {
      lines.push(`• مستخلصات لم تُسدد بالكامل: ${s.outstandingCount}`);
    } else {
      lines.push('• لا توجد مستخلصات متبقية — كل المستحقات مسددة.');
    }
    return lines.join('\n');
  }

  private formatFoundContractorAr(data: any): string {
    if (!data?.name) return 'لم يتم العثور على المقاول.';
    let s = `وجدت المقاول: **${data.name}**`;
    if (data.workType) s += ` (${data.workType})`;
    if (data.status) s += ` — الحالة ${this.statusAr(data.status)}`;
    return s;
  }

  private formatFoundProjectAr(data: any): string {
    if (!data?.name && !data?.code) return 'لم يتم العثور على المشروع.';
    return `وجدت المشروع: **${data.code || ''}${data.code && data.name ? ' — ' : ''}${data.name || ''}**${data.status ? ` (${this.statusAr(data.status)})` : ''}`;
  }

  private formatFoundBuildingAr(data: any): string {
    if (data?.items && data.ambiguous) {
      return data.items.length > 0
        ? `يوجد في هذا المشروع ${data.items.length} مبنى: ${data.items.map((b: any) => b.name).join('، ')}. أي واحد تقصد؟`
        : 'لا يوجد مباني في هذا المشروع.';
    }
    if (!data?.name) return 'لم يتم العثور على المبنى.';
    return `وجدت المبنى: **${data.name}**${data.code ? ` (${data.code})` : ''}`;
  }

  private formatProjectBuildingsAr(data: any): string {
    const items = data?.items || [];
    if (items.length === 0) return 'لا توجد مباني في هذا المشروع.';
    return `مشروع **${data.projectName || ''}** به ${items.length} مبنى: ${items.map((b: any) => b.name).join('، ')}.`;
  }

  private formatProfitabilityAr(data: any): string {
    const cost = data?.cost;
    const boq = data?.boq;
    if (!cost) return 'لا توجد بيانات ربحية لهذا المشروع.';
    const lines: string[] = [];
    const profit = cost.profit || 0;
    lines.push(`**التحليل المالي للمشروع:**`);
    lines.push(`• قيمة الأعمال (قيمة صاحب العمل): ${this.formatMoneyAr(cost.employerValue)} ج.م`);
    lines.push(`• تكلفة المقاولين: ${this.formatMoneyAr(cost.contractorValue)} ج.م`);
    lines.push(`• التكلفة الفعلية: ${this.formatMoneyAr(cost.actualCost)} ج.م`);
    lines.push(`• **الربح: ${this.formatMoneyAr(profit)} ج.م** (هامش ${(cost.margin ?? 0).toFixed(1)}%)`);
    if (profit < 0) {
      lines.push('⚠️ المشروع في **خسارة**.');
    }
    if (boq?.topProfit?.length) {
      const top = boq.topProfit.slice(0, 5).map((i: any) => `• ${i.itemCode} ${i.description} — ربح ${this.formatMoneyAr(i.profit)} ج.م`).join('\n');
      lines.push(`\n**أعلى البنود ربحاً:**\n${top}`);
    }
    if (boq?.topLoss?.length) {
      const loss = boq.topLoss.slice(0, 5).map((i: any) => `• ${i.itemCode} ${i.description} — خسارة ${this.formatMoneyAr(Math.abs(i.profit))} ج.م`).join('\n');
      lines.push(`\n**أكثر البنود خسارة:**\n${loss}`);
    }
    return lines.join('\n');
  }

  private formatRisksAr(data: any): string {
    const score = data?.score;
    const items = data?.items || [];
    if (!score) return 'لا توجد بيانات مخاطر متاحة.';
    const lines: string[] = [];
    const levelMap: Record<string, string> = { low: 'منخفض', medium: 'متوسط', high: 'مرتفع', critical: 'حرج' };
    lines.push(`**مؤشر المخاطر: ${score.overall}/100 (${levelMap[score.level] || score.level})**`);
    for (const r of items.slice(0, 8)) {
      lines.push(`• ${r.label}`);
      if (r.recommendation) lines.push(`  ↳ التوصية: ${r.recommendation}`);
    }
    return lines.join('\n');
  }

  private formatContractorAnalysisAr(data: any): string {
    const items = Array.isArray(data) ? data : data?.contractors || [];
    if (items.length === 0) return 'لا توجد بيانات مقاولين متاحة.';
    const lines: string[] = [`**تحليل أداء المقاولين (${items.length}):**`];
    for (const c of items.slice(0, 10)) {
      const delay = c.averageDelayDays > 0 ? `، تأخير ${c.averageDelayDays} يوم` : '';
      lines.push(`• ${c.name}${c.workType ? ` (${c.workType})` : ''} — إسناد ${this.formatMoneyAr(c.assignedBOQ)} ج.م، منفذ ${this.formatMoneyAr(c.completedBOQ)} ج.م، مدفوع ${this.formatMoneyAr(c.paid)} ج.م${delay}`);
    }
    return lines.join('\n');
  }

  private formatBoqAnalysisAr(data: any): string {
    const lines: string[] = [];
    const delayed = data?.topDelayed || [];
    const counts = data?.counts;
    if (counts) {
      lines.push(`**تحليل بنود الكميات:**`);
      lines.push(`• ربحية: ${counts.profitable ?? 0} | تعادل: ${counts.break_even ?? 0} | خسارة: ${(counts.loss ?? 0) + (counts.critical_loss ?? 0)} | ربحية عالية: ${counts.very_profitable ?? 0}`);
    }
    if (delayed.length) {
      lines.push(`\n**البنود المتأخرة (${delayed.length}):**`);
      for (const i of delayed.slice(0, 10)) {
        lines.push(`• ${i.itemCode} ${i.description} — إنجاز ${i.progress ?? 0}%`);
      }
    } else {
      lines.push('\nلا توجد بنود متأخرة.');
    }
    return lines.join('\n');
  }

  private formatInventoryAr(data: any): string {
    const items = data?.items || [];
    const searched = data?.searchedName;
    if (items.length === 0) {
      return searched ? `لم أجد صنف "${searched}" في المخازن.` : 'لا توجد أصناف في المخزون حالياً.';
    }
    if (searched) {
      const item = items[0];
      const where = item.warehouseName ? `في مخزن **${item.warehouseName}**` : 'في المخزون';
      return `الصنف **${item.name}** (${item.code || ''}) موجود ${where} — الكمية المتاحة ${item.quantity} ${item.unit || ''}${item.quantity <= (item.minQuantity || 0) ? ' ⚠️ (كمية منخفضة)' : ''}.`;
    }
    const lines: string[] = [`${items.length} صنف في المخزون:`];
    for (const i of items.slice(0, 15)) {
      lines.push(`• ${i.name} — ${i.quantity} ${i.unit || ''}${i.warehouseName ? ` (${i.warehouseName})` : ''}`);
    }
    return lines.join('\n');
  }

  private formatDashboardAr(data: any): string {
    const lines: string[] = [];
    if (data?.project?.name) lines.push(`**مشروع ${data.project.name}**${data.project.code ? ` (${data.project.code})` : ''}`);
    if (data?.progress?.projectPercent !== undefined) lines.push(`• نسبة الإنجاز: ${data.progress.projectPercent}%`);
    if (data?.evm) lines.push(`• مؤشر الأداء: SPI ${data.evm.spi}, CPI ${data.evm.cpi}`);
    if (data?.cost) {
      lines.push(`• قيمة الأعمال: ${this.formatMoneyAr(data.cost.employerValue)} ج.م`);
      lines.push(`• الربح: ${this.formatMoneyAr(data.cost.profit)} ج.م (هامش ${(data.cost.margin ?? 0).toFixed(1)}%)`);
    }
    if (data?.risks?.score) lines.push(`• مؤشر المخاطر: ${data.risks.score.overall}/100`);
    if (data?.treasury?.balance !== undefined) lines.push(`• رصيد الخزنة: ${this.formatMoneyAr(data.treasury.balance)} ج.م`);
    if (data?.purchases) lines.push(`• مشتريات فعلية: ${this.formatMoneyAr(data.purchases.actualPurchases)} ج.م${data.purchases.costOverrun > 0 ? ` (تجاوز ${this.formatMoneyAr(data.purchases.costOverrun)} ج.م)` : ''}`);
    return lines.join('\n') || 'لا توجد بيانات متاحة.';
  }

  private formatListResultAr(intent: string, data: any, showFull = false): string {
    const items = Array.isArray(data) ? data : data?.items || data?.projects || [];
    const entity = intent.replace('list_', '').replace('show_', '').replace(/_/g, ' ');
    const arEntities: Record<string, string> = {
      projects: 'مشروع', project: 'مشروع',
      buildings: 'مبنى', building: 'مبنى',
      employees: 'موظف', employee: 'موظف',
      attendance: 'سجل حضور',
      approvals: 'موافقة', approval: 'موافقة',
      suppliers: 'مورد', supplier: 'مورد',
      clients: 'عميل', client: 'عميل',
      subcontractors: 'مقاول', subcontractor: 'مقاول',
      warehouses: 'مخزن', warehouse: 'مخزن',
      'inventory items': 'صنف', 'inventory item': 'صنف',
      'project funds': 'صندوق', 'project fund': 'صندوق',
      purchases: 'مشتريات', purchase: 'مشتريات',
      extracts: 'مستخلص', extract: 'مستخلص',
      payments: 'دفعة', payment: 'دفعة',
      reports: 'تقرير', report: 'تقرير',
    };
    const entityAr = arEntities[entity] || entity;
    if (items.length === 0) {
      return `لا توجد ${entityAr} حالياً.`;
    }
    if (items.length <= 5 || showFull) {
      const names = items.slice(0, 30).map((i: any) => i.name || i.fullName || i.code || `سجل ${items.indexOf(i) + 1}`).join('، ');
      return `وجدت ${items.length} ${entityAr}: ${names}.`;
    }
    return `وجدت ${items.length} ${entityAr}. هل تريد أن أعرض لك القائمة كاملة؟`;
  }

  private formatCreateResultAr(intent: string, data: any): string {
    const entity = intent.replace('create_', '').replace(/_/g, ' ');
    const name = data?.name || data?.fullName || data?.code || '';
    return name
      ? `تم إنشاء "${name}" وتم تفعيله في النظام.`
      : `تم إنشاء ${entity} بنجاح.`;
  }

  private formatUpdateResultAr(intent: string): string {
    const entity = intent.replace('update_', '').replace(/_/g, ' ');
    return `تم تحديث ${entity} بالمعلومات الجديدة.`;
  }

  private formatSummaryResultAr(intent: string, data: any): string {
    if (!data) return 'لا توجد بيانات للملخص.';
    if (data.total !== undefined) {
      const parts: string[] = [`**الملخص**: ${data.total} إجمالي`];
      if (data.active !== undefined) parts.push(`${data.active} نشط`);
      if (data.completed !== undefined) parts.push(`${data.completed} مكتمل`);
      if (data.onHold !== undefined) parts.push(`${data.onHold} متوقف`);
      if (data.lowStock !== undefined) parts.push(`${data.lowStock} صنف منخفض المخزون`);
      if (data.remaining !== undefined) parts.push(`💰 الرصيد المتبقي: ${data.remaining}`);
      return parts.join(' | ');
    }
    return JSON.stringify(data);
  }

  private formatAttendance(data: any): string {
    if (!data) return 'No attendance data available.';
    const lines: string[] = [];
    lines.push(`**Attendance:** ${data.totalRecords ?? 0} records | ${data.present ?? 0} present | ${data.late ?? 0} late | ${data.absent ?? 0} absent`);
    lines.push(`• Attendance rate: ${data.attendanceRate ?? 0}% | Absence: ${data.absenceRate ?? 0}% | Late: ${data.lateArrivalRate ?? 0}%`);
    lines.push(`• Avg working hours: ${data.averageWorkingHours ?? 0} | Overtime: ${data.overtimeHours ?? 0}h | Active workforce: ${data.activeWorkforce ?? 0}`);
    const byBuilding = data.byBuilding || [];
    if (byBuilding.length) {
      lines.push(`\n**By building:**`);
      for (const b of byBuilding.slice(0, 5)) {
        lines.push(`• ${b.name}: ${b.present}/${b.total} present (${(b.attendanceRate ?? 0).toFixed(1)}%)`);
      }
    }
    return lines.join('\n');
  }

  private formatAttendanceAr(data: any): string {
    if (!data) return 'لا توجد بيانات حضور متاحة.';
    const lines: string[] = [];
    lines.push(`**الحضور:** ${data.totalRecords ?? 0} سجل | ${data.present ?? 0} حاضر | ${data.late ?? 0} متأخر | ${data.absent ?? 0} غائب`);
    lines.push(`• نسبة الحضور: ${data.attendanceRate ?? 0}% | نسبة الغياب: ${data.absenceRate ?? 0}% | نسبة التأخير: ${data.lateArrivalRate ?? 0}%`);
    lines.push(`• متوسط ساعات العمل: ${data.averageWorkingHours ?? 0} | ساعات إضافية: ${data.overtimeHours ?? 0} ساعة | القوى العاملة النشطة: ${data.activeWorkforce ?? 0}`);
    const byBuilding = data.byBuilding || [];
    if (byBuilding.length) {
      lines.push(`\n**حسب المبنى:**`);
      for (const b of byBuilding.slice(0, 5)) {
        lines.push(`• ${b.name}: ${b.present}/${b.total} حاضر (${(b.attendanceRate ?? 0).toFixed(1)}%)`);
      }
    }
    return lines.join('\n');
  }
}
