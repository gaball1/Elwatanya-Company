import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface WorkflowStepDef {
  label: string;
  roleName?: string;
  userId?: string;
  isFinal?: boolean;
}

export interface SignatureWorkflowProps {
  name: string;
  description?: string;
  entityType: string;
  isActive: boolean;
  steps: WorkflowStepDef[];
}

export class SignatureWorkflow extends AggregateRoot {
  private props: SignatureWorkflowProps;

  private constructor(props: SignatureWorkflowProps, id?: UniqueEntityId) {
    super(id);
    this.props = props;
  }

  get name(): string { return this.props.name; }
  get description(): string | undefined { return this.props.description; }
  get entityType(): string { return this.props.entityType; }
  get isActive(): boolean { return this.props.isActive; }
  get steps(): WorkflowStepDef[] { return this.props.steps; }

  deactivate(): void { this.props.isActive = false; }
  activate(): void { this.props.isActive = true; }

  static create(props: SignatureWorkflowProps, id?: UniqueEntityId): SignatureWorkflow {
    return new SignatureWorkflow(props, id);
  }
}
