import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface SettingProps {
  group: string;
  key: string;
  value: any;
  valueType: string;
  label?: string;
  description?: string;
  isSecret: boolean;
  isReadOnly: boolean;
}

export class Setting extends AggregateRoot {
  private props: SettingProps;

  private constructor(props: SettingProps, id?: UniqueEntityId, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get group(): string { return this.props.group; }
  get key(): string { return this.props.key; }
  get value(): any { return this.props.value; }
  get valueType(): string { return this.props.valueType; }
  get label(): string | undefined { return this.props.label; }
  get description(): string | undefined { return this.props.description; }
  get isSecret(): boolean { return this.props.isSecret; }
  get isReadOnly(): boolean { return this.props.isReadOnly; }

  public static create(props: SettingProps, id?: UniqueEntityId, createdAt?: Date, updatedAt?: Date): Setting {
    return new Setting(props, id, createdAt, updatedAt);
  }

  public updateValue(value: any): void {
    this.props.value = value;
  }
}
