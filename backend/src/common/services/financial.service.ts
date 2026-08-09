import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface FinancialExpenseInput {
  projectId: string;
  amount: number;
  category: 'purchase' | 'miscellaneous' | 'extract' | 'payment' | 'adjustment';
  referenceId: string;
  description: string;
  notes?: string;
  createdBy: string;
  date?: Date;
}

@Injectable()
export class FinancialService {
  constructor(private readonly prisma: PrismaService) {}

  async recordExpense(input: FinancialExpenseInput, tx?: Prisma.TransactionClient): Promise<void> {
    const run = async (client: Prisma.TransactionClient) => {
      const fund = await client.projectFund.findFirst({
        where: { projectId: input.projectId, deletedAt: null },
      });

      if (!fund) {
        throw new Error(`No project fund found for project ${input.projectId}`);
      }

      const newBalance = new Prisma.Decimal(fund.currentBalance).minus(input.amount);

      await client.projectFund.update({
        where: { id: fund.id },
        data: { currentBalance: newBalance, lastUpdated: new Date(), updatedAt: new Date() },
      });

      await client.fundTransaction.create({
        data: {
          id: crypto.randomUUID(),
          fundId: fund.id,
          type: 'deduct',
          category: input.category,
          amount: new Prisma.Decimal(input.amount),
          description: input.description,
          date: input.date ?? new Date(),
          status: 'approved',
          referenceId: input.referenceId,
          notes: input.notes ?? input.description,
          createdBy: input.createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    };

    if (tx) {
      await run(tx);
    } else {
      await this.prisma.$transaction(run);
    }
  }

  async reverseExpense(input: FinancialExpenseInput, tx?: Prisma.TransactionClient): Promise<void> {
    const run = async (client: Prisma.TransactionClient) => {
      const fund = await client.projectFund.findFirst({
        where: { projectId: input.projectId, deletedAt: null },
      });

      if (!fund) {
        throw new Error(`No project fund found for project ${input.projectId}`);
      }

      const newBalance = new Prisma.Decimal(fund.currentBalance).plus(input.amount);

      await client.projectFund.update({
        where: { id: fund.id },
        data: { currentBalance: newBalance, lastUpdated: new Date(), updatedAt: new Date() },
      });

      await client.fundTransaction.create({
        data: {
          id: crypto.randomUUID(),
          fundId: fund.id,
          type: 'add',
          category: input.category,
          amount: new Prisma.Decimal(input.amount),
          description: `عكس: ${input.description}`,
          date: new Date(),
          status: 'approved',
          referenceId: input.referenceId,
          notes: `عكس مصروف: ${input.description}`,
          createdBy: input.createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    };

    if (tx) {
      await run(tx);
    } else {
      await this.prisma.$transaction(run);
    }
  }

  async recordIncome(input: {
    projectId: string;
    amount: number;
    category: 'extract' | 'payment' | 'adjustment';
    referenceId: string;
    description: string;
    createdBy: string;
    date?: Date;
  }, tx?: Prisma.TransactionClient): Promise<void> {
    const run = async (client: Prisma.TransactionClient) => {
      const fund = await client.projectFund.findFirst({
        where: { projectId: input.projectId, deletedAt: null },
      });

      if (!fund) {
        throw new Error(`No project fund found for project ${input.projectId}`);
      }

      const newBalance = new Prisma.Decimal(fund.currentBalance).plus(input.amount);

      await client.projectFund.update({
        where: { id: fund.id },
        data: { currentBalance: newBalance, lastUpdated: new Date(), updatedAt: new Date() },
      });

      await client.fundTransaction.create({
        data: {
          id: crypto.randomUUID(),
          fundId: fund.id,
          type: 'add',
          category: input.category,
          amount: new Prisma.Decimal(input.amount),
          description: input.description,
          date: input.date ?? new Date(),
          status: 'approved',
          referenceId: input.referenceId,
          notes: input.description,
          createdBy: input.createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    };

    if (tx) {
      await run(tx);
    } else {
      await this.prisma.$transaction(run);
    }
  }
}
