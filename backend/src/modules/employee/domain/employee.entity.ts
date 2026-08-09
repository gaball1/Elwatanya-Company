import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export interface EmployeeProps {
  code: string;
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  address: string;
  birthDate: Date | null;
  hireDate: Date | null;
  departmentId: string;
  roleId: string;
  salary: number;
  status: string;
  notes: string;
  deletedAt: Date | null;
}

export class Employee extends AggregateRoot {
  private props: EmployeeProps;

  private constructor(props: EmployeeProps, id?: UniqueEntityId, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get code(): string { return this.props.code; }
  get fullName(): string { return this.props.fullName; }
  get nationalId(): string { return this.props.nationalId; }
  get phone(): string { return this.props.phone; }
  get email(): string { return this.props.email; }
  get address(): string { return this.props.address; }
  get birthDate(): Date | null { return this.props.birthDate; }
  get hireDate(): Date | null { return this.props.hireDate; }
  get departmentId(): string { return this.props.departmentId; }
  get roleId(): string { return this.props.roleId; }
  get salary(): number { return this.props.salary; }
  get status(): string { return this.props.status; }
  get notes(): string { return this.props.notes; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: { code: string; fullName: string; nationalId?: string; phone?: string; email?: string; address?: string; birthDate?: Date | null; hireDate?: Date | null; departmentId?: string; roleId?: string; salary?: number; status?: string; notes?: string }): Result<Employee> {
    const guard = Guard.againstNullOrUndefined(input.code, 'code');
    if (guard.isFailure) return Result.fail(guard.error as Error);
    const guardName = Guard.againstNullOrUndefined(input.fullName, 'fullName');
    if (guardName.isFailure) return Result.fail(guardName.error as Error);
    const trimmedCode = input.code.trim();
    if (trimmedCode.length === 0) return Result.fail(new Error('Employee code cannot be empty'));
    const trimmedName = input.fullName.trim();
    if (trimmedName.length === 0) return Result.fail(new Error('Employee name cannot be empty'));
    return Result.ok(
      new Employee({
        code: trimmedCode,
        fullName: trimmedName,
        nationalId: input.nationalId ?? '',
        phone: input.phone ?? '',
        email: input.email ?? '',
        address: input.address ?? '',
        birthDate: input.birthDate ?? null,
        hireDate: input.hireDate ?? null,
        departmentId: input.departmentId ?? '',
        roleId: input.roleId ?? '',
        salary: input.salary ?? 0,
        status: input.status ?? 'active',
        notes: input.notes ?? '',
        deletedAt: null,
      }),
    );
  }

  public static reconstitute(props: EmployeeProps, id: UniqueEntityId, createdAt: Date, updatedAt: Date): Employee {
    return new Employee(props, id, createdAt, updatedAt);
  }

  public update(fields: { code?: string; fullName?: string; nationalId?: string; phone?: string; email?: string; address?: string; birthDate?: Date | null; hireDate?: Date | null; departmentId?: string; roleId?: string; salary?: number; status?: string; notes?: string }): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot update a deleted employee'));
    if (fields.code !== undefined) {
      const trimmed = fields.code.trim();
      if (trimmed.length === 0) return Result.fail(new Error('Employee code cannot be empty'));
      this.props.code = trimmed;
    }
    if (fields.fullName !== undefined) {
      const trimmed = fields.fullName.trim();
      if (trimmed.length === 0) return Result.fail(new Error('Employee name cannot be empty'));
      this.props.fullName = trimmed;
    }
    if (fields.nationalId !== undefined) this.props.nationalId = fields.nationalId;
    if (fields.phone !== undefined) this.props.phone = fields.phone;
    if (fields.email !== undefined) this.props.email = fields.email;
    if (fields.address !== undefined) this.props.address = fields.address;
    if (fields.birthDate !== undefined) this.props.birthDate = fields.birthDate;
    if (fields.hireDate !== undefined) this.props.hireDate = fields.hireDate;
    if (fields.departmentId !== undefined) this.props.departmentId = fields.departmentId;
    if (fields.roleId !== undefined) this.props.roleId = fields.roleId;
    if (fields.salary !== undefined) this.props.salary = fields.salary;
    if (fields.status !== undefined) this.props.status = fields.status;
    if (fields.notes !== undefined) this.props.notes = fields.notes;
    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Employee is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }
}
