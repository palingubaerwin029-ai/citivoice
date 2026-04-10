import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { useConcerns } from "../../context/ConcernContext";
import { useLanguage } from "../../context/LanguageContext";
import { COLORS, RADIUS, SHADOWS, STATUS_CONFIG } from "../../utils/theme";
import { LANGUAGES } from "../../i18n/translations";
export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { myConcerns } = useConcerns();
  const { language, changeLanguage } = useLanguage();
  const [showLang, setShowLang] = useState(false);
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  const stats = {
    total: myConcerns.length,
    pending: myConcerns.filter((c) => c.status === "Pending").length,
    inProgress: myConcerns.filter((c) => c.status === "In Progress").length,
    resolved: myConcerns.filter((c) => c.status === "Resolved").length,
  };
  const memberSince =
    user?.createdAt
      ?.toDate?.()
      ?.toLocaleDateString("en-PH", { year: "numeric", month: "long" }) ||
    "2024";
  const handleLogout = () =>
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: COLORS.bgDark }}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <LinearGradient
          colors={[COLORS.primary + "22", COLORS.bgDark]}
          style={{
            alignItems: "center",
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 28,
          }}
        >
          <View style={{ position: "relative", marginBottom: 14 }}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.purple || "#8B5CF6"]}
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 30, fontWeight: "900" }}>
                {initials}
              </Text>
            </LinearGradient>
            <View
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: COLORS.accent,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: COLORS.bgDark,
              }}
            >
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
          </View>
          <Text
            style={{
              color: COLORS.textPrimary,
              fontSize: 22,
              fontWeight: "800",
              letterSpacing: -0.4,
              marginBottom: 3,
            }}
          >
            {user?.name}
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 13,
              marginBottom: 10,
            }}
          >
            {user?.email}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: COLORS.bgCard,
              borderRadius: RADIUS.full,
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: COLORS.border,
              marginBottom: 8,
            }}
          >
            <Ionicons
              name="location-outline"
              size={12}
              color={COLORS.primaryLight}
            />
            <Text
              style={{
                color: COLORS.primaryLight,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {user?.barangay}
            </Text>
          </View>
          <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>
            Member since {memberSince}
          </Text>
        </LinearGradient>
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            gap: 10,
            marginTop: 4,
            marginBottom: 20,
          }}
        >
          {[
            {
              label: "Submitted",
              value: stats.total,
              color: COLORS.primaryLight,
            },
            { label: "Pending", value: stats.pending, color: "#F59E0B" },
            { label: "Active", value: stats.inProgress, color: "#3B82F6" },
            { label: "Resolved", value: stats.resolved, color: "#10B981" },
          ].map((s, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                backgroundColor: COLORS.bgCard,
                borderRadius: RADIUS.lg,
                paddingVertical: 14,
                alignItems: "center",
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "800",
                  letterSpacing: -0.5,
                  color: s.color,
                }}
              >
                {s.value}
              </Text>
              <Text
                style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 3 }}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>
        {myConcerns.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 11,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 10,
              }}
            >
              My Recent Reports
            </Text>
            {myConcerns.slice(0, 3).map((c) => {
              const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG["Pending"];
              return (
                <View
                  key={c.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    backgroundColor: COLORS.bgCard,
                    borderRadius: RADIUS.lg,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      flexShrink: 0,
                      backgroundColor: cfg.color,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: COLORS.textPrimary,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                      numberOfLines={1}
                    >
                      {c.title}
                    </Text>
                    <Text
                      style={{
                        color: COLORS.textMuted,
                        fontSize: 11,
                        marginTop: 2,
                      }}
                    >
                      {c.category?.split(" ")[0]} · {c.userBarangay}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: RADIUS.full,
                      borderWidth: 1,
                      backgroundColor: cfg.bg,
                      borderColor: cfg.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: cfg.color,
                      }}
                    >
                      {cfg.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 10,
            }}
          >
            Account Information
          </Text>
          <View
            style={{
              backgroundColor: COLORS.bgCard,
              borderRadius: RADIUS.xl,
              borderWidth: 1,
              borderColor: COLORS.border,
              overflow: "hidden",
            }}
          >
            {[
              { icon: "person-outline", label: "Full Name", value: user?.name },
              { icon: "mail-outline", label: "Email", value: user?.email },
              {
                icon: "call-outline",
                label: "Phone",
                value: user?.phone || "—",
              },
              {
                icon: "location-outline",
                label: "Barangay",
                value: user?.barangay,
              },
            ].map((item, i, arr) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 14,
                  borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                  borderBottomColor: COLORS.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      backgroundColor: COLORS.bgCardAlt,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={15}
                      color={COLORS.textSecondary}
                    />
                  </View>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
                    {item.label}
                  </Text>
                </View>
                <Text
                  style={{
                    color: COLORS.textPrimary,
                    fontSize: 13,
                    fontWeight: "600",
                    maxWidth: 180,
                  }}
                  numberOfLines={1}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 11,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 10,
            }}
          >
            Settings
          </Text>
          <View
            style={{
              backgroundColor: COLORS.bgCard,
              borderRadius: RADIUS.xl,
              borderWidth: 1,
              borderColor: COLORS.border,
              overflow: "hidden",
            }}
          >
            <TouchableOpacity
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 14,
              }}
              onPress={() => setShowLang(true)}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    backgroundColor: COLORS.bgCardAlt,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="language-outline"
                    size={15}
                    color={COLORS.textSecondary}
                  />
                </View>
                <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
                  Language
                </Text>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Text
                  style={{
                    color: COLORS.primaryLight,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {LANGUAGES.find((l) => l.code === language)?.label ||
                    "English"}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={COLORS.textMuted}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginHorizontal: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.2)",
            borderRadius: RADIUS.xl,
            marginBottom: 16,
            backgroundColor: "rgba(239,68,68,0.06)",
          }}
          onPress={handleLogout}
        >
          <Ionicons
            name="log-out-outline"
            size={18}
            color={COLORS.danger || "#EF4444"}
          />
          <Text
            style={{
              color: COLORS.danger || "#EF4444",
              fontSize: 15,
              fontWeight: "700",
            }}
          >
            Sign Out
          </Text>
        </TouchableOpacity>
        <Text
          style={{ color: COLORS.textMuted, fontSize: 11, textAlign: "center" }}
        >
          CitiVoice v2.0 · Kabankalan City
        </Text>
      </ScrollView>
      <Modal
        visible={showLang}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLang(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.65)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.bgCard,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: 40,
              borderTopWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: COLORS.border,
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 16,
              }}
            />
            <Text
              style={{
                color: COLORS.textPrimary,
                fontSize: 18,
                fontWeight: "800",
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              Select Language
            </Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  padding: 14,
                  borderRadius: RADIUS.lg,
                  marginBottom: 8,
                  backgroundColor:
                    language === lang.code
                      ? COLORS.primary + "1A"
                      : "transparent",
                }}
                onPress={() => {
                  changeLanguage(lang.code);
                  setShowLang(false);
                }}
              >
                <Text style={{ fontSize: 22 }}>{lang.flag}</Text>
                <Text
                  style={{
                    color:
                      language === lang.code
                        ? COLORS.primaryLight
                        : COLORS.textPrimary,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {lang.label}
                </Text>
                {language === lang.code && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={COLORS.primaryLight}
                    style={{ marginLeft: "auto" }}
                  />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={{ padding: 14, alignItems: "center", marginTop: 4 }}
              onPress={() => setShowLang(false)}
            >
              <Text style={{ color: COLORS.textMuted, fontSize: 15 }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
