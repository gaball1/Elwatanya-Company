import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';
import { SetupStep } from './setup-step.enum';

export interface SetupStateProps {
  isComplete: boolean;
  currentStep: SetupStep;
  completedSteps: SetupStep[];
}

export class SetupState extends AggregateRoot {
  private props: SetupStateProps;

  private constructor(props: SetupStateProps, id?: UniqueEntityId, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get isComplete(): boolean { return this.props.isComplete; }
  get currentStep(): SetupStep { return this.props.currentStep; }
  get completedSteps(): SetupStep[] { return this.props.completedSteps; }

  static create(props?: Partial<SetupStateProps>, id?: UniqueEntityId): SetupState {
    return new SetupState(
      {
        isComplete: false,
        currentStep: SetupStep.COMPANY_INFO,
        completedSteps: [],
        ...props,
      },
      id,
    );
  }

  completeStep(step: SetupStep): void {
    if (!this.props.completedSteps.includes(step)) {
      this.props.completedSteps.push(step);
    }
    const stepIndex = SETUP_STEPS.indexOf(step);
    if (stepIndex >= 0 && stepIndex < SETUP_STEPS.length - 1) {
      this.props.currentStep = SETUP_STEPS[stepIndex + 1];
    } else {
      this.props.isComplete = true;
      this.props.currentStep = SetupStep.COMPLETE;
    }
  }
}

const SETUP_STEPS = [
  SetupStep.COMPANY_INFO,
  SetupStep.BRANDING,
  SetupStep.FINANCE,
  SetupStep.ADMINISTRATOR,
  SetupStep.SCHEDULE,
  SetupStep.COMPLETE,
];
