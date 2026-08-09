import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export type ReportFormat = 'pdf' | 'excel' | 'csv';

export interface ReportDefinitionProps {
  name: string;
  displayName: string;
  description: string;
  category: string;
  supportedFormats: ReportFormat[];
  parameterSchema: Record<string, any>;
  requiresProject: boolean;
  requiresBuilding: boolean;
}

export class ReportDefinition extends AggregateRoot {
  private props: ReportDefinitionProps;

  private constructor(props: ReportDefinitionProps, id?: UniqueEntityId) {
    super(id);
    this.props = props;
  }

  get name(): string { return this.props.name; }
  get displayName(): string { return this.props.displayName; }
  get description(): string { return this.props.description; }
  get category(): string { return this.props.category; }
  get supportedFormats(): ReportFormat[] { return this.props.supportedFormats; }
  get parameterSchema(): Record<string, any> { return this.props.parameterSchema; }
  get requiresProject(): boolean { return this.props.requiresProject; }
  get requiresBuilding(): boolean { return this.props.requiresBuilding; }

  supportsFormat(format: ReportFormat): boolean {
    return this.props.supportedFormats.includes(format);
  }

  static create(props: ReportDefinitionProps, id?: UniqueEntityId): ReportDefinition {
    return new ReportDefinition(props, id);
  }
}
