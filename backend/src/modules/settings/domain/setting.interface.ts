export interface SettingDto {
  id: string;
  group: string;
  key: string;
  value: any;
  valueType: string;
  label?: string;
  description?: string;
  isSecret: boolean;
  isReadOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
}
