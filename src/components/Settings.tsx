// src/components/Settings.tsx
import React, { useState, useEffect } from 'react';
import LanguageSetting from './LanguageSetting';
import SeparatorSetting from './SeparatorSetting';
import CheckboxSetting from './CheckboxSetting';
import { useMessages } from '../hooks/useMessages';
import { saveSettings } from '../utils/storageUtils';
import { getMessage } from '../utils/utils';
import { UserSettings } from '../types'; // Import UserSettings

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
  copyFileNamesOnly: boolean; // <-- Thêm prop này
  setCopyFileNamesOnly: (value: boolean) => void; // <-- Thêm prop này
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
  setAutoShareEnabled, // Giữ nguyên prop này
  userLanguage,
  setUserLanguage,
  copyFileNamesOnly, // <-- Sử dụng prop này
  setCopyFileNamesOnly, // <-- Sử dụng prop này
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

  const saveCurrentSettings = (updatedSettings: Partial<UserSettings>) => {
    saveSettings({
      separator,
      removeExtension,
      darkMode,
      notificationsEnabled,
      autoShareEnabled,
      userLanguage,
      customSeparator,
      copyFileNamesOnly, // <-- Đảm bảo thuộc tính này được lưu
      ...updatedSettings, // Ghi đè các cài đặt cụ thể nếu có
    });
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

  const handleCopyFileNamesOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => { // <-- Thêm hàm xử lý mới
    const newValue = e.target.checked;
    setCopyFileNamesOnly(newValue);
    saveCurrentSettings({ copyFileNamesOnly: newValue });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAutoShareChange = (e: React.ChangeEvent<HTMLInputElement>) => { // Đảm bảo hàm này tồn tại nếu bạn bật lại autoShareEnabled
    const newValue = e.target.checked;
    setAutoShareEnabled(newValue);
    saveCurrentSettings({ autoShareEnabled: newValue });
  };

  const handleLanguageChange = (newLanguage: string | null) => {
    setUserLanguage(newLanguage);
    saveCurrentSettings({ userLanguage: newLanguage });
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
      <CheckboxSetting // <-- Thêm checkbox mới
        label="copyFileNamesOnlyLabel"
        checked={copyFileNamesOnly}
        onChange={handleCopyFileNamesOnlyChange}
        messages={messages}
      />
      {/* Temporarily disabled auto-share option */}
      {/*
      <CheckboxSetting
        label="autoShareLabel"
        checked={autoShareEnabled}
        onChange={handleAutoShareChange} // Bỏ comment nếu bật lại
        messages={messages}
      />
      */}
    </div>
  );
};

export default Settings;