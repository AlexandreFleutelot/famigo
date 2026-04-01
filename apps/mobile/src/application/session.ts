import AsyncStorage from "@react-native-async-storage/async-storage";

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

const APP_SESSION_STORAGE_KEY = "famigo/app-session";

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

function isAppSessionContext(value: unknown): value is AppSessionContext {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const session = value as Record<string, unknown>;

  const hasValidFamilyId =
    session.selectedFamilyId === null || typeof session.selectedFamilyId === "string";
  const hasValidMemberId =
    session.selectedMemberId === null || typeof session.selectedMemberId === "string";

  return hasValidFamilyId && hasValidMemberId;
}

export function createAsyncStorageAppSessionGateway(): AppSessionGateway {
  return {
    async read() {
      const serializedSession = await AsyncStorage.getItem(APP_SESSION_STORAGE_KEY);

      if (serializedSession === null) {
        return null;
      }

      try {
        const parsedSession = JSON.parse(serializedSession);

        if (!isAppSessionContext(parsedSession)) {
          await AsyncStorage.removeItem(APP_SESSION_STORAGE_KEY);
          return null;
        }

        return parsedSession;
      } catch {
        await AsyncStorage.removeItem(APP_SESSION_STORAGE_KEY);
        return null;
      }
    },

    async save(session) {
      await AsyncStorage.setItem(APP_SESSION_STORAGE_KEY, JSON.stringify(session));
    },

    async clear() {
      await AsyncStorage.removeItem(APP_SESSION_STORAGE_KEY);
    },
  };
}
