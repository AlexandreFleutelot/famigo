import {
  createDailyPointAllocation,
  getAllocatedPoints,
  getRemainingDailyPoints,
  replaceDailyPointAllocationLines,
  type DailyPointAllocationLine,
} from "@famigo/domain";

import {
  getDailyAllocationForMember as getDailyAllocationForMemberRepository,
  saveDailyAllocationDraft as saveDailyAllocationDraftRepository,
} from "../../data/repositories/daily_point_allocations.repository";
import { executeUseCase, type UseCaseResult } from "../result";

export interface SaveDailyPointsInput {
  familyId: string;
  memberId: string;
  dayKey: string;
  lines: ReadonlyArray<DailyPointAllocationLine>;
}

export interface SaveDailyPointsData {
  allocation: import("@famigo/domain").DailyPointAllocation;
  allocatedPoints: number;
  remainingPoints: number;
}

export interface SaveDailyPointsDependencies {
  getDailyAllocationForMember?: typeof getDailyAllocationForMemberRepository;
  saveDailyAllocationDraft?: typeof saveDailyAllocationDraftRepository;
}

export function createSaveDailyPointsUseCase(dependencies: SaveDailyPointsDependencies = {}) {
  const {
    getDailyAllocationForMember = getDailyAllocationForMemberRepository,
    saveDailyAllocationDraft = saveDailyAllocationDraftRepository,
  } = dependencies;

  return (input: SaveDailyPointsInput): Promise<UseCaseResult<SaveDailyPointsData>> =>
    executeUseCase(async () => {
      const existingAllocation = await getDailyAllocationForMember({
        familyId: input.familyId,
        giverMemberId: input.memberId,
        dayKey: input.dayKey,
      });

      const draftAllocation =
        existingAllocation ??
        createDailyPointAllocation({
          id: `draft-${input.memberId}-${input.dayKey}`,
          familyId: input.familyId,
          dayKey: input.dayKey,
          giverMemberId: input.memberId,
        });

      const nextAllocation = replaceDailyPointAllocationLines(draftAllocation, input.lines);
      const savedAllocation = await saveDailyAllocationDraft({
        familyId: input.familyId,
        giverMemberId: input.memberId,
        dayKey: input.dayKey,
        lines: nextAllocation.lines,
      });

      return {
        allocation: savedAllocation,
        allocatedPoints: getAllocatedPoints(savedAllocation),
        remainingPoints: getRemainingDailyPoints(savedAllocation),
      };
    });
}
