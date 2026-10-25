import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiClient, type ChatNutritionMessage } from '../../api/apiClient.js';
import type { DailyGoal } from '../../types/nutrition.js';
import { Icon } from '../ui/Icon.js';

export interface NutritionChatAssistantProps {
  userName?: string;
  activeGoal?: DailyGoal | null;
  consumedCalories?: number;
  consumedProtein?: number;
  consumedCarbs?: number;
  consumedFat?: number;
  waterIntakeMl?: number;
  selectedDate?: string;
  allergies?: string[];
  onLogWater?: (amountMl: number, note?: string) => void;
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedPrompts?: string[];
}

function getCurrentTimeString(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

let messageSeq = 0;
function createMessageId(prefix: string): string {
  messageSeq += 1;
  return `${prefix}-${messageSeq}`;
}

export const NutritionChatAssistant: React.FC<NutritionChatAssistantProps> = ({
  userName = 'Friend',
  activeGoal,
  consumedCalories = 0,
  consumedProtein = 0,
  consumedCarbs = 0,
  consumedFat = 0,
  waterIntakeMl = 0,
  selectedDate,
  allergies = [],
  onLogWater,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const targetCalories = activeGoal?.dailyCaloriesKcal || 2000;
  const targetProtein = activeGoal?.proteinGrams || 150;
  const targetCarbs = activeGoal?.carbohydrateGrams || 200;
  const targetFat = activeGoal?.fatGrams || 65;

  const remainingCalories = Math.max(0, targetCalories - consumedCalories);
  const remainingProtein = Math.max(0, targetProtein - consumedProtein);

  // Initial welcome greeting
  const initialGreeting = useMemo<DisplayMessage>(() => ({
    id: 'msg-welcome',
    role: 'assistant',
    content: `Hi ${userName.split(' ')[0]}! I'm your **Calories AI Nutrition Assistant**.\n\n` +
      `Today you've logged **${consumedCalories} kcal** with **${remainingCalories} kcal** remaining towards your **${targetCalories} kcal** target (${remainingProtein}g protein needed).\n\n` +
      `How can I help you plan your next meal or balance your nutrients today?`,
    timestamp: getCurrentTimeString(),
    suggestedPrompts: [
      'What should I eat for dinner?',
      'High protein snack under 200 kcal',
      'Check my daily protein deficit',
      'How is my hydration today?',
    ],
  }), [userName, consumedCalories, remainingCalories, targetCalories, remainingProtein]);

  const [messages, setMessages] = useState<DisplayMessage[]>([initialGreeting]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: DisplayMessage = {
      id: createMessageId('user'),
      role: 'user',
      content: query,
      timestamp: getCurrentTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');

    // Check if the query is an action intent to log water (e.g. "Log 500ml water", "I drank 350ml water")
    const waterLogMatch = query.match(/(?:log|add|drank|drink|track|have)\s+(\d+)\s*(?:ml)?(?:\s+(?:of\s+)?water)?/i)
      || query.match(/(\d+)\s*ml\s+(?:of\s+)?water/i)
      || query.match(/log\s+water\s*[:-]?\s*(\d+)/i);

    if (waterLogMatch) {
      const amount = parseInt(waterLogMatch[1], 10);
      if (amount > 0 && onLogWater) {
        onLogWater(amount, 'Logged via Calories AI Assistant');
        const newTotal = (waterIntakeMl || 0) + amount;
        const remaining = Math.max(0, 3000 - newTotal);
        const assistantMsg: DisplayMessage = {
          id: createMessageId('assistant'),
          role: 'assistant',
          content: `💧 **Logged ${amount} ml of water!**\n\n` +
            `Your total water intake for today is now **${newTotal} ml** towards your **3,000 ml** target ` +
            `(${remaining > 0 ? `**${remaining} ml** remaining` : '🎉 daily target achieved!'}).\n\n` +
            `Drinking water regularly optimizes nutrient delivery, supports joint health, and keeps metabolic rate high.`,
          timestamp: getCurrentTimeString(),
          suggestedPrompts: [
            'How is my hydration today?',
            'Log another 250ml water',
            'What should I eat next?',
          ],
        };
        setMessages((prev) => [...prev, assistantMsg]);
        return;
      }
    }

    // Check if the query is specifically asking about today's live hydration status
    const isHydrationStatusQuery = /(?:hydration|hydrate|water)/i.test(query) &&
      /(?:how|status|today|did i|have i|intake|check|much)/i.test(query) &&
      !/(?:log|add|drank|track)/i.test(query);

    if (isHydrationStatusQuery) {
      if (!waterIntakeMl || waterIntakeMl === 0) {
        const assistantMsg: DisplayMessage = {
          id: createMessageId('assistant'),
          role: 'assistant',
          content: `You haven't logged any water yet today (**0 ml / 3,000 ml** target).\n\n` +
            `• **Daily Benchmark:** 2,500 – 3,000 ml per day.\n` +
            `• **Action Tip:** Drink a full 350ml glass of water now to kickstart your metabolism and prevent confusing dehydration with hunger cues.`,
          timestamp: getCurrentTimeString(),
          suggestedPrompts: [
            'Log 250ml water',
            'Log 500ml water',
            'What should I eat next?',
          ],
        };
        setMessages((prev) => [...prev, assistantMsg]);
        return;
      }

      const pct = Math.round((waterIntakeMl / 3000) * 100);
      const remaining = Math.max(0, 3000 - waterIntakeMl);
      const assistantMsg: DisplayMessage = {
        id: createMessageId('assistant'),
        role: 'assistant',
        content: `Here is your live hydration status for today:\n\n` +
          `• **Logged Water:** **${waterIntakeMl} ml** / 3,000 ml (${pct}% of target)\n` +
          `• **Remaining:** **${remaining} ml** needed to reach optimal hydration\n\n` +
          (remaining > 0
            ? `💡 Keep a water bottle nearby and aim for 250–500ml every couple of hours.`
            : `🎉 Excellent job! You have reached your daily hydration goal.`),
        timestamp: getCurrentTimeString(),
        suggestedPrompts: [
          'Log 250ml water',
          'Log 500ml water',
          'What should I eat for dinner?',
        ],
      };
      setMessages((prev) => [...prev, assistantMsg]);
      return;
    }

    setIsLoading(true);

    // Build history payload for server
    const historyPayload: ChatNutritionMessage[] = messages
      .filter((m) => m.id !== 'msg-welcome')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await apiClient.sendNutritionChat(
        query,
        historyPayload,
        selectedDate
      );

      const assistantMsg: DisplayMessage = {
        id: createMessageId('assistant'),
        role: 'assistant',
        content: response.reply,
        timestamp: getCurrentTimeString(),
        suggestedPrompts: response.suggestedPrompts,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (_err) {
      console.warn('[NutritionChatAssistant] Service request failed:', _err);
      const fallbackErrorMsg: DisplayMessage = {
        id: createMessageId('assistant-err'),
        role: 'assistant',
        content: `I'm having a brief connection pause with the AI service. ` +
          `Based on your live numbers, you have **${remainingCalories} kcal** and **${remainingProtein}g protein** remaining today. ` +
          `Try a lean protein bowl with steamed vegetables or a cup of Greek yogurt!`,
        timestamp: getCurrentTimeString(),
        suggestedPrompts: [
          'What should I eat for dinner?',
          'Suggest a high-protein snack',
        ],
      };
      setMessages((prev) => [...prev, fallbackErrorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        ...initialGreeting,
        timestamp: getCurrentTimeString(),
      },
    ]);
  };

  // Safe lightweight renderer for markdown formatting in chat bubbles
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (!line.trim()) {
        return <div key={idx} style={{ height: '8px' }} />;
      }

      // Check if bullet point
      const isBullet = line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ');
      const cleanLine = isBullet ? line.replace(/^[•\-*]\s+/, '') : line;

      // Simple regex for bold (**bold**)
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} style={{ color: 'inherit', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} className="nutrition-chat-bullet-row">
            <span className="nutrition-chat-bullet-dot">•</span>
            <div className="nutrition-chat-bullet-text">{renderedParts}</div>
          </div>
        );
      }

      return (
        <p key={idx} className="nutrition-chat-paragraph">
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Launcher Pill */}
      {!isOpen && (
        <button
          type="button"
          className="nutrition-chat-launcher"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          aria-label="Open AI Nutrition Assistant"
          title="Ask AI Nutritionist"
        >
          <div className="nutrition-chat-launcher-icon-wrap">
            <Icon name="leaf" size={20} />
            <span className="nutrition-chat-pulse-indicator" />
          </div>
          <span className="nutrition-chat-launcher-label">Ask Nutritionist AI</span>
          <span className="nutrition-chat-launcher-badge">{remainingCalories} kcal left</span>
        </button>
      )}

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div className={`nutrition-chat-window ${isMinimized ? 'nutrition-chat-window-minimized' : ''}`}>
          {/* Header */}
          <div className="nutrition-chat-header">
            <div className="nutrition-chat-header-left">
              <div className="nutrition-chat-avatar">
                <Icon name="leaf" size={18} />
              </div>
              <div className="nutrition-chat-header-text">
                <div className="nutrition-chat-header-title">
                  <span>Calories AI Nutritionist</span>
                  <span className="nutrition-chat-status-pill">● Context Aware</span>
                </div>
                <div className="nutrition-chat-header-subtitle">
                  Aware of your goals, logged meals &amp; allergies
                </div>
              </div>
            </div>

            <div className="nutrition-chat-header-actions">
              <button
                type="button"
                className="nutrition-chat-btn-icon"
                onClick={handleResetChat}
                title="Restart Conversation"
                aria-label="Restart Conversation"
              >
                ↺
              </button>
              <button
                type="button"
                className="nutrition-chat-btn-icon"
                onClick={() => setIsMinimized((prev) => !prev)}
                title={isMinimized ? 'Expand' : 'Minimize'}
                aria-label={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? '▢' : '—'}
              </button>
              <button
                type="button"
                className="nutrition-chat-btn-icon"
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                aria-label="Close Assistant"
              >
                ✕
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Live Context Bar */}
              <div className="nutrition-chat-context-bar">
                <div className="nutrition-chat-context-item">
                  <span className="nutrition-chat-context-label">Calories:</span>
                  <span className="nutrition-chat-context-val">
                    {consumedCalories} / {targetCalories} kcal
                    <strong style={{ color: '#285B46', marginLeft: '4px' }}>({remainingCalories} left)</strong>
                  </span>
                </div>
                <div className="nutrition-chat-context-divider" />
                <div className="nutrition-chat-context-item">
                  <span className="nutrition-chat-context-label">Protein:</span>
                  <span className="nutrition-chat-context-val">
                    {consumedProtein}g / {targetProtein}g
                  </span>
                </div>
                <div className="nutrition-chat-context-divider" />
                <div className="nutrition-chat-context-item">
                  <span className="nutrition-chat-context-label">Carbs:</span>
                  <span className="nutrition-chat-context-val">
                    {consumedCarbs}g / {targetCarbs}g
                  </span>
                </div>
                <div className="nutrition-chat-context-divider" />
                <div className="nutrition-chat-context-item">
                  <span className="nutrition-chat-context-label">Fat:</span>
                  <span className="nutrition-chat-context-val">
                    {consumedFat}g / {targetFat}g
                  </span>
                </div>
                {waterIntakeMl > 0 && (
                  <>
                    <div className="nutrition-chat-context-divider" />
                    <div className="nutrition-chat-context-item">
                      <span className="nutrition-chat-context-label">Water:</span>
                      <span className="nutrition-chat-context-val">{waterIntakeMl} ml</span>
                    </div>
                  </>
                )}
                {allergies.length > 0 && (
                  <>
                    <div className="nutrition-chat-context-divider" />
                    <div className="nutrition-chat-context-item nutrition-chat-context-allergy">
                      <span className="nutrition-chat-context-label">Allergens:</span>
                      <span className="nutrition-chat-context-val">{allergies.join(', ')}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Message List */}
              <div className="nutrition-chat-messages">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`nutrition-chat-msg-row ${
                      msg.role === 'user' ? 'nutrition-chat-msg-user' : 'nutrition-chat-msg-assistant'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="nutrition-chat-msg-avatar">
                        <Icon name="leaf" size={14} />
                      </div>
                    )}
                    <div className="nutrition-chat-msg-body">
                      <div className="nutrition-chat-msg-bubble">
                        {renderFormattedText(msg.content)}
                      </div>
                      <span className="nutrition-chat-msg-time">{msg.timestamp}</span>

                      {/* Prompt Suggestions */}
                      {msg.role === 'assistant' && msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                        <div className="nutrition-chat-chips-wrap">
                          <span className="nutrition-chat-chips-title">Suggested prompts:</span>
                          <div className="nutrition-chat-chips-list">
                            {msg.suggestedPrompts.map((prompt, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                className="nutrition-chat-chip"
                                onClick={() => handleSendMessage(prompt)}
                                disabled={isLoading}
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="nutrition-chat-msg-row nutrition-chat-msg-assistant">
                    <div className="nutrition-chat-msg-avatar">
                      <Icon name="leaf" size={14} />
                    </div>
                    <div className="nutrition-chat-msg-body">
                      <div className="nutrition-chat-msg-bubble nutrition-chat-thinking">
                        <span className="nutrition-chat-dot" />
                        <span className="nutrition-chat-dot" />
                        <span className="nutrition-chat-dot" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="nutrition-chat-input-bar">
                <input
                  ref={inputRef}
                  type="text"
                  className="nutrition-chat-input"
                  placeholder="Ask anything about today's meals, macros or recipes..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="nutrition-chat-send-btn"
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isLoading}
                  aria-label="Send message"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
