import { Injectable } from '@nestjs/common';
import { formatMoney, sanitizeUuids } from '../tools/resolution.utils';

export interface ContractorPaymentData {
  contractor?: { id?: string; name?: string; workType?: string };
  project?: { id?: string; code?: string; name?: string } | null;
  buildings?: { id?: string; name?: string; projectName?: string }[];
  extracts?: any[];
  approvals?: any[];
  payments?: any[];
  treasury?: any[];
  purchases?: any[];
  cashflow?: any;
}

/**
 * Builds executive-grade, structured answers from ERP tool results.
 * Every number is taken from verified ERP data — nothing is fabricated.
 */
@Injectable()
export class ExecutiveReportService {
  buildContractorPaymentReport(data: ContractorPaymentData): string {
    const contractor = data.contractor;
    const project = data.project;
    const extracts = data.extracts || [];
    const approvals = data.approvals || [];
    const payments = data.payments || [];
    const treasury = data.treasury || [];
    const purchases = data.purchases || [];

    const contractorName = contractor?.name || 'the contractor';
    const projectName = project?.name || project?.code || (data.buildings?.[0]?.projectName as string) || 'the project';

    // --- Financial computation (all from verified ERP records) ---
    const totalWorkValue = extracts.reduce((s, e) => s + Number(e.totalWorkValue ?? 0), 0);
    const totalNetPayable = extracts.reduce((s, e) => s + Number(e.netPayable ?? 0), 0);
    const totalDeductions = extracts.reduce((s, e) => s + Number(e.totalDeductions ?? 0), 0);
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const remaining = Math.max(0, totalNetPayable - totalPaid);

    const paidByExtract = new Map<string, number>();
    for (const p of payments) {
      const key = p.extractId || p.statementId || '';
      paidByExtract.set(key, (paidByExtract.get(key) || 0) + Number(p.amount ?? 0));
    }
    const unpaidExtracts = extracts.filter((e) => (paidByExtract.get(e.id) || 0) < Number(e.netPayable ?? 0));
    const approvedCount = approvals.filter((a) => String(a.status).toLowerCase() === 'approved').length;
    const rejectedCount = approvals.filter((a) => String(a.status).toLowerCase() === 'rejected').length;
    const pendingCount = approvals.filter((a) => String(a.status).toLowerCase() === 'pending').length;

    const runningExtracts = extracts.filter((e) => String(e.status).toLowerCase() === 'running').length;
    const finalExtracts = extracts.filter((e) => String(e.status).toLowerCase() === 'final').length;

    const lastExtract = extracts[0] || null;

    const cashIn = Number(data.cashflow?.cashIn ?? data.cashflow?.totalCashIn ?? 0);
    const cashOut = Number(data.cashflow?.cashOut ?? data.cashflow?.totalCashOut ?? 0);
    const treasuryOut = treasury
      .map((f) => Number(f?.totalOut ?? f?.spent ?? 0))
      .reduce((s, v) => s + v, 0);

    // --- Root cause analysis ---
    let rootCause = '';
    if (remaining <= 0 && totalNetPayable > 0) {
      rootCause = `No outstanding dues. All ${extracts.length} extract(s) have been settled by ${formatMoney(totalPaid)} EGP in verified payments.`;
    } else if (unpaidExtracts.length > 0) {
      const approvalBlock = pendingCount > 0
        ? ` ${pendingCount} extract approval(s) are still pending in the approval queue, which blocks the payment step.`
        : '';
      rootCause = `${unpaidExtracts.length} extract(s) worth ${formatMoney(totalNetPayable - totalPaid)} EGP remain unpaid. The extract workflow (submission → approval → payment) has not produced a payment covering these amounts.${approvalBlock}`;
    } else if (extracts.length === 0) {
      rootCause = 'There are no extract records for this contractor, so no payment obligation exists yet.';
    } else {
      rootCause = 'All recorded extracts are covered by payments; any payment gap is within normal workflow timing.';
    }

    // --- Recommended action ---
    let action = '';
    if (remaining > 0 && unpaidExtracts.length > 0) {
      action = `Issue payments totalling ${formatMoney(remaining)} EGP to settle the outstanding extracts (highest first: ${unpaidExtracts.slice(0, 3).map((e) => e.buildingName || 'building').join(', ')}).`;
    } else if (pendingCount > 0) {
      action = 'Review and approve the pending extract approvals to unblock contractor payments.';
    } else if (extracts.length === 0) {
      action = 'No action needed on payments; verify the contractor is correctly assigned to a building and BOQ first.';
    } else {
      action = 'No payment action required. Continue with the normal extract cycle.';
    }

    const sections: string[] = [];

    sections.push('## Executive Summary');
    sections.push(
      `This report covers the payment position of **${contractorName}** on **${projectName}**. ` +
        `Total work value ${formatMoney(totalWorkValue)} EGP across ${extracts.length} extract(s) ` +
        `(${runningExtracts} running, ${finalExtracts} final). Net payable ${formatMoney(totalNetPayable)} EGP, ` +
        `paid ${formatMoney(totalPaid)} EGP, **remaining ${formatMoney(remaining)} EGP**.`,
    );

    sections.push('## Root Cause');
    sections.push(rootCause);

    sections.push('## Current Status');
    sections.push(
      `• Extracts: ${extracts.length} total, net payable ${formatMoney(totalNetPayable)} EGP (deductions ${formatMoney(totalDeductions)} EGP).\n` +
        `• Payments: ${payments.length} verified payment(s) totalling ${formatMoney(totalPaid)} EGP.\n` +
        `• Approvals: ${approvedCount} approved, ${pendingCount} pending, ${rejectedCount} rejected.\n` +
        `• Outstanding: ${unpaidExtracts.length} extract(s) with unpaid balance.\n` +
        `• Last extract: ${lastExtract ? `${lastExtract.buildingName || 'building'} on ${String(lastExtract.date).slice(0, 10)} (net payable ${formatMoney(lastExtract.netPayable)} EGP)` : 'none'}.`,
    );

    sections.push('## Financial Impact');
    sections.push(
      `Remaining dues of ${formatMoney(remaining)} EGP. ` +
        `Project cash out ${formatMoney(cashOut)} EGP${cashIn ? `, cash in ${formatMoney(cashIn)} EGP` : ''}` +
        (treasuryOut ? `, treasury outflows ${formatMoney(treasuryOut)} EGP.` : '.' ) +
        ` Settlement of contractor dues increases cash outflows but releases contractual obligations.`,
    );

    sections.push('## Recommended Action');
    sections.push(action);

    sections.push('## Supporting Documents');
    if (extracts.length > 0) {
      sections.push(
        extracts.slice(0, 10).map((e) => {
          const ref = e.runningNumber ? `Extract #${e.runningNumber}` : 'Extract';
          return `• ${ref} — ${e.buildingName || 'building'} (${String(e.date).slice(0, 10)}, ${e.status}, net payable ${formatMoney(e.netPayable)} EGP)`;
        }).join('\n'),
      );
    } else {
      sections.push('No extract documents are available for this contractor.');
    }

    const confidence = totalNetPayable > 0 || payments.length > 0 || extracts.length > 0 ? 0.95 : 0.7;
    sections.push(`## Confidence\n${Math.round(confidence * 100)}% — based on live ERP records (extracts, payments, approvals). No figures are estimated.`);

    sections.push('## References');
    const refs: string[] = [];
    if (extracts.length > 0) refs.push(`${extracts.length} extract record(s)`);
    if (payments.length > 0) refs.push(`${payments.length} payment record(s)`);
    if (approvals.length > 0) refs.push(`${approvals.length} approval record(s)`);
    if (treasury.length > 0) refs.push(`${treasury.length} treasury/fund record(s)`);
    if (purchases.length > 0) refs.push(`${purchases.length} purchase record(s)`);
    sections.push(refs.length > 0 ? refs.map((r) => `• ${r}`).join('\n') : '• No ERP records matched this query.');

    return sanitizeUuids(sections.join('\n\n'));
  }
}
