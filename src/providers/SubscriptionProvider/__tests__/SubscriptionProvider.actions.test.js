import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import API from '../../../api';
import { updatePlans } from '../SubscriptionProvider.actions';

jest.mock('../../../api', () => ({
  __esModule: true,
  default: {
    listSubscriptions: jest.fn()
  }
}));

jest.mock('../../../constants', () => ({
  ...jest.requireActual('../../../constants'),
  LOCAL_BACKEND_DISABLED: true,
  IS_PRODUCTION: false
}));

jest.mock('../../../providers/SpeechProvider/SpeechProvider.actions', () => ({
  changeElevenLabsApiKey: jest.fn()
}));

jest.mock('../../../providers/SpeechProvider/tts', () => ({
  initElevenLabsInstance: jest.fn()
}));

const mockStore = configureMockStore([thunk]);

describe('SubscriptionProvider actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips subscription plan API when local backend is disabled', async () => {
    const store = mockStore({
      app: {},
      subscription: {}
    });

    await store.dispatch(updatePlans());

    expect(API.listSubscriptions).not.toHaveBeenCalled();
    expect(store.getActions()).toEqual([]);
  });
});
