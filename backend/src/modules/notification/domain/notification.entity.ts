import { AggregateRoot } from '@/shared/kernel/aggregate-root';
import { Result } from '@/shared/kernel/result';
import { Guard } from '@/shared/kernel/guard';
import { UniqueEntityId } from '@/shared/kernel/unique-entity-id.vo';

export type NotificationType = 'info' | 'warning' | 'error';

export interface NotificationProps {
  title: string;
  titleEn: string;
  message: string;
  messageEn: string;
  type: NotificationType;
  date: Date;
  read: boolean;
  userId: string | null;
  entityType: string | null;
  entityId: string | null;
  link: string | null;
  deletedAt: Date | null;
}

const VALID_TYPES: NotificationType[] = ['info', 'warning', 'error'];

export class Notification extends AggregateRoot {
  private props: NotificationProps;

  private constructor(
    props: NotificationProps,
    id?: UniqueEntityId,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  get title(): string { return this.props.title; }
  get titleEn(): string { return this.props.titleEn; }
  get message(): string { return this.props.message; }
  get messageEn(): string { return this.props.messageEn; }
  get type(): NotificationType { return this.props.type; }
  get date(): Date { return this.props.date; }
  get read(): boolean { return this.props.read; }
  get userId(): string | null { return this.props.userId; }
  get entityType(): string | null { return this.props.entityType; }
  get entityId(): string | null { return this.props.entityId; }
  get link(): string | null { return this.props.link; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get isDeleted(): boolean { return this.props.deletedAt !== null; }

  public static create(input: {
    title: string;
    titleEn?: string;
    message: string;
    messageEn?: string;
    type?: string;
    date?: Date;
    userId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    link?: string | null;
  }): Result<Notification> {
    const guard1 = Guard.againstNullOrUndefined(input.title, 'title');
    const guard2 = Guard.againstNullOrUndefined(input.message, 'message');
    const combined = Guard.combine(guard1, guard2);
    if (combined.isFailure) return Result.fail(combined.error as Error);

    const trimmedTitle = input.title.trim();
    if (trimmedTitle.length === 0) return Result.fail(new Error('Notification title cannot be empty'));

    const trimmedMessage = input.message.trim();
    if (trimmedMessage.length === 0) return Result.fail(new Error('Notification message cannot be empty'));

    const type = input.type ?? 'info';
    if (!VALID_TYPES.includes(type as NotificationType)) {
      return Result.fail(new Error(`Invalid notification type. Must be one of: ${VALID_TYPES.join(', ')}`));
    }

    return Result.ok(
      new Notification({
        title: trimmedTitle,
        titleEn: input.titleEn ?? '',
        message: trimmedMessage,
        messageEn: input.messageEn ?? '',
        type: type as NotificationType,
        date: input.date ?? new Date(),
        read: false,
        userId: input.userId ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        link: input.link ?? null,
        deletedAt: null,
      }),
    );
  }

  public markAsRead(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Cannot mark a deleted notification as read'));
    if (this.props.read) return Result.fail(new Error('Notification is already marked as read'));
    this.props.read = true;
    return Result.ok();
  }

  public softDelete(): Result<void> {
    if (this.isDeleted) return Result.fail(new Error('Notification is already deleted'));
    this.props.deletedAt = new Date();
    return Result.ok();
  }

  public static reconstitute(
    props: NotificationProps,
    id: UniqueEntityId,
    createdAt: Date,
    updatedAt: Date,
  ): Notification {
    return new Notification(props, id, createdAt, updatedAt);
  }
}
