import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AdminChatIcon from '../../components/AdminChatIcon';
import { useTheme } from '../../context/ThemeContext';
import { mobileApi } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';
import { useLanguage } from '../../context/LanguageContext';

export default function ChatScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const flatListRef = useRef();

  const QUICK_PROMPTS = [
    { label: '📊 Check My Reports', prompt: 'What is the current status of my reported concerns?' },
    { label: '🚨 How to File Report?', prompt: 'How do I report a new concern in Kabankalan City?' },
    { label: '⚡ Streetlight Issues', prompt: 'Who handles broken streetlights and electric posts?' },
    { label: '🗑️ Garbage Schedule', prompt: 'What is the garbage collection schedule for CENRO?' },
  ];

  useEffect(() => {
    const initChat = async () => {
      const storedToken = await AsyncStorage.getItem('cv_chat_token');
      if (storedToken) {
        setSessionToken(storedToken);
        loadHistory(storedToken);
      } else {
        setMessages([
          { id: 'welcome', sender: 'ai', message: t('chatbotWelcome') }
        ]);
      }
    };
    initChat();
  }, []);

  const loadHistory = async (token) => {
    try {
      const res = await mobileApi.get(`/chatbot/${token}`);
      const history = res.data || res || [];
      if (Array.isArray(history) && history.length > 0) {
        setMessages(history);
      } else {
        setMessages([{ id: 'welcome', sender: 'ai', message: t('chatbotWelcome') }]);
      }
    } catch (err) {
      console.log('Failed to load chat history', err);
      await AsyncStorage.removeItem('cv_chat_token');
      setSessionToken(null);
      setMessages([{ id: 'welcome', sender: 'ai', message: t('chatbotWelcome') }]);
    }
  };

  const handleSendText = async (textToSend) => {
    if (!textToSend.trim()) return;
    const userMsg = { id: Date.now().toString(), sender: 'user', message: textToSend.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await mobileApi.post('/chatbot/message', {
        sessionToken,
        message: userMsg.message
      });
      const data = res.data || res;
      
      if (data.sessionToken && data.sessionToken !== sessionToken) {
        setSessionToken(data.sessionToken);
        await AsyncStorage.setItem('cv_chat_token', data.sessionToken);
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', message: data.message }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', message: 'Sorry, I encountered an error. Please try again later.' }]);
    }
    setLoading(false);
  };

  const clearChat = async () => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to reset your conversation history with the AI Assistant?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('cv_chat_token');
            setSessionToken(null);
            setMessages([{ id: 'welcome', sender: 'ai', message: t('chatbotWelcome') }]);
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[
        styles.msgContainer, 
        isUser ? styles.userMsgContainer : styles.aiMsgContainer
      ]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <AdminChatIcon size={14} color="#fff" />
          </View>
        )}
        <View style={[
          styles.msgBubble,
          { 
            backgroundColor: isUser ? colors.primary : colors.bgCard,
            borderColor: isUser ? 'transparent' : colors.border,
            borderWidth: isUser ? 0 : 1,
          }
        ]}>
          <Text style={[styles.msgText, { color: isUser ? '#fff' : colors.textPrimary }]}>
            {item.message}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
      {/* Official Executive Header */}
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              CitiVoice AI Assistant
            </Text>
            <View style={styles.onlineDot} />
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Office of the City Mayor · Kabankalan City
          </Text>
        </View>

        <TouchableOpacity onPress={clearChat} style={styles.headerBtn}>
          <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Quick Suggestion Chips */}
        <View style={[styles.chipsContainer, { borderTopColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {QUICK_PROMPTS.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.chipBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                onPress={() => handleSendText(item.prompt)}
                disabled={loading}
              >
                <Text style={[styles.chipText, { color: colors.primary }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={[
          styles.inputContainer, 
          { 
            backgroundColor: colors.bgCard, 
            borderTopColor: colors.border,
            paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, scale(12)) : scale(12)
          }
        ]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bgDark, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="Ask AI assistant in English or Hiligaynon..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? colors.primary : colors.bgDark }]}
            onPress={() => handleSendText(inputText)}
            disabled={!inputText.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color={inputText.trim() ? '#fff' : colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: scale(38),
    height: scale(38),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  headerTitle: {
    fontSize: rf(15),
    fontWeight: '700',
  },
  onlineDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#22c55e',
  },
  headerSubtitle: {
    fontSize: rf(11),
    fontWeight: '500',
    marginTop: verticalScale(2),
  },
  keyboardView: { flex: 1 },
  listContent: { padding: scale(16), gap: verticalScale(14) },
  msgContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  userMsgContainer: {
    alignSelf: 'flex-end',
  },
  aiMsgContainer: {
    alignSelf: 'flex-start',
    gap: scale(8),
  },
  avatar: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(2),
  },
  msgBubble: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  msgText: {
    fontSize: rf(14),
    lineHeight: rf(21),
  },
  chipsContainer: {
    paddingVertical: verticalScale(8),
    borderTopWidth: 1,
  },
  chipsScroll: {
    paddingHorizontal: scale(14),
    gap: scale(8),
  },
  chipBtn: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(7),
    borderRadius: moderateScale(20),
    borderWidth: 1,
  },
  chipText: {
    fontSize: rf(12),
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(12),
    borderTopWidth: 1,
    gap: scale(10),
  },
  input: {
    flex: 1,
    borderRadius: moderateScale(20),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(10),
    fontSize: rf(14),
    maxHeight: verticalScale(100),
    borderWidth: 1,
  },
  sendBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
  }
});
