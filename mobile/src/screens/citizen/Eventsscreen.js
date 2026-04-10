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
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { COLORS } from "../../utils/theme";

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

  useEffect(() => {
    // Listen to announcements
    const unsubAnnouncements = onSnapshot(
      query(collection(db, "announcements"), orderBy("createdAt", "desc")),
      (snap) => {
        setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
    );

    // Listen to events
    const unsubEvents = onSnapshot(
      query(collection(db, "events"), orderBy("date", "asc")),
      (snap) => {
        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
    );

    return () => {
      unsubAnnouncements();
      unsubEvents();
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
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
      const d = e.date.toDate ? e.date.toDate() : new Date(e.date);
      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 86400000);
      return d >= now && d <= in30;
    })
    .slice(0, 5);

  const selectedDayEvents = selectedDate ? getEventsOnDate(selectedDate) : [];

  const formatEventDate = (date) => {
    if (!date) return "";
    const d = date.toDate ? date.toDate() : new Date(date);
    return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const formatEventTime = (date) => {
    if (!date) return "";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const timeAgo = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
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
          <Text style={styles.headerTitle}>Community Board</Text>
          <Text style={styles.headerSub}>Events & Announcements</Text>
        </View>
        <View style={styles.headerBadges}>
          {announcements.filter((a) => !a.read).length > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{announcements.length} new</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabRow}>
        {[
          { key: "announcements", label: "Announcements", icon: "megaphone" },
          { key: "calendar", label: "Calendar", icon: "calendar" },
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
                <Text style={styles.loadingText}>Loading announcements...</Text>
              </View>
            ) : announcements.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 48 }}>📢</Text>
                <Text style={styles.emptyTitle}>No announcements yet</Text>
                <Text style={styles.emptySubtitle}>
                  Check back later for updates from your local government.
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
                            {timeAgo(a.createdAt)}
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
                      No events on this day
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
              <Text style={styles.sectionTitle}>📆 Upcoming Events</Text>
              {upcomingEvents.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={{ fontSize: 40 }}>🗓️</Text>
                  <Text style={styles.emptyTitle}>No upcoming events</Text>
                  <Text style={styles.emptySubtitle}>
                    Check back later for scheduled events.
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
                      <Text style={styles.modalInfoLabel}>Date</Text>
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
                      <Text style={styles.modalInfoLabel}>Time</Text>
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
                      <Text style={styles.modalInfoLabel}>Location</Text>
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
                      <Text style={styles.modalInfoLabel}>Organizer</Text>
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
                    <Text style={styles.modalInfoLabel}>Posted by</Text>
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
                    <Text style={styles.modalInfoLabel}>Posted</Text>
                    <Text style={styles.modalInfoValue}>
                      {timeAgo(item.createdAt)}
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
                      <Text style={styles.modalInfoLabel}>Barangay</Text>
                      <Text style={styles.modalInfoValue}>{item.barangay}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Body / Description */}
            <View style={styles.modalBody}>
              <Text style={styles.modalBodyLabel}>
                {isEvent ? "About this Event" : "Announcement"}
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
                <Text style={styles.linkBtnText}>Learn More</Text>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "900" },
  headerSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  headerBadges: { flexDirection: "row", gap: 6 },
  unreadBadge: {
    backgroundColor: COLORS.primary + "33",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.primary + "55",
  },
  unreadText: { color: COLORS.primary, fontSize: 11, fontWeight: "700" },

  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "700" },
  tabTextActive: { color: "#fff" },

  scroll: { paddingHorizontal: 16, paddingBottom: 32 },

  // ── Loading / Empty ──
  loadingBox: { alignItems: "center", paddingVertical: 60 },
  loadingText: { color: COLORS.textMuted, fontSize: 14 },
  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 14,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },

  // ── Announcements ──
  announcementCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
  },
  announcementTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  announcementIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  announcementTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  announcementMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  typeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  timeAgo: { color: COLORS.textMuted, fontSize: 11 },
  announcementBody: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  announcementFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  announcementAuthor: { color: COLORS.textMuted, fontSize: 11 },
  dot: { color: COLORS.textMuted, fontSize: 11 },

  // ── Calendar ──
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "800" },

  calendarCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  dayHeaders: { flexDirection: "row", marginBottom: 8 },
  dayHeader: {
    flex: 1,
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },

  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  dayCellToday: { backgroundColor: COLORS.primary + "33", borderRadius: 10 },
  dayCellSelected: { backgroundColor: COLORS.primary, borderRadius: 10 },
  dayCellHasEvents: { backgroundColor: COLORS.bgCardAlt, borderRadius: 10 },
  dayNum: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "600" },
  dayNumToday: { color: COLORS.primary, fontWeight: "900" },
  dayNumSelected: { color: "#fff", fontWeight: "900" },
  eventDots: { flexDirection: "row", gap: 2, marginTop: 2 },
  eventDot: { width: 5, height: 5, borderRadius: 3 },

  // ── Selected day ──
  selectedDaySection: { marginBottom: 16 },
  selectedDayTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  noDayEvents: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noDayEventsText: { color: COLORS.textMuted, fontSize: 13 },

  // ── Upcoming ──
  upcomingSection: { marginBottom: 16 },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },

  // ── Event Card ──
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eventIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  eventTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  eventMeta: { gap: 2 },
  eventTime: { color: COLORS.textMuted, fontSize: 11 },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 48,
    maxHeight: "90%",
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalClose: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  modalHeader: { alignItems: "center", marginBottom: 20 },
  modalIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  modalTypeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 28,
  },
  modalInfoGrid: {
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  modalInfoLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  modalInfoValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  modalBody: { marginBottom: 20 },
  modalBodyLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  modalBodyText: { color: COLORS.textPrimary, fontSize: 15, lineHeight: 24 },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 14,
  },
  linkBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
