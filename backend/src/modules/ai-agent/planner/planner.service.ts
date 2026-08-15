import { Injectable } from '@nestjs/common';
import { IntentCategory, IntentDefinition } from './intent.types';
import { IntentResult } from '../dto/agent-response.dto';

export interface ChainMatch {
  chainKey: string;
  confidence: number;
  entities: Record<string, any>;
}

export interface WhyQuery {
  topic: string;
  metric: string;
  timeframe?: string;
  confidence: number;
}

@Injectable()
export class PlannerService {
  private readonly intents: IntentDefinition[] = [
    // === KNOWLEDGE QUERIES ===
    { category: IntentCategory.KNOWLEDGE_QUERY, action: 'explain_boq', description: 'Explain how BOQ works', entities: ['boq'] },
    { category: IntentCategory.KNOWLEDGE_QUERY, action: 'explain_extract', description: 'Explain extract workflow', entities: ['extract'] },
    { category: IntentCategory.KNOWLEDGE_QUERY, action: 'explain_payment', description: 'Explain payments workflow', entities: ['payment'] },
    { category: IntentCategory.KNOWLEDGE_QUERY, action: 'explain_attendance', description: 'Explain attendance tracking', entities: ['attendance'] },
    { category: IntentCategory.KNOWLEDGE_QUERY, action: 'explain_approval', description: 'Explain approval workflow', entities: ['approval'] },
    { category: IntentCategory.KNOWLEDGE_QUERY, action: 'explain_inventory', description: 'Explain inventory management', entities: ['inventory'] },
    { category: IntentCategory.KNOWLEDGE_QUERY, action: 'explain_project_fund', description: 'Explain project funds and treasury', entities: ['fund', 'treasury'] },
    { category: IntentCategory.KNOWLEDGE_QUERY, action: 'explain_roles', description: 'Explain roles and permissions system', entities: ['role', 'permission'] },

    // === DATA RETRIEVAL ===
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_projects', description: 'List projects', toolName: 'list_projects', entities: ['project'], requiredPermissions: ['projects.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_buildings', description: 'List buildings', toolName: 'list_buildings', entities: ['building'], requiredPermissions: ['buildings.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_employees', description: 'List employees', toolName: 'list_employees', entities: ['employee'], requiredPermissions: ['employees.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_attendance', description: 'List attendance records', toolName: 'list_attendance', entities: ['attendance'], requiredPermissions: ['attendance.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_pending_approvals', description: 'List pending approvals', toolName: 'list_pending_approvals', entities: ['approval'], requiredPermissions: ['approvals.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_suppliers', description: 'List suppliers', toolName: 'list_suppliers', entities: ['supplier'], requiredPermissions: ['suppliers.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_clients', description: 'List clients', toolName: 'list_clients', entities: ['client'], requiredPermissions: ['clients.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_subcontractors', description: 'List subcontractors', toolName: 'list_subcontractors', entities: ['subcontractor'], requiredPermissions: ['subcontractors.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_warehouses', description: 'List warehouses', toolName: 'list_warehouses', entities: ['warehouse'], requiredPermissions: ['warehouses.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_inventory', description: 'List inventory items', toolName: 'list_inventory_items', entities: ['inventory', 'item'], requiredPermissions: ['inventory.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_project_funds', description: 'List project funds', toolName: 'list_project_funds', entities: ['fund'], requiredPermissions: ['project-funds.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_purchases', description: 'List purchases', toolName: 'list_purchases', entities: ['purchase'], requiredPermissions: ['purchases.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_extracts', description: 'List extracts', toolName: 'list_extracts', entities: ['extract'], requiredPermissions: ['extracts.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_payments', description: 'List payments', toolName: 'list_payments', entities: ['payment'], requiredPermissions: ['payments.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'find_project', description: 'Find a project by name or code', toolName: 'find_project', entities: ['project'], requiredPermissions: ['projects.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'find_building', description: 'Find a building within a project', toolName: 'find_building', entities: ['building'], requiredPermissions: ['buildings.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'find_contractor', description: 'Find a contractor by name', toolName: 'find_contractor', entities: ['contractor', 'subcontractor'], requiredPermissions: ['subcontractors.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_project_buildings', description: 'List buildings of a project', toolName: 'list_project_buildings', entities: ['building'], requiredPermissions: ['buildings.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_contractor_extracts', description: 'List contractor extract history across buildings', toolName: 'list_contractor_extracts', entities: ['contractor', 'extract'], requiredPermissions: ['extracts.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_extract_payments', description: 'List contractor payments', toolName: 'list_extract_payments', entities: ['contractor', 'payment'], requiredPermissions: ['payments.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_extract_approvals', description: 'List extract approvals', toolName: 'list_extract_approvals', entities: ['contractor', 'approval', 'extract'], requiredPermissions: ['approvals.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'find_extract', description: 'Find the latest, unpaid, approved or rejected extract of a contractor', toolName: 'find_extract', entities: ['contractor', 'extract'], requiredPermissions: ['extracts.read'] },
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'get_contractor_dues', description: 'Contractor dues, balance and remaining payments', toolName: 'get_contractor_dues', entities: ['contractor', 'dues', 'payment'], requiredPermissions: ['extracts.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'get_employee', description: 'Get employee details', toolName: 'get_employee', entities: ['employee'], requiredPermissions: ['employees.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'global_search', description: 'Search across all ERP entities', toolName: 'global_search', entities: ['search'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'get_entity_timeline', description: 'Get entity timeline', toolName: 'get_entity_timeline', entities: ['timeline'], requiredPermissions: ['timeline.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'get_settings', description: 'Get system settings', toolName: 'get_settings', entities: ['setting', 'settings'], requiredPermissions: ['settings.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'get_employer_boq', description: 'Get employer BOQ', toolName: 'get_employer_boq', entities: ['boq', 'employer-boq'], requiredPermissions: ['employer-boq.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'get_analytical_boq', description: 'Get analytical BOQ', toolName: 'get_analytical_boq', entities: ['boq', 'analytical-boq'], requiredPermissions: ['analytical-boq.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'search_knowledge', description: 'Search knowledge base', toolName: 'search_knowledge', entities: ['knowledge', 'document', 'contract'], requiredPermissions: ['knowledge.read'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'get_white_label_branding', description: 'Get company branding and theme', toolName: 'get_white_label_branding', entities: ['branding', 'theme'], requiredPermissions: ['settings.read'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'update_white_label_branding', description: 'Update company branding', toolName: 'update_white_label_branding', entities: ['branding'], requiredPermissions: ['settings.write'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_reports', description: 'List available reports', toolName: 'list_reports', entities: ['report'], requiredPermissions: ['reports.read'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'generate_report', description: 'Generate a report in PDF/Excel/CSV', toolName: 'generate_report', entities: ['report'], requiredPermissions: ['reports.generate'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'render_pdf', description: 'Render a custom PDF document with branding and signatures', toolName: 'render_pdf', entities: ['pdf'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'list_signature_workflows', description: 'List signature workflow definitions', toolName: 'list_signature_workflows', entities: ['signature', 'workflow'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'create_signature_workflow', description: 'Create a signature workflow', toolName: 'create_signature_workflow', entities: ['signature', 'workflow'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'submit_for_signature', description: 'Submit a document for signature workflow', toolName: 'submit_for_signature', entities: ['signature'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'sign_document', description: 'Sign or reject a pending signature request', toolName: 'sign_document', entities: ['signature'] },
    { category: IntentCategory.DATA_RETRIEVAL, action: 'get_signature_status', description: 'Get signature status for a document', toolName: 'get_signature_status', entities: ['signature'] },
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'get_project_dashboard', description: 'Get project KPI dashboard', toolName: 'get_project_dashboard', entities: ['dashboard', 'project'], requiredPermissions: ['projects.read'] },
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'evaluate_all_kpis', description: 'Evaluate all construction KPIs', toolName: 'evaluate_all_kpis', entities: ['kpi', 'project'], requiredPermissions: ['projects.read'] },

    // === BUSINESS ANALYSIS ===
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'project_summary', description: 'Project summary with status counts', toolName: 'project_summary', entities: ['project'], requiredPermissions: ['projects.read'] },
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'get_project_risks', description: 'Get project risk score and risk items', toolName: 'get_project_risks', entities: ['risk', 'project'], requiredPermissions: ['projects.read'] },
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'get_contractor_analysis', description: 'Get subcontractor performance analysis', toolName: 'get_contractor_analysis', entities: ['contractor', 'subcontractor'], requiredPermissions: ['projects.read'] },
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'get_project_profitability', description: 'Get project profitability and BOQ profit/loss analysis', toolName: 'get_project_profitability', entities: ['profit', 'loss', 'profitability', 'margin'], requiredPermissions: ['projects.read'] },
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'get_executive_dashboard', description: 'Get company-wide executive dashboard across all projects', toolName: 'get_executive_dashboard', entities: ['executive', 'company', 'all projects'], requiredPermissions: ['projects.read'] },
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'get_project_dashboard', description: 'Get project purchase budget and cost analysis', toolName: 'get_project_dashboard', entities: ['purchase', 'budget'], requiredPermissions: ['projects.read'] },
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'employee_stats', description: 'Employee statistics', toolName: 'employee_stats', entities: ['employee'], requiredPermissions: ['employees.read'] },
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'pending_approvals_summary', description: 'Pending approvals summary', toolName: 'pending_approvals_summary', entities: ['approval'], requiredPermissions: ['approvals.read'] },
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'fund_summary', description: 'Project fund summary', toolName: 'fund_summary', entities: ['fund'], requiredPermissions: ['project-funds.read'] },
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'inventory_summary', description: 'Inventory summary with low stock', toolName: 'inventory_summary', entities: ['inventory', 'item'], requiredPermissions: ['inventory.read'] },
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'get_kpi', description: 'Get project KPIs', toolName: 'get_kpi', entities: ['kpi', 'project'], requiredPermissions: ['projects.read'] },
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'get_trends', description: 'Get project trends', toolName: 'get_trends', entities: ['trend', 'project'], requiredPermissions: ['projects.read'] },
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'get_comparison', description: 'Compare projects', toolName: 'get_comparison', entities: ['comparison', 'project'], requiredPermissions: ['projects.read'] },
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'get_forecast', description: 'Get project forecast', toolName: 'get_forecast', entities: ['forecast', 'project'], requiredPermissions: ['projects.read'] },
    { category: IntentCategory.BUSINESS_ANALYSIS, action: 'get_attendance_analysis', description: 'Attendance intelligence: attendance, absence and late rates, working hours, overtime, workforce and trends', toolName: 'get_attendance_analysis', entities: ['attendance', 'absent', 'late', 'overtime', 'workforce'], requiredPermissions: ['projects.read'] },

    // === EXECUTE OPERATIONS ===
    { category: IntentCategory.EXECUTE_OPERATION, action: 'create_project', description: 'Create a project', toolName: 'create_project', entities: ['project'], requiredPermissions: ['projects.create'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'create_building', description: 'Create a building', toolName: 'create_building', entities: ['building'], requiredPermissions: ['buildings.create'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'create_employee', description: 'Create an employee', toolName: 'create_employee', entities: ['employee'], requiredPermissions: ['employees.create'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'create_supplier', description: 'Create a supplier', toolName: 'create_supplier', entities: ['supplier'], requiredPermissions: ['suppliers.create'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'create_client', description: 'Create a client', toolName: 'create_client', entities: ['client'], requiredPermissions: ['clients.create'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'create_subcontractor', description: 'Create a subcontractor', toolName: 'create_subcontractor', entities: ['subcontractor'], requiredPermissions: ['subcontractors.create'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'create_purchase', description: 'Create a purchase order', toolName: 'create_purchase', entities: ['purchase'], requiredPermissions: ['purchases.create'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'create_inventory_item', description: 'Create an inventory item', toolName: 'create_inventory_item', entities: ['inventory', 'item'], requiredPermissions: ['inventory.create'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'approve_request', description: 'Approve a request', toolName: 'approve_request', entities: ['approval'], requiredPermissions: ['approvals.approve'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'reject_request', description: 'Reject a request', toolName: 'reject_request', entities: ['approval'], requiredPermissions: ['approvals.reject'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'create_approval', description: 'Submit an approval request', toolName: 'create_approval', entities: ['approval'], requiredPermissions: ['approvals.create'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'update_project', description: 'Update project details', toolName: 'update_project', entities: ['project'], requiredPermissions: ['projects.update'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'update_building', description: 'Update building details', toolName: 'update_building', entities: ['building'], requiredPermissions: ['buildings.update'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'update_employee', description: 'Update employee record', toolName: 'update_employee', entities: ['employee'], requiredPermissions: ['employees.update'] },

    // === COMPANY ===
    { category: IntentCategory.DATA_RETRIEVAL, action: 'get_company_info', description: 'Get company settings', toolName: 'get_company_settings', entities: ['company', 'settings'], requiredPermissions: ['company.read'] },
    { category: IntentCategory.EXECUTE_OPERATION, action: 'update_company_info', description: 'Update company settings', toolName: 'update_company_settings', entities: ['company', 'settings'], requiredPermissions: ['company.write'] },

    // === WORKFLOWS ===
    { category: IntentCategory.WORKFLOW, action: 'workflow_create_project', description: 'Full project creation workflow', requiresWorkflow: 'create_project', entities: ['project'] },
    { category: IntentCategory.WORKFLOW, action: 'workflow_employee_onboarding', description: 'Employee onboarding', requiresWorkflow: 'employee_onboarding', entities: ['employee'] },
    { category: IntentCategory.WORKFLOW, action: 'workflow_purchase_order', description: 'Purchase order workflow', requiresWorkflow: 'purchase_order', entities: ['purchase'] },
    { category: IntentCategory.WORKFLOW, action: 'workflow_approval', description: 'Approval workflow', requiresWorkflow: 'approval_process', entities: ['approval'] },
    { category: IntentCategory.WORKFLOW, action: 'workflow_contractor_onboarding', description: 'Contractor onboarding workflow', requiresWorkflow: 'contractor_onboarding', entities: ['subcontractor', 'contractor'] },
    { category: IntentCategory.WORKFLOW, action: 'workflow_extract', description: 'Extract workflow', requiresWorkflow: 'extract_workflow', entities: ['extract'] },
    { category: IntentCategory.WORKFLOW, action: 'workflow_knowledge_fusion', description: 'Deep analysis combining ERP, knowledge, and BI data to analyze project performance, costs, and issues', requiresWorkflow: 'knowledge_fusion', entities: ['project', 'analysis'] },
    { category: IntentCategory.WORKFLOW, action: 'workflow_contractor_payment_analysis', description: 'Deep contractor payment analysis: extracts, approvals, payments, treasury and purchase impact', requiresWorkflow: 'contractor_payment_analysis', entities: ['contractor', 'payment', 'extract'] },
  ];

  private readonly knowledgeKeywords: Record<string, string> = {
    'how does': 'explain',
    'how do': 'explain',
    'explain': 'explain',
    'what is': 'explain',
    'tell me about': 'explain',
    'describe': 'explain',
    'workflow': 'explain',
    'process': 'explain',
    'اشرح': 'explain',
    'شرح': 'explain',
    'وضح': 'explain',
    'وضح لي': 'explain',
    'اعرف': 'explain',
    'أعرف': 'explain',
    'يعني': 'explain',
    'ايه هي': 'explain',
    'اية هي': 'explain',
    'بيمشي ازاي': 'explain',
    'ازاي بيمشي': 'explain',
    'ايه نظام': 'explain',
    'ايه الاجراء': 'explain',
  };

  /** Detect "why" business reasoning questions (English + Arabic/Egyptian) */
  detectWhyQuery(message: string): WhyQuery | null {
    const lower = message.toLowerCase().trim();
    const arabicWhy = /(ليه|لماذا|ليش|عشان ايه|علشان ايه|ايه السبب|ايه سبب|ليه السبب|ايه سبب خساره)/.test(lower);
    if (!lower.startsWith('why') && !arabicWhy) return null;

    const patterns: Array<{ pattern: RegExp; topic: string; metric: string }> = [
      { pattern: /why\s+is\s+(.+?)\s+(delayed|late|behind)/, topic: 'project', metric: 'delayed' },
      { pattern: /why\s+(?:is|are)\s+(.+?)\s+(low|below|insufficient|decreasing)/, topic: 'treasury', metric: 'low' },
      { pattern: /why\s+(?:are|is)\s+(purchases?|spending|costs?).*?(increasing|high|up)/, topic: 'purchase', metric: 'increasing' },
      { pattern: /why\s+(?:is|are)\s+(inventory|stock).*?(below|low|shortage)/, topic: 'inventory', metric: 'below_threshold' },
      { pattern: /why\s+is\s+(.+?)\s+(performance|rating|work)\s+(poor|bad|low)/, topic: 'contractor', metric: 'poor_performance' },
      { pattern: /why\s+(?:did|has)\s+(.+?)\s+(fail|exceed|drop)/, topic: 'general', metric: 'anomaly' },
      // Arabic / Egyptian
      { pattern: /(خسر|خساره|خسارة|بيخسر|خسران|عملت خساره|عملت خسارة)/, topic: 'general', metric: 'lost' },
      { pattern: /(متاخر|متأخر|متاخره|متأخره|اتأخر|تأخر|تاخر|تأخرت)/, topic: 'project', metric: 'delayed' },
      { pattern: /(المخزون ناقص|الحديد ناقص|نقص في المخزون|شحه|شحه في)/, topic: 'inventory', metric: 'below_threshold' },
      { pattern: /(زادت|بتزيد|ارتفعت|الاسعار|غاليه|غلاء)/, topic: 'purchase', metric: 'increasing' },
    ];

    for (const p of patterns) {
      const match = lower.match(p.pattern);
      if (match) {
        return { topic: p.topic, metric: p.metric, confidence: 0.75 };
      }
    }

    // Arabic "why" with no specific subject yet
    if (arabicWhy) {
      return { topic: 'general', metric: 'reason', confidence: 0.55 };
    }

    return { topic: 'general', metric: 'reason', confidence: 0.5 };
  }

  /** Detect if message requires a multi-tool chain */
  detectChain(message: string): ChainMatch | null {
    const lower = message.toLowerCase().trim();

    const chains: Array<{ pattern: RegExp; key: string }> = [
      { pattern: /delayed.*(financial|impact|cost)|financial.*(delay|late)/, key: 'delayed_project_impact' },
      { pattern: /(contractor|sub).*perform|perform.*(contractor|sub)/, key: 'contractor_performance' },
      { pattern: /treasury.*(low|analysis|why)|cash.*flow|balance.*low/, key: 'treasury_analysis' },
      { pattern: /inventory.*(below|low|stock|shortage)/, key: 'inventory_analysis' },
      { pattern: /project.*(details|full|overview|complete)/, key: 'project_details' },
      { pattern: /purchase.*(trend|analysis|increas|supplier)/, key: 'purchase_analysis' },
      { pattern: /employee.*(full|info|record|details|history)/, key: 'employee_full_info' },
      { pattern: /(?:why|analyze|analysis|deep|root cause).*(?:project|performance|cost|issue|problem)/, key: 'knowledge_fusion' },
      { pattern: /combine|fusion|deep.*(?:analysis|look|dive|investigation)|complex.*(?:question|query|analysis)/, key: 'knowledge_fusion' },
      { pattern: /performance.*(?:project|cost|budget|timeline)|project.*(?:health|performance|status).*(?:report)?/, key: 'knowledge_fusion' },
    ];

    for (const chain of chains) {
      if (chain.pattern.test(lower)) {
        return { chainKey: chain.key, confidence: 0.7, entities: {} };
      }
    }

    return null;
  }

  classify(message: string, context?: Record<string, any>): IntentResult {
    const lower = message.toLowerCase().trim();

    // === Contractor payment WHY (knowledge fusion over contractor payment history) ===
    // e.g. "Why hasn't contractor Ahmed been paid?" / "Why wasn't he paid?"
    const contractorPaidWhy = lower.match(
      /(?:why|reason|cause|explain)\b[\s\S]{0,140}?\b(?:been\s+)?(?:paid|unpaid|payments?)\b/,
    );
    if (
      contractorPaidWhy &&
      (lower.includes('contractor') || lower.includes('subcontractor') || lower.includes('مقاول') ||
        context?.currentContractorName || context?.currentContractorId)
    ) {
      return {
        intent: 'workflow_contractor_payment_analysis',
        confidence: 0.9,
        entities: { entity: 'contractor' },
        requiresWorkflow: 'contractor_payment_analysis',
        requiresFollowUp: true,
        followUpQuestion: 'I\'ll investigate the contractor\'s payment history — extracts, approvals and payments.',
      };
    }

    // === Contractor extract / payment / dues questions ===
    const contractorContext =
      lower.includes('contractor') || lower.includes('subcontractor') || lower.includes('مقاول') ||
      !!context?.currentContractorName || !!context?.currentContractorId;

    if (contractorContext) {
      // "extract approvals" / "approvals" of a contractor's extracts
      if (lower.includes('approval') || lower.includes('approvals')) {
        return {
          intent: 'list_extract_approvals',
          confidence: 0.9,
          entities: { entity: 'contractor' },
          toolName: 'list_extract_approvals',
          requiredPermissions: ['approvals.read'],
        };
      }
      // "contractor extracts" / "show contractor X's extracts" / "latest extract"
      if (lower.includes('extract') || lower.includes('extracts') || lower.includes('مستخلص') || lower.includes('مستخلصات') || lower.includes('خلاصه') || lower.includes('خلاصة')) {
        // latest / unpaid / approved / rejected extract → find_extract
        const specificExtract = /latest|unpaid|approved|rejected|اخر|غير مدفوع|معتمد|مرفوض|لم يدفع|مستحق/.test(lower);
        return {
          intent: specificExtract ? 'find_extract' : 'list_contractor_extracts',
          confidence: 0.9,
          entities: { entity: 'contractor' },
          toolName: specificExtract ? 'find_extract' : 'list_contractor_extracts',
          requiredPermissions: specificExtract ? ['extracts.read'] : ['extracts.read'],
        };
      }
      // "payments" / "payment status" / "how much was paid"
      if (lower.includes('payment') || lower.includes('payments') || /paid|دفع|دفعات|مدفوعات|صرف/.test(lower)) {
        return {
          intent: 'list_extract_payments',
          confidence: 0.9,
          entities: { entity: 'contractor' },
          toolName: 'list_extract_payments',
          requiredPermissions: ['payments.read'],
        };
      }
      // "dues" / "balance" / "remaining payments" / "outstanding"
      if (/dues|due|balance|remaining|outstanding|unpaid amount|net payable|مستحقات|مستحق|متبق|باقي|باقيه|المتبقي|رصيد|مديونيه/.test(lower)) {
        return {
          intent: 'get_contractor_dues',
          confidence: 0.9,
          entities: { entity: 'contractor' },
          toolName: 'get_contractor_dues',
          requiredPermissions: ['extracts.read'],
        };
      }
      // "show contractor Ahmed" / "find contractor ..." → find_contractor
      const findContractorVerb = lower.match(/(?:show|list|get|find|display|view|who is|عرفني|وريني)\s+(?:contractor|subcontractor|المقاول|مقاول)/);
      if (findContractorVerb) {
        return {
          intent: 'find_contractor',
          confidence: 0.85,
          entities: { entity: 'contractor' },
          toolName: 'find_contractor',
          requiredPermissions: ['subcontractors.read'],
        };
      }
    }

    // === Definition questions ===
    // "ما هي المستخلصات؟" / "ما هو البند النهائي" → explain the knowledge topic.
    // If the user is asking for a filtered list (e.g. "ما هي الموافقات المعلقة؟")
    // fall through so the list/approval branches handle it.
    const definitionMatch = lower.match(/^(?:ما هي|ما هو|ما هيا|ما هوا|ما هم|ماهي|ماهو|ماهى|ماهي)\s+(.+)/);
    if (definitionMatch && !/(المعلقة|المعلقه|المعتمدة|المعتمده|المرفوضة|المرفوضه|المكتملة|المكتمله|الملغية|الملغيه|المتاحة|المتاحه|قائمة|قائمه|جميع|كل\s+|عدد)/.test(lower)) {
      const entity = this.extractEntity(lower);
      let target = entity;
      if (entity === 'item' && /(بند|بنود|كمية|كميات|كميه)/.test(lower)) target = 'boq';
      const intent = this.intents.find(
        (i) => i.category === IntentCategory.KNOWLEDGE_QUERY && i.entities?.includes(target),
      );
      if (intent) {
        return { intent: intent.action, confidence: 0.85, entities: { entity: target } };
      }
    }

    // Check for "why" questions first (business reasoning)
    const whyQuery = this.detectWhyQuery(message);
    // "اشرح ليه X" / "explain why X" mixes an explain keyword with a why word:
    // it is a knowledge question (explain what X is), not business reasoning.
    // Route it to the explain branch so the user gets real content, never a canned response.
    const genericWhyExplain =
      !!whyQuery &&
      whyQuery.topic === 'general' &&
      whyQuery.metric === 'reason' &&
      /(اشرح|شرح|وضح|يعني|explain)/.test(lower);
    if (whyQuery && whyQuery.confidence >= 0.5 && !genericWhyExplain) {
      // Deep project analysis: a generic "why" about a project (e.g. "why is X losing money")
      // should route to the knowledge_fusion workflow which pulls ERP + knowledge + BI data.
      if (whyQuery.topic === 'general' && this.extractEntity(lower) === 'project') {
        // "why did the project lose money" → profitability + loss analysis directly
        if (whyQuery.metric === 'lost') {
          return {
            intent: 'get_project_profitability',
            confidence: 0.8,
            entities: { entity: 'profitability' },
            toolName: 'get_project_profitability',
            requiredPermissions: ['projects.read'],
          };
        }
        return {
          intent: 'workflow_knowledge_fusion',
          confidence: 0.7,
          entities: { entity: 'project' },
          requiresWorkflow: 'knowledge_fusion',
          requiresFollowUp: true,
          followUpQuestion: 'I\'ll run a deep analysis combining ERP data, knowledge documents, and BI metrics. Which project would you like me to analyze?',
        };
      }
      return {
        intent: `why_${whyQuery.topic}_${whyQuery.metric}`,
        confidence: whyQuery.confidence,
        entities: { whyTopic: whyQuery.topic, whyMetric: whyQuery.metric },
        requiresFollowUp: false,
      };
    }

    // === Arabic / Egyptian business-analysis questions ===
    // Delayed BOQ items: "اعرض البنود المتأخرة" → BOQ intelligence (delayed items)
    if (/(متاخر|متأخر|متاخره|متأخره|تأخر|تاخر)/.test(lower) &&
        (lower.includes('بند') || lower.includes('بنود') || lower.includes('اصناف') || lower.includes('أصناف'))) {
      return {
        intent: 'get_boq_analysis',
        confidence: 0.85,
        entities: { entity: 'project' },
        toolName: 'get_boq_analysis',
        requiredPermissions: ['projects.read'],
      };
    }

    // Buildings of a project: "وريني المباني في مشروع A105" / "اعرض عمارات مشروع X"
    if (/(مباني|مبانى|مبنى|مبني|عماره|عمارة|عمارات|برج|ابنية|أبنية)/.test(lower) &&
        /(مشروع|مشاريع)/.test(lower)) {
      return {
        intent: 'list_project_buildings',
        confidence: 0.9,
        entities: { entity: 'building' },
        toolName: 'list_project_buildings',
        requiredPermissions: ['buildings.read'],
      };
    }

    // Arabic "who" questions: "مين المقاولين الموجودين؟" → list subcontractors/suppliers/clients/employees
    const whoMatch = lower.match(/(?:مين هم|مين هم|من هم|من هم|ايه هم|مين)\s+(.+)/);
    if (whoMatch) {
      const who = whoMatch[1];
      if (/(مقاول|مقاولين)/.test(who)) {
        return {
          intent: 'list_subcontractors',
          confidence: 0.85,
          entities: { entity: 'subcontractor' },
          toolName: 'list_subcontractors',
          requiredPermissions: ['subcontractors.read'],
        };
      }
      if (/(مورد|موردين|مورّد)/.test(who)) {
        return {
          intent: 'list_suppliers',
          confidence: 0.85,
          entities: { entity: 'supplier' },
          toolName: 'list_suppliers',
          requiredPermissions: ['suppliers.read'],
        };
      }
      if (/(عميل|عملاء)/.test(who)) {
        return {
          intent: 'list_clients',
          confidence: 0.85,
          entities: { entity: 'client' },
          toolName: 'list_clients',
          requiredPermissions: ['clients.read'],
        };
      }
      if (/(موظف|موظفين)/.test(who)) {
        return {
          intent: 'list_employees',
          confidence: 0.85,
          entities: { entity: 'employee' },
          toolName: 'list_employees',
          requiredPermissions: ['employees.read'],
        };
      }
    }

    // Arabic list/count phrases: "اعرض لي قائمة المقاولين من الباطن" / "كم عدد المقاولين؟"
    // → list the matching entity instead of misrouting to find_*.
    const arListPhrase = lower.match(/(?:قائمة|قائمه|كم عدد|كام عدد|عدد)\s+(.+)/);
    if (arListPhrase) {
      const listTarget = arListPhrase[1];
      if (/(مقاول|مقاولين)/.test(listTarget)) {
        return {
          intent: 'list_subcontractors',
          confidence: 0.85,
          entities: { entity: 'subcontractor' },
          toolName: 'list_subcontractors',
          requiredPermissions: ['subcontractors.read'],
        };
      }
      if (/(مورد|موردين|مورّد)/.test(listTarget)) {
        return {
          intent: 'list_suppliers',
          confidence: 0.85,
          entities: { entity: 'supplier' },
          toolName: 'list_suppliers',
          requiredPermissions: ['suppliers.read'],
        };
      }
      if (/(عميل|عملاء)/.test(listTarget)) {
        return {
          intent: 'list_clients',
          confidence: 0.85,
          entities: { entity: 'client' },
          toolName: 'list_clients',
          requiredPermissions: ['clients.read'],
        };
      }
      if (/(موظف|موظفين)/.test(listTarget)) {
        return {
          intent: 'list_employees',
          confidence: 0.85,
          entities: { entity: 'employee' },
          toolName: 'list_employees',
          requiredPermissions: ['employees.read'],
        };
      }
      if (/(مبني|مبنى|عماره|عمارة|مباني|مبانى)/.test(listTarget)) {
        return {
          intent: 'list_buildings',
          confidence: 0.85,
          entities: { entity: 'building' },
          toolName: 'list_buildings',
          requiredPermissions: ['buildings.read'],
        };
      }
      if (/(مشتريات|شراء)/.test(listTarget)) {
        return {
          intent: 'list_purchases',
          confidence: 0.85,
          entities: { entity: 'purchase' },
          toolName: 'list_purchases',
          requiredPermissions: ['purchases.read'],
        };
      }
      if (/(مستخلص|مستخلصات)/.test(listTarget)) {
        return {
          intent: 'list_extracts',
          confidence: 0.85,
          entities: { entity: 'extract' },
          toolName: 'list_extracts',
          requiredPermissions: ['extracts.read'],
        };
      }
      if (/(دفعات|مدفوعات|دفعه|دفعة)/.test(listTarget)) {
        return {
          intent: 'list_payments',
          confidence: 0.85,
          entities: { entity: 'payment' },
          toolName: 'list_payments',
          requiredPermissions: ['payments.read'],
        };
      }
      // Items listed/counted inside a warehouse: "كم عدد الأصناف في المخزن؟"
      // must resolve to inventory items (with the warehouse as context), NOT
      // to the list of warehouses.
      if (/(اصناف|أصناف|صنف|بنود|بند|خامات|بضاعة|بضاعه|مواد)/.test(listTarget)) {
        return {
          intent: 'list_inventory_items',
          confidence: 0.85,
          entities: { entity: 'item' },
          toolName: 'list_inventory_items',
          requiredPermissions: ['inventory.read'],
        };
      }
      if (/(مخزن|مخازن)/.test(listTarget)) {
        return {
          intent: 'list_warehouses',
          confidence: 0.85,
          entities: { entity: 'warehouse' },
          toolName: 'list_warehouses',
          requiredPermissions: ['warehouses.read'],
        };
      }
    }

    // Arabic show/list verbs: "اعرض المقاولين" / "وريني المشتريات" / "اعرض البنود"
    // must route to the list_* tool — never to find_* (which demands a name).
    const arShowPhrase = lower.match(/(?:اعرض(?:لي|لى)?|وريني|ورينى|عرض|شوف(?:لي|لى)?|اديني|ادينى|جيب|اكشف|كشف|اظهر|أظهر|اطلع|ابحث عن)\s+(.+)/);
    if (arShowPhrase) {
      const showTarget = arShowPhrase[1];
      const arShowTargets: Array<{ re: RegExp; intent: string; tool: string; entity: string; perm: string }> = [
        { re: /(مقاول|مقاولين)/, intent: 'list_subcontractors', tool: 'list_subcontractors', entity: 'subcontractor', perm: 'subcontractors.read' },
        { re: /(مورد|موردين|مورّد)/, intent: 'list_suppliers', tool: 'list_suppliers', entity: 'supplier', perm: 'suppliers.read' },
        { re: /(عميل|عملاء)/, intent: 'list_clients', tool: 'list_clients', entity: 'client', perm: 'clients.read' },
        { re: /(موظف|موظفين)/, intent: 'list_employees', tool: 'list_employees', entity: 'employee', perm: 'employees.read' },
        { re: /(مشتريات|شراء)/, intent: 'list_purchases', tool: 'list_purchases', entity: 'purchase', perm: 'purchases.read' },
        { re: /(مستخلص|مستخلصات)/, intent: 'list_extracts', tool: 'list_extracts', entity: 'extract', perm: 'extracts.read' },
        { re: /(بنود|بند|اصناف|أصناف|صنف|خامات|مواد|مخزون)/, intent: 'list_inventory_items', tool: 'list_inventory_items', entity: 'item', perm: 'inventory.read' },
        { re: /(مخزن|مخازن)/, intent: 'list_warehouses', tool: 'list_warehouses', entity: 'warehouse', perm: 'warehouses.read' },
        { re: /(صناديق|صندوق)/, intent: 'list_project_funds', tool: 'list_project_funds', entity: 'fund', perm: 'project-funds.read' },
      ];
      for (const t of arShowTargets) {
        if (t.re.test(showTarget)) {
          return {
            intent: t.intent,
            confidence: 0.85,
            entities: { entity: t.entity },
            toolName: t.tool,
            requiredPermissions: [t.perm],
          };
        }
      }
    }

    // Attendance questions: "مين متأخر النهاردة؟" / "مين حضر النهاردة؟" / "مين غايب اليوم؟"
    if (/(مين|من هم)\s+(.+)/.test(lower) &&
        /(متأخر|متاخر|متأخره|متاخره|حاضر|حضر|غايب|غائب|غياب|انصراف|غياب)/.test(lower)) {
      return {
        intent: 'list_attendance',
        confidence: 0.8,
        entities: { entity: 'attendance' },
        toolName: 'list_attendance',
        requiredPermissions: ['attendance.read'],
      };
    }

    const hasArabicEntity =
      /(مشروع|مشاريع|مبني|مبنى|عماره|عمارة|مباني|مبانى|مقاول|بند|بنود|مخزون|مخزن|مورد|مشتريات|مستخلص|صناديق|صندوق|مصاريف|مصروفات)/.test(lower);
    const arabicAnalysis: Array<{ pattern: RegExp; intentName: string; entity: string }> = [
      { pattern: /(ارباح|أرباح|ربحيه|ربحية|بيخسر|بتخسر|تخسر|خسران|الخساره|الخسارة|خساره|خسارة|ربح|كسبان|كسبانه|كسبانة|مربح|مربحة|مكسب|مكاسر|مكاسب)/, intentName: 'get_project_profitability', entity: 'profitability' },
      { pattern: /(مخاطر|مخاطره|الخطر|خطوره|خطورة)/, intentName: 'get_project_risks', entity: 'risk' },
      { pattern: /(تقييم|اداء المقاول|أداء المقاول|الأداء|الاداء)/, intentName: 'get_contractor_analysis', entity: 'contractor' },
      { pattern: /(الميزانيه|الميزانية|الموازنه|الموازنة|تجاوز.*ميزانيه)/, intentName: 'get_project_dashboard', entity: 'purchase' },
      { pattern: /(موقف|الموقف|وضع المشروع|شغال ولا|حاله المشروع|حالة المشروع)/, intentName: 'get_project_dashboard', entity: 'project' },
      { pattern: /(مصاريف|مصروفات|المصاريف|المصروفات|التدفق النقدي|السيولة|سيولة)/, intentName: 'get_cashflow', entity: 'cashflow' },
      { pattern: /(مشتريات|المشتريات).*(مستلم|استلم|لسه|لسة|وصلت|موصله|موصلة|مرفوضه|مرفوضة|مرفوض)/, intentName: 'list_purchases', entity: 'purchase' },
      { pattern: /(الحضور.*(نسبه|نسبة|إحصائيه|إحصائية|تحليل|ساعات)|نسبه الحضور|نسبة الحضور|حضور.*غياب|تأخير.*حضور)/, intentName: 'get_attendance_analysis', entity: 'attendance' },
      { pattern: /(متأخر|متاخر|متأخره|متاخره).*(مشروع|مشاريع)|(مشروع|مشاريع).*(متأخر|متاخر|متأخره|متاخره)/, intentName: 'get_project_risks', entity: 'risk' },
      { pattern: /(تحليل|تحليلات|حلل|دراسه|دراسة).*(boq|بند|بنود|كميات|كمية)|(boq|بند|بنود|كميات|كمية).*(تحليل|تحليلات|حلل|دراسه|دراسة)/, intentName: 'get_boq_analysis', entity: 'project' },
    ];
    if (hasArabicEntity || context?.projectId) {
      for (const ap of arabicAnalysis) {
        if (ap.pattern.test(lower)) {
          return {
            intent: ap.intentName,
            confidence: 0.8,
            entities: { entity: ap.entity },
            toolName: ap.intentName,
            requiredPermissions: ['projects.read'],
          };
        }
      }
    }

    // Arabic "where is X" / "مخزن فيه X" → inventory location (e.g. "فين الحديد؟", "المخزن فيه حديد كام؟")
    const arWhereMatch = lower.match(/(?:فين|اين|وين)\s+(.+)|(?:المخزن|المخزون|مخزن|مخزون|المخازن|مخازن)[^\n]*?(?:فيه|فية|فيا|موجود فيه|موجود فية)\s+(.+)/);
    if (arWhereMatch) {
      const rawTarget = (arWhereMatch[1] || arWhereMatch[2] || '').replace(/[؟?]+$/, '').trim();
      const target = rawTarget.replace(/\s+(كام|كم|بكام|عندك|عندنا|عندكو|فيه|فية|متوفر|الموجود|موجود)\s*$/i, '');
      if (target) {
        return {
          intent: 'list_inventory_items',
          confidence: 0.8,
          entities: { entity: 'item', itemName: target },
          toolName: 'list_inventory_items',
          requiredPermissions: ['inventory.read'],
        };
      }
    }

    // Arabic inventory listing: "اعرض مخزون المشروع" / "وريني مخزون المشروع"
    // must go to the inventory list, NOT list_projects (which "المشروع" would match).
    if (/(مخزون|المخزون)/.test(lower) && /(اعرض(?:لي|لى)?|وريني|ورينى|عرض|شوف(?:لي|لى)?|اديني|ادينى|جيب|قول(?:لي|لى)?|كشف|قائمة|قائمه|اظهر|أظهر|ابحث|دور|كم|كام|عندك)/.test(lower)) {
      return {
        intent: 'list_inventory_items',
        confidence: 0.85,
        entities: { entity: 'item' },
        toolName: 'list_inventory_items',
        requiredPermissions: ['inventory.read'],
      };
    }

    // Check for knowledge queries first
    for (const [keyword, action] of Object.entries(this.knowledgeKeywords)) {
      if (lower.startsWith(keyword) || lower.includes(keyword)) {
        let entity = this.extractEntity(lower);
        // Arabic phrases like "اشرح البنود" refer to the BOQ items → explain the BOQ
        // knowledge topic instead of falling through to the generic inventory item handling.
        if (entity === 'item' && /(بند|بنود|كمية|كميات)/.test(lower)) {
          entity = 'boq';
        }
        // Analytical topics (risk, contractor, profitability) prefer the BI tools
        if (entity === 'risk' || entity === 'contractor' || entity === 'profitability') {
          const biIntent = this.intents.find(
            (i) => i.category === IntentCategory.BUSINESS_ANALYSIS && i.entities?.includes(entity) && i.toolName,
          );
          if (biIntent) {
            return {
              intent: biIntent.action,
              confidence: 0.85,
              entities: { entity },
              toolName: biIntent.toolName,
              requiredPermissions: biIntent.requiredPermissions,
            };
          }
        }
        const intent = this.intents.find(
          (i) => i.category === IntentCategory.KNOWLEDGE_QUERY && i.entities?.includes(entity),
        );
        if (intent) {
          return { intent: intent.action, confidence: 0.9, entities: { entity } };
        }
        // Generic explain
        return { intent: 'explain_generic', confidence: 0.7, entities: { topic: entity || message } };
      }
    }

    // Check for knowledge_fusion workflow (complex analysis)
    if (lower.includes('analyze') || lower.includes('deep dive') || lower.includes('root cause') || lower.includes('why is') || lower.includes('why are')) {
      const hasEntity = this.extractEntity(lower);
      if (hasEntity === 'project') {
        return {
          intent: 'workflow_knowledge_fusion',
          confidence: 0.7,
          entities: { entity: 'project' },
          requiresWorkflow: 'knowledge_fusion',
          requiresFollowUp: true,
          followUpQuestion: 'I\'ll run a deep analysis combining ERP data, knowledge documents, and BI metrics. Which project would you like me to analyze?',
        };
      }
    }

    // Check for analysis/summary queries (before generic list to avoid capture)
    const analysisMatch = lower.match(/(?:summary|analytics|statistics|overview|report|stats)\s+(.+)/);
    if (analysisMatch) {
      const entity = this.extractEntity(analysisMatch[1]);
      const intent = this.intents.find(
        (i) => i.category === IntentCategory.BUSINESS_ANALYSIS && i.entities?.includes(entity),
      );
      if (intent) {
        return {
          intent: intent.action,
          confidence: 0.8,
          entities: { entity },
          toolName: intent.toolName,
          requiredPermissions: intent.requiredPermissions,
        };
      }
    }

    // Also catch "summarize" prefix
    if (lower.startsWith('summarize') || lower.startsWith('summarise')) {
      const entity = this.extractEntity(lower.replace(/^summari[sz]e\s+/, ''));
      const intent = this.intents.find(
        (i) => i.category === IntentCategory.BUSINESS_ANALYSIS && i.entities?.includes(entity),
      );
      if (intent) {
        return {
          intent: intent.action,
          confidence: 0.8,
          entities: { entity },
          toolName: intent.toolName,
          requiredPermissions: intent.requiredPermissions,
        };
      }
    }

    // Check for list/retrieval queries (English + Arabic/Egyptian verbs, including
    // attached-pronoun forms like "اعرضلي" and question words "مين"/"كام"/"ايه")
    const listMatch = lower.match(
      /(?:show|list|get|find|display|view|اعرض(?:لي|لى)?|عرض|وريني|ورينى|ارني|اريني|أرني|أريني|اطلع(?:لي|لى)?|اكشف(?:لي|لى)?|دور(?:لي|لى)?|ادور|ابحث عن|ابحث|عرفني|عرفنى|اظهر|أظهر|شوف(?:لي|لى)?|قول(?:لي|لى)?|اديني|ادينى|جيب(?:لي|لى)?|عايز اشوف|عايز أشوف|مين هم|من هم|ايه|اية|كام|كم|عندك|عندي)\s+(.+)/,
    );
    if (listMatch) {
      const entity = this.extractEntity(listMatch[1]);
      // BOQ listing (e.g. "اعرض البنود", "عرض بنود الـ BOQ") → BOQ intelligence
      // which classifies items as profitable/loss-making per project.
      if (entity === 'boq') {
        return {
          intent: 'get_boq_analysis',
          confidence: 0.8,
          entities: { entity: 'project' },
          toolName: 'get_boq_analysis',
          requiredPermissions: ['projects.read'],
        };
      }
      // Prefer get_* if "details" is in the message
      const wantsDetails = lower.includes('details') || lower.includes('detail') || lower.includes('تفاصيل');
      const intent = this.intents.find(
        (i) => i.category === IntentCategory.DATA_RETRIEVAL && i.entities?.includes(entity) && (wantsDetails ? i.toolName?.startsWith('get_') : !i.toolName?.startsWith('get_')),
      );
      if (intent) {
        return {
          intent: intent.action,
          confidence: 0.85,
          entities: { entity },
          toolName: intent.toolName,
          requiredPermissions: intent.requiredPermissions,
        };
      }
    }

    // Check for explicit workflow intents (user says "workflow" or "run ... process")
    const workflowExplicit = lower.match(/(?:run|start|execute|begin)\s+(?:a\s+|the\s+)?(?:full\s+)?(?:workflow\s+)?(?:for\s+)?(.+)/);
    if (workflowExplicit || lower.includes('workflow')) {
      const entity = this.extractEntity(workflowExplicit ? workflowExplicit[1] : lower);
      const intent = this.intents.find(
        (i) => i.category === IntentCategory.WORKFLOW && i.entities?.includes(entity),
      );
      if (intent) {
        return {
          intent: intent.action,
          confidence: 0.8,
          entities: { entity },
          requiresWorkflow: intent.requiresWorkflow,
          requiresFollowUp: true,
          followUpQuestion: `I'll help you with the ${intent.description}. Let's get started.`,
        };
      }
    }

    // Catch "new project" as workflow (preserves existing test behavior)
    if (lower.includes('new project') || lower.match(/^create.*project/) || lower.includes('start a project')) {
      return {
        intent: 'workflow_create_project',
        confidence: 0.8,
        entities: { entity: 'project' },
        requiresWorkflow: 'create_project',
        requiresFollowUp: true,
        followUpQuestion: 'I\'ll help you set up a new project. I need: project name, location, start date, and client name.',
      };
    }

    // Check for create operations (English + Arabic)
    const createMatch = lower.match(/(?:create|add|new|make|انشئ|انشى|أنشئ|اضف|أضف|اسجل|أضيف|اعمل|أعمل|سجل)\s+(.+)/);
    if (createMatch) {
      const entity = this.extractEntity(createMatch[1]);
      const intent = this.intents.find(
        (i) => i.category === IntentCategory.EXECUTE_OPERATION && i.toolName === `create_${entity}`,
      );
      if (intent) {
        const missing = this.getMissingFieldsForCreate(entity, context);
        if (missing.length > 0) {
          // Prefer a full workflow when one exists (e.g. create_project) so the
          // follow-up can be resumed across turns; otherwise fall back to the
          // single-tool follow-up question.
          const workflowIntent = this.intents.find(
            (i) => i.category === IntentCategory.WORKFLOW && i.entities?.includes(entity),
          );
          if (workflowIntent) {
            return {
              intent: workflowIntent.action,
              confidence: 0.8,
              entities: { entity },
              requiresWorkflow: workflowIntent.requiresWorkflow,
              requiresFollowUp: true,
              followUpQuestion: `I'll help you ${workflowIntent.description}. I need: ${missing.join(', ')}.`,
            };
          }
          return {
            intent: intent.action,
            confidence: 0.8,
            entities: { entity },
            toolName: intent.toolName,
            requiredPermissions: intent.requiredPermissions,
            requiresFollowUp: true,
            followUpQuestion: `I need the following information to create this ${entity}: ${missing.join(', ')}.`,
          };
        }
        return {
          intent: intent.action,
          confidence: 0.8,
          entities: { entity },
          toolName: intent.toolName,
          requiredPermissions: intent.requiredPermissions,
        };
      }
    }

    // Check for update/modify operations (English + Arabic)
    const updateMatch = lower.match(/(?:update|modify|change|edit|عدل|عدّل|غيّر|غير|حدّث|حدث)\s+(.+)/);
    if (updateMatch) {
      const entity = this.extractEntity(updateMatch[1]);
      const intent = this.intents.find(
        (i) => i.category === IntentCategory.EXECUTE_OPERATION && i.toolName === `update_${entity}`,
      );
      if (intent) {
        return {
          intent: intent.action,
          confidence: 0.8,
          entities: { entity },
          toolName: intent.toolName,
          requiredPermissions: intent.requiredPermissions,
          requiresFollowUp: true,
          followUpQuestion: `What changes would you like to make to this ${entity}? Please provide the ID and the fields to update.`,
        };
      }
    }

    // Check for approve/reject (English + Arabic)
    if (lower.includes('approve') || lower.includes('reject') || lower.includes('approval') || lower.includes('وافق') || lower.includes('اعتمد') || lower.includes('ارفض') || lower.includes('موافقة') || lower.includes('موافقات') || lower.includes('اعتماد')) {
      const hasApprovalUuid = /approval\s+request\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.test(lower);
      const approveAction = lower.includes('approve') && !lower.includes('reject');
      const action = approveAction ? 'approve_request' : 'reject_request';
      const intent = this.intents.find((i) => i.action === action);
      if (intent && (hasApprovalUuid || /(approve|reject)\s+(?:this\s+|the\s+)?(?:pending\s+)?(?:approval\s+)?request/i.test(lower) || /approval\s+id\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.test(lower))) {
        return {
          intent: intent.action,
          confidence: 0.85,
          entities: {},
          toolName: intent.toolName,
          requiredPermissions: intent.requiredPermissions,
        };
      }
      const listIntent = this.intents.find((i) => i.action === 'list_pending_approvals');
      if (listIntent) {
        return {
          intent: listIntent.action,
          confidence: 0.8,
          entities: {},
          toolName: listIntent.toolName,
          requiredPermissions: listIntent.requiredPermissions,
        };
      }
    }

    // Check for onboarding workflows (employee or contractor)
    if (lower.includes('onboard') || lower.includes('new employee') || lower.includes('hire employee') || lower.includes('register contractor') || lower.includes('new subcontractor')) {
      // Determine which onboarding workflow based on entity
      const entity = this.extractEntity(lower);
      if (entity === 'subcontractor' || lower.includes('contractor')) {
        return {
          intent: 'workflow_contractor_onboarding',
          confidence: 0.75,
          entities: { entity: 'subcontractor' },
          requiresWorkflow: 'contractor_onboarding',
          requiresFollowUp: true,
          followUpQuestion: 'I\'ll help you onboard a new subcontractor. I need: contractor name, work type, and building ID.',
        };
      }
      return {
        intent: 'workflow_employee_onboarding',
        confidence: 0.75,
        entities: { entity: 'employee' },
        requiresWorkflow: 'employee_onboarding',
        requiresFollowUp: true,
        followUpQuestion: 'I\'ll help you onboard a new employee. What is their name, code, and hire date?',
      };
    }

    // Analytical questions about risk / contractor performance / profit & loss
    // e.g. "which subcontractors are delayed?", "which items have the highest loss?",
    // "what is the risk level?", "is the project profitable?"
    const analyticalPatterns: Array<{ pattern: RegExp; intentName: string; entity: string }> = [
      { pattern: /(which project|highest profit|best project|across projects|all projects|company-wide|top project|compare projects)/, intentName: 'get_executive_dashboard', entity: 'executive' },
      { pattern: /(purchase|budget|overrun|exceed|spending|cost overrun)/, intentName: 'get_project_dashboard', entity: 'purchase' },
      { pattern: /(risk|risk level|risk score|hazards?)/, intentName: 'get_project_risks', entity: 'risk' },
      { pattern: /(delayed|delay|behind schedule|poor performance|performance)/, intentName: 'get_contractor_analysis', entity: 'contractor' },
      { pattern: /(losing money|lose money|losses?|loss-making|highest loss|profitab|margin|not profitable)/, intentName: 'get_project_profitability', entity: 'profitability' },
    ];
    if (lower.includes('project') || lower.includes('boq') || lower.includes('contractor') || lower.includes('subcontractor') || lower.includes('purchase') || lower.includes('budget') || context?.projectId) {
      for (const ap of analyticalPatterns) {
        if (ap.pattern.test(lower)) {
          return {
            intent: ap.intentName,
            confidence: 0.7,
            entities: { entity: ap.entity },
            toolName: ap.intentName,
            requiredPermissions: ['projects.read'],
          };
        }
      }
    }

    // Fallback
    return { intent: 'unknown', confidence: 0.3, entities: {} };
  }

  private extractEntity(text: string): string {
    const entityMap: Record<string, string> = {
      project: 'project',
      projects: 'project',
      building: 'building',
      buildings: 'building',
      employee: 'employee',
      employees: 'employee',
      attendance: 'attendance',
      approval: 'approval',
      approvals: 'approval',
      supplier: 'supplier',
      suppliers: 'supplier',
      client: 'client',
      clients: 'client',
      subcontractor: 'subcontractor',
      subcontractors: 'subcontractor',
      warehouse: 'warehouse',
      warehouses: 'warehouse',
      inventory: 'inventory',
      item: 'item',
      items: 'item',
      fund: 'fund',
      funds: 'fund',
      purchase: 'purchase',
      purchases: 'purchase',
      extract: 'extract',
      extracts: 'extract',
      payment: 'payment',
      payments: 'payment',
      boq: 'boq',
      'employer-boq': 'boq',
      'analytical-boq': 'boq',
      role: 'role',
      permission: 'permission',
      knowledge: 'knowledge',
      document: 'knowledge',
      contract: 'knowledge',
      settings: 'settings',
      setting: 'settings',
      timeline: 'timeline',
      kpi: 'kpi',
      trend: 'trend',
      trends: 'trend',
      branding: 'branding',
      brand: 'branding',
      report: 'report',
      reports: 'report',
      pdf: 'pdf',
      signature: 'signature',
      signatures: 'signature',
      number: 'number',
      numbers: 'number',
      dashboard: 'dashboard',
      kpis: 'kpi',
      workflow: 'workflow',
      workflows: 'workflow',
      theme: 'theme',
      comparison: 'comparison',
      forecast: 'forecast',
      risk: 'risk',
      risks: 'risk',
      contractor: 'contractor',
      contractors: 'contractor',
      profitability: 'profitability',
      profit: 'profitability',
      margin: 'profitability',
      delayed: 'contractor',
      loss: 'profitability',
      losses: 'profitability',
      executive: 'executive',
      budget: 'purchase',
      // === Arabic / Egyptian ===
      'مشروع': 'project',
      'مشاريع': 'project',
      'مبني': 'building',
      'مبنى': 'building',
      'عماره': 'building',
      'عمارة': 'building',
      'مباني': 'building',
      'مبانى': 'building',
      'موظف': 'employee',
      'موظفين': 'employee',
      'حضور': 'attendance',
      'غياب': 'attendance',
      'موافقه': 'approval',
      'موافقة': 'approval',
      'موافقات': 'approval',
      'اعتماد': 'approval',
      'مورد': 'supplier',
      'موردين': 'supplier',
      'عميل': 'client',
      'عملاء': 'client',
      'مقاول': 'contractor',
      'مقاولين': 'contractor',
      'مخزن': 'warehouse',
      'مخازن': 'warehouse',
      'مخزون': 'inventory',
      'بند': 'item',
      'بنود': 'item',
      'صنف': 'item',
      'اصناف': 'item',
      'أصناف': 'item',
      'مستخلص': 'extract',
      'مستخلصات': 'extract',
      'خلاصه': 'extract',
      'خلاصة': 'extract',
      'دفعه': 'payment',
      'دفعة': 'payment',
      'دفعات': 'payment',
      'مدفوعات': 'payment',
      'مشتريات': 'purchase',
      'شراء': 'purchase',
      'صندوق': 'fund',
      'صناديق': 'fund',
      'تمويل': 'fund',
      'مستند': 'knowledge',
      'مستندات': 'knowledge',
      'عقد': 'knowledge',
      'عقود': 'knowledge',
      'تقرير': 'report',
      'تقارير': 'report',
      'ربح': 'profitability',
      'ارباح': 'profitability',
      'أرباح': 'profitability',
      'ربحيه': 'profitability',
      'ربحية': 'profitability',
      'خساره': 'profitability',
      'خسارة': 'profitability',
      'خسائر': 'profitability',
      'خطر': 'risk',
      'مخاطر': 'risk',
      'كشف': 'dashboard',
      'لوحه': 'dashboard',
      'لوحة': 'dashboard',
      'مؤشرات': 'kpi',
      'اتجاهات': 'trend',
      'مقارنه': 'comparison',
      'مقارنة': 'comparison',
      'توقعات': 'forecast',
      'توقع': 'forecast',
    };

    for (const [key, value] of Object.entries(entityMap)) {
      if (text.includes(key)) return value;
    }
    return text.split(/\s+/)[0] || 'general';
  }

  private getMissingFieldsForCreate(entity: string, context?: Record<string, any>): string[] {
    const required: Record<string, string[]> = {
      project: ['name', 'code', 'location', 'startDate'],
      building: ['projectId', 'name', 'type', 'startDate'],
      employee: ['fullName', 'code'],
      supplier: ['name', 'phone'],
      client: ['name'],
      subcontractor: ['name', 'workType'],
      purchase: ['projectId', 'itemName', 'quantity', 'unit', 'unitPrice', 'total', 'date'],
      'inventory-item': ['name', 'code', 'categoryId', 'warehouseId', 'unit', 'quantity', 'minQuantity', 'price'],
    };

    const fields = required[entity] || [];
    return fields.filter((f) => !context?.[f]);
  }
}
