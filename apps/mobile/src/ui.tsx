import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export function AppScreen({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>{title}</Text>
        {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </ScrollView>
  );
}

export function SectionCard({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title?: string; subtitle?: string }>) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, disabled ? styles.primaryButtonDisabled : null]}
    >
      <Text style={styles.primaryButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.secondaryButton, disabled ? styles.secondaryButtonDisabled : null]}
    >
      <Text style={styles.secondaryButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function StatPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillLabel}>{label}</Text>
      <Text style={styles.statPillValue}>{value}</Text>
    </View>
  );
}

export function MemberBadge({
  name,
  roleLabel,
  selected,
  onPress,
}: {
  name: string;
  roleLabel: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.memberCard, selected ? styles.memberCardSelected : null]}
    >
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarLabel}>{name.slice(0, 2).toUpperCase()}</Text>
      </View>
      <Text style={styles.memberName}>{name}</Text>
      <Text style={styles.memberRole}>{roleLabel}</Text>
    </Pressable>
  );
}

export function PinPad({
  value,
  onDigitPress,
  onBackspace,
}: {
  value: string;
  onDigitPress: (digit: string) => void;
  onBackspace: () => void;
}) {
  const pinSlots = ["slot-1", "slot-2", "slot-3", "slot-4"];
  const digits = [
    { key: "digit-1", label: "1" },
    { key: "digit-2", label: "2" },
    { key: "digit-3", label: "3" },
    { key: "digit-4", label: "4" },
    { key: "digit-5", label: "5" },
    { key: "digit-6", label: "6" },
    { key: "digit-7", label: "7" },
    { key: "digit-8", label: "8" },
    { key: "digit-9", label: "9" },
    { key: "spacer-center", label: "" },
    { key: "digit-0", label: "0" },
    { key: "digit-backspace", label: "←" },
  ];

  return (
    <View>
      <View style={styles.pinRow}>
        {pinSlots.map((slotId, index) => (
          <View key={slotId} style={styles.pinCell}>
            <Text style={styles.pinCellText}>{value[index] ? "•" : ""}</Text>
          </View>
        ))}
      </View>
      <View style={styles.keypadGrid}>
        {digits.map((digit) => {
          if (digit.label === "") {
            return <View key={digit.key} style={styles.keypadSpacer} />;
          }

          return (
            <Pressable
              key={digit.key}
              onPress={() => {
                if (digit.label === "←") {
                  onBackspace();
                  return;
                }

                onDigitPress(digit.label);
              }}
              style={styles.keypadKey}
            >
              <Text style={styles.keypadKeyLabel}>{digit.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function StepperRow({
  title,
  subtitle,
  value,
  onDecrease,
  onIncrease,
  canDecrease,
  canIncrease,
}: {
  title: string;
  subtitle?: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease: boolean;
  canIncrease: boolean;
}) {
  return (
    <View style={styles.stepperRow}>
      <View style={styles.stepperText}>
        <Text style={styles.stepperTitle}>{title}</Text>
        {subtitle ? <Text style={styles.stepperSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.stepperActions}>
        <SecondaryButton label="-" onPress={onDecrease} disabled={!canDecrease} />
        <Text style={styles.stepperValue}>{value}</Text>
        <SecondaryButton label="+" onPress={onIncrease} disabled={!canIncrease} />
      </View>
    </View>
  );
}

export function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(progress, 1) * 100}%` }]} />
    </View>
  );
}

export function BottomTabs<TTab extends string>({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: ReadonlyArray<{ key: TTab; label: string }>;
  activeTab: TTab;
  onChange: (tab: TTab) => void;
}) {
  return (
    <View style={styles.bottomTabs}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => onChange(tab.key)}
          style={[styles.bottomTab, activeTab === tab.key ? styles.bottomTabActive : null]}
        >
          <Text
            style={[
              styles.bottomTabLabel,
              activeTab === tab.key ? styles.bottomTabLabelActive : null,
            ]}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function InlineField({
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <TextInput
      keyboardType={keyboardType}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      style={styles.input}
      value={value}
    />
  );
}

export function InfoMessage({ tone, children }: PropsWithChildren<{ tone: "error" | "info" }>) {
  return (
    <View style={[styles.messageBox, tone === "error" ? styles.messageError : styles.messageInfo]}>
      <Text
        style={[
          styles.messageText,
          tone === "error" ? styles.messageErrorText : styles.messageInfoText,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <View style={styles.metricGrid}>{children}</View>;
}

const styles = StyleSheet.create({
  screenContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 120,
  },
  screenHeader: {
    gap: 4,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
  },
  screenSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
  },
  card: {
    gap: 12,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#0f766e",
    paddingHorizontal: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 40,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
  },
  secondaryButtonDisabled: {
    opacity: 0.4,
  },
  secondaryButtonLabel: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  statPill: {
    flex: 1,
    minWidth: 120,
    gap: 4,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statPillLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  statPillValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  memberCard: {
    width: 132,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    padding: 16,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  memberCardSelected: {
    borderColor: "#0f766e",
    backgroundColor: "#ecfeff",
  },
  memberAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f766e",
  },
  memberAvatarLabel: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  memberName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  memberRole: {
    fontSize: 13,
    color: "#64748b",
  },
  pinRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },
  pinCell: {
    width: 54,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  pinCellText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  keypadGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  keypadKey: {
    width: 72,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  keypadKeyLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  keypadSpacer: {
    width: 72,
    height: 56,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  stepperText: {
    flex: 1,
    gap: 2,
  },
  stepperTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  stepperSubtitle: {
    fontSize: 13,
    color: "#64748b",
  },
  stepperActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepperValue: {
    width: 20,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#0f766e",
  },
  bottomTabs: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    gap: 8,
  },
  bottomTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: 12,
  },
  bottomTabActive: {
    backgroundColor: "#ecfeff",
  },
  bottomTabLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  bottomTabLabelActive: {
    color: "#0f766e",
  },
  input: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0f172a",
  },
  messageBox: {
    borderRadius: 14,
    padding: 12,
  },
  messageError: {
    backgroundColor: "#fef2f2",
  },
  messageInfo: {
    backgroundColor: "#eff6ff",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageErrorText: {
    color: "#b91c1c",
  },
  messageInfoText: {
    color: "#1d4ed8",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
