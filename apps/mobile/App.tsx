import type { Family, FamilyGoal, HistoryEvent, Member } from "@famigo/domain";
import { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";

import type { AppSessionGateway } from "./src/application";
import {
  createClearSessionUseCase,
  createGetFamiliesUseCase,
  createGetMembersForSelectedFamilyUseCase,
  createMemoryAppSessionGateway,
  createRestoreSessionUseCase,
  createSelectFamilyUseCase,
  createStartMemberSessionUseCase,
} from "./src/application";
import {
  buyShopItem,
  createFamilyGoal,
  createInitialMockAppState,
  getAllocatedPointsForReceiver,
  getAllocationForMember,
  getBalanceForMember,
  getCurrentMember,
  getGoalVoteCount,
  getPendingPointsForMember,
  getRemainingBudgetForMember,
  hasMemberVotedToday,
  logout,
  simulateEndOfDay,
  updatePointAllocation,
  voteForGoal,
} from "./src/mock-state";
import {
  AppScreen,
  BottomTabs,
  InfoMessage,
  InlineField,
  MemberBadge,
  MetricGrid,
  PrimaryButton,
  ProgressBar,
  SecondaryButton,
  SectionCard,
  StatPill,
  StepperRow,
} from "./src/ui";

type MainTab = "home" | "points" | "shop" | "goals" | "history" | "profile";
type AuthStage = "loading" | "family" | "member";

const tabs: ReadonlyArray<{ key: MainTab; label: string }> = [
  { key: "home", label: "Accueil" },
  { key: "points", label: "Points" },
  { key: "shop", label: "Boutique" },
  { key: "goals", label: "Objectifs" },
  { key: "history", label: "Historique" },
  { key: "profile", label: "Profil" },
];

export default function App() {
  const appSessionGatewayRef = useRef<AppSessionGateway>(createMemoryAppSessionGateway());
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
  const [goalTitleInput, setGoalTitleInput] = useState("");
  const [goalTargetInput, setGoalTargetInput] = useState("3");

  const currentMember = useMemo(() => getCurrentMember(appState), [appState]);
  const selectedFamily =
    selectedFamilyId === null
      ? null
      : (availableFamilies.find((family) => family.id === selectedFamilyId) ?? null);
  const selectedMember =
    selectedMemberId === null
      ? null
      : (availableMembers.find((member) => member.id === selectedMemberId) ?? null);

  const currentBalance = currentMember ? getBalanceForMember(appState, currentMember.id) : 0;
  const currentPending = currentMember ? getPendingPointsForMember(appState, currentMember.id) : 0;
  const currentRemaining =
    currentMember !== null ? getRemainingBudgetForMember(appState, currentMember.id) : 0;
  const hasVotedToday = currentMember ? hasMemberVotedToday(appState, currentMember.id) : false;

  useEffect(() => {
    void bootstrapSessionFlow();
  }, []);

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
    memberId: string | null
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
              startedAt: new Date().toISOString(),
            },
    }));
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
      setAuthStage("member");
      setIsAuthBusy(false);
      return;
    }

    syncMockStateWithSelectedSession(
      restoredFamily,
      membersResult.data.members,
      restoredMember.id
    );
    setSelectedMemberId(restoredMember.id);
    setActiveTab("home");
    setAuthStage("member");
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

    syncMockStateWithSelectedSession(selectedFamily, availableMembers, sessionResult.data.member.id);
    setActiveTab("home");
    setIsAuthBusy(false);
  }

  async function handleLogout() {
    await clearSession();
    setAppState((previous) => logout(previous));
    setAvailableMembers([]);
    setSelectedFamilyId(null);
    setSelectedMemberId(null);
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
            label={isAuthBusy ? "Connexion..." : "Continuer"}
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
              subtitle={`${selectedMember.displayName} est selectionne. Le PIN sera rebranche dans une prochaine etape.`}
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
        {appState.shopItems.map((item) => (
          <SectionCard key={item.id} title={item.name} subtitle={`Cout : ${item.cost} points`}>
            <PrimaryButton
              label={currentBalance >= item.cost ? "Acheter" : "Solde insuffisant"}
              onPress={() =>
                applyMutation(
                  buyShopItem(appState, member.id, item.id, new Date().toISOString()),
                  `${item.name} achete avec succes.`
                )
              }
              disabled={currentBalance < item.cost}
            />
          </SectionCard>
        ))}
      </AppScreen>
    );
  }

  function renderGoals(member: Member) {
    const isParent = member.role === "parent";

    return (
      <AppScreen title="Objectifs famille" subtitle="Un seul vote par jour et par membre.">
        {isParent ? (
          <SectionCard title="Creer un objectif">
            <InlineField
              value={goalTitleInput}
              onChangeText={setGoalTitleInput}
              placeholder="Titre de l'objectif"
            />
            <InlineField
              value={goalTargetInput}
              onChangeText={setGoalTargetInput}
              placeholder="Cible de votes"
              keyboardType="number-pad"
            />
            <PrimaryButton
              label="Ajouter l'objectif"
              onPress={() => {
                const targetVoteCount = Number(goalTargetInput);
                const result = createFamilyGoal(
                  appState,
                  member.id,
                  goalTitleInput.trim(),
                  Number.isFinite(targetVoteCount) ? targetVoteCount : 0
                );

                applyMutation(result, "Objectif ajoute.");
                if (!result.errorMessage) {
                  setGoalTitleInput("");
                  setGoalTargetInput("3");
                }
              }}
              disabled={goalTitleInput.trim().length === 0}
            />
          </SectionCard>
        ) : null}
        {appState.goals.map((goal) => {
          const voteCount = getGoalVoteCount(appState, goal.id);
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
                onPress={() =>
                  applyMutation(
                    voteForGoal(appState, member.id, goal.id, new Date().toISOString()),
                    "Vote enregistre."
                  )
                }
                disabled={!canVote}
              />
            </SectionCard>
          );
        })}
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
