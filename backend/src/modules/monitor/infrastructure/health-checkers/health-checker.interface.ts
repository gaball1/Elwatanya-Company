import { ComponentHealth } from '../../domain/system-health.interface';

export interface HealthChecker {
  readonly name: string;
  check(): Promise<ComponentHealth>;
}
