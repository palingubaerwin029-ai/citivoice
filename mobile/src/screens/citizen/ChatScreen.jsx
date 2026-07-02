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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { mobileApi } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';
import { useLanguage } from '../../context/LanguageContext';

export default function ChatScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const flatListRef = useRef();

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
      if (history.length > 0) {
        setMessages(history);
      } else {
        setMessages([{ id: 'welcome', sender: 'ai', message: t('chatbotWelcome') }]);
      }
    } catch (err) {
      console.log('Failed to load chat history', err);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const userMsg = { id: Date.now().toString(), sender: 'user', message: inputText.trim() };
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

  const renderItem = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[
        styles.msgContainer, 
        isUser ? styles.userMsgContainer : styles.aiMsgContainer
      ]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Ionicons name="sparkles" size={14} color="#fff" />
          </View>
        )}
        <View style={[
          styles.msgBubble,
          { backgroundColor: isUser ? colors.primary : colors.bgCard }
        ]}>
          <Text style={[styles.msgText, { color: isUser ? '#fff' : colors.textPrimary }]}>
            {item.message}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgDark }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          CitiVoice AI
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={[styles.inputContainer, { backgroundColor: colors.bgCard, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bgDark, color: colors.textPrimary }]}
            placeholder="Type your message..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? colors.primary : colors.bgDark }]}
            onPress={sendMessage}
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
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: scale(40),
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: rf(16),
    fontWeight: '700',
  },
  keyboardView: { flex: 1 },
  listContent: { padding: scale(16), gap: verticalScale(12) },
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
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgBubble: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(16),
  },
  msgText: {
    fontSize: rf(14),
    lineHeight: rf(20),
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
  },
  sendBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
  }
});
