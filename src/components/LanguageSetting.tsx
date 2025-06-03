import React from 'react';
import { getMessage } from '../utils/utils';
import { Messages } from '../types';

interface LanguageSettingProps {
  userLanguage: string | null;
  setUserLanguage: (value: string | null) => void;
  messages: Messages;
  onChange: (newLanguage: string | null) => void;
}

const LanguageSetting: React.FC<LanguageSettingProps> = ({
  userLanguage,
  setUserLanguage,
  messages,
  onChange,
}) => {
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value === '' ? null : e.target.value;
    setUserLanguage(newLanguage);
    onChange(newLanguage);
  };

  return (
    <div className="setting-item language-setting">
      <label>{getMessage(messages, 'languageLabel')}</label>
      <select value={userLanguage || ''} onChange={handleLanguageChange}>
        <option value="">{getMessage(messages, 'languageDefault')}</option>
        <option value="vi">{getMessage(messages, 'languageVietnamese')}</option>
        <option value="en">{getMessage(messages, 'languageEnglish')}</option>
      </select>
    </div>
  );
};

export default LanguageSetting;
