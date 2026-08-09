export interface HolidayResult {
  id: string;
  name: string;
  date: Date;
  description: string;
  isRecurring: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHolidayInput {
  name: string;
  date: Date;
  description?: string;
  isRecurring?: boolean;
}

export interface UpdateHolidayInput {
  id: string;
  name?: string;
  date?: Date;
  description?: string;
  isRecurring?: boolean;
}
