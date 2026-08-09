import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShiftDto, UpdateShiftDto } from './dto/shift.dto';

@Injectable()
export class ShiftService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const shifts = await this.prisma.shift.findMany({ where: { deletedAt: null } });
    return { items: shifts };
  }

  async findOne(id: string) {
    const shift = await this.prisma.shift.findFirst({ where: { id, deletedAt: null } });
    if (!shift) throw new NotFoundException('Shift not found');
    return { shift };
  }

  async create(dto: CreateShiftDto) {
    const shift = await this.prisma.shift.create({ data: dto });
    return { shift };
  }

  async update(id: string, dto: UpdateShiftDto) {
    const existing = await this.prisma.shift.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Shift not found');
    const shift = await this.prisma.shift.update({ where: { id }, data: dto });
    return { shift };
  }

  async remove(id: string) {
    const existing = await this.prisma.shift.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Shift not found');
    await this.prisma.shift.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
