import { Password } from '../../domain/value-objects/password.vo';
import { PasswordHash } from '../../domain/value-objects/password-hash.vo';

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface IPasswordHasher {
  hash(password: Password): Promise<PasswordHash>;
  compare(plainPassword: string, hash: PasswordHash): Promise<boolean>;
}
