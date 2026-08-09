export type KpiCategory = 'earned_value' | 'financial' | 'performance' | 'risk' | 'boq' | 'resources';

export interface KpiDefinitionProps {
  key: string;
  name: string;
  nameArabic: string;
  description: string;
  category: KpiCategory;
  unit: string;
  higherIsBetter: boolean;
  calculate(params: any): Promise<KpiResult>;
}

export interface KpiResult {
  key: string;
  value: number;
  display: string;
  trend?: 'up' | 'down' | 'stable';
  threshold?: { warning: number; critical: number };
  status?: 'good' | 'warning' | 'critical';
  details?: Record<string, any>;
}

export class KpiDefinition {
  private props: KpiDefinitionProps;

  private constructor(props: KpiDefinitionProps) {
    this.props = props;
  }

  get key(): string { return this.props.key; }
  get name(): string { return this.props.name; }
  get nameArabic(): string { return this.props.nameArabic; }
  get description(): string { return this.props.description; }
  get category(): KpiCategory { return this.props.category; }
  get unit(): string { return this.props.unit; }
  get higherIsBetter(): boolean { return this.props.higherIsBetter; }

  calculate(params: any): Promise<KpiResult> { return this.props.calculate(params); }

  static create(props: KpiDefinitionProps): KpiDefinition {
    return new KpiDefinition(props);
  }
}
