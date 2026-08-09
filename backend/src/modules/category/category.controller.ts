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
import { ListCategoriesUseCase } from './application/use-cases/list-categories.use-case';
import { GetCategoryUseCase } from './application/use-cases/get-category.use-case';
import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.use-case';
import { DeleteCategoryUseCase } from './application/use-cases/delete-category.use-case';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoryController {
  constructor(
    private readonly getCategory: GetCategoryUseCase,
    private readonly listCategories: ListCategoriesUseCase,
    private readonly createCategory: CreateCategoryUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly deleteCategory: DeleteCategoryUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List categories' })
  @RequirePermission(Permissions.Categories.Read)
  async list() {
    const result = await this.listCategories.execute();
    return { items: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by id' })
  @RequirePermission(Permissions.Categories.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getCategory.execute(id);
    const category = result.getValue();
    if (!category) throw new NotFoundException('Category not found');
    return { category };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a category' })
  @RequirePermission(Permissions.Categories.Create)
  async create(@Body() dto: CreateCategoryDto) {
    const result = await this.createCategory.execute({
      code: dto.code,
      name: dto.name,
      description: dto.description,
      parentId: dto.parentId ?? null,
      status: dto.status,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to create category');
    return { category: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category' })
  @RequirePermission(Permissions.Categories.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    const result = await this.updateCategory.execute({
      id,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      parentId: dto.parentId !== undefined ? dto.parentId : undefined,
      status: dto.status,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to update category');
    return { category: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a category' })
  @RequirePermission(Permissions.Categories.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteCategory.execute(id);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete category');
  }
}
