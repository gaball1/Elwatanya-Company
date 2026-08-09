export type ResetStrategy = 'none' | 'yearly' | 'monthly' | 'daily';

export interface DocumentNumberConfigProps {
  documentType: string;
  prefix: string;
  padding: number;
  resetStrategy: ResetStrategy;
  nextNumber: number;
  lastResetAt?: Date;
}

export class DocumentNumberConfig {
  private props: DocumentNumberConfigProps;

  private constructor(props: DocumentNumberConfigProps) {
    this.props = props;
  }

  get documentType(): string { return this.props.documentType; }
  get prefix(): string { return this.props.prefix; }
  get padding(): number { return this.props.padding; }
  get resetStrategy(): ResetStrategy { return this.props.resetStrategy; }
  get nextNumber(): number { return this.props.nextNumber; }
  get lastResetAt(): Date | undefined { return this.props.lastResetAt; }

  increment(): void { this.props.nextNumber++; }
  reset(nextNumber: number): void { this.props.nextNumber = nextNumber; this.props.lastResetAt = new Date(); }

  generate(currentDate: Date): string {
    let suffix = '';
    if (this.props.resetStrategy === 'yearly') suffix = `-${currentDate.getFullYear()}`;
    else if (this.props.resetStrategy === 'monthly') suffix = `-${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    else if (this.props.resetStrategy === 'daily') suffix = `-${currentDate.toISOString().slice(0, 10).replace(/-/g, '')}`;
    return `${this.props.prefix}${suffix}-${String(this.props.nextNumber).padStart(this.props.padding, '0')}`;
  }

  needsReset(currentDate: Date): boolean {
    if (!this.props.lastResetAt) return this.props.resetStrategy !== 'none';
    const last = this.props.lastResetAt;
    if (this.props.resetStrategy === 'yearly') return last.getFullYear() < currentDate.getFullYear();
    if (this.props.resetStrategy === 'monthly') return last.getFullYear() < currentDate.getFullYear() || (last.getFullYear() === currentDate.getFullYear() && last.getMonth() < currentDate.getMonth());
    if (this.props.resetStrategy === 'daily') return last.toISOString().slice(0, 10) < currentDate.toISOString().slice(0, 10);
    return false;
  }

  static create(props: DocumentNumberConfigProps): DocumentNumberConfig {
    return new DocumentNumberConfig(props);
  }
}
