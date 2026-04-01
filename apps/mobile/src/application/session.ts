export interface AppSessionContext {
  selectedFamilyId: string | null;
  selectedMemberId: string | null;
}

export interface AppSessionGateway {
  read(): Promise<AppSessionContext | null>;
  save(session: AppSessionContext): Promise<void>;
  clear(): Promise<void>;
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
