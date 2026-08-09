import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { ISettingRepository } from '../domain/setting.repository';
import { Setting } from '../domain/setting.entity';

@Injectable()
export class PrismaSettingRepository implements ISettingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Setting | null> {
    const record = await this.prisma.setting.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByGroup(group: string): Promise<Setting[]> {
    const records = await this.prisma.setting.findMany({ where: { group } });
    return records.map((r) => this.toDomain(r));
  }

  async findByGroupAndKey(group: string, key: string): Promise<Setting | null> {
    const record = await this.prisma.setting.findUnique({ where: { group_key: { group, key } } });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Setting[]> {
    const records = await this.prisma.setting.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] });
    return records.map((r) => this.toDomain(r));
  }

  async save(setting: Setting): Promise<void> {
    const data = {
      group: setting.group,
      key: setting.key,
      value: setting.value,
      type: setting.valueType,
      label: setting.label,
      description: setting.description,
      isSecret: setting.isSecret,
      isReadOnly: setting.isReadOnly,
    };

    await this.prisma.setting.upsert({
      where: { id: setting.id.toValue() },
      create: { id: setting.id.toValue(), ...data },
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.setting.delete({ where: { id } });
  }

  private toDomain(record: any): Setting {
    return Setting.create(
      {
        group: record.group,
        key: record.key,
        value: record.value,
        valueType: record.type ?? 'string',
        label: record.label ?? undefined,
        description: record.description ?? undefined,
        isSecret: record.isSecret ?? false,
        isReadOnly: record.isReadOnly ?? false,
      },
      new UniqueEntityId(record.id),
      record.createdAt,
      record.updatedAt,
    );
  }
}
