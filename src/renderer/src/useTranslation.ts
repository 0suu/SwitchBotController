import { useSelector } from "react-redux";
import { useCallback } from "react";
import { selectLanguage } from "./store/slices/settingsSlice";
import { Language, translate } from "./i18n";

export const useTranslation = () => {
  const language = useSelector(selectLanguage) as Language;
  const t = useCallback((key: string) => translate(language, key), [language]);
  return { t, language };
};
