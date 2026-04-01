import {
  DAILY_POINT_BUDGET,
  getAllocatedPoints,
  getPointBalance,
  getRemainingDailyPoints,
  sortHistoryEvents,
  type DailyPointAllocation,
  type Family,
  type FamilyGoal,
  type HistoryEvent,
  type Member,
} from "@famigo/domain";
import { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";

import type { AppSessionGateway } from "./src/application";
import {
  createAsyncStorageAppSessionGateway,
  createBuyRewardUseCase,
  createCastGoalVoteUseCase,
  createClearSessionUseCase,
  createFinalizeDailyPointsUseCase,
  createGetFamiliesUseCase,
  createGetMembersForSelectedFamilyUseCase,
  createLoadDailyPointsUseCase,
  createLoadGoalsUseCase,
  createLoadHistoryUseCase,
  createLoadPendingPointsUseCase,
  createLoadShopUseCase,
  createLoginWithPinUseCase,
  createRestoreSessionUseCase,
  createSaveDailyPointsUseCase,
  createSelectFamilyUseCase,
  createStartMemberSessionUseCase,
} from "./src/application";
import { verifyMemberPin } from "./src/data/repositories/members.repository";
import {
  createInitialMockAppState,
  getCurrentMember,
  logout,
} from "./src/mock-state";
import {
  AppScreen,
  BottomTabs,
  InfoMessage,
  MemberBadge,
  MetricGrid,
  PinPad,
  PrimaryButton,
  ProgressBar,
  SecondaryButton,
  SectionCard,
  StatPill,
  StepperRow,
} from "./src/ui";

type MainTab = "home" | "points" | "shop" | "goals" | "history" | "profile";
type AuthStage = "loading" | "family" | "member" | "pin";

const tabs: ReadonlyArray<{ key: MainTab; label: string }> = [
  { key: "home", label: "Accueil" },
  { key: "points", label: "Points" },
  { key: "shop", label: "Boutique" },
  { key: "goals", label: "Objectifs" },
  { key: "history", label: "Historique" },
  { key: "profile", label: "Profil" },
];

export default function App() {
  const appSessionGatewayRef = useRef<AppSessionGateway>(createAsyncStorageAppSessionGateway());
  const getFamilies = useRef(createGetFamiliesUseCase()).current;
  const selectFamily = useRef(
    createSelectFamilyUseCase({ appSessionGateway: appSessionGatewayRef.current })
  ).current;
  const getMembersForSelectedFamily = useRef(
    createGetMembersForSelectedFamilyUseCase({ appSessionGateway: appSessionGatewayRef.current })
  ).current;
  const startMemberSession = useRef(
    createStartMemberSessionUseCase({ appSessionGateway: appSessionGatewayRef.current })
  ).current;
  const loginWithPin = useRef(
    createLoginWithPinUseCase({
      pinVerifier: {
        verify: verifyMemberPin,
      },
    })
  ).current;
  const loadShop = useRef(createLoadShopUseCase()).current;
  const buyReward = useRef(createBuyRewardUseCase()).current;
  const loadGoals = useRef(createLoadGoalsUseCase()).current;
  const loadHistory = useRef(createLoadHistoryUseCase()).current;
  const loadDailyPoints = useRef(createLoadDailyPointsUseCase()).current;
  const loadPendingPoints = useRef(createLoadPendingPointsUseCase()).current;
  const saveDailyPoints = useRef(createSaveDailyPointsUseCase()).current;
  const finalizeDailyPoints = useRef(createFinalizeDailyPointsUseCase()).current;
  const castGoalVote = useRef(createCastGoalVoteUseCase()).current;
  const restoreSession = useRef(
    createRestoreSessionUseCase({ appSessionGateway: appSessionGatewayRef.current })
  ).current;
  const clearSession = useRef(
    createClearSessionUseCase({ appSessionGateway: appSessionGatewayRef.current })
  ).current;

  const [appState, setAppState] = useState(createInitialMockAppState);
  const [authStage, setAuthStage] = useState<AuthStage>("loading");
  const [availableFamilies, setAvailableFamilies] = useState<ReadonlyArray<Family>>([]);
  const [availableMembers, setAvailableMembers] = useState<ReadonlyArray<Member>>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>("home");
  const [message, setMessage] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [isPointsBusy, setIsPointsBusy] = useState(false);
  const [loadedPointsSessionKey, setLoadedPointsSessionKey] = useState<string | null>(null);
  const [currentDailyAllocation, setCurrentDailyAllocation] = useState<DailyPointAllocation | null>(
    null
  );
  const [currentPendingPoints, setCurrentPendingPoints] = useState(0);
  const [isShopBusy, setIsShopBusy] = useState(false);
  const [loadedShopSessionKey, setLoadedShopSessionKey] = useState<string | null>(null);
  const [isGoalsBusy, setIsGoalsBusy] = useState(false);
  const [loadedGoalsSessionKey, setLoadedGoalsSessionKey] = useState<string | null>(null);
  const [isHistoryBusy, setIsHistoryBusy] = useState(false);
  const [loadedHistorySessionKey, setLoadedHistorySessionKey] = useState<string | null>(null);
  const [goalVoteCounts, setGoalVoteCounts] = useState<Record<string, number>>({});
  const [hasCurrentMemberVotedToday, setHasCurrentMemberVotedToday] = useState(false);

  const currentMember = useMemo(() => getCurrentMember(appState), [appState]);
  const selectedFamily =
    selectedFamilyId === null
      ? null
      : (availableFamilies.find((family) => family.id === selectedFamilyId) ?? null);
  const selectedMember =
    selectedMemberId === null
      ? null
      : (availableMembers.find((member) => member.id === selectedMemberId) ?? null);
  const currentSessionKey =
    currentMember !== null && selectedFamily !== null
      ? `${selectedFamily.id}:${currentMember.id}`
      : null;
  const currentPointsAllocation =
    currentMember !== null &&
    currentDailyAllocation !== null &&
    currentDailyAllocation.giverMemberId === currentMember.id &&
    currentDailyAllocation.dayKey === appState.currentDayKey
      ? currentDailyAllocation
      : null;
  const currentPointMetrics = useMemo(
    () => ({
      balance:
        currentMember === null ? 0 : getPointBalance(appState.ledgerEntries, currentMember.id),
      pending: currentMember === null ? 0 : currentPendingPoints,
      allocated: currentPointsAllocation === null ? 0 : getAllocatedPoints(currentPointsAllocation),
      remaining:
        currentMember === null
          ? 0
          : currentPointsAllocation === null
            ? DAILY_POINT_BUDGET
            : getRemainingDailyPoints(currentPointsAllocation),
    }),
    [appState.ledgerEntries, currentMember, currentPendingPoints, currentPointsAllocation]
  );
  const hasVotedToday = hasCurrentMemberVotedToday;
  const isPointsLoaded = currentSessionKey !== null && loadedPointsSessionKey === currentSessionKey;
  const isShopLoaded = currentSessionKey !== null && loadedShopSessionKey === currentSessionKey;
  const isGoalsLoaded = currentSessionKey !== null && loadedGoalsSessionKey === currentSessionKey;
  const isHistoryLoaded =
    currentSessionKey !== null && loadedHistorySessionKey === currentSessionKey;

  useEffect(() => {
    void bootstrapSessionFlow();
  }, []);

  useEffect(() => {
    if (
      activeTab !== "points" ||
      currentMember === null ||
      selectedFamily === null ||
      isPointsBusy ||
      isPointsLoaded
    ) {
      return;
    }

    void refreshPointsData(selectedFamily.id, currentMember.id);
  }, [activeTab, currentMember, selectedFamily, isPointsBusy, isPointsLoaded, appState.currentDayKey]);

  useEffect(() => {
    if (currentMember === null || selectedFamily === null) {
      setCurrentPendingPoints(0);
      return;
    }

    void refreshPendingPointsData(selectedFamily.id, currentMember.id);
  }, [currentSessionKey, currentMember, selectedFamily, appState.currentDayKey]);

  useEffect(() => {
    if (
      activeTab !== "shop" ||
      currentMember === null ||
      selectedFamily === null ||
      isShopBusy ||
      isShopLoaded
    ) {
      return;
    }

    void refreshShopData(selectedFamily.id, currentMember.id);
  }, [activeTab, currentMember, selectedFamily, isShopBusy, isShopLoaded]);

  useEffect(() => {
    if (
      activeTab !== "goals" ||
      currentMember === null ||
      selectedFamily === null ||
      isGoalsBusy ||
      isGoalsLoaded
    ) {
      return;
    }

    void refreshGoalsData(selectedFamily.id, currentMember.id);
  }, [activeTab, currentMember, selectedFamily, isGoalsBusy, isGoalsLoaded]);

  useEffect(() => {
    if (
      activeTab !== "history" ||
      currentMember === null ||
      selectedFamily === null ||
      isHistoryBusy ||
      isHistoryLoaded
    ) {
      return;
    }

    void refreshHistoryData(selectedFamily.id, currentMember.id);
  }, [activeTab, currentMember, selectedFamily, isHistoryBusy, isHistoryLoaded]);

  useEffect(() => {
    setCurrentDailyAllocation(null);
    setLoadedPointsSessionKey(null);
  }, [currentSessionKey, appState.currentDayKey]);

  useEffect(() => {
    setHasCurrentMemberVotedToday(false);
    setGoalVoteCounts({});
  }, [currentSessionKey]);

  useEffect(() => {
    setLoadedHistorySessionKey(null);
  }, [currentSessionKey]);

  function syncMockStateWithSelectedSession(
    family: Family,
    members: ReadonlyArray<Member>,
    memberId: string | null,
    startedAt = new Date().toISOString()
  ) {
    setAppState((previous) => ({
      ...previous,
      family,
      members: [...members],
      session:
        memberId === null
          ? null
          : {
              familyId: family.id,
              memberId,
              startedAt,
            },
    }));
  }

  async function refreshShopData(
    familyId: string,
    memberId: string,
    successMessage?: string
  ): Promise<boolean> {
    setIsShopBusy(true);

    const loadShopResult = await loadShop({ familyId, memberId });

    if (!loadShopResult.ok) {
      setIsShopBusy(false);
      setMessage(loadShopResult.error.message);
      return false;
    }

    setAppState((previous) => ({
      ...previous,
      shopItems: [...loadShopResult.data.items],
      ledgerEntries: [...loadShopResult.data.ledgerEntries],
    }));
    setLoadedShopSessionKey(`${familyId}:${memberId}`);
    setIsShopBusy(false);
    setMessage(successMessage ?? null);

    return true;
  }

  async function refreshPointsData(
    familyId: string,
    memberId: string,
    successMessage?: string
  ): Promise<boolean> {
    setIsPointsBusy(true);

    const loadDailyPointsResult = await loadDailyPoints({
      familyId,
      memberId,
      dayKey: appState.currentDayKey,
    });

    if (!loadDailyPointsResult.ok) {
      setIsPointsBusy(false);
      setMessage(loadDailyPointsResult.error.message);
      return false;
    }

    setCurrentDailyAllocation(loadDailyPointsResult.data.allocation);
    setLoadedPointsSessionKey(`${familyId}:${memberId}`);
    setAppState((previous) => ({
      ...previous,
      members: [...loadDailyPointsResult.data.members],
    }));
    setIsPointsBusy(false);
    setMessage(successMessage ?? null);

    return true;
  }

  async function refreshPendingPointsData(familyId: string, memberId: string): Promise<void> {
    const loadPendingPointsResult = await loadPendingPoints({
      familyId,
      memberId,
      dayKey: appState.currentDayKey,
    });

    if (!loadPendingPointsResult.ok) {
      return;
    }

    setCurrentPendingPoints(loadPendingPointsResult.data.pendingPoints);
  }

  async function handlePointAllocationChange(receiverMemberId: string, nextPoints: number) {
    if (selectedFamily === null || currentMember === null || currentPointsAllocation === null) {
      return;
    }

    setIsPointsBusy(true);
    setMessage(null);

    const remainingLines = currentPointsAllocation.lines.filter(
      (line) => line.receiverMemberId !== receiverMemberId
    );
    const nextLines =
      nextPoints > 0
        ? [...remainingLines, { receiverMemberId, points: nextPoints }]
        : remainingLines;

    const saveDailyPointsResult = await saveDailyPoints({
      familyId: selectedFamily.id,
      memberId: currentMember.id,
      dayKey: appState.currentDayKey,
      lines: nextLines,
    });

    if (!saveDailyPointsResult.ok) {
      setIsPointsBusy(false);
      setMessage(saveDailyPointsResult.error.message);
      return;
    }

    setCurrentDailyAllocation(saveDailyPointsResult.data.allocation);
    setLoadedPointsSessionKey(`${selectedFamily.id}:${currentMember.id}`);
    setIsPointsBusy(false);
  }

  async function handleFinalizeDailyPoints() {
    if (
      selectedFamily === null ||
      currentMember === null ||
      currentPointsAllocation === null ||
      currentPointsAllocation.status === "finalized"
    ) {
      return;
    }

    setIsPointsBusy(true);
    setMessage(null);

    const finalizeDailyPointsResult = await finalizeDailyPoints({
      allocationId: currentPointsAllocation.id,
      familyId: selectedFamily.id,
      memberId: currentMember.id,
      dayKey: appState.currentDayKey,
    });

    if (!finalizeDailyPointsResult.ok) {
      setIsPointsBusy(false);
      setMessage(finalizeDailyPointsResult.error.message);
      return;
    }

    setCurrentDailyAllocation(finalizeDailyPointsResult.data.allocation);
    setCurrentPendingPoints(finalizeDailyPointsResult.data.pendingPoints);
    setLoadedPointsSessionKey(`${selectedFamily.id}:${currentMember.id}`);
    setLoadedHistorySessionKey(null);
    setAppState((previous) => ({
      ...previous,
      ledgerEntries: [...finalizeDailyPointsResult.data.ledgerEntries],
    }));
    setIsPointsBusy(false);
    setMessage("Repartition finalisee pour aujourd'hui.");
  }

  async function handleShopPurchase(rewardId: string) {
    if (selectedFamily === null || currentMember === null) {
      return;
    }

    setIsShopBusy(true);
    setMessage(null);

    const buyRewardResult = await buyReward({
      familyId: selectedFamily.id,
      memberId: currentMember.id,
      rewardId,
      purchasedAt: new Date().toISOString(),
    });

    if (!buyRewardResult.ok) {
      setIsShopBusy(false);
      setMessage(buyRewardResult.error.message);
      return;
    }

    setAppState((previous) => ({
      ...previous,
      ledgerEntries: [
        ...previous.ledgerEntries.filter(
          (entry) => entry.id !== buyRewardResult.data.pointTransactionId
        ),
        {
          id: buyRewardResult.data.pointTransactionId,
          familyId: selectedFamily.id,
          memberId: currentMember.id,
          type: "shop_purchase",
          pointsDelta: -buyRewardResult.data.item.cost,
          occurredAt: buyRewardResult.data.purchasedAt,
          referenceId: buyRewardResult.data.purchaseId,
        },
      ],
      historyEvents: sortHistoryEvents([
        ...previous.historyEvents.filter(
          (event) => event.id !== buyRewardResult.data.auditEventId
        ),
        {
          id: buyRewardResult.data.auditEventId,
          familyId: selectedFamily.id,
          type: "shop_purchase_made",
          occurredAt: buyRewardResult.data.purchasedAt,
          actorMemberId: currentMember.id,
          metadata: {
            purchaseId: buyRewardResult.data.purchaseId,
            rewardId: buyRewardResult.data.item.id,
            rewardName: buyRewardResult.data.item.name,
            cost: buyRewardResult.data.item.cost,
          },
        },
      ]),
    }));

    await refreshShopData(
      selectedFamily.id,
      currentMember.id,
      `${buyRewardResult.data.item.name} achete avec succes.`
    );
  }

  async function refreshGoalsData(
    familyId: string,
    memberId: string,
    successMessage?: string
  ): Promise<boolean> {
    setIsGoalsBusy(true);

    const loadGoalsResult = await loadGoals({
      familyId,
      memberId,
      dayKey: appState.currentDayKey,
    });

    if (!loadGoalsResult.ok) {
      setIsGoalsBusy(false);
      setMessage(loadGoalsResult.error.message);
      return false;
    }

    setAppState((previous) => ({
      ...previous,
      goals: [...loadGoalsResult.data.goals],
    }));
    setGoalVoteCounts({ ...loadGoalsResult.data.voteCountsByGoalId });
    setHasCurrentMemberVotedToday(loadGoalsResult.data.hasMemberVotedToday);
    setLoadedGoalsSessionKey(`${familyId}:${memberId}`);
    setIsGoalsBusy(false);
    setMessage(successMessage ?? null);

    return true;
  }

  async function refreshHistoryData(
    familyId: string,
    memberId: string,
    successMessage?: string
  ): Promise<boolean> {
    setIsHistoryBusy(true);

    const loadHistoryResult = await loadHistory({ familyId });

    if (!loadHistoryResult.ok) {
      setIsHistoryBusy(false);
      setMessage(loadHistoryResult.error.message);
      return false;
    }

    setAppState((previous) => ({
      ...previous,
      historyEvents: [...loadHistoryResult.data.events],
    }));
    setLoadedHistorySessionKey(`${familyId}:${memberId}`);
    setIsHistoryBusy(false);
    setMessage(successMessage ?? null);

    return true;
  }

  async function handleGoalVote(goalId: string) {
    if (selectedFamily === null || currentMember === null) {
      return;
    }

    setIsGoalsBusy(true);
    setMessage(null);

    const createdAt = new Date().toISOString();
    const castGoalVoteResult = await castGoalVote({
      familyId: selectedFamily.id,
      memberId: currentMember.id,
      goalId,
      dayKey: appState.currentDayKey,
      createdAt,
    });

    if (!castGoalVoteResult.ok) {
      setIsGoalsBusy(false);
      setMessage(castGoalVoteResult.error.message);
      return;
    }

    setAppState((previous) => ({
      ...previous,
      goals: previous.goals.map((candidate) =>
        candidate.id === castGoalVoteResult.data.goal.id ? castGoalVoteResult.data.goal : candidate
      ),
      historyEvents: sortHistoryEvents([
        ...previous.historyEvents.filter(
          (event) =>
            event.id !== castGoalVoteResult.data.voteAuditEventId &&
            event.id !== castGoalVoteResult.data.goalReachedAuditEventId
        ),
        {
          id: castGoalVoteResult.data.voteAuditEventId,
          familyId: selectedFamily.id,
          type: "goal_vote_recorded",
          occurredAt: createdAt,
          actorMemberId: currentMember.id,
          metadata: {
            goalId,
            dayKey: appState.currentDayKey,
          },
        },
        ...(castGoalVoteResult.data.goalReachedAuditEventId === null
          ? []
          : [
              {
                id: castGoalVoteResult.data.goalReachedAuditEventId,
                familyId: selectedFamily.id,
                type: "goal_reached" as const,
                occurredAt: createdAt,
                actorMemberId: currentMember.id,
                metadata: {
                  goalId,
                  targetVoteCount: castGoalVoteResult.data.goal.targetVoteCount,
                },
              },
            ]),
      ]),
    }));
    setGoalVoteCounts((previous) => ({
      ...previous,
      [goalId]: castGoalVoteResult.data.totalVotes,
    }));
    setHasCurrentMemberVotedToday(true);

    await refreshGoalsData(
      selectedFamily.id,
      currentMember.id,
      castGoalVoteResult.data.reachedTarget
        ? "Vote enregistre. Objectif atteint."
        : "Vote enregistre."
    );
  }

  async function bootstrapSessionFlow() {
    setIsAuthBusy(true);

    const [familiesResult, restoreResult] = await Promise.all([getFamilies(), restoreSession()]);

    if (!familiesResult.ok) {
      setAvailableFamilies([]);
      setAuthStage("family");
      setIsAuthBusy(false);
      setMessage(familiesResult.error.message);
      return;
    }

    setAvailableFamilies(familiesResult.data.families);

    if (!restoreResult.ok) {
      setAuthStage("family");
      setIsAuthBusy(false);
      setMessage(restoreResult.error.message);
      return;
    }

    const restoredFamily = restoreResult.data.family;
    const restoredMember = restoreResult.data.member;

    if (restoredFamily === null) {
      setSelectedFamilyId(null);
      setSelectedMemberId(null);
      setAvailableMembers([]);
      setAuthStage("family");
      setIsAuthBusy(false);
      return;
    }

    setSelectedFamilyId(restoredFamily.id);

    const membersResult = await getMembersForSelectedFamily();

    if (!membersResult.ok) {
      setAvailableMembers([]);
      setSelectedMemberId(null);
      setAuthStage("family");
      setIsAuthBusy(false);
      setMessage(membersResult.error.message);
      return;
    }

    setAvailableMembers(membersResult.data.members);

    if (restoredMember === null) {
      syncMockStateWithSelectedSession(restoredFamily, membersResult.data.members, null);
      setSelectedMemberId(null);
      setPinInput("");
      setAuthStage("member");
      setIsAuthBusy(false);
      return;
    }

    syncMockStateWithSelectedSession(restoredFamily, membersResult.data.members, null);
    setSelectedMemberId(restoredMember.id);
    setPinInput("");
    setAuthStage("pin");
    setIsAuthBusy(false);
  }

  async function handleFamilySelection(familyId: string) {
    setIsAuthBusy(true);
    setMessage(null);

    const familyResult = await selectFamily({ familyId });

    if (!familyResult.ok) {
      setIsAuthBusy(false);
      setMessage(familyResult.error.message);
      return;
    }

    const membersResult = await getMembersForSelectedFamily();

    if (!membersResult.ok) {
      setIsAuthBusy(false);
      setMessage(membersResult.error.message);
      return;
    }

    setSelectedFamilyId(familyResult.data.family.id);
    setSelectedMemberId(null);
    setAvailableMembers(membersResult.data.members);
    setPinInput("");
    syncMockStateWithSelectedSession(familyResult.data.family, membersResult.data.members, null);
    setAuthStage("member");
    setIsAuthBusy(false);
  }

  async function handleMemberSessionStart() {
    if (selectedMemberId === null || selectedFamily === null) {
      return;
    }

    setIsAuthBusy(true);
    setMessage(null);

    const sessionResult = await startMemberSession({ memberId: selectedMemberId });

    if (!sessionResult.ok) {
      setIsAuthBusy(false);
      setMessage(sessionResult.error.message);
      return;
    }

    syncMockStateWithSelectedSession(selectedFamily, availableMembers, null);
    setPinInput("");
    setAuthStage("pin");
    setIsAuthBusy(false);
  }

  function handlePinDigitPress(digit: string) {
    setMessage(null);
    setPinInput((currentValue) => {
      if (currentValue.length >= 4) {
        return currentValue;
      }

      return `${currentValue}${digit}`;
    });
  }

  function handlePinBackspace() {
    setMessage(null);
    setPinInput((currentValue) => currentValue.slice(0, -1));
  }

  async function handlePinSubmit() {
    if (selectedFamily === null || selectedMemberId === null) {
      return;
    }

    setIsAuthBusy(true);
    setMessage(null);

    const loginResult = await loginWithPin({
      familyId: selectedFamily.id,
      memberId: selectedMemberId,
      pin: pinInput,
      now: new Date().toISOString(),
      historyEventId: `member-session-${Date.now()}`,
    });

    if (!loginResult.ok) {
      setIsAuthBusy(false);
      setMessage(loginResult.error.message);
      return;
    }

    syncMockStateWithSelectedSession(
      selectedFamily,
      availableMembers,
      loginResult.data.session.memberId,
      loginResult.data.session.startedAt
    );
    setPinInput("");
    setActiveTab("home");
    setIsAuthBusy(false);
  }

  async function handleChangeSelectedMember() {
    if (selectedFamilyId === null) {
      return;
    }

    setIsAuthBusy(true);
    setMessage(null);

    const familyResult = await selectFamily({ familyId: selectedFamilyId });

    if (!familyResult.ok) {
      setIsAuthBusy(false);
      setMessage(familyResult.error.message);
      return;
    }

    setSelectedMemberId(null);
    setPinInput("");
    syncMockStateWithSelectedSession(familyResult.data.family, availableMembers, null);
    setAuthStage("member");
    setIsAuthBusy(false);
  }

  async function handleLogout() {
    await clearSession();
    setAppState((previous) => logout(previous));
    setAvailableMembers([]);
    setSelectedFamilyId(null);
    setSelectedMemberId(null);
    setCurrentDailyAllocation(null);
    setCurrentPendingPoints(0);
    setLoadedPointsSessionKey(null);
    setLoadedShopSessionKey(null);
    setLoadedGoalsSessionKey(null);
    setLoadedHistorySessionKey(null);
    setGoalVoteCounts({});
    setHasCurrentMemberVotedToday(false);
    setPinInput("");
    setAuthStage("family");
    setActiveTab("home");
    setMessage(null);
  }

  function renderLoggedOut() {
    if (authStage === "loading") {
      return (
        <AppScreen title="Famigo" subtitle="Restauration du contexte de session.">
          <SectionCard subtitle="Chargement en cours..." />
        </AppScreen>
      );
    }

    if (authStage === "family") {
      return (
        <AppScreen title="Famigo" subtitle="Selectionnez une famille pour commencer.">
          {message ? <InfoMessage tone="error">{message}</InfoMessage> : null}
          <SectionCard title="Familles disponibles">
            {availableFamilies.map((family) => (
              <SecondaryButton
                key={family.id}
                label={selectedFamilyId === family.id ? `${family.name} (selectionnee)` : family.name}
                onPress={() => void handleFamilySelection(family.id)}
                disabled={isAuthBusy}
              />
            ))}
            {availableFamilies.length === 0 ? (
              <Text style={styles.helperText}>Aucune famille disponible pour le moment.</Text>
            ) : null}
          </SectionCard>
        </AppScreen>
      );
    }

    if (authStage === "pin") {
      return (
        <AppScreen
          title="Entrer le PIN"
          subtitle={
            selectedMember
              ? `Saisissez le PIN a 4 chiffres de ${selectedMember.displayName}.`
              : "Saisissez le PIN du membre selectionne."
          }
        >
          {message ? <InfoMessage tone="error">{message}</InfoMessage> : null}
          <SectionCard
            title={selectedMember ? selectedMember.displayName : "Membre selectionne"}
            subtitle="Le membre a deja ete choisi. Il ne reste qu'a valider le PIN."
          >
            <PinPad
              value={pinInput}
              onDigitPress={handlePinDigitPress}
              onBackspace={handlePinBackspace}
            />
            <PrimaryButton
              label={isAuthBusy ? "Verification..." : "Ouvrir la session"}
              onPress={() => void handlePinSubmit()}
              disabled={pinInput.length !== 4 || isAuthBusy}
            />
            <SecondaryButton
              label="Changer de membre"
              onPress={() => void handleChangeSelectedMember()}
              disabled={isAuthBusy}
            />
            <SecondaryButton
              label="Changer de famille"
              onPress={() => {
                setAvailableMembers([]);
                setSelectedFamilyId(null);
                setSelectedMemberId(null);
                setPinInput("");
                setAuthStage("family");
                setMessage(null);
                void clearSession();
              }}
              disabled={isAuthBusy}
            />
          </SectionCard>
        </AppScreen>
      );
    }

    return (
      <AppScreen
        title="Choisir un membre"
        subtitle={
          selectedFamily
            ? `Profils disponibles dans ${selectedFamily.name}`
            : "Selectionnez un membre de la famille."
        }
      >
        {message ? <InfoMessage tone="error">{message}</InfoMessage> : null}
        <SectionCard title="Qui se connecte ?">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.memberCarousel}>
              {availableMembers.map((member) => (
                <MemberBadge
                  key={member.id}
                  name={member.displayName}
                  roleLabel={member.role === "parent" ? "Parent" : "Enfant"}
                  selected={selectedMemberId === member.id}
                  onPress={() => setSelectedMemberId(member.id)}
                />
              ))}
            </View>
          </ScrollView>
          <PrimaryButton
            label={isAuthBusy ? "Preparation..." : "Continuer"}
            onPress={() => void handleMemberSessionStart()}
            disabled={selectedMemberId === null || isAuthBusy}
          />
          <SecondaryButton
            label="Changer de famille"
            onPress={() => {
              setAvailableMembers([]);
              setSelectedFamilyId(null);
              setSelectedMemberId(null);
              setAuthStage("family");
              setMessage(null);
              void clearSession();
            }}
            disabled={isAuthBusy}
          />
          {selectedMember !== null ? (
            <SectionCard
              subtitle={`${selectedMember.displayName} est selectionne. La saisie du PIN sera demandee a l'etape suivante.`}
            />
          ) : null}
        </SectionCard>
      </AppScreen>
    );
  }

  function renderHome(member: Member) {
    return (
      <AppScreen
        title={`Bonjour ${member.displayName}`}
        subtitle={`Journee en cours : ${appState.currentDayKey}`}
      >
        {message ? (
          <InfoMessage
            tone={
              message.includes("introuvable") ||
              message.includes("invalide") ||
              message.includes("insuffisant") ||
              message.includes("peut")
                ? "error"
                : "info"
            }
          >
            {message}
          </InfoMessage>
        ) : null}
        <SectionCard
          title="Vue rapide"
          subtitle="Les points en attente ne sont pas encore dans le solde reel."
        >
          <MetricGrid>
            <StatPill label="Solde reel" value={`${currentPointMetrics.balance} pts`} />
            <StatPill label="Points en attente" value={`${currentPointMetrics.pending} pts`} />
            <StatPill
              label="Restant a distribuer"
              value={`${currentPointMetrics.remaining} pts`}
            />
            <StatPill label="Vote du jour" value={hasVotedToday ? "fait" : "a faire"} />
          </MetricGrid>
        </SectionCard>
        <SectionCard title="Raccourcis">
          <PrimaryButton label="Attribuer mes points" onPress={() => setActiveTab("points")} />
          <PrimaryButton label="Voir la boutique" onPress={() => setActiveTab("shop")} />
          <PrimaryButton label="Voter pour un objectif" onPress={() => setActiveTab("goals")} />
        </SectionCard>
      </AppScreen>
    );
  }

  function renderPoints(member: Member) {
    const others = appState.members.filter((candidate) => candidate.id !== member.id);

    return (
      <AppScreen
        title="Attribution des points"
        subtitle="Chaque membre dispose de 5 points par jour a repartir aux autres."
      >
        <SectionCard
          title="Mes reperes du jour"
          subtitle="Le solde reel est distinct des points en attente tant que la journee n'est pas finalisee."
        >
          <MetricGrid>
            <StatPill label="Solde reel" value={`${currentPointMetrics.balance} pts`} />
            <StatPill label="Points en attente" value={`${currentPointMetrics.pending} pts`} />
            <StatPill label="Deja alloues" value={`${currentPointMetrics.allocated} pts`} />
            <StatPill
              label="Restant a distribuer"
              value={`${currentPointMetrics.remaining} pts`}
            />
            <StatPill
              label="Statut"
              value={currentPointsAllocation?.status === "finalized" ? "finalise" : "brouillon"}
            />
          </MetricGrid>
        </SectionCard>
        {!isPointsLoaded ? (
          <SectionCard
            subtitle={
              isPointsBusy
                ? "Chargement de votre repartition du jour..."
                : "Ouverture de la repartition..."
            }
          />
        ) : null}
        <SectionCard title="Repartir mes points">
          {others.map((other) => {
            const currentValue =
              currentPointsAllocation?.lines.find((line) => line.receiverMemberId === other.id)
                ?.points ?? 0;

            return (
              <StepperRow
                key={other.id}
                title={other.displayName}
                subtitle={other.role === "parent" ? "Parent" : "Enfant"}
                value={currentValue}
                onDecrease={() =>
                  void handlePointAllocationChange(other.id, Math.max(currentValue - 1, 0))
                }
                onIncrease={() => void handlePointAllocationChange(other.id, currentValue + 1)}
                canDecrease={
                  isPointsLoaded &&
                  !isPointsBusy &&
                  currentPointsAllocation?.status !== "finalized" &&
                  currentValue > 0
                }
                canIncrease={
                  isPointsLoaded &&
                  !isPointsBusy &&
                  currentPointsAllocation?.status !== "finalized" &&
                  currentPointMetrics.remaining > 0
                }
              />
            );
          })}
          {isPointsLoaded && others.length === 0 ? (
            <Text style={styles.helperText}>Aucun autre membre disponible pour recevoir des points.</Text>
          ) : null}
        </SectionCard>
        <SectionCard subtitle="La finalisation applique immediatement les gains via la RPC metier.">
          <PrimaryButton
            label={
              isPointsBusy
                ? "Finalisation..."
                : currentPointsAllocation?.status === "finalized"
                  ? "Journee finalisee"
                  : "Finaliser ma journee"
            }
            onPress={() => void handleFinalizeDailyPoints()}
            disabled={
              !isPointsLoaded ||
              isPointsBusy ||
              currentPointsAllocation === null ||
              currentPointsAllocation.status === "finalized"
            }
          />
          <Text style={styles.helperText}>
            Etat actuel :{" "}
            {currentPointsAllocation?.status === "finalized"
              ? "allocation finalisee"
              : "reallocation possible"}
          </Text>
        </SectionCard>
      </AppScreen>
    );
  }

  function renderShop(member: Member) {
    return (
      <AppScreen title="Boutique" subtitle="Les achats debitent immediatement le solde reel.">
        <SectionCard title="Mon solde disponible">
          <StatPill label="Solde reel" value={`${currentPointMetrics.balance} pts`} />
        </SectionCard>
        {!isShopLoaded ? (
          <SectionCard subtitle={isShopBusy ? "Chargement de la boutique..." : "Ouverture de la boutique..."} />
        ) : null}
        {appState.shopItems.map((item) => (
          <SectionCard key={item.id} title={item.name} subtitle={`Cout : ${item.cost} points`}>
            <PrimaryButton
              label={
                isShopBusy
                  ? "Traitement..."
                  : currentPointMetrics.balance >= item.cost
                    ? "Acheter"
                    : "Solde insuffisant"
              }
              onPress={() => void handleShopPurchase(item.id)}
              disabled={currentPointMetrics.balance < item.cost || isShopBusy}
            />
          </SectionCard>
        ))}
        {isShopLoaded && appState.shopItems.length === 0 ? (
          <SectionCard subtitle="Aucun cadeau disponible pour cette famille." />
        ) : null}
      </AppScreen>
    );
  }

  function renderGoals(member: Member) {
    const isParent = member.role === "parent";

    return (
      <AppScreen title="Objectifs famille" subtitle="Un seul vote par jour et par membre.">
        {isParent ? (
          <SectionCard subtitle="La creation d'objectif n'est pas encore branchee dans cette tranche." />
        ) : null}
        {!isGoalsLoaded ? (
          <SectionCard subtitle={isGoalsBusy ? "Chargement des objectifs..." : "Ouverture des objectifs..."} />
        ) : null}
        {appState.goals.map((goal) => {
          const voteCount =
            goalVoteCounts[goal.id] ?? (goal.status === "promised" ? goal.targetVoteCount : 0);
          const progress = voteCount / goal.targetVoteCount;
          const canVote = !hasVotedToday && goal.status === "active";

          return (
            <SectionCard
              key={goal.id}
              title={goal.title}
              subtitle={`Objectif ${voteCount}/${goal.targetVoteCount} - ${goal.status === "promised" ? "promesse a realiser" : "actif"}`}
            >
              <ProgressBar progress={progress} />
              <PrimaryButton
                label={
                  goal.status === "promised"
                    ? "Deja atteint"
                    : hasVotedToday
                      ? "Vote deja utilise aujourd'hui"
                      : "Voter pour cet objectif"
                }
                onPress={() => void handleGoalVote(goal.id)}
                disabled={!canVote || isGoalsBusy}
              />
            </SectionCard>
          );
        })}
        {isGoalsLoaded && appState.goals.length === 0 ? (
          <SectionCard subtitle="Aucun objectif disponible pour cette famille." />
        ) : null}
      </AppScreen>
    );
  }

  function renderHistory() {
    return (
      <AppScreen title="Historique" subtitle="Visible par tous les membres de la famille.">
        {!isHistoryLoaded ? (
          <SectionCard
            subtitle={
              isHistoryBusy ? "Chargement de l'historique partage..." : "Ouverture de l'historique..."
            }
          />
        ) : null}
        {appState.historyEvents.map((event) => (
          <SectionCard
            key={event.id}
            title={formatHistoryTitle(event, appState.members, appState.goals)}
            subtitle={new Date(event.occurredAt).toLocaleString("fr-FR")}
          >
            <Text style={styles.helperText}>{formatHistorySubtitle(event)}</Text>
          </SectionCard>
        ))}
      </AppScreen>
    );
  }

  function renderProfile(member: Member) {
    return (
      <AppScreen title="Profil" subtitle="Synthese locale du membre connecte.">
        <SectionCard
          title={member.displayName}
          subtitle={`${member.role === "parent" ? "Parent" : "Enfant"} - les points en attente ne sont pas encore disponibles en boutique.`}
        >
          <MetricGrid>
            <StatPill label="Solde reel" value={`${currentPointMetrics.balance} pts`} />
            <StatPill label="Points en attente" value={`${currentPointMetrics.pending} pts`} />
            <StatPill label="Deja alloues" value={`${currentPointMetrics.allocated} pts`} />
            <StatPill
              label="Restant a distribuer"
              value={`${currentPointMetrics.remaining} pts`}
            />
          </MetricGrid>
        </SectionCard>
        <SectionCard title="Session">
          <Text style={styles.helperText}>Famille : {appState.family.name}</Text>
          <Text style={styles.helperText}>Journee : {appState.currentDayKey}</Text>
        </SectionCard>
        <PrimaryButton label="Se deconnecter" onPress={() => void handleLogout()} />
      </AppScreen>
    );
  }

  function renderMain(member: Member) {
    return (
      <>
        <View style={styles.mainContent}>
          {activeTab === "home" ? renderHome(member) : null}
          {activeTab === "points" ? renderPoints(member) : null}
          {activeTab === "shop" ? renderShop(member) : null}
          {activeTab === "goals" ? renderGoals(member) : null}
          {activeTab === "history" ? renderHistory() : null}
          {activeTab === "profile" ? renderProfile(member) : null}
        </View>
        <BottomTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {currentMember ? renderMain(currentMember) : renderLoggedOut()}
    </SafeAreaView>
  );
}

function formatHistoryTitle(
  event: HistoryEvent,
  members: ReadonlyArray<Member>,
  goals: ReadonlyArray<FamilyGoal>
): string {
  const actor = members.find((member) => member.id === event.actorMemberId)?.displayName;
  const goalTitle = goals.find((goal) => goal.id === String(event.metadata.goalId))?.title;

  switch (event.type) {
    case "member_session_started":
      return `${actor ?? "Un membre"} s'est connecte`;
    case "points_given":
      return `${actor ?? "Quelqu'un"} a finalise sa repartition de points`;
    case "shop_purchase_made":
      return `${actor ?? "Un membre"} a achete un cadeau`;
    case "goal_vote_recorded":
      return `${actor ?? "Un membre"} a vote pour ${goalTitle ?? "un objectif"}`;
    case "goal_reached":
      return `${goalTitle ?? "Un objectif"} a ete atteint`;
    default:
      return "Evenement";
  }
}

function formatHistorySubtitle(event: HistoryEvent): string {
  switch (event.type) {
    case "shop_purchase_made":
      return `Cout : ${event.metadata.cost} points`;
    case "goal_reached":
      return "Objectif passe en promesse a realiser.";
    case "goal_vote_recorded":
      return "Vote du jour enregistre.";
    case "points_given":
      return typeof event.metadata.dayKey === "string"
        ? `Repartition finalisee pour la journee du ${event.metadata.dayKey}.`
        : "Repartition de points finalisee.";
    case "member_session_started":
      return "Session locale demarree sur cet appareil.";
    default:
      return "";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  memberCarousel: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 6,
  },
  mainContent: {
    flex: 1,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
  },
});
