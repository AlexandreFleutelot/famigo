import type { AppSessionGateway } from "./ports";

export interface AppSessionContext {
  selectedFamilyId: string | null;
  selectedMemberId: string | null;
}

export const EMPTY_APP_SESSION_CONTEXT: AppSessionContext = {
  selectedFamilyId: null,
  selectedMemberId: null,
};

export function createMemoryAppSessionGateway(
  initialSession: AppSessionContext | null = null
): AppSessionGateway {
  let currentSession = initialSession;

  return {
    async read() {
      return currentSession;
    },

    async save(session) {
      currentSession = { ...session };
    },

    async clear() {
      currentSession = null;
    },
  };
}
