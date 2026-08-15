import { apiClient } from '@/lib/api/apiClient';

export interface ProfileRoleRef {
  id: string;
  name: string;
}

export interface ProfileProjectRef {
  id: string;
  name: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  signatureUrl: string;
  employee?: unknown;
  roles?: ProfileRoleRef[];
  projects?: ProfileProjectRef[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const profileService = {
  async get(): Promise<Profile> {
    const data = await apiClient<Profile>('/profile', { method: 'GET' });
    return data;
  },

  async update(body: UpdateProfileData): Promise<Profile> {
    const data = await apiClient<Profile>('/profile', { method: 'PATCH', body });
    return data;
  },

  async changePassword(body: ChangePasswordData): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>('/profile/change-password', { method: 'POST', body });
  },

  async getSignature(): Promise<{ signatureUrl: string }> {
    return apiClient<{ signatureUrl: string }>('/profile/signature', { method: 'GET' });
  },

  async saveSignature(signatureUrl: string): Promise<{ signatureUrl: string }> {
    return apiClient<{ signatureUrl: string }>('/profile/signature', {
      method: 'PUT',
      body: { signatureUrl },
    });
  },

  async clearSignature(): Promise<void> {
    await apiClient('/profile/signature', { method: 'DELETE' });
  },
};
