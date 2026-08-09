import { Setting } from './setting.entity';

export const SETTING_REPOSITORY = Symbol('SETTING_REPOSITORY');

export interface ISettingRepository {
  findById(id: string): Promise<Setting | null>;
  findByGroup(group: string): Promise<Setting[]>;
  findByGroupAndKey(group: string, key: string): Promise<Setting | null>;
  findAll(): Promise<Setting[]>;
  save(setting: Setting): Promise<void>;
  delete(id: string): Promise<void>;
}
