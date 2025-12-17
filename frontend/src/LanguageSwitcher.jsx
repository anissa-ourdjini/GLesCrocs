import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
  ];

  return (
    <div className="flex gap-2">
      {languages.map(lang => (
        <button
          key={lang.code}
          onClick={() => {
            i18n.changeLanguage(lang.code);
            localStorage.setItem('language', lang.code);
          }}
          className={`btn-small rounded-full transition-all ${
            i18n.language === lang.code
              ? 'bg-primary-600 text-white shadow-lg'
              : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-primary-500'
          }`}
          title={lang.label}
        >
          {lang.flag}
        </button>
      ))}
    </div>
  );
}
