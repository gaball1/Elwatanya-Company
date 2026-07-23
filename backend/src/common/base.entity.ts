// src/common/base.entity.ts

export abstract class BaseEntity {
  id!: string;

  version: number = 1;

  createdAt!: Date;

  updatedAt!: Date;

  deletedAt?: Date | null;
}
