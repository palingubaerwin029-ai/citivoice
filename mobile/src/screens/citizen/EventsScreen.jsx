import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { mobileApi } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { COLORS } from "../../utils/theme";
import { scale, verticalScale, rf, moderateScale } from "../../utils/responsive";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_COLORS = {
  meeting: { bg: "#1A6BFF22", color: "#4D8FFF", icon: "people" },
  maintenance: { bg: "#FFB80022", color: "#FFB800", icon: "construct" },
  health: { bg: "#00D4AA22", color: "#00D4AA", icon: "medical" },
  emergency: { bg: "#FF444422", color: "#FF4444", icon: "warning" },
  celebration: { bg: "#FF6B3522", color: "#FF6B35", icon: "sparkles" },
  other: { bg: "#8899BB22", color: "#8899BB", icon: "calendar" },
};

const ANNOUNCEMENT_COLORS = {
  info: { bg: "#1A6BFF22", color: "#4D8FFF", icon: "information-circle" },
  warning: { bg: "#FFB80022", color: "#FFB800", icon: "alert-circle" },
  urgent: { bg: "#FF444422", color: "#FF4444", icon: "megaphone" },
  success: { bg: "#00D4AA22", color: "#00D4AA", icon: "checkmark-circle" },
};

export default function EventsScreen() {
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("announcements"); // 'announcements' | 'calendar'
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const { t } = useLanguage();

  const loadData = async () => {
    try {
      const anns = await mobileApi.get("/announcements");
      setAnnouncements(anns);
      
      const evts = await mobileApi.get("/events");
      setEvents(evts);
    } catch (err) {
      console.log("Error fetching events/announcements", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const getEventsOnDate = (day) => {
    return events.filter((e) => {
      if (!e.date) return false;
      const d = e.date.toDate ? e.date.toDate() : new Date(e.date);
      return (
        d.getDate() === day &&
        d.getMonth() === calendarMonth.getMonth() &&
        d.getFullYear() === calendarMonth.getFullYear()
      );
    });
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      calendarMonth.getMonth() === today.getMonth() &&
      calendarMonth.getFullYear() === today.getFullYear()
    );
  };

  const prevMonth = () => {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1),
    );
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
    );
    setSelectedDate(null);
  };

  const { firstDay, daysInMonth } = getDaysInMonth(calendarMonth);

  // Upcoming events (next 30 days)
  const upcomingEvents = events
    .filter((e) => {
      if (!e.date) return false;
      const d = new Date(e.date);
      if (isNaN(d)) return false;
      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 86400000);
      return d >= now && d <= in30;
    })
    .slice(0, 5);

  const selectedDayEvents = selectedDate ? getEventsOnDate(selectedDate) : [];

  const formatEventDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d)) return "";
    return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const formatEventTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d)) return "";
    return d.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const timeAgo = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    if (isNaN(d)) return "";
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('communityBoard')}</Text>
          <Text style={styles.headerSub}>{t('eventsAndAnnouncements')}</Text>
        </View>
        <View style={styles.headerBadges}>
          {announcements.filter((a) => !a.read).length > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{announcements.length} {t('newCount')}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabRow}>
        {[
          { key: "announcements", label: t('announcements'), icon: "megaphone" },
          { key: "calendar", label: t('calendar'), icon: "calendar" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? COLORS.primary : COLORS.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ══════════════════════════════════════
              ANNOUNCEMENTS TAB
            ══════════════════════════════════════ */}
        {activeTab === "announcements" && (
          <>
            {loading ? (
              <View style={styles.loadingBox}>
                <Text style={styles.loadingText}>{t('loadingAnnouncements')}</Text>
              </View>
            ) : announcements.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 48 }}>📢</Text>
                <Text style={styles.emptyTitle}>{t('noAnnouncementsYet')}</Text>
                <Text style={styles.emptySubtitle}>
                  {t('checkBackAnnouncements')}
                </Text>
              </View>
            ) : (
              announcements.map((a) => {
                const cfg =
                  ANNOUNCEMENT_COLORS[a.type] || ANNOUNCEMENT_COLORS["info"];
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[
                      styles.announcementCard,
                      { borderLeftColor: cfg.color },
                    ]}
                    onPress={() =>
                      setSelectedEvent({ ...a, _type: "announcement" })
                    }
                    activeOpacity={0.85}
                  >
                    {/* Top row */}
                    <View style={styles.announcementTop}>
                      <View
                        style={[
                          styles.announcementIcon,
                          { backgroundColor: cfg.bg },
                        ]}
                      >
                        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.announcementTitle}>{a.title}</Text>
                        <View style={styles.announcementMeta}>
                          <View
                            style={[
                              styles.typeBadge,
                              { backgroundColor: cfg.bg },
                            ]}
                          >
                            <Text
                              style={[styles.typeText, { color: cfg.color }]}
                            >
                              {a.type?.toUpperCase() || "INFO"}
                            </Text>
                          </View>
                          <Text style={styles.timeAgo}>
                            {timeAgo(a.created_at)}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={COLORS.textMuted}
                      />
                    </View>

                    {/* Body preview */}
                    <Text style={styles.announcementBody} numberOfLines={2}>
                      {a.body}
                    </Text>

                    {/* Footer */}
                    <View style={styles.announcementFooter}>
                      <Ionicons
                        name="person-outline"
                        size={12}
                        color={COLORS.textMuted}
                      />
                      <Text style={styles.announcementAuthor}>
                        {a.author || "CitiVoice Admin"}
                      </Text>
                      {a.barangay && (
                        <>
                          <Text style={styles.dot}>·</Text>
                          <Ionicons
                            name="location-outline"
                            size={12}
                            color={COLORS.textMuted}
                          />
                          <Text style={styles.announcementAuthor}>
                            {a.barangay}
                          </Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {/* ══════════════════════════════════════
              CALENDAR TAB
            ══════════════════════════════════════ */}
        {activeTab === "calendar" && (
          <>
            {/* Month Navigation */}
            <View style={styles.monthNav}>
              <TouchableOpacity style={styles.monthBtn} onPress={prevMonth}>
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={COLORS.textPrimary}
                />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </Text>
              <TouchableOpacity style={styles.monthBtn} onPress={nextMonth}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.textPrimary}
                />
              </TouchableOpacity>
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarCard}>
              {/* Day headers */}
              <View style={styles.dayHeaders}>
                {DAYS.map((d) => (
                  <Text key={d} style={styles.dayHeader}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Day cells */}
              <View style={styles.daysGrid}>
                {/* Empty cells for first day offset */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.dayCell} />
                ))}

                {/* Actual days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = getEventsOnDate(day);
                  const hasEvents = dayEvents.length > 0;
                  const today = isToday(day);
                  const selected = selectedDate === day;

                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayCell,
                        today && styles.dayCellToday,
                        selected && styles.dayCellSelected,
                        hasEvents &&
                          !today &&
                          !selected &&
                          styles.dayCellHasEvents,
                      ]}
                      onPress={() => setSelectedDate(selected ? null : day)}
                    >
                      <Text
                        style={[
                          styles.dayNum,
                          today && styles.dayNumToday,
                          selected && styles.dayNumSelected,
                        ]}
                      >
                        {day}
                      </Text>
                      {hasEvents && (
                        <View style={styles.eventDots}>
                          {dayEvents.slice(0, 3).map((e, idx) => (
                            <View
                              key={idx}
                              style={[
                                styles.eventDot,
                                {
                                  backgroundColor:
                                    EVENT_COLORS[e.category]?.color ||
                                    COLORS.primary,
                                },
                              ]}
                            />
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Selected Day Events */}
            {selectedDate && (
              <View style={styles.selectedDaySection}>
                <Text style={styles.selectedDayTitle}>
                  📅 {MONTHS[calendarMonth.getMonth()]} {selectedDate}
                </Text>
                {selectedDayEvents.length === 0 ? (
                  <View style={styles.noDayEvents}>
                    <Text style={styles.noDayEventsText}>
                      {t('noEventsOnDay')}
                    </Text>
                  </View>
                ) : (
                  selectedDayEvents.map((e) => (
                    <EventCard
                      key={e.id}
                      event={e}
                      onPress={() => setSelectedEvent({ ...e, _type: "event" })}
                      formatTime={formatEventTime}
                    />
                  ))
                )}
              </View>
            )}

            {/* Upcoming Events */}
            <View style={styles.upcomingSection}>
              <Text style={styles.sectionTitle}>📆 {t('upcomingEvents')}</Text>
              {upcomingEvents.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={{ fontSize: 40 }}>🗓️</Text>
                  <Text style={styles.emptyTitle}>{t('noUpcomingEvents')}</Text>
                  <Text style={styles.emptySubtitle}>
                    {t('checkBackEvents')}
                  </Text>
                </View>
              ) : (
                upcomingEvents.map((e) => (
                  <EventCard
                    key={e.id}
                    event={e}
                    onPress={() => setSelectedEvent({ ...e, _type: "event" })}
                    formatTime={formatEventTime}
                    formatDate={formatEventDate}
                    showDate
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Detail Modal ── */}
      {selectedEvent && (
        <DetailModal
          item={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          formatEventDate={formatEventDate}
          formatEventTime={formatEventTime}
          timeAgo={timeAgo}
          t={t}
        />
      )}
    </SafeAreaView>
  );
}

// ── Event Card Component ───────────────────────────────────────────────────
function EventCard({ event, onPress, formatTime, formatDate, showDate }) {
  const cfg = EVENT_COLORS[event.category] || EVENT_COLORS["other"];
  return (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.eventIconBox, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <View style={styles.eventMeta}>
          {showDate && event.date && (
            <Text style={styles.eventTime}>📅 {formatDate(event.date)}</Text>
          )}
          {event.date && (
            <Text style={styles.eventTime}>🕐 {formatTime(event.date)}</Text>
          )}
          {event.location && (
            <Text style={styles.eventTime} numberOfLines={1}>
              📍 {event.location}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────
function DetailModal({
  item,
  onClose,
  formatEventDate,
  formatEventTime,
  timeAgo,
  t,
}) {
  const isEvent = item._type === "event";
  const cfg = isEvent
    ? EVENT_COLORS[item.category] || EVENT_COLORS["other"]
    : ANNOUNCEMENT_COLORS[item.type] || ANNOUNCEMENT_COLORS["info"];

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          {/* Close button */}
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Ionicons name="close" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Icon + Title */}
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon} size={32} color={cfg.color} />
              </View>
              <View
                style={[styles.modalTypeBadge, { backgroundColor: cfg.bg }]}
              >
                <Text style={[styles.modalTypeText, { color: cfg.color }]}>
                  {isEvent
                    ? (item.category || "Event").toUpperCase()
                    : (item.type || "Info").toUpperCase()}
                </Text>
              </View>
              <Text style={styles.modalTitle}>{item.title}</Text>
            </View>

            {/* Event-specific info */}
            {isEvent && (
              <View style={styles.modalInfoGrid}>
                {item.date && (
                  <View style={styles.modalInfoRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={COLORS.textMuted}
                    />
                    <View>
                      <Text style={styles.modalInfoLabel}>{t('date')}</Text>
                      <Text style={styles.modalInfoValue}>
                        {formatEventDate(item.date)}
                      </Text>
                    </View>
                  </View>
                )}
                {item.date && (
                  <View style={styles.modalInfoRow}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={COLORS.textMuted}
                    />
                    <View>
                      <Text style={styles.modalInfoLabel}>{t('time')}</Text>
                      <Text style={styles.modalInfoValue}>
                        {formatEventTime(item.date)}
                      </Text>
                    </View>
                  </View>
                )}
                {item.location && (
                  <View style={styles.modalInfoRow}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={COLORS.textMuted}
                    />
                    <View>
                      <Text style={styles.modalInfoLabel}>{t('location')}</Text>
                      <Text style={styles.modalInfoValue}>{item.location}</Text>
                    </View>
                  </View>
                )}
                {item.organizer && (
                  <View style={styles.modalInfoRow}>
                    <Ionicons
                      name="person-outline"
                      size={16}
                      color={COLORS.textMuted}
                    />
                    <View>
                      <Text style={styles.modalInfoLabel}>{t('organizerLabel')}</Text>
                      <Text style={styles.modalInfoValue}>
                        {item.organizer}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Announcement meta */}
            {!isEvent && (
              <View style={styles.modalInfoGrid}>
                <View style={styles.modalInfoRow}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={COLORS.textMuted}
                  />
                  <View>
                    <Text style={styles.modalInfoLabel}>{t('postedBy')}</Text>
                    <Text style={styles.modalInfoValue}>
                      {item.author || "CitiVoice Admin"}
                    </Text>
                  </View>
                </View>
                <View style={styles.modalInfoRow}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={COLORS.textMuted}
                  />
                  <View>
                    <Text style={styles.modalInfoLabel}>{t('posted')}</Text>
                    <Text style={styles.modalInfoValue}>
                      {timeAgo(item.created_at)}
                    </Text>
                  </View>
                </View>
                {item.barangay && (
                  <View style={styles.modalInfoRow}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={COLORS.textMuted}
                    />
                    <View>
                      <Text style={styles.modalInfoLabel}>{t('barangay')}</Text>
                      <Text style={styles.modalInfoValue}>{item.barangay}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Body / Description */}
            <View style={styles.modalBody}>
              <Text style={styles.modalBodyLabel}>
                {isEvent ? t('aboutThisEvent') : t('announcementLabel')}
              </Text>
              <Text style={styles.modalBodyText}>
                {item.body || item.description || "No details provided."}
              </Text>
            </View>

            {/* Link button if available */}
            {item.link && (
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => Linking.openURL(item.link)}
              >
                <Ionicons name="open-outline" size={18} color="#fff" />
                <Text style={styles.linkBtnText}>{t('learnMore')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(14),
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: rf(22), fontWeight: "900" },
  headerSub: { color: COLORS.textSecondary, fontSize: rf(13), marginTop: verticalScale(2) },
  headerBadges: { flexDirection: "row", gap: scale(6) },
  unreadBadge: {
    backgroundColor: COLORS.primary + "33",
    borderRadius: moderateScale(20),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderWidth: 1,
    borderColor: COLORS.primary + "55",
  },
  unreadText: { color: COLORS.primary, fontSize: rf(11), fontWeight: "700" },

  tabRow: {
    flexDirection: "row",
    marginHorizontal: scale(16),
    backgroundColor: COLORS.bgCard,
    borderRadius: moderateScale(12),
    padding: scale(4),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(6),
    paddingVertical: verticalScale(9),
    borderRadius: moderateScale(9),
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textMuted, fontSize: rf(13), fontWeight: "700" },
  tabTextActive: { color: "#fff" },

  scroll: { paddingHorizontal: scale(16), paddingBottom: verticalScale(32) },

  // ── Loading / Empty ──
  loadingBox: { alignItems: "center", paddingVertical: verticalScale(60) },
  loadingText: { color: COLORS.textMuted, fontSize: rf(14) },
  emptyBox: { alignItems: "center", paddingVertical: verticalScale(60) },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: rf(18),
    fontWeight: "700",
    marginTop: verticalScale(14),
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: rf(13),
    textAlign: "center",
    marginTop: verticalScale(6),
    lineHeight: rf(20),
  },

  // ── Announcements ──
  announcementCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: moderateScale(16),
    padding: scale(14),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: scale(4),
  },
  announcementTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scale(10),
    marginBottom: verticalScale(8),
  },
  announcementIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(12),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  announcementTitle: {
    color: COLORS.textPrimary,
    fontSize: rf(15),
    fontWeight: "700",
    flex: 1,
  },
  announcementMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    marginTop: verticalScale(4),
  },
  typeBadge: { paddingHorizontal: scale(8), paddingVertical: verticalScale(2), borderRadius: moderateScale(20) },
  typeText: { fontSize: rf(10), fontWeight: "800", letterSpacing: 0.5 },
  timeAgo: { color: COLORS.textMuted, fontSize: rf(11) },
  announcementBody: {
    color: COLORS.textSecondary,
    fontSize: rf(13),
    lineHeight: rf(20),
    marginBottom: verticalScale(10),
  },
  announcementFooter: { flexDirection: "row", alignItems: "center", gap: scale(4) },
  announcementAuthor: { color: COLORS.textMuted, fontSize: rf(11) },
  dot: { color: COLORS.textMuted, fontSize: rf(11) },

  // ── Calendar ──
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },
  monthBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: moderateScale(10),
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: { color: COLORS.textPrimary, fontSize: rf(18), fontWeight: "800" },

  calendarCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: moderateScale(16),
    padding: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: verticalScale(16),
  },
  dayHeaders: { flexDirection: "row", marginBottom: verticalScale(8) },
  dayHeader: {
    flex: 1,
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: rf(11),
    fontWeight: "700",
  },

  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: scale(2),
  },
  dayCellToday: { backgroundColor: COLORS.primary + "33", borderRadius: moderateScale(10) },
  dayCellSelected: { backgroundColor: COLORS.primary, borderRadius: moderateScale(10) },
  dayCellHasEvents: { backgroundColor: COLORS.bgCardAlt, borderRadius: moderateScale(10) },
  dayNum: { color: COLORS.textSecondary, fontSize: rf(13), fontWeight: "600" },
  dayNumToday: { color: COLORS.primary, fontWeight: "900" },
  dayNumSelected: { color: "#fff", fontWeight: "900" },
  eventDots: { flexDirection: "row", gap: scale(2), marginTop: verticalScale(2) },
  eventDot: { width: scale(5), height: scale(5), borderRadius: scale(3) },

  // ── Selected day ──
  selectedDaySection: { marginBottom: verticalScale(16) },
  selectedDayTitle: {
    color: COLORS.textPrimary,
    fontSize: rf(16),
    fontWeight: "700",
    marginBottom: verticalScale(10),
  },
  noDayEvents: {
    backgroundColor: COLORS.bgCard,
    borderRadius: moderateScale(12),
    padding: scale(20),
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noDayEventsText: { color: COLORS.textMuted, fontSize: rf(13) },

  // ── Upcoming ──
  upcomingSection: { marginBottom: verticalScale(16) },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: rf(16),
    fontWeight: "700",
    marginBottom: verticalScale(10),
  },

  // ── Event Card ──
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    backgroundColor: COLORS.bgCard,
    borderRadius: moderateScale(14),
    padding: scale(12),
    marginBottom: verticalScale(8),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eventIconBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(12),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  eventTitle: {
    color: COLORS.textPrimary,
    fontSize: rf(14),
    fontWeight: "700",
    marginBottom: verticalScale(4),
  },
  eventMeta: { gap: verticalScale(2) },
  eventTime: { color: COLORS.textMuted, fontSize: rf(11) },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    padding: scale(20),
    paddingBottom: verticalScale(48),
    maxHeight: "90%",
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  modalHandle: {
    width: scale(40),
    height: verticalScale(4),
    borderRadius: scale(2),
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: verticalScale(14),
  },
  modalClose: {
    position: "absolute",
    top: verticalScale(16),
    right: scale(16),
    padding: scale(8),
    zIndex: 10,
  },
  modalHeader: { alignItems: "center", marginBottom: verticalScale(20) },
  modalIcon: {
    width: scale(72),
    height: scale(72),
    borderRadius: moderateScale(20),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(12),
  },
  modalTypeBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(20),
    marginBottom: verticalScale(10),
  },
  modalTypeText: { fontSize: rf(11), fontWeight: "800", letterSpacing: 0.5 },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: rf(20),
    fontWeight: "900",
    textAlign: "center",
    lineHeight: rf(28),
  },
  modalInfoGrid: {
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: moderateScale(14),
    padding: scale(14),
    marginBottom: verticalScale(16),
    gap: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: scale(10) },
  modalInfoLabel: {
    color: COLORS.textMuted,
    fontSize: rf(10),
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  modalInfoValue: {
    color: COLORS.textPrimary,
    fontSize: rf(14),
    fontWeight: "600",
    marginTop: verticalScale(2),
  },
  modalBody: { marginBottom: verticalScale(20) },
  modalBodyLabel: {
    color: COLORS.textMuted,
    fontSize: rf(11),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: verticalScale(8),
  },
  modalBodyText: { color: COLORS.textPrimary, fontSize: rf(15), lineHeight: rf(24) },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    backgroundColor: COLORS.primary,
    borderRadius: moderateScale(14),
    padding: scale(14),
  },
  linkBtnText: { color: "#fff", fontSize: rf(15), fontWeight: "700" },
});
