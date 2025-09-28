/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {streamEmeraudeResponse} from '../services/geminiService';
import {AppDefinition, InteractionData} from '../types';

interface Message {
  sender: 'user' | 'ai';
  htmlContent: string;
}

interface EmeraudeAssistantProps {
  activeApp: AppDefinition | null;
  llmContent: string;
  interactionHistory: InteractionData[];
}

export const EmeraudeAssistant: React.FC<EmeraudeAssistantProps> = ({
  activeApp,
  llmContent,
  interactionHistory,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);
  
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          sender: 'ai',
          htmlContent:
            '<p>Hello! I am Emeraude. How can I assist you today?</p>',
        },
      ]);
    }
  }, [isOpen, messages.length]);

  const handleSendMessage = useCallback(async () => {
    if (!userInput.trim() || isLoading) return;

    const newUserMessage: Message = {
      sender: 'user',
      htmlContent: `<p>${userInput}</p>`,
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    // Create context
    const textContent =
      new DOMParser().parseFromString(llmContent, 'text/html').body
        .textContent || '';
    const screenContext = `The user is currently in the '${
      activeApp?.name || 'Desktop'
    }' app. The first 500 characters of text on the screen are: "${textContent
      .trim()
      .substring(0, 500)}..."`;

    let accumulatedResponse = '';
    const aiMessage: Message = {sender: 'ai', htmlContent: ''};
    setMessages((prev) => [...prev, aiMessage]);

    try {
      const stream = streamEmeraudeResponse(screenContext, userInput);
      for await (const chunk of stream) {
        accumulatedResponse += chunk;
        setMessages((prev) =>
          prev.map((msg, index) =>
            index === prev.length - 1
              ? {...msg, htmlContent: accumulatedResponse}
              : msg,
          ),
        );
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) =>
        prev.map((msg, index) =>
          index === prev.length - 1
            ? {
                ...msg,
                htmlContent:
                  '<p class="text-red-500">An error occurred.</p>',
              }
            : msg,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [userInput, isLoading, llmContent, activeApp]);

  const handleToggleChat = () => {
    if (isOpen && isFullScreen) {
      setIsFullScreen(false);
    }
    setIsOpen(!isOpen);
  };

  const handleToggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const chatWindowClass = [
    'emeraude-chat-window',
    isOpen ? 'open' : '',
    isFullScreen ? 'fullscreen' : '',
  ]
    .join(' ')
    .trim();

  return (
    <div className="emeraude-widget-container">
      {/* Chat Window */}
      <div className={chatWindowClass}>
        <div className="emeraude-chat-header">
          <span>Emeraude AI</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFullScreen}
              title={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="text-xl">
              {isFullScreen ? '↙️' : '↗️'}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              title="Close"
              className="text-xl">
              &times;
            </button>
          </div>
        </div>
        <div ref={chatBodyRef} className="emeraude-chat-body">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`emeraude-message ${msg.sender}`}
              dangerouslySetInnerHTML={{__html: msg.htmlContent}}
            />
          ))}
        </div>
        <div className="emeraude-chat-footer">
          <input
            type="text"
            className="emeraude-chat-input"
            placeholder="Ask Emeraude..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading}
            className="llm-button !m-0 !py-2 !px-3">
            {isLoading ? '...' : '➤'}
          </button>
        </div>
      </div>

      {/* Floating Icon Button */}
      <div
        className="emeraude-icon-button"
        onClick={handleToggleChat}
        role="button"
        aria-label="Open Emeraude AI Assistant"
        tabIndex={0}>
        <span className="emeraude-icon">💎</span>
        <span className="emeraude-label">Emeraude</span>
      </div>
    </div>
  );
};
