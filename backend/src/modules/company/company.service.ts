import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const company = await this.prisma.company.findFirst();
    if (!company) {
      return this.prisma.company.create({ data: {} });
    }
    return company;
  }

  async update(dto: UpdateCompanyDto) {
    let company = await this.prisma.company.findFirst();
    if (!company) {
      company = await this.prisma.company.create({ data: {} });
    }
    return this.prisma.company.update({
      where: { id: company.id },
      data: dto,
    });
  }

  async uploadLogo(fileId: string) {
    return this.updateField('logo', fileId);
  }

  async uploadSmallLogo(fileId: string) {
    return this.updateField('smallLogo', fileId);
  }

  async uploadWatermark(fileId: string) {
    return this.updateField('watermark', fileId);
  }

  async uploadStamp(fileId: string) {
    return this.updateField('stamp', fileId);
  }

  async uploadSignature(fileId: string) {
    return this.updateField('signature', fileId);
  }

  private async updateField(field: string, value: string) {
    let company = await this.prisma.company.findFirst();
    if (!company) {
      company = await this.prisma.company.create({ data: {} });
    }
    return this.prisma.company.update({
      where: { id: company.id },
      data: { [field]: value },
    });
  }
}
