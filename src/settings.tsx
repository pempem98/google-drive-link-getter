import React, { useState, useEffect } from 'react';
import { loadMessages, getMessage } from './utils';

interface SettingsProps {
  separator: string;
  setSeparator: (value: string) => void;
  removeExtension: boolean;
  setRemoveExtension: (value: boolean) => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
  autoShareEnabled: boolean;
  setAutoShareEnabled: (value: boolean) => void;
  userLanguage: string | null;
  setUserLanguage: (value: string | null) => void;
}

const Settings: React.FC<SettingsProps> = ({
  separator,
  setSeparator,
  removeExtension,
  setRemoveExtension,
  darkMode,
  setDarkMode,
  notificationsEnabled,
  setNotificationsEnabled,
  autoShareEnabled,
  setAutoShareEnabled,
  userLanguage,
  setUserLanguage,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [messages, setMessages] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [customSeparator, setCustomSeparator] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const locale = userLanguage || chrome.i18n.getUILanguage().split('-')[0];
      const loadedMessages = await loadMessages(locale);
      setMessages(loadedMessages);
      setIsLoading(false);
    };
    load();
  }, [userLanguage]);

  // Load custom separator if previously saved
  useEffect(() => {
    chrome.storage.local.get(['settings'], (result) => {
      if (result.settings && result.settings.customSeparator) {
        setCustomSeparator(result.settings.customSeparator);
        if (result.settings.separator === 'other') {
          setShowCustomInput(true);
        }
      }
    });
  }, []);

  const handleSeparatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSeparator = e.target.value === 'tab' ? '\t' : e.target.value;
    const isOtherSelected = newSeparator === 'other';
    setShowCustomInput(isOtherSelected);
    setSeparator(newSeparator);

    if (!isOtherSelected) {
      // If not "Other", use the selected separator directly
      setCustomSeparator(''); // Reset custom separator
    }

    chrome.storage.local.set({
      settings: {
        separator: newSeparator,
        removeExtension,
        darkMode,
        notificationsEnabled,
        autoShareEnabled,
        userLanguage,
        customSeparator: isOtherSelected ? customSeparator : ''
      }
    });
  };

  const handleCustomSeparatorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCustomSeparator = e.target.value;
    setCustomSeparator(newCustomSeparator);
    setSeparator(newCustomSeparator); // Use custom separator as the active separator
    chrome.storage.local.set({
      settings: {
        separator: 'other',
        removeExtension,
        darkMode,
        notificationsEnabled,
        autoShareEnabled,
        userLanguage,
        customSeparator: newCustomSeparator
      }
    });
  };

  const handleExtensionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setRemoveExtension(newValue);
    chrome.storage.local.set({
      settings: {
        separator,
        removeExtension: newValue,
        darkMode,
        notificationsEnabled,
        autoShareEnabled,
        userLanguage,
        customSeparator
      }
    });
  };

  const handleDarkModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setDarkMode(newValue);
    chrome.storage.local.set({
      settings: {
        separator,
        removeExtension,
        darkMode: newValue,
        notificationsEnabled,
        autoShareEnabled,
        userLanguage,
        customSeparator
      }
    });
  };

  const handleNotificationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setNotificationsEnabled(newValue);
    chrome.storage.local.set({
      settings: {
        separator,
        removeExtension,
        darkMode,
        notificationsEnabled: newValue,
        autoShareEnabled,
        userLanguage,
        customSeparator
      }
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAutoShareChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setAutoShareEnabled(newValue);
    chrome.storage.local.set({
      settings: {
        separator,
        removeExtension,
        darkMode,
        notificationsEnabled,
        autoShareEnabled: newValue,
        userLanguage,
        customSeparator
      }
    });
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value === '' ? null : e.target.value;
    setUserLanguage(newLanguage);
    chrome.storage.local.set({
      settings: {
        separator,
        removeExtension,
        darkMode,
        notificationsEnabled,
        autoShareEnabled,
        userLanguage: newLanguage,
        customSeparator
      }
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="settings-container">
      <h2>{getMessage(messages, 'settingsTab')}</h2>
      <div className="setting-item language-setting">
        <label>{getMessage(messages, 'languageLabel')}</label>
        <select value={userLanguage || ''} onChange={handleLanguageChange}>
          <option value="">{getMessage(messages, 'languageDefault')}</option>
          <option value="vi">{getMessage(messages, 'languageVietnamese')}</option>
          <option value="en">{getMessage(messages, 'languageEnglish')}</option>
        </select>
      </div>
      <div className="setting-item separator-setting">
        <label>{getMessage(messages, 'separatorLabel')}</label>
        <select value={separator === '\t' ? 'tab' : (separator === 'other' || (showCustomInput && customSeparator) ? 'other' : separator)} onChange={handleSeparatorChange}>
          <option value="tab">{getMessage(messages, 'separatorTab')}</option>
          <option value=" ">{getMessage(messages, 'separatorSpace')}</option>
          <option value=":">{getMessage(messages, 'separatorColon')}</option>
          <option value=",">{getMessage(messages, 'separatorComma')}</option>
          <option value="-">{getMessage(messages, 'separatorHyphen')}</option>
          <option value="|">{getMessage(messages, 'separatorPipe')}</option>
          <option value="other">{getMessage(messages, 'separatorOther')}</option>
        </select>
        {showCustomInput && (
          <input
            type="text"
            className="custom-separator-input"
            value={customSeparator}
            onChange={handleCustomSeparatorChange}
            placeholder={getMessage(messages, 'customSeparatorPlaceholder')}
          />
        )}
      </div>
      <div className="checkbox-setting">
        <label>
          <input
            type="checkbox"
            checked={removeExtension}
            onChange={handleExtensionChange}
          />
          <span>{getMessage(messages, 'extensionLabel')}</span>
        </label>
      </div>
      <div className="checkbox-setting">
        <label>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={handleDarkModeChange}
          />
          <span>{getMessage(messages, 'darkModeLabel')}</span>
        </label>
      </div>
      <div className="checkbox-setting">
        <label>
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={handleNotificationsChange}
          />
          <span>{getMessage(messages, 'notificationsLabel')}</span>
        </label>
      </div>
      {/* Temporarily disabled auto-share option */}
      {/*
      <div className="checkbox-setting">
        <label>
          <input
            type="checkbox"
            checked={autoShareEnabled}
            onChange={handleAutoShareChange}
          />
          <span>{getMessage(messages, "autoShareLabel")}</span>
        </label>
      </div>
      */}
    </div>
  );
};

export default Settings;