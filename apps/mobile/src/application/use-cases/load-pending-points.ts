import { getPendingPointsForMember as getPendingPointsForMemberRepository } from "../../data/repositories/daily_point_allocations.repository";
import { executeUseCase, type UseCaseResult } from "../result";

export interface LoadPendingPointsInput {
  familyId: string;
  memberId: string;
  dayKey: string;
}

export interface LoadPendingPointsData {
  pendingPoints: number;
}

export interface LoadPendingPointsDependencies {
  getPendingPointsForMember?: typeof getPendingPointsForMemberRepository;
}

export function createLoadPendingPointsUseCase(dependencies: LoadPendingPointsDependencies = {}) {
  const {
    getPendingPointsForMember = getPendingPointsForMemberRepository,
  } = dependencies;

  return (input: LoadPendingPointsInput): Promise<UseCaseResult<LoadPendingPointsData>> =>
    executeUseCase(async () => ({
      pendingPoints: await getPendingPointsForMember({
        familyId: input.familyId,
        memberId: input.memberId,
        dayKey: input.dayKey,
      }),
    }));
}
