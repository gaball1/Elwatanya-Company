import { apiClient } from '@/lib/api/apiClient';

export interface Company {
  id: string;
  name: string;
  arabicName: string;
  logo: string;
  smallLogo: string;
  watermark: string;
  stamp: string;
  signature: string;
  primaryColor: string;
  secondaryColor: string;
  font: string;
  address: string;
  taxNumber: string;
  commercialRegister: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  timezone: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCompanyData {
  name?: string;
  arabicName?: string;
  logo?: string;
  smallLogo?: string;
  watermark?: string;
  stamp?: string;
  signature?: string;
  primaryColor?: string;
  secondaryColor?: string;
  font?: string;
  address?: string;
  taxNumber?: string;
  commercialRegister?: string;
  phone?: string;
  email?: string;
  website?: string;
  currency?: string;
  timezone?: string;
  language?: string;
}

export const companyService = {
  async get(): Promise<Company> {
    const data = await apiClient<{ company: Company }>('/company', { method: 'GET' });
    return data.company;
  },

  async update(body: UpdateCompanyData): Promise<Company> {
    const data = await apiClient<{ company: Company }>('/company', { method: 'PUT', body });
    return data.company;
  },

  async uploadLogo(file: File): Promise<Company> {
    const formData = new FormData();
    formData.append('file', file);
    const data = await apiClient<{ company: Company }>('/company/upload/logo', {
      method: 'POST',
      body: formData,
      headers: {},
    });
    return data.company;
  },

  async uploadSmallLogo(file: File): Promise<Company> {
    const formData = new FormData();
    formData.append('file', file);
    const data = await apiClient<{ company: Company }>('/company/upload/small-logo', {
      method: 'POST',
      body: formData,
      headers: {},
    });
    return data.company;
  },

  async uploadWatermark(file: File): Promise<Company> {
    const formData = new FormData();
    formData.append('file', file);
    const data = await apiClient<{ company: Company }>('/company/upload/watermark', {
      method: 'POST',
      body: formData,
      headers: {},
    });
    return data.company;
  },

  async uploadStamp(file: File): Promise<Company> {
    const formData = new FormData();
    formData.append('file', file);
    const data = await apiClient<{ company: Company }>('/company/upload/stamp', {
      method: 'POST',
      body: formData,
      headers: {},
    });
    return data.company;
  },

  async uploadSignature(file: File): Promise<Company> {
    const formData = new FormData();
    formData.append('file', file);
    const data = await apiClient<{ company: Company }>('/company/upload/signature', {
      method: 'POST',
      body: formData,
      headers: {},
    });
    return data.company;
  },
};
