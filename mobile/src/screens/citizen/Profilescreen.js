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
import { scale, verticalScale, rf, moderateScale } from "../../utils/responsive";
import { LANGUAGES } from "../../i18n/translations";
export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { myConcerns } = useConcerns();
  const { t, language, changeLanguage } = useLanguage();
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
    (user?.created_at ? new Date(user.created_at) : null)
      ?.toLocaleDateString("en-PH", { year: "numeric", month: "long" });
  const handleLogout = () =>
    Alert.alert(t('signOut'), t('signOutConfirm'), [
      { text: t('cancel'), style: "cancel" },
      { text: t('signOut'), style: "destructive", onPress: logout },
    ]);
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: COLORS.bgDark }}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: verticalScale(48) }}
      >
        <LinearGradient
          colors={[COLORS.primary + "22", COLORS.bgDark]}
          style={{
            alignItems: "center",
            paddingHorizontal: scale(24),
            paddingTop: verticalScale(20),
            paddingBottom: verticalScale(28),
          }}
        >
          <View style={{ position: "relative", marginBottom: verticalScale(14) }}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.purple || "#8B5CF6"]}
              style={{
                width: scale(80),
                height: scale(80),
                borderRadius: moderateScale(24),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: rf(30), fontWeight: "900" }}>
                {initials}
              </Text>
            </LinearGradient>
            <View
              style={{
                position: "absolute",
                bottom: scale(-2),
                right: scale(-2),
                width: scale(22),
                height: scale(22),
                borderRadius: scale(11),
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
              fontSize: rf(22),
              fontWeight: "800",
              letterSpacing: -0.4,
              marginBottom: verticalScale(3),
            }}
          >
            {user?.name}
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: rf(13),
              marginBottom: verticalScale(10),
            }}
          >
            {user?.email}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: scale(5),
              backgroundColor: COLORS.bgCard,
              borderRadius: RADIUS.full,
              paddingHorizontal: scale(12),
              paddingVertical: verticalScale(5),
              borderWidth: 1,
              borderColor: COLORS.border,
              marginBottom: verticalScale(8),
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
                fontSize: rf(12),
                fontWeight: "600",
              }}
            >
              {user?.barangay}
            </Text>
          </View>
          <Text style={{ color: COLORS.textMuted, fontSize: rf(11) }}>
            {t('memberSince')} {memberSince}
          </Text>
        </LinearGradient>
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: scale(16),
            gap: scale(10),
            marginTop: verticalScale(4),
            marginBottom: verticalScale(20),
          }}
        >
          {[
            {
              label: t('submitted_stat'),
              value: stats.total,
              color: COLORS.primaryLight,
            },
            { label: t('pending'), value: stats.pending, color: "#F59E0B" },
            { label: t('active'), value: stats.inProgress, color: "#3B82F6" },
            { label: t('resolved'), value: stats.resolved, color: "#10B981" },
          ].map((s, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                backgroundColor: COLORS.bgCard,
                borderRadius: RADIUS.lg,
                paddingVertical: verticalScale(14),
                alignItems: "center",
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text
                style={{
                  fontSize: rf(20),
                  fontWeight: "800",
                  letterSpacing: -0.5,
                  color: s.color,
                }}
              >
                {s.value}
              </Text>
              <Text
                style={{ color: COLORS.textMuted, fontSize: rf(10), marginTop: verticalScale(3) }}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>
        {myConcerns.length > 0 && (
          <View style={{ paddingHorizontal: scale(16), marginBottom: verticalScale(20) }}>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: rf(11),
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: verticalScale(10),
              }}
            >
              {t('myRecentReports')}
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
                      width: scale(8),
                      height: scale(8),
                      borderRadius: scale(4),
                      flexShrink: 0,
                      backgroundColor: cfg.color,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: COLORS.textPrimary,
                        fontSize: rf(13),
                        fontWeight: "600",
                      }}
                      numberOfLines={1}
                    >
                      {c.title}
                    </Text>
                    <Text
                      style={{
                        color: COLORS.textMuted,
                        fontSize: rf(11),
                        marginTop: verticalScale(2),
                      }}
                    >
                      {c.category?.split(" ")[0]} · {c.userBarangay}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: scale(8),
                      paddingVertical: verticalScale(3),
                      borderRadius: RADIUS.full,
                      borderWidth: 1,
                      backgroundColor: cfg.bg,
                      borderColor: cfg.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: rf(10),
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
        <View style={{ paddingHorizontal: scale(16), marginBottom: verticalScale(20) }}>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: rf(11),
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: verticalScale(10),
            }}
          >
            {t('accountInfo')}
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
              { icon: "person-outline", label: t('fullName'), value: user?.name },
              { icon: "mail-outline", label: t('email'), value: user?.email },
              {
                icon: "call-outline",
                label: t('phone'),
                value: user?.phone || "—",
              },
              {
                icon: "location-outline",
                label: t('barangay'),
                value: user?.barangay,
              },
            ].map((item, i, arr) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: scale(14),
                  borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                  borderBottomColor: COLORS.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: scale(10),
                  }}
                >
                  <View
                    style={{
                      width: scale(30),
                      height: scale(30),
                      borderRadius: moderateScale(8),
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
                  <Text style={{ color: COLORS.textSecondary, fontSize: rf(14) }}>
                    {item.label}
                  </Text>
                </View>
                <Text
                  style={{
                    color: COLORS.textPrimary,
                    fontSize: rf(13),
                    fontWeight: "600",
                    maxWidth: scale(180),
                  }}
                  numberOfLines={1}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ paddingHorizontal: scale(16), marginBottom: verticalScale(20) }}>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: rf(11),
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: verticalScale(10),
            }}
          >
            {t('settings')}
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
                padding: scale(14),
              }}
              onPress={() => setShowLang(true)}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: scale(10) }}
              >
                <View
                  style={{
                    width: scale(30),
                    height: scale(30),
                    borderRadius: moderateScale(8),
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
                <Text style={{ color: COLORS.textSecondary, fontSize: rf(14) }}>
                  {t('language')}
                </Text>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: scale(6) }}
              >
                <Text
                  style={{
                    color: COLORS.primaryLight,
                    fontSize: rf(13),
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
            gap: scale(8),
            marginHorizontal: scale(16),
            padding: scale(14),
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.2)",
            borderRadius: RADIUS.xl,
            marginBottom: verticalScale(16),
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
              fontSize: rf(15),
              fontWeight: "700",
            }}
          >
            {t('signOut')}
          </Text>
        </TouchableOpacity>
        <Text
          style={{ color: COLORS.textMuted, fontSize: rf(11), textAlign: "center" }}
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
              borderTopLeftRadius: moderateScale(24),
              borderTopRightRadius: moderateScale(24),
              padding: scale(20),
              paddingBottom: verticalScale(40),
              borderTopWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <View
              style={{
                width: scale(36),
                height: verticalScale(4),
                backgroundColor: COLORS.border,
                borderRadius: scale(2),
                alignSelf: "center",
                marginBottom: verticalScale(16),
              }}
            />
            <Text
              style={{
                color: COLORS.textPrimary,
                fontSize: rf(18),
                fontWeight: "800",
                textAlign: "center",
                marginBottom: verticalScale(16),
              }}
            >
              {t('selectLanguage')}
            </Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: scale(14),
                  padding: scale(14),
                  borderRadius: RADIUS.lg,
                  marginBottom: verticalScale(8),
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
                <Text style={{ fontSize: rf(22) }}>{lang.flag}</Text>
                <Text
                  style={{
                    color:
                      language === lang.code
                        ? COLORS.primaryLight
                        : COLORS.textPrimary,
                    fontSize: rf(16),
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
              style={{ padding: scale(14), alignItems: "center", marginTop: verticalScale(4) }}
              onPress={() => setShowLang(false)}
            >
              <Text style={{ color: COLORS.textMuted, fontSize: rf(15) }}>
                {t('cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
