import type { DailyPointAllocation, PointLedgerEntry } from "@famigo/domain";

import { createApplicationError } from "../errors";
import { executeUseCase, type UseCaseResult } from "../result";
import {
  finalizeDailyAllocation as finalizeDailyAllocationRepository,
  getDailyAllocationForMember as getDailyAllocationForMemberRepository,
  getPendingPointsForMember as getPendingPointsForMemberRepository,
} from "../../data/repositories/daily_point_allocations.repository";
import { getPointTransactions as getPointTransactionsRepository } from "../../data/repositories/points.repository";

export interface FinalizeDailyPointsInput {
  allocationId: string;
  familyId: string;
  memberId: string;
  dayKey: string;
}

export interface FinalizeDailyPointsData {
  allocation: DailyPointAllocation;
  pendingPoints: number;
  ledgerEntries: ReadonlyArray<PointLedgerEntry>;
}

export interface FinalizeDailyPointsDependencies {
  finalizeDailyAllocation?: typeof finalizeDailyAllocationRepository;
  getDailyAllocationForMember?: typeof getDailyAllocationForMemberRepository;
  getPendingPointsForMember?: typeof getPendingPointsForMemberRepository;
  getPointTransactions?: typeof getPointTransactionsRepository;
}

export function createFinalizeDailyPointsUseCase(
  dependencies: FinalizeDailyPointsDependencies = {}
) {
  const {
    finalizeDailyAllocation = finalizeDailyAllocationRepository,
    getDailyAllocationForMember = getDailyAllocationForMemberRepository,
    getPendingPointsForMember = getPendingPointsForMemberRepository,
    getPointTransactions = getPointTransactionsRepository,
  } = dependencies;

  return (input: FinalizeDailyPointsInput): Promise<UseCaseResult<FinalizeDailyPointsData>> =>
    executeUseCase(async () => {
      const result = await finalizeDailyAllocation(input.allocationId);

      if (!result.success) {
        throw createApplicationError({
          code: "DAILY_POINTS_FINALIZATION_FAILED",
          kind: "infrastructure",
          message: result.error ?? "La finalisation des points a echoue.",
        });
      }

      const [allocation, pendingPoints, ledgerEntries] = await Promise.all([
        getDailyAllocationForMember({
          familyId: input.familyId,
          giverMemberId: input.memberId,
          dayKey: input.dayKey,
        }),
        getPendingPointsForMember({
          familyId: input.familyId,
          memberId: input.memberId,
          dayKey: input.dayKey,
        }),
        getPointTransactions(input.memberId),
      ]);

      if (allocation === null) {
        throw createApplicationError({
          code: "ALLOCATION_NOT_FOUND",
          kind: "infrastructure",
          message: "La repartition finalisee est introuvable.",
        });
      }

      return {
        allocation,
        pendingPoints,
        ledgerEntries,
      };
    });
}
