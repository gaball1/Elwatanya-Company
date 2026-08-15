import { Body, Controller, ForbiddenException, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { handleError } from '../../common/utils/handle-error';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { isAdminUser } from '../../common/utils/is-admin.util';
import { ListApprovalsUseCase } from './application/use-cases/list-approvals.use-case';
import { RequestApprovalUseCase } from './application/use-cases/request-approval.use-case';
import { ApproveApprovalUseCase } from './application/use-cases/approve-approval.use-case';
import { RejectApprovalUseCase } from './application/use-cases/reject-approval.use-case';
import { SubmitApprovalUseCase } from './application/use-cases/submit-approval.use-case';
import { CancelApprovalUseCase } from './application/use-cases/cancel-approval.use-case';
import { RequestApprovalDto, ApproveOrRejectDto, ListApprovalsQueryDto } from './dto/approval.dto';

@ApiTags('Approvals')
@ApiBearerAuth()
@Controller('approvals')
export class ApprovalController {
  constructor(
    private readonly listApprovals: ListApprovalsUseCase,
    private readonly requestApproval: RequestApprovalUseCase,
    private readonly approveApproval: ApproveApprovalUseCase,
    private readonly rejectApproval: RejectApprovalUseCase,
    private readonly submitApproval: SubmitApprovalUseCase,
    private readonly cancelApproval: CancelApprovalUseCase,
  ) {}

  /** General managers and project managers see the full company list; everyone else only their own requests. */
  private canViewAll(user: any): boolean {
    if (isAdminUser(user)) return true;
    return user?.roleNames?.includes('PROJECT_MANAGER') ?? false;
  }

  /** Approve/reject authority belongs to the general manager and project manager. */
  private canDecide(user: any): boolean {
    if (isAdminUser(user)) return true;
    return user?.roleNames?.includes('PROJECT_MANAGER') ?? false;
  }

  @Get()
  @ApiOperation({ summary: 'List approval requests' })
  @RequirePermission(Permissions.Approvals.Read)
  async list(@Query() query: ListApprovalsQueryDto, @CurrentUser() user: any) {
    const isAdmin = this.canViewAll(user);
    const result = await this.listApprovals.execute(
      {
        status: query.status,
        entityType: query.entityType,
        skip: query.skip ? parseInt(query.skip, 10) : undefined,
        take: query.take ? parseInt(query.take, 10) : undefined,
      },
      { userId: user?.sub, isAdmin },
    );
    if (result.isFailure) handleError(result.error?.message, 'Failed to list approvals');
    const { items, total } = result.getValue();
    return { items, total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get approval request by id' })
  @RequirePermission(Permissions.Approvals.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const isAdmin = this.canViewAll(user);
    const result = await this.listApprovals.execute({}, { userId: user?.sub, isAdmin });
    if (result.isFailure) handleError(result.error?.message, 'Failed to get approval');
    const { items } = result.getValue();
    const approval = items.find((a) => a.id === id);
    if (!approval) throw new NotFoundException('Approval request not found');
    return { approval };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a request for approval (or save as draft)' })
  @RequirePermission(Permissions.Approvals.Create)
  async create(@Body() dto: RequestApprovalDto, @CurrentUser('sub') userId: string) {
    const result = await this.requestApproval.execute({
      entityType: dto.entityType,
      entityId: dto.entityId,
      requestedBy: userId,
      comment: dto.comment,
      status: dto.status,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to create approval request');
    return { approval: result.getValue() };
  }

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Submit a draft request for approval' })
  @RequirePermission(Permissions.Approvals.Create)
  async submit(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveOrRejectDto, @CurrentUser('sub') userId: string) {
    const result = await this.submitApproval.execute(id, userId, dto.comment);
    if (result.isFailure) handleError(result.error?.message, 'Failed to submit approval request');
    return { approval: result.getValue() };
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a draft or pending request' })
  @RequirePermission(Permissions.Approvals.Create)
  async cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveOrRejectDto, @CurrentUser('sub') userId: string) {
    const result = await this.cancelApproval.execute(id, userId, dto.comment);
    if (result.isFailure) handleError(result.error?.message, 'Failed to cancel approval request');
    return { approval: result.getValue() };
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a pending request' })
  @RequirePermission(Permissions.Approvals.Approve)
  async approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveOrRejectDto, @CurrentUser('sub') userId: string, @CurrentUser() user: any, @Req() req: any) {
    if (!this.canDecide(user)) {
      throw new ForbiddenException('Only the general manager or project manager can approve approval requests');
    }
    const result = await this.approveApproval.execute(id, userId, dto.comment, req?.ip);
    if (result.isFailure) handleError(result.error?.message, 'Failed to approve');
    return { approval: result.getValue() };
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a pending request' })
  @RequirePermission(Permissions.Approvals.Reject)
  async reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveOrRejectDto, @CurrentUser('sub') userId: string, @CurrentUser() user: any, @Req() req: any) {
    if (!this.canDecide(user)) {
      throw new ForbiddenException('Only the general manager or project manager can reject approval requests');
    }
    const result = await this.rejectApproval.execute(id, userId, dto.comment, req?.ip);
    if (result.isFailure) handleError(result.error?.message, 'Failed to reject');
    return { approval: result.getValue() };
  }
}
