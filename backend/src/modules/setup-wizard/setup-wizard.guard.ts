import { Injectable, CanActivate, ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SetupWizardGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path = request.path as string;

    if (path.startsWith('/api/setup')) return true;

    const setting = await this.prisma.setting.findUnique({
      where: { group_key: { group: 'company', key: 'isSetup' } },
    });

    if (!setting || setting.value === false) {
      throw new ServiceUnavailableException(
        'System is not yet configured. Please complete the setup wizard at /api/setup',
      );
    }

    return true;
  }
}
