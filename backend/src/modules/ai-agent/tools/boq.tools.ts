import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';

@Injectable()
export class GetEmployerBOQTool extends BaseTool {
  readonly name = 'get_employer_boq';
  readonly description = 'Get employer Bill of Quantities (BOQ) for a building';
  readonly requiresPermission = 'employer-boq.read';
  readonly requiredEntity = 'boq';

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const buildingId = args.buildingId;
    if (!buildingId) return this.fail('buildingId is required');

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/buildings/${buildingId}/boq/employer`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Employer BOQ retrieval failed');
    }
  }
}

@Injectable()
export class GetAnalyticalBOQTool extends BaseTool {
  readonly name = 'get_analytical_boq';
  readonly description = 'Get analytical BOQ for a building';
  readonly requiresPermission = 'analytical-boq.read';
  readonly requiredEntity = 'boq';

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const buildingId = args.buildingId;
    if (!buildingId) return this.fail('buildingId is required');

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/buildings/${buildingId}/boq/analytical`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Analytical BOQ retrieval failed');
    }
  }
}

@Injectable()
export class GetFinalBOQTool extends BaseTool {
  readonly name = 'get_final_boq';
  readonly description = 'Get final BOQ with components and distribution status for a building';
  readonly requiresPermission = 'final-boq.read';
  readonly requiredEntity = 'boq';

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const buildingId = args.buildingId;
    if (!buildingId) return this.fail('buildingId is required');

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/buildings/${buildingId}/boq/final`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Final BOQ retrieval failed');
    }
  }
}

@Injectable()
export class GetContractorBOQTool extends BaseTool {
  readonly name = 'get_contractor_boq';
  readonly description = 'Get contractor-allocated BOQ items for a specific contractor in a building';
  readonly requiresPermission = 'contractor-boq.read';
  readonly requiredEntity = 'boq';

  async execute(args: Record<string, any>, user: any): Promise<any> {
    const buildingId = args.buildingId;
    const contractorId = args.contractorId;
    if (!buildingId || !contractorId) return this.fail('buildingId and contractorId are required');

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3001'}/api/v1/buildings/${buildingId}/contractors/${contractorId}/boq`,
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      const data = await response.json();
      return this.success(data);
    } catch {
      return this.fail('Contractor BOQ retrieval failed');
    }
  }
}
