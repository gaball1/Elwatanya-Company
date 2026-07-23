import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IPasswordHasher } from '../application/ports/password-hasher.port';
import { Password } from '../domain/value-objects/password.vo';
import { PasswordHash } from '../domain/value-objects/password-hash.vo';

@Injectable()
export class BcryptPasswordHasher implements IPasswordHasher {
  private readonly saltRounds = 10;

  async hash(password: Password): Promise<PasswordHash> {
    const hash = await bcrypt.hash(password.value, this.saltRounds);
    return PasswordHash.create(hash).getValue();
  }

  async compare(plainPassword: string, hash: PasswordHash): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash.value);
  }
}
