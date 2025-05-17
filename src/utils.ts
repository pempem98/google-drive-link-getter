// src/utils.ts
interface MessageEntry {
  message: string;
  description?: string;
}

interface Messages {
  [key: string]: MessageEntry;
}

const messagesCache: { [locale: string]: Messages } = {};

export const loadMessages = async (locale: string): Promise<Messages> => {
  if (messagesCache[locale]) {
    return messagesCache[locale];
  }

  try {
    const response = await fetch(`/_locales/${locale}/messages.json`);
    if (!response.ok) {
      throw new Error(`Failed to load messages for locale ${locale}`);
    }
    const messages = await response.json();
    messagesCache[locale] = messages;
    return messages;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    // Fallback to default locale 'vi'
    if (locale !== 'vi') {
      const fallbackMessages = await loadMessages('vi');
      messagesCache[locale] = fallbackMessages;
      return fallbackMessages;
    }
    // If even 'vi' fails, return an empty object with a warning
    // eslint-disable-next-line no-console
    console.warn('Failed to load messages for default locale "vi".');
    messagesCache[locale] = {};
    return {};
  }
};

export const getMessage = (messages: Messages, messageName: string, substitutions?: string | string[]): string => {
  const entry = messages[messageName];
  if (!entry || !entry.message) {
    // Fallback to messageName if not found
    return messageName;
  }

  let message = entry.message;
  if (substitutions) {
    const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
    subs.forEach((sub, index) => {
      message = message.replace(`$${index + 1}$`, sub);
    });
  }
  return message;
};