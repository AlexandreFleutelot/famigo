import type { FamilyGoal, HistoryEvent, Member } from "@famigo/domain";
import { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";

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
  loginWithPin,
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
  PinPad,
  PrimaryButton,
  ProgressBar,
  SecondaryButton,
  SectionCard,
  StatPill,
  StepperRow,
} from "./src/ui";

type MainTab = "home" | "points" | "shop" | "goals" | "history" | "profile";

const tabs: ReadonlyArray<{ key: MainTab; label: string }> = [
  { key: "home", label: "Accueil" },
  { key: "points", label: "Points" },
  { key: "shop", label: "Boutique" },
  { key: "goals", label: "Objectifs" },
  { key: "history", label: "Historique" },
  { key: "profile", label: "Profil" },
];

export default function App() {
  const [appState, setAppState] = useState(createInitialMockAppState);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [activeTab, setActiveTab] = useState<MainTab>("home");
  const [message, setMessage] = useState<string | null>(null);
  const [goalTitleInput, setGoalTitleInput] = useState("");
  const [goalTargetInput, setGoalTargetInput] = useState("3");

  const currentMember = useMemo(() => getCurrentMember(appState), [appState]);
  const selectedMember =
    selectedMemberId === null
      ? null
      : (appState.members.find((member) => member.id === selectedMemberId) ?? null);

  const currentBalance = currentMember ? getBalanceForMember(appState, currentMember.id) : 0;
  const currentPending = currentMember ? getPendingPointsForMember(appState, currentMember.id) : 0;
  const currentRemaining =
    currentMember !== null ? getRemainingBudgetForMember(appState, currentMember.id) : 0;
  const hasVotedToday = currentMember ? hasMemberVotedToday(appState, currentMember.id) : false;

  function applyMutation(
    next: { state: typeof appState; errorMessage?: string },
    success?: string
  ) {
    setAppState(next.state);
    setMessage(next.errorMessage ?? success ?? null);
  }

  function handlePinDigit(digit: string) {
    if (pinInput.length >= 4) {
      return;
    }

    const nextPin = `${pinInput}${digit}`;
    setPinInput(nextPin);

    if (nextPin.length === 4 && selectedMemberId !== null) {
      const result = loginWithPin(appState, selectedMemberId, nextPin, new Date().toISOString());

      applyMutation(result);
      if (!result.errorMessage) {
        setPinInput("");
        setSelectedMemberId(null);
        setActiveTab("home");
      }
    }
  }

  function handleLogout() {
    setAppState((previous) => logout(previous));
    setSelectedMemberId(null);
    setPinInput("");
    setActiveTab("home");
    setMessage(null);
  }

  function renderLoggedOut() {
    if (selectedMember !== null) {
      return (
        <AppScreen
          title="Saisir le PIN"
          subtitle={`Connexion de ${selectedMember.displayName} sur ${appState.family.name}`}
        >
          {message ? <InfoMessage tone="error">{message}</InfoMessage> : null}
          <SectionCard title={selectedMember.displayName} subtitle="Entrez le PIN a 4 chiffres">
            <PinPad
              value={pinInput}
              onDigitPress={handlePinDigit}
              onBackspace={() => setPinInput((current) => current.slice(0, -1))}
            />
            <SecondaryButton
              label="Changer de membre"
              onPress={() => {
                setSelectedMemberId(null);
                setPinInput("");
                setMessage(null);
              }}
            />
          </SectionCard>
        </AppScreen>
      );
    }

    return (
      <AppScreen title="Famigo" subtitle="Selectionnez un membre de la famille pour commencer.">
        {message ? <InfoMessage tone="info">{message}</InfoMessage> : null}
        <SectionCard title="Qui se connecte ?">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.memberCarousel}>
              {appState.members.map((member) => (
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
            label="Continuer"
            onPress={() => {
              if (selectedMemberId !== null) {
                setMessage(null);
              }
            }}
            disabled={selectedMemberId === null}
          />
          {selectedMemberId !== null ? (
            <PrimaryButton
              label="Saisir le PIN"
              onPress={() => {
                setMessage(null);
              }}
            />
          ) : null}
        </SectionCard>
        {selectedMemberId !== null ? (
          <SectionCard subtitle="Le membre est selectionne. Appuyez sur Saisir le PIN pour continuer." />
        ) : null}
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
        <PrimaryButton label="Se deconnecter" onPress={handleLogout} />
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
