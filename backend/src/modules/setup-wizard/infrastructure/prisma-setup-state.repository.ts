import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SetupState, SetupStateProps } from '../domain/setup-state.entity';
import { SetupStep } from '../domain/setup-step.enum';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

@Injectable()
export class PrismaSetupStateRepository {
  private readonly CONFIG_KEY = 'setup-wizard-state';

  constructor(private readonly prisma: PrismaService) {}

  async getState(): Promise<SetupState | null> {
    const setting = await this.prisma.setting.findUnique({
      where: { group_key: { group: 'company', key: 'setupState' } },
    });
    if (!setting) return null;
    const props = setting.value as any;
    return SetupState.create({
      isComplete: props.isComplete ?? false,
      currentStep: props.currentStep as SetupStep,
      completedSteps: props.completedSteps as SetupStep[],
    });
  }

  async save(state: SetupState): Promise<void> {
    const value = {
      isComplete: state.isComplete,
      currentStep: state.currentStep,
      completedSteps: state.completedSteps,
    };
    await this.prisma.setting.upsert({
      where: { group_key: { group: 'company', key: 'setupState' } },
      create: {
        group: 'company',
        key: 'setupState',
        value: value as any,
        type: 'json',
        label: 'Setup Wizard State',
        isSecret: false,
        isReadOnly: true,
      } as any,
      update: { value: value as any } as any,
    });
  }
}
