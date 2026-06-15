import {
  persistCombineReducers,
  persistReducer,
  createMigrate
} from 'redux-persist';

import localForage from 'localforage';
import localStorage from 'redux-persist/lib/storage';
import { appInsights } from './appInsights';

import appReducer from './components/App/App.reducer';
import languageProviderReducer from './providers/LanguageProvider/LanguageProvider.reducer';
import scannerProviderReducer from './providers/ScannerProvider/ScannerProvider.reducer';
import speechProviderReducer from './providers/SpeechProvider/SpeechProvider.reducer';
import boardReducer from './components/Board/Board.reducer';
import communicatorReducer from './components/Communicator/Communicator.reducer';
import notificationsReducer from './components/Notifications/Notifications.reducer';
import subscriptionProviderReducer from './providers/SubscriptionProvider/SubscriptionProvider.reducer';
import {
  DEFAULT_BOARDS,
  FAMILY_BOARDS_OWNER_EMAIL,
  FAMILY_BOARDS_VERSION,
  deepCopy
} from '../src/helpers';

localForage.config({
  name: 'cboard',
  storeName: 'cboard_store'
});

/**
 * Creates a storage wrapper that migrates data from old storage to new storage.
 *
 * @param {Object} oldStorage - The legacy storage engine (localStorage)
 * @param {Object} newStorage - The new storage engine (localForage/IndexedDB)
 * @returns {Object} A storage engine compatible with redux-persist
 */
export const createMigratingStorage = (oldStorage, newStorage) => ({
  /**
   * Retrieves a value from storage, migrating from old to new if necessary.
   * Called by redux-persist on app initialization.
   */
  async getItem(key) {
    try {
      const newValue = await newStorage.getItem(key);
      if (newValue !== null && newValue !== undefined) {
        return newValue;
      }
    } catch (err) {
      console.warn('Cboard: IndexedDB read failed', err);
      appInsights.trackException({
        exception: err,
        properties: { key, step: 'indexeddb_read' }
      });
    }

    try {
      const oldValue = await oldStorage.getItem(key);
      if (oldValue !== null && oldValue !== undefined) {
        console.log(
          `Cboard: Migrating ${key} from localStorage to IndexedDB...`
        );
        appInsights.trackEvent({
          name: 'StorageMigration_Started',
          properties: { key }
        });
        try {
          await newStorage.setItem(key, oldValue);
          console.log(`Cboard: Successfully migrated ${key}`);
          appInsights.trackEvent({
            name: 'StorageMigration_Success',
            properties: { key }
          });
          await oldStorage.removeItem(key);
          console.log(`Cboard: Cleaned up ${key} from localStorage`);
          appInsights.trackEvent({
            name: 'StorageMigration_Cleanup',
            properties: { key }
          });
        } catch (writeErr) {
          console.warn('Cboard: Migration write failed', writeErr);
          appInsights.trackException({
            exception: writeErr,
            properties: { key, step: 'migration_write' }
          });
        }
        return oldValue;
      }
    } catch (err) {
      console.warn('Cboard: localStorage read failed', err);
      appInsights.trackException({
        exception: err,
        properties: { key, step: 'localstorage_read' }
      });
    }

    return null;
  },

  /**
   * Saves a value to storage.
   * Called by redux-persist whenever Redux state changes.
   */
  async setItem(key, value) {
    return await newStorage.setItem(key, value);
  },

  /**
   * Removes a value from storage.
   * Called by redux-persist when purging state.
   */
  async removeItem(key) {
    return await newStorage.removeItem(key);
  }
});

const migratingStorage = createMigratingStorage(localStorage, localForage);

const FAMILY_ROOT_BOARD_ID = 'family-root';

function isCodeOwnedFamilyBoard(board) {
  return (
    board?.id?.startsWith('family-') &&
    board.email === FAMILY_BOARDS_OWNER_EMAIL
  );
}

function migrateCodeOwnedFamilyBoards(state) {
  const boardState = state.board || {};
  const persistedBoards = Array.isArray(boardState.boards)
    ? boardState.boards
    : [];
  const currentFamilyBoards = deepCopy(DEFAULT_BOARDS.family);
  const currentFamilyBoardIds = new Set(
    currentFamilyBoards.map(board => board.id)
  );
  const removedFamilyBoardIds = [];
  const preservedBoards = persistedBoards.filter(board => {
    if (currentFamilyBoardIds.has(board.id)) {
      return false;
    }

    if (isCodeOwnedFamilyBoard(board)) {
      removedFamilyBoardIds.push(board.id);
      return false;
    }

    return true;
  });
  const removedFamilyBoardIdSet = new Set(removedFamilyBoardIds);
  const syncMeta = Object.keys(boardState.syncMeta || {}).reduce((acc, id) => {
    if (!removedFamilyBoardIdSet.has(id)) {
      acc[id] = boardState.syncMeta[id];
    }
    return acc;
  }, {});
  const navHistory = Array.isArray(boardState.navHistory)
    ? boardState.navHistory.filter(id => !removedFamilyBoardIdSet.has(id))
    : [];
  const activeBoardWasRemoved = removedFamilyBoardIdSet.has(
    boardState.activeBoardId
  );
  const repairedActiveBoardId = activeBoardWasRemoved
    ? FAMILY_ROOT_BOARD_ID
    : boardState.activeBoardId;
  const repairedNavHistory =
    activeBoardWasRemoved && !navHistory.includes(FAMILY_ROOT_BOARD_ID)
      ? [FAMILY_ROOT_BOARD_ID]
      : navHistory;

  return {
    ...state,
    board: {
      ...boardState,
      boards: [...currentFamilyBoards, ...preservedBoards],
      syncMeta,
      activeBoardId: repairedActiveBoardId,
      navHistory: repairedNavHistory,
      familyBoardsVersion: FAMILY_BOARDS_VERSION
    }
  };
}

export const boardMigrations = {
  0: state => {
    return {
      ...state,
      board: {
        ...state.board,
        boards: [...state.board.boards, ...DEFAULT_BOARDS.picSeePal]
      }
    };
  },
  1: state => ({
    ...state,
    board: {
      ...state.board,
      syncMeta: state.board?.syncMeta ?? {}
    }
  }),
  2: migrateCodeOwnedFamilyBoards,
  3: migrateCodeOwnedFamilyBoards
};

const config = {
  key: 'root',
  storage: migratingStorage,
  blacklist: ['language'],
  version: 3,
  migrate: createMigrate(boardMigrations, { debug: false })
};

const languagePersistConfig = {
  key: 'language',
  storage: migratingStorage,
  blacklist: ['langsFetched', 'lang', 'dir']
};

export default function createReducer() {
  return persistCombineReducers(config, {
    app: appReducer,
    language: persistReducer(languagePersistConfig, languageProviderReducer),
    speech: speechProviderReducer,
    board: boardReducer,
    communicator: communicatorReducer,
    scanner: scannerProviderReducer,
    notification: notificationsReducer,
    subscription: subscriptionProviderReducer
  });
}
