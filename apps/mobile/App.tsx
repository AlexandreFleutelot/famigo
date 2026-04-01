import { sortHistoryEvents, type Family, type FamilyGoal, type HistoryEvent, type Member } from "@famigo/domain";
import { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";

import type { AppSessionGateway } from "./src/application";
import {
  createAsyncStorageAppSessionGateway,
  createBuyRewardUseCase,
  createCastGoalVoteUseCase,
  createClearSessionUseCase,
  createGetFamiliesUseCase,
  createGetMembersForSelectedFamilyUseCase,
  createLoadGoalsUseCase,
  createLoadShopUseCase,
  createLoginWithPinUseCase,
  createRestoreSessionUseCase,
  createSelectFamilyUseCase,
  createStartMemberSessionUseCase,
} from "./src/application";
import { verifyMemberPin } from "./src/data/repositories/members.repository";
import {
  createInitialMockAppState,
  getAllocatedPointsForReceiver,
  getAllocationForMember,
  getCurrentMember,
  getPendingPointsForMember,
  getRemainingBudgetForMember,
  logout,
  simulateEndOfDay,
  updatePointAllocation,
} from "./src/mock-state";
import {
  AppScreen,
  BottomTabs,
  InfoMessage,
  InlineField,
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
  const [isShopBusy, setIsShopBusy] = useState(false);
  const [loadedShopSessionKey, setLoadedShopSessionKey] = useState<string | null>(null);
  const [isGoalsBusy, setIsGoalsBusy] = useState(false);
  const [loadedGoalsSessionKey, setLoadedGoalsSessionKey] = useState<string | null>(null);
  const [goalVoteCounts, setGoalVoteCounts] = useState<Record<string, number>>({});
  const [votedGoalsSessionKey, setVotedGoalsSessionKey] = useState<string | null>(null);

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

  const currentBalance = currentMember
    ? appState.ledgerEntries
        .filter((entry) => entry.memberId === currentMember.id)
        .reduce((sum, entry) => sum + entry.pointsDelta, 0)
    : 0;
  const currentPending = currentMember ? getPendingPointsForMember(appState, currentMember.id) : 0;
  const currentRemaining =
    currentMember !== null ? getRemainingBudgetForMember(appState, currentMember.id) : 0;
  const hasVotedToday = currentSessionKey !== null && votedGoalsSessionKey === currentSessionKey;
  const isShopLoaded = currentSessionKey !== null && loadedShopSessionKey === currentSessionKey;
  const isGoalsLoaded = currentSessionKey !== null && loadedGoalsSessionKey === currentSessionKey;

  useEffect(() => {
    void bootstrapSessionFlow();
  }, []);

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

  function applyMutation(
    next: { state: typeof appState; errorMessage?: string },
    success?: string
  ) {
    setAppState(next.state);
    setMessage(next.errorMessage ?? success ?? null);
  }

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

    const loadGoalsResult = await loadGoals({ familyId });

    if (!loadGoalsResult.ok) {
      setIsGoalsBusy(false);
      setMessage(loadGoalsResult.error.message);
      return false;
    }

    setAppState((previous) => ({
      ...previous,
      goals: [...loadGoalsResult.data.goals],
    }));
    setGoalVoteCounts({});
    setLoadedGoalsSessionKey(`${familyId}:${memberId}`);
    setIsGoalsBusy(false);
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
    setVotedGoalsSessionKey(currentSessionKey);
    setIsGoalsBusy(false);
    setMessage(
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
    setLoadedShopSessionKey(null);
    setLoadedGoalsSessionKey(null);
    setGoalVoteCounts({});
    setVotedGoalsSessionKey(null);
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
            <StatPill label="Solde reel" value={`${currentBalance} pts`} />
            <StatPill label="En attente" value={`${currentPending} pts`} />
            <StatPill label="A distribuer" value={`${currentRemaining} pts`} />
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
    const allocation = getAllocationForMember(appState, member.id);
    const others = appState.members.filter((candidate) => candidate.id !== member.id);

    return (
      <AppScreen
        title="Attribution des points"
        subtitle="Chaque membre dispose de 5 points par jour a repartir aux autres."
      >
        <SectionCard title="Mon budget du jour">
          <MetricGrid>
            <StatPill label="Restant" value={`${currentRemaining} pts`} />
            <StatPill label="Alloue" value={`${5 - currentRemaining} pts`} />
            <StatPill label="Recevables demain" value={`${currentPending} pts`} />
          </MetricGrid>
        </SectionCard>
        <SectionCard title="Repartir mes points">
          {others.map((other) => {
            const currentValue = getAllocatedPointsForReceiver(appState, member.id, other.id);

            return (
              <StepperRow
                key={other.id}
                title={other.displayName}
                subtitle={other.role === "parent" ? "Parent" : "Enfant"}
                value={currentValue}
                onDecrease={() =>
                  applyMutation(
                    updatePointAllocation(
                      appState,
                      member.id,
                      other.id,
                      Math.max(currentValue - 1, 0)
                    )
                  )
                }
                onIncrease={() =>
                  applyMutation(
                    updatePointAllocation(appState, member.id, other.id, currentValue + 1)
                  )
                }
                canDecrease={currentValue > 0}
                canIncrease={currentRemaining > 0}
              />
            );
          })}
        </SectionCard>
        <SectionCard subtitle="La simulation de fin de journee finalise toutes les allocations de la famille et ouvre le jour suivant.">
          <PrimaryButton
            label="Simuler la fin de journee"
            onPress={() =>
              applyMutation(
                simulateEndOfDay(appState, new Date().toISOString()),
                "Journee finalisee. Les soldes reels ont ete mis a jour."
              )
            }
          />
          <Text style={styles.helperText}>
            Etat actuel :{" "}
            {allocation.status === "draft" ? "reallocation possible" : "allocation finalisee"}
          </Text>
        </SectionCard>
      </AppScreen>
    );
  }

  function renderShop(member: Member) {
    return (
      <AppScreen title="Boutique" subtitle="Les achats debitent immediatement le solde reel.">
        <SectionCard title="Mon solde disponible">
          <StatPill label="Solde reel" value={`${currentBalance} pts`} />
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
                  : currentBalance >= item.cost
                    ? "Acheter"
                    : "Solde insuffisant"
              }
              onPress={() => void handleShopPurchase(item.id)}
              disabled={currentBalance < item.cost || isShopBusy}
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
          subtitle={member.role === "parent" ? "Parent" : "Enfant"}
        >
          <MetricGrid>
            <StatPill label="Solde reel" value={`${currentBalance} pts`} />
            <StatPill label="Points en attente" value={`${currentPending} pts`} />
            <StatPill label="Budget restant" value={`${currentRemaining} pts`} />
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
  const subject = members.find((member) => member.id === event.subjectMemberId)?.displayName;
  const goalTitle = goals.find((goal) => goal.id === String(event.metadata.goalId))?.title;

  switch (event.type) {
    case "member_session_started":
      return `${actor ?? "Un membre"} s'est connecte`;
    case "points_given":
      return `${actor ?? "Quelqu'un"} a donne ${event.metadata.points} point(s) a ${subject ?? "un membre"}`;
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
      return "Le gain reel sera applique a la fin de la journee.";
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
