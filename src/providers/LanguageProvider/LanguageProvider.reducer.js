import {
  CHANGE_LANG,
  SET_LANGS,
  SET_DOWNLOADING_LANG
} from './LanguageProvider.constants';
import { LOGIN_SUCCESS } from '../../components/Account/Login/Login.constants';
import { DEFAULT_LANG } from '../../components/App/App.constants';

function getDir(lang) {
  const locale = lang.slice(0, 2);
  return locale === 'ar' || locale === 'he' ? 'rtl' : 'ltr';
}

const initialState = {
  lang: DEFAULT_LANG,
  dir: 'ltr',
  langs: [],
  localLangs: [],
  langsFetched: false,
  downloadingLang: { isdownloading: false }
};

function languageProviderReducer(state = initialState, action) {
  switch (action.type) {
    case LOGIN_SUCCESS:
      return {
        ...state,
        lang: DEFAULT_LANG,
        dir: getDir(DEFAULT_LANG)
      };
    case CHANGE_LANG:
      return {
        ...state,
        lang: DEFAULT_LANG,
        dir: getDir(DEFAULT_LANG)
      };
    case SET_LANGS:
      return {
        ...state,
        langs: action.langs.sort(),
        localLangs: action.localLangs || [],
        langsFetched: true
      };
    case SET_DOWNLOADING_LANG:
      return { ...state, downloadingLang: action.downloadingLangData };

    default:
      return {
        ...state,
        lang: DEFAULT_LANG,
        dir: getDir(DEFAULT_LANG)
      };
  }
}

export default languageProviderReducer;
