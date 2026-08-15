import { UniqueEntityId } from './unique-entity-id.vo';

export abstract class BaseEntity {
  protected _id: UniqueEntityId;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(id?: UniqueEntityId, createdAt?: Date, updatedAt?: Date) {
    this._id = id ?? new UniqueEntityId();
    this.createdAt = createdAt ?? new Date();
    this.updatedAt = updatedAt ?? new Date();
  }

  get id(): UniqueEntityId {
    return this._id;
  }

  protected changeId(id: UniqueEntityId): void {
    this._id = id;
  }

  equals(entity?: BaseEntity): boolean {
    if (!entity) return false;
    return this._id.equals(entity._id);
  }
}
