import { Controller, Get, Post, Put, Delete, Param, Body, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SignatureWorkflowService } from './application/signature-workflow.service';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';

@ApiTags('Signature Workflow')
@ApiBearerAuth()
@RequirePermission(Permissions.Profile.Read)
@Controller('signature-workflow')
export class SignatureWorkflowController {
  constructor(private readonly service: SignatureWorkflowService) {}

  // ─── Workflow Definitions ─────────────────────────────────────

  @Post('workflows')
  @ApiOperation({ summary: 'Create a new signature workflow definition' })
  @RequirePermission(Permissions.Reports.Generate)
  createWorkflow(@Body() body: any) {
    return this.service.createWorkflow(body);
  }

  @Get('workflows')
  @ApiOperation({ summary: 'List all workflows, optionally filtered by entity type' })
  getWorkflows(@Param('entityType') entityType?: string) {
    return this.service.getWorkflows(entityType);
  }

  @Get('workflows/:id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  getWorkflow(@Param('id') id: string) {
    return this.service.getWorkflow(id);
  }

  @Put('workflows/:id')
  @ApiOperation({ summary: 'Update workflow name, description, or active status' })
  @RequirePermission(Permissions.Reports.Generate)
  updateWorkflow(@Param('id') id: string, @Body() body: any) {
    return this.service.updateWorkflow(id, body);
  }

  @Delete('workflows/:id')
  @ApiOperation({ summary: 'Delete a workflow definition' })
  @RequirePermission(Permissions.Reports.Generate)
  deleteWorkflow(@Param('id') id: string) {
    return this.service.deleteWorkflow(id);
  }

  // ─── Signature Requests ───────────────────────────────────────

  @Post('submit')
  @ApiOperation({ summary: 'Submit a document for signature workflow' })
  submit(@Body() body: { workflowId: string; entityType: string; entityId: string }, @Req() req: any) {
    return this.service.submitForSignature(body.workflowId, body.entityType, body.entityId, req.user?.sub || 'system');
  }

  @Post('requests/:id/sign')
  @ApiOperation({ summary: 'Sign or reject a pending signature request' })
  sign(
    @Param('id') id: string,
    @Body() body: { status: 'signed' | 'rejected'; comment?: string; imageUrl?: string },
    @Req() req: any,
  ) {
    return this.service.sign(id, req.user?.sub || 'system', body.status, body.comment, body.imageUrl);
  }

  @Get('status/:entityType/:entityId')
  @ApiOperation({ summary: 'Get signature status for a document' })
  getStatus(@Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    return this.service.getSignatureStatus(entityType, entityId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending signature requests for current user' })
  getPending(@Req() req: any) {
    const role = req.user?.role || 'USER';
    return this.service.getPendingRequests(req.user?.sub, role);
  }
}
