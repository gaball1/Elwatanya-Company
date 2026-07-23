import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface SubcontractorProps {
  name: string;
  deletedAt: Date | null;
}

export class Subcontractor extends AggregateRoot {
  private props: SubcontractorProps;

  private constructor(
    props: SubcontractorProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get name(): string {
    return this.props.name;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  public static create(name: string): Subcontractor {
    return new Subcontractor({ name: name.trim(), deletedAt: null });
  }

  public static reconstitute(
    props: SubcontractorProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): Subcontractor {
    return new Subcontractor(props, id, createdAt, updatedAt);
  }
}
