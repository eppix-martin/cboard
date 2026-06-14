import register, {
  createUpdateContext,
  unregister,
  waitForServiceWorkerController
} from '../registerServiceWorker';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

describe('registerServiceWorker', () => {
  it('should register Service Worker', () => {
    const serviceWorker = register(jest.fn(), jest.fn());
    expect(serviceWorker).toBeDefined;
  });
  it('should register Service Worker', () => {
    global.process.env.NODE_ENV = 'development';
    const serviceWorker = register(jest.fn(), jest.fn());
    expect(serviceWorker).toBeDefined;
  });
  it('should unregister Service Worker', () => {
    const serviceWorker = unregister();
    expect(serviceWorker).toBeDefined;
  });

  it('waits for controllerchange before reloading after an update', async () => {
    const reload = jest.fn();
    const serviceWorker = {
      controller: null,
      addEventListener: jest.fn((eventName, handler) => {
        expect(eventName).toBe('controllerchange');
        serviceWorker.controller = { state: 'activated' };
        handler();
      }),
      removeEventListener: jest.fn()
    };

    await waitForServiceWorkerController(serviceWorker, reload);

    expect(serviceWorker.addEventListener).toHaveBeenCalledWith(
      'controllerchange',
      expect.any(Function)
    );
    expect(serviceWorker.removeEventListener).toHaveBeenCalledWith(
      'controllerchange',
      expect.any(Function)
    );
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('asks the waiting service worker to skip waiting before refresh', async () => {
    const postMessage = jest.fn();
    const registration = {
      waiting: { postMessage }
    };
    const reload = jest.fn();
    const serviceWorker = {
      controller: null,
      addEventListener: jest.fn((eventName, handler) => {
        serviceWorker.controller = { state: 'activated' };
        handler();
      }),
      removeEventListener: jest.fn()
    };
    const updateContext = createUpdateContext(
      registration,
      serviceWorker,
      reload
    );

    await updateContext.refresh();

    expect(postMessage).toHaveBeenCalledWith({ action: 'skipWaiting' });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('generates a service worker that handles skipWaiting messages and claims clients', () => {
    jest.resetModules();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const swPrecacheConfig = require('../../sw-precache-config');

    expect(swPrecacheConfig.importScripts).toContain(
      'service-worker-skip-waiting.js'
    );
    expect(swPrecacheConfig.clientsClaim).toBe(true);

    const script = fs.readFileSync(
      path.join(__dirname, '../../public/service-worker-skip-waiting.js'),
      'utf8'
    );
    const skipWaitingPromise = Promise.resolve();
    const waitUntil = jest.fn();
    const context = {
      self: {
        addEventListener: jest.fn(),
        skipWaiting: jest.fn(() => skipWaitingPromise)
      }
    };

    vm.runInNewContext(script, context);
    const messageHandler = context.self.addEventListener.mock.calls.find(
      ([eventName]) => eventName === 'message'
    )[1];

    messageHandler({ data: { action: 'skipWaiting' }, waitUntil });

    expect(context.self.skipWaiting).toHaveBeenCalledTimes(1);
    expect(waitUntil).toHaveBeenCalledWith(skipWaitingPromise);
  });

  it('waits for a new controller even when an old controller exists', async () => {
    const postMessage = jest.fn();
    const registration = {
      waiting: { postMessage }
    };
    const reload = jest.fn();
    const serviceWorker = {
      controller: { state: 'activated' },
      addEventListener: jest.fn((eventName, handler) => {
        handler();
      }),
      removeEventListener: jest.fn()
    };
    const updateContext = createUpdateContext(
      registration,
      serviceWorker,
      reload
    );

    const refreshPromise = updateContext.refresh();

    expect(serviceWorker.addEventListener).toHaveBeenCalledWith(
      'controllerchange',
      expect.any(Function)
    );
    await refreshPromise;
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
