import {
  createDailyPointAllocation,
  getAllocatedPoints,
  getRemainingDailyPoints,
  type DailyPointAllocation,
  type Member,
} from "@famigo/domain";

import { getFamilyMembers as getFamilyMembersRepository } from "../../data/repositories/members.repository";
import { getDailyAllocationForMember as getDailyAllocationForMemberRepository } from "../../data/repositories/daily_point_allocations.repository";
import { executeUseCase, type UseCaseResult } from "../result";

export interface LoadDailyPointsInput {
  familyId: string;
  memberId: string;
  dayKey: string;
}

export interface LoadDailyPointsData {
  allocation: DailyPointAllocation;
  members: ReadonlyArray<Member>;
  allocatedPoints: number;
  remainingPoints: number;
}

export interface LoadDailyPointsDependencies {
  getFamilyMembers?: typeof getFamilyMembersRepository;
  getDailyAllocationForMember?: typeof getDailyAllocationForMemberRepository;
}

export function createLoadDailyPointsUseCase(dependencies: LoadDailyPointsDependencies = {}) {
  const {
    getFamilyMembers = getFamilyMembersRepository,
    getDailyAllocationForMember = getDailyAllocationForMemberRepository,
  } = dependencies;

  return (input: LoadDailyPointsInput): Promise<UseCaseResult<LoadDailyPointsData>> =>
    executeUseCase(async () => {
      const [members, existingAllocation] = await Promise.all([
        getFamilyMembers(input.familyId),
        getDailyAllocationForMember({
          familyId: input.familyId,
          giverMemberId: input.memberId,
          dayKey: input.dayKey,
        }),
      ]);

      const allocation =
        existingAllocation ??
        createDailyPointAllocation({
          id: `draft-${input.memberId}-${input.dayKey}`,
          familyId: input.familyId,
          dayKey: input.dayKey,
          giverMemberId: input.memberId,
        });

      return {
        allocation,
        members,
        allocatedPoints: getAllocatedPoints(allocation),
        remainingPoints: getRemainingDailyPoints(allocation),
      };
    });
}
