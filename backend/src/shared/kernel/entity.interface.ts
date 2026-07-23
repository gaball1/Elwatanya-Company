export interface Entity<T> {
  id: T;
  equals(entity: Entity<T>): boolean;
}
