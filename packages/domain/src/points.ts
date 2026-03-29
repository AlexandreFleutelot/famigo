import { assertDomain } from "./errors";
import type {
  DailyPointAllocation,
  DailyPointAllocationLine,
  HistoryEvent,
  PointLedgerEntry,
} from "./types";
import { DAILY_POINT_BUDGET } from "./types";

export interface CreateDailyPointAllocationInput {
  id: string;
  familyId: string;
  dayKey: string;
  giverMemberId: string;
}

export interface FinalizeDailyPointAllocationInput {
  allocation: DailyPointAllocation;
  finalizedAt: string;
  ledgerEntryIds: ReadonlyArray<string>;
  historyEventIds: ReadonlyArray<string>;
}

export interface FinalizeDailyPointAllocationResult {
  allocation: DailyPointAllocation;
  ledgerEntries: ReadonlyArray<PointLedgerEntry>;
  historyEvents: ReadonlyArray<HistoryEvent>;
  unallocatedPointsExpired: number;
}

export function createDailyPointAllocation(
  input: CreateDailyPointAllocationInput
): DailyPointAllocation {
  return {
    id: input.id,
    familyId: input.familyId,
    dayKey: input.dayKey,
    giverMemberId: input.giverMemberId,
    status: "draft",
    lines: [],
  };
}

export function replaceDailyPointAllocationLines(
  allocation: DailyPointAllocation,
  lines: ReadonlyArray<DailyPointAllocationLine>
): DailyPointAllocation {
  assertDomain(
    allocation.status === "draft",
    "ALLOCATION_ALREADY_FINALIZED",
    "Une allocation finalisee ne peut plus etre modifiee."
  );

  const normalizedLines = normalizeAllocationLines(allocation.giverMemberId, lines);

  return {
    ...allocation,
    lines: normalizedLines,
  };
}

export function getAllocatedPoints(allocation: DailyPointAllocation): number {
  return allocation.lines.reduce((sum, line) => sum + line.points, 0);
}

export function getRemainingDailyPoints(allocation: DailyPointAllocation): number {
  return DAILY_POINT_BUDGET - getAllocatedPoints(allocation);
}

export function finalizeDailyPointAllocation(
  input: FinalizeDailyPointAllocationInput
): FinalizeDailyPointAllocationResult {
  assertDomain(
    input.allocation.status === "draft",
    "ALLOCATION_ALREADY_FINALIZED",
    "L'allocation de la journee est deja finalisee."
  );

  const lines = normalizeAllocationLines(input.allocation.giverMemberId, input.allocation.lines);
  assertDomain(
    input.ledgerEntryIds.length >= lines.length,
    "MISSING_LEDGER_ENTRY_IDS",
    "Un identifiant de mouvement est requis pour chaque beneficiaire."
  );
  assertDomain(
    input.historyEventIds.length >= lines.length,
    "MISSING_HISTORY_EVENT_IDS",
    "Un identifiant d'historique est requis pour chaque ligne finalisee."
  );

  const allocation: DailyPointAllocation = {
    ...input.allocation,
    lines,
    status: "finalized",
    finalizedAt: input.finalizedAt,
  };

  const ledgerEntries = lines.map<PointLedgerEntry>((line, index) => ({
    id: input.ledgerEntryIds[index],
    familyId: allocation.familyId,
    memberId: line.receiverMemberId,
    type: "daily_points_received",
    pointsDelta: line.points,
    occurredAt: input.finalizedAt,
    dayKey: allocation.dayKey,
    referenceId: allocation.id,
  }));

  const historyEvents = lines.map<HistoryEvent>((line, index) => ({
    id: input.historyEventIds[index],
    familyId: allocation.familyId,
    type: "points_given",
    occurredAt: input.finalizedAt,
    actorMemberId: allocation.giverMemberId,
    subjectMemberId: line.receiverMemberId,
    metadata: {
      allocationId: allocation.id,
      dayKey: allocation.dayKey,
      points: line.points,
    },
  }));

  return {
    allocation,
    ledgerEntries,
    historyEvents,
    unallocatedPointsExpired: getRemainingDailyPoints(allocation),
  };
}

function normalizeAllocationLines(
  giverMemberId: string,
  lines: ReadonlyArray<DailyPointAllocationLine>
): ReadonlyArray<DailyPointAllocationLine> {
  const pointsByReceiver = new Map<string, number>();

  for (const line of lines) {
    assertDomain(
      Number.isInteger(line.points) && line.points >= 0,
      "INVALID_POINT_VALUE",
      "Chaque ligne d'allocation doit contenir un nombre entier positif ou nul."
    );
    assertDomain(
      line.receiverMemberId !== giverMemberId,
      "SELF_ALLOCATION_FORBIDDEN",
      "Un membre ne peut pas s'attribuer des points a lui-meme."
    );

    if (line.points === 0) {
      continue;
    }

    pointsByReceiver.set(
      line.receiverMemberId,
      (pointsByReceiver.get(line.receiverMemberId) ?? 0) + line.points
    );
  }

  const normalizedLines = Array.from(pointsByReceiver.entries()).map(([receiverMemberId, points]) => ({
    receiverMemberId,
    points,
  }));

  const total = normalizedLines.reduce((sum, line) => sum + line.points, 0);
  assertDomain(
    total <= DAILY_POINT_BUDGET,
    "DAILY_BUDGET_EXCEEDED",
    "Le budget quotidien de 5 points ne peut pas etre depasse."
  );

  return normalizedLines;
}
