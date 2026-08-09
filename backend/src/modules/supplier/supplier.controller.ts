import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { handleError } from '../../common/utils/handle-error';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { GetSupplierUseCase } from './application/use-cases/get-supplier.use-case';
import { ListSuppliersUseCase } from './application/use-cases/list-suppliers.use-case';
import { CreateSupplierUseCase } from './application/use-cases/create-supplier.use-case';
import { UpdateSupplierUseCase } from './application/use-cases/update-supplier.use-case';
import { DeleteSupplierUseCase } from './application/use-cases/delete-supplier.use-case';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SupplierController {
  constructor(
    private readonly getSupplier: GetSupplierUseCase,
    private readonly listSuppliers: ListSuppliersUseCase,
    private readonly createSupplier: CreateSupplierUseCase,
    private readonly updateSupplier: UpdateSupplierUseCase,
    private readonly deleteSupplier: DeleteSupplierUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List suppliers' })
  @RequirePermission(Permissions.Suppliers.Read)
  async list() {
    const result = await this.listSuppliers.execute();
    return { items: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by id' })
  @RequirePermission(Permissions.Suppliers.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getSupplier.execute(id);
    const supplier = result.getValue();
    if (!supplier) throw new NotFoundException('Supplier not found');
    return { supplier };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a supplier' })
  @RequirePermission(Permissions.Suppliers.Create)
  async create(@Body() dto: CreateSupplierDto) {
    const result = await this.createSupplier.execute({
      name: dto.name,
      contactPerson: dto.contactPerson,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      products: dto.products,
      paymentTerms: dto.paymentTerms,
      joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
      status: dto.status,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to create supplier');
    return { supplier: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update supplier' })
  @RequirePermission(Permissions.Suppliers.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSupplierDto) {
    const result = await this.updateSupplier.execute({
      id,
      name: dto.name,
      contactPerson: dto.contactPerson,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      products: dto.products,
      paymentTerms: dto.paymentTerms,
      joinDate: dto.joinDate !== undefined ? new Date(dto.joinDate) : undefined,
      status: dto.status,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to update supplier');
    return { supplier: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a supplier' })
  @RequirePermission(Permissions.Suppliers.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteSupplier.execute(id);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete supplier');
  }
}
