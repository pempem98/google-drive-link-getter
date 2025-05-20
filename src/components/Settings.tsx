import React, { useState, useEffect } from 'react';
import LanguageSetting from './LanguageSetting';
import SeparatorSetting from './SeparatorSetting';
import CheckboxSetting from './CheckboxSetting';
import { useMessages } from '../hooks/useMessages';
import { saveSettings } from '../utils/storageUtils';
import { getMessage } from '../utils/utils';
// import { Messages } from '../types';

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
  // setAutoShareEnabled,
  userLanguage,
  setUserLanguage,
}) => {
  const { messages, isLoading } = useMessages(userLanguage);
  const [customSeparator, setCustomSeparator] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

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

  const handleSeparatorChange = (newSeparator: string, newCustomSeparator: string) => {
    saveSettings({
      separator: newSeparator,
      removeExtension,
      darkMode,
      notificationsEnabled,
      autoShareEnabled,
      userLanguage,
      customSeparator: newCustomSeparator,
    });
  };

  const handleExtensionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setRemoveExtension(newValue);
    saveSettings({
      separator,
      removeExtension: newValue,
      darkMode,
      notificationsEnabled,
      autoShareEnabled,
      userLanguage,
      customSeparator,
    });
  };

  const handleDarkModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setDarkMode(newValue);
    saveSettings({
      separator,
      removeExtension,
      darkMode: newValue,
      notificationsEnabled,
      autoShareEnabled,
      userLanguage,
      customSeparator,
    });
  };

  const handleNotificationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setNotificationsEnabled(newValue);
    saveSettings({
      separator,
      removeExtension,
      darkMode,
      notificationsEnabled: newValue,
      autoShareEnabled,
      userLanguage,
      customSeparator,
    });
  };

  const handleLanguageChange = (newLanguage: string | null) => {
    saveSettings({
      separator,
      removeExtension,
      darkMode,
      notificationsEnabled,
      autoShareEnabled,
      userLanguage: newLanguage,
      customSeparator,
    });
  };

  console.log('Settings component rendering, isLoading:', isLoading); // Debug log

  if (isLoading) {
    console.log('Settings: Showing loading state'); // Debug log
    return <div>Loading...</div>;
  }

  return (
    <div className="settings-container">
      <h2>{getMessage(messages, 'settingsTab')}</h2>
      <LanguageSetting
        userLanguage={userLanguage}
        setUserLanguage={setUserLanguage}
        messages={messages}
        onChange={handleLanguageChange}
      />
      <SeparatorSetting
        separator={separator}
        customSeparator={customSeparator}
        setSeparator={setSeparator}
        setCustomSeparator={setCustomSeparator}
        showCustomInput={showCustomInput}
        setShowCustomInput={setShowCustomInput}
        messages={messages}
        onChange={handleSeparatorChange}
      />
      <CheckboxSetting
        label="extensionLabel"
        checked={removeExtension}
        onChange={handleExtensionChange}
        messages={messages}
      />
      <CheckboxSetting
        label="darkModeLabel"
        checked={darkMode}
        onChange={handleDarkModeChange}
        messages={messages}
      />
      <CheckboxSetting
        label="notificationsLabel"
        checked={notificationsEnabled}
        onChange={handleNotificationsChange}
        messages={messages}
      />
      {/* Temporarily disabled auto-share option */}
      {/*
      <CheckboxSetting
        label="autoShareLabel"
        checked={autoShareEnabled}
        onChange={handleAutoShareChange}
        messages={messages}
      />
      */}
    </div>
  );
};

export default Settings;