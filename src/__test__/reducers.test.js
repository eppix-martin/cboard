import createReducer, {
  createMigratingStorage,
  boardMigrations
} from '../reducers';
import {
  DEFAULT_BOARDS,
  FAMILY_BOARDS_OWNER_EMAIL,
  FAMILY_BOARDS_VERSION
} from '../helpers';

describe('reducers', () => {
  it('should create Reducer', () => {
    const red = createReducer();
    expect(red).toBeDefined();
  });
});

const createMockStorage = () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
});

describe('createMigratingStorage', () => {
  let oldStorage, newStorage, storage;

  beforeEach(() => {
    oldStorage = createMockStorage();
    newStorage = createMockStorage();
    storage = createMigratingStorage(oldStorage, newStorage);
  });

  describe('getItem', () => {
    it('returns value from new storage when it exists, without touching old storage', async () => {
      newStorage.getItem.mockResolvedValue('new-data');

      const result = await storage.getItem('persist:root');

      expect(result).toBe('new-data');
      expect(oldStorage.getItem).not.toHaveBeenCalled();
      expect(oldStorage.removeItem).not.toHaveBeenCalled();
    });

    it('migrates from old to new storage when only old has the key', async () => {
      newStorage.getItem.mockResolvedValue(null);
      oldStorage.getItem.mockResolvedValue('legacy-data');
      newStorage.setItem.mockResolvedValue(undefined);
      oldStorage.removeItem.mockResolvedValue(undefined);

      const result = await storage.getItem('persist:root');

      expect(result).toBe('legacy-data');
      expect(newStorage.setItem).toHaveBeenCalledWith(
        'persist:root',
        'legacy-data'
      );
      expect(oldStorage.removeItem).toHaveBeenCalledWith('persist:root');
    });

    it('returns null when neither storage has the key', async () => {
      newStorage.getItem.mockResolvedValue(null);
      oldStorage.getItem.mockResolvedValue(null);

      const result = await storage.getItem('persist:root');

      expect(result).toBeNull();
    });

    it('falls back to old storage when new storage read fails', async () => {
      newStorage.getItem.mockRejectedValue(new Error('IndexedDB error'));
      oldStorage.getItem.mockResolvedValue('legacy-data');
      newStorage.setItem.mockResolvedValue(undefined);
      oldStorage.removeItem.mockResolvedValue(undefined);

      const result = await storage.getItem('persist:root');

      expect(result).toBe('legacy-data');
      expect(newStorage.setItem).toHaveBeenCalledWith(
        'persist:root',
        'legacy-data'
      );
    });

    it('returns old value but does not remove from old storage when migration write fails', async () => {
      newStorage.getItem.mockResolvedValue(null);
      oldStorage.getItem.mockResolvedValue('legacy-data');
      newStorage.setItem.mockRejectedValue(new Error('write failed'));

      const result = await storage.getItem('persist:root');

      expect(result).toBe('legacy-data');
      expect(oldStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('setItem', () => {
    it('delegates to new storage only', async () => {
      newStorage.setItem.mockResolvedValue(undefined);

      await storage.setItem('persist:root', 'data');

      expect(newStorage.setItem).toHaveBeenCalledWith('persist:root', 'data');
      expect(oldStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('removeItem', () => {
    it('delegates to new storage only', async () => {
      newStorage.removeItem.mockResolvedValue(undefined);

      await storage.removeItem('persist:root');

      expect(newStorage.removeItem).toHaveBeenCalledWith('persist:root');
      expect(oldStorage.removeItem).not.toHaveBeenCalled();
    });
  });
});

describe('boardMigrations', () => {
  describe('migration 1 – syncMeta default', () => {
    it('defaults syncMeta to {} when missing from persisted state', () => {
      const state = {
        board: {
          boards: [{ id: 'board-1' }]
        }
      };

      const result = boardMigrations[1](state);

      expect(result.board.syncMeta).toEqual({});
      expect(result.board.boards).toEqual([{ id: 'board-1' }]);
    });

    it('preserves existing syncMeta when present', () => {
      const existingSyncMeta = {
        'board-1': { status: 'PENDING', isDeleted: false }
      };
      const state = {
        board: {
          boards: [{ id: 'board-1' }],
          syncMeta: existingSyncMeta
        }
      };

      const result = boardMigrations[1](state);

      expect(result.board.syncMeta).toEqual(existingSyncMeta);
    });

    it('defaults syncMeta to {} when board state is undefined', () => {
      const state = {};

      const result = boardMigrations[1](state);

      expect(result.board.syncMeta).toEqual({});
    });
  });

  describe('migration 2 – code-owned family boards', () => {
    const createState = boardOverrides => ({
      board: {
        boards: [],
        syncMeta: {},
        output: [{ id: 'spoken-tile' }],
        images: [{ id: 'image-1' }],
        activeBoardId: null,
        navHistory: [],
        ...boardOverrides
      },
      app: { ready: true },
      communicator: { activeCommunicatorId: 'communicator-1' },
      speech: { voiceURI: 'voice-1' }
    });

    it('replaces a stale persisted family root board with the current default', () => {
      const staleFamilyRoot = {
        ...DEFAULT_BOARDS.family[0],
        name: 'Stale Family Home',
        tiles: [{ id: 'stale-tile', label: 'STALE' }]
      };
      const state = createState({ boards: [staleFamilyRoot] });

      const result = boardMigrations[2](state);
      const migratedFamilyRoot = result.board.boards.find(
        board => board.id === 'family-root'
      );

      expect(migratedFamilyRoot).toEqual(DEFAULT_BOARDS.family[0]);
    });

    it('appends missing current family boards', () => {
      const state = createState({ boards: [DEFAULT_BOARDS.family[0]] });

      const result = boardMigrations[2](state);

      DEFAULT_BOARDS.family.forEach(defaultFamilyBoard => {
        expect(result.board.boards).toContainEqual(defaultFamilyBoard);
      });
    });

    it('preserves non-family boards, user boards, output, and other root state', () => {
      const nonFamilyBoard = { id: 'root', email: 'support@cboard.io' };
      const userBoard = { id: 'user-board', email: 'user@example.com' };
      const state = createState({
        boards: [DEFAULT_BOARDS.family[0], nonFamilyBoard, userBoard]
      });

      const result = boardMigrations[2](state);

      expect(result.board.boards).toEqual(
        expect.arrayContaining([nonFamilyBoard, userBoard])
      );
      expect(result.board.output).toEqual([{ id: 'spoken-tile' }]);
      expect(result.board.images).toEqual([{ id: 'image-1' }]);
      expect(result.app).toBe(state.app);
      expect(result.communicator).toBe(state.communicator);
      expect(result.speech).toBe(state.speech);
    });

    it('removes stale code-owned family boards', () => {
      const staleFamilyBoard = {
        id: 'family-old-category',
        email: FAMILY_BOARDS_OWNER_EMAIL
      };
      const state = createState({ boards: [staleFamilyBoard] });

      const result = boardMigrations[2](state);

      expect(
        result.board.boards.find(board => board.id === staleFamilyBoard.id)
      ).toBeUndefined();
    });

    it('preserves family-prefixed boards that do not use the family owner email', () => {
      const importedBoard = {
        id: 'family-imported-board',
        email: 'user@example.com'
      };
      const state = createState({ boards: [importedBoard] });

      const result = boardMigrations[2](state);

      expect(result.board.boards).toContainEqual(importedBoard);
    });

    it('removes syncMeta for stale removed family boards only', () => {
      const staleFamilyBoard = {
        id: 'family-old-category',
        email: FAMILY_BOARDS_OWNER_EMAIL
      };
      const state = createState({
        boards: [staleFamilyBoard],
        syncMeta: {
          [staleFamilyBoard.id]: { status: 'PENDING' },
          'user-board': { status: 'PENDING' }
        }
      });

      const result = boardMigrations[2](state);

      expect(result.board.syncMeta[staleFamilyBoard.id]).toBeUndefined();
      expect(result.board.syncMeta['user-board']).toEqual({
        status: 'PENDING'
      });
    });

    it('repairs activeBoardId and navHistory references to removed family boards', () => {
      const staleFamilyBoard = {
        id: 'family-old-category',
        email: FAMILY_BOARDS_OWNER_EMAIL
      };
      const state = createState({
        boards: [DEFAULT_BOARDS.family[0], staleFamilyBoard],
        activeBoardId: staleFamilyBoard.id,
        navHistory: ['family-root', staleFamilyBoard.id]
      });

      const result = boardMigrations[2](state);

      expect(result.board.activeBoardId).toBe('family-root');
      expect(result.board.navHistory).toEqual(['family-root']);
    });

    it('sets the family boards version marker', () => {
      const state = createState({ boards: [DEFAULT_BOARDS.family[0]] });

      const result = boardMigrations[2](state);

      expect(result.board.familyBoardsVersion).toBe(FAMILY_BOARDS_VERSION);
    });
  });
});
