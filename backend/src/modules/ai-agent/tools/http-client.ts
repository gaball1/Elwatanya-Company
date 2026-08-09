import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class AgentHttpClient {
  constructor(private readonly http: HttpService) {}

  async get(path: string, token: string): Promise<any> {
    const response: AxiosResponse = await firstValueFrom(
      this.http.get(path, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    return response.data;
  }

  async post(path: string, body: any, token: string): Promise<any> {
    const response: AxiosResponse = await firstValueFrom(
      this.http.post(path, body, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      }),
    );
    return response.data;
  }

  async patch(path: string, body: any, token: string): Promise<any> {
    const response: AxiosResponse = await firstValueFrom(
      this.http.patch(path, body, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      }),
    );
    return response.data;
  }

  async delete(path: string, token: string): Promise<any> {
    const response: AxiosResponse = await firstValueFrom(
      this.http.delete(path, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    return response.data;
  }
}
