// src/components/Settings.tsx
import React, { useState, useEffect } from 'react';
import LanguageSetting from './LanguageSetting';
import SeparatorSetting from './SeparatorSetting';
import CheckboxSetting from './CheckboxSetting';
import { useMessages } from '../hooks/useMessages';
import { saveSettings } from '../utils/storageUtils';
import { getMessage } from '../utils/utils';
import { UserSettings } from '../types';

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
  copyFileNamesOnly: boolean;
  setCopyFileNamesOnly: (value: boolean) => void;
  recursiveScanEnabled: boolean;
  setRecursiveScanEnabled: (value: boolean) => void;
  removeDirectoryPath: boolean;
  setRemoveDirectoryPath: (value: boolean) => void;
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
  copyFileNamesOnly,
  setCopyFileNamesOnly,
  recursiveScanEnabled,
  setRecursiveScanEnabled,
  removeDirectoryPath,
  setRemoveDirectoryPath,
}) => {
  const { messages, isLoading } = useMessages(userLanguage);
  const [customSeparator, setCustomSeparator] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  useEffect(() => {
    chrome.storage.local.get(['settings'], (result) => {
      if (result.settings) {
        if (result.settings.customSeparator) {
          setCustomSeparator(result.settings.customSeparator);
        }
        if (result.settings.separator === 'other' && result.settings.customSeparator) {
          setShowCustomInput(true);
        }
      }
    });
  }, []);

  const saveCurrentSettings = (updatedSettings: Partial<UserSettings>) => {
    const currentSettings: UserSettings = {
      separator,
      removeExtension,
      darkMode,
      notificationsEnabled,
      autoShareEnabled,
      userLanguage,
      customSeparator,
      copyFileNamesOnly,
      recursiveScanEnabled,
      removeDirectoryPath,
    };
    saveSettings({ ...currentSettings, ...updatedSettings });
  };

  const handleSeparatorChange = (newSeparator: string, newCustomSeparator: string) => {
    setSeparator(newSeparator);
    setCustomSeparator(newCustomSeparator);

    saveCurrentSettings({ separator: newSeparator, customSeparator: newCustomSeparator });
  };

  const handleExtensionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setRemoveExtension(newValue);
    saveCurrentSettings({ removeExtension: newValue });
  };

  const handleDarkModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setDarkMode(newValue);
    saveCurrentSettings({ darkMode: newValue });
  };

  const handleNotificationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setNotificationsEnabled(newValue);
    saveCurrentSettings({ notificationsEnabled: newValue });
  };

  const handleCopyFileNamesOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setCopyFileNamesOnly(newValue);
    saveCurrentSettings({ copyFileNamesOnly: newValue });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAutoShareChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setAutoShareEnabled(newValue);
    saveCurrentSettings({ autoShareEnabled: newValue });
  };

  const handleLanguageChange = (newLanguage: string | null) => {
    setUserLanguage(newLanguage);
    saveCurrentSettings({ userLanguage: newLanguage });
  };

  const handleRecursiveScanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setRecursiveScanEnabled(newValue);
    saveCurrentSettings({ recursiveScanEnabled: newValue });
  };

  const handleRemoveDirectoryPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setRemoveDirectoryPath(newValue);
    saveCurrentSettings({ removeDirectoryPath: newValue });
  };

  if (isLoading) {
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
        label="removeDirectoryLabel"
        checked={removeDirectoryPath}
        onChange={handleRemoveDirectoryPathChange}
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
      <CheckboxSetting
        label="copyFileNamesOnlyLabel"
        checked={copyFileNamesOnly}
        onChange={handleCopyFileNamesOnlyChange}
        messages={messages}
      />
      <CheckboxSetting
        label="recursiveScanLabel" 
        checked={recursiveScanEnabled}
        onChange={handleRecursiveScanChange}
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