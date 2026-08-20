import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEntityNoteDto, UpdateEntityNoteDto } from './dto/entity-note.dto';
import { isAdminUser } from '../../common/utils/is-admin.util';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class EntityNoteService {
  constructor(private readonly prisma: PrismaService) {}

  async list(entityType: string, entityId: string) {
    return this.prisma.entityNote.findMany({
      where: {
        entityType,
        entityId,
        deletedAt: null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateEntityNoteDto) {
    return this.prisma.entityNote.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        userId,
        content: dto.content,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async update(id: string, userId: string, content: string) {
    const note = await this.prisma.entityNote.findUnique({ where: { id } });
    if (!note || note.deletedAt) {
      throw new NotFoundException('Entity note not found');
    }
    if (note.userId !== userId) {
      throw new ForbiddenException('You can only edit your own notes');
    }
    return this.prisma.entityNote.update({
      where: { id },
      data: { content },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async delete(id: string, user: JwtPayload) {
    const note = await this.prisma.entityNote.findUnique({ where: { id } });
    if (!note || note.deletedAt) {
      throw new NotFoundException('Entity note not found');
    }
    if (note.userId !== user.sub && !isAdminUser(user)) {
      throw new ForbiddenException('You can only delete your own notes');
    }
    return this.prisma.entityNote.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
