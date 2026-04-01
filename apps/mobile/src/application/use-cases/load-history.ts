import { sortHistoryEvents, type HistoryEvent } from "@famigo/domain";

import { getAuditEvents as getAuditEventsRepository } from "../../data/repositories/audit_events.repository";
import { executeUseCase, type UseCaseResult } from "../result";

export interface LoadHistoryInput {
  familyId: string;
}

export interface LoadHistoryData {
  events: ReadonlyArray<HistoryEvent>;
}

export interface LoadHistoryDependencies {
  getAuditEvents?: typeof getAuditEventsRepository;
}

export function createLoadHistoryUseCase(dependencies: LoadHistoryDependencies = {}) {
  const { getAuditEvents = getAuditEventsRepository } = dependencies;

  return (input: LoadHistoryInput): Promise<UseCaseResult<LoadHistoryData>> =>
    executeUseCase(async () => {
      const auditEvents = await getAuditEvents(input.familyId);
      const events = auditEvents
        .filter((event) => event.type !== "member_session_started")
        .map<HistoryEvent>((event) => ({
          id: event.id,
          familyId: event.familyId,
          type: event.type,
          occurredAt: event.occurredAt,
          actorMemberId: event.actorMemberId,
          subjectMemberId: event.subjectMemberId,
          metadata: event.metadata,
        }));

      return {
        events: sortHistoryEvents(events),
      };
    });
}
