import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { CATEGORY_REPOSITORY } from './domain/category.repository';
import { ICategoryRepository } from './domain/category.repository';
import { PrismaCategoryRepository } from './infrastructure/prisma-category.repository';
import { ListCategoriesUseCase } from './application/use-cases/list-categories.use-case';
import { GetCategoryUseCase } from './application/use-cases/get-category.use-case';
import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.use-case';
import { DeleteCategoryUseCase } from './application/use-cases/delete-category.use-case';
import { CategoryController } from './category.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CategoryController],
  providers: [
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
    {
      provide: GetCategoryUseCase,
      useFactory: (repo: ICategoryRepository) => new GetCategoryUseCase(repo),
      inject: [CATEGORY_REPOSITORY],
    },
    {
      provide: ListCategoriesUseCase,
      useFactory: (repo: ICategoryRepository) => new ListCategoriesUseCase(repo),
      inject: [CATEGORY_REPOSITORY],
    },
    {
      provide: CreateCategoryUseCase,
      useFactory: (repo: ICategoryRepository) => new CreateCategoryUseCase(repo),
      inject: [CATEGORY_REPOSITORY],
    },
    {
      provide: UpdateCategoryUseCase,
      useFactory: (repo: ICategoryRepository) => new UpdateCategoryUseCase(repo),
      inject: [CATEGORY_REPOSITORY],
    },
    {
      provide: DeleteCategoryUseCase,
      useFactory: (repo: ICategoryRepository) => new DeleteCategoryUseCase(repo),
      inject: [CATEGORY_REPOSITORY],
    },
  ],
  exports: [CATEGORY_REPOSITORY],
})
export class CategoryModule {}
