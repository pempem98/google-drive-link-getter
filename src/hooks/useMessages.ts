import { useState, useEffect } from 'react';
import { loadMessages, Messages } from '../utils/utils';

export const useMessages = (userLanguage: string | null) => {
  const [messages, setMessages] = useState<Messages>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const locale = userLanguage || chrome.i18n.getUILanguage().split('-')[0];
      console.log('useMessages: Loading messages for locale:', locale);
      try {
        const loadedMessages = await loadMessages(locale);
        console.log('useMessages: Messages loaded:', loadedMessages);
        setMessages(loadedMessages);
      } catch (error) {
        console.error('useMessages: Error loading messages:', error);
        setMessages({});
      } finally {
        setIsLoading(false);
        console.log('useMessages: Loading complete, isLoading:', false);
      }
    };
    load();
  }, [userLanguage]);

  return { messages, isLoading };
};
