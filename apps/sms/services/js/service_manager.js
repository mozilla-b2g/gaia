/* global App,
          ConversationClient,
          ConversationService,
          MessagingClient,
          MessagingService,
          MozMobileConnectionsClient,
          MozMobileConnectionsShim,
          MozSettingsShim
*/

(function(exports) {
  'use strict';

  const debug = 1 ?
    (arg1, ...args) => console.log(`[ServiceManager] ${arg1}`, ...args):
    () => {};

  const priv = {
    upgradeKey: Symbol('upgradeKey')
  };

  const UPGRADE_KEY = 'upgrade-key';

  // Allow old clients to gracefully finish all pending operations before
  // we destroy them.
  var ConversationServiceInitializer = {
    initialize(upgradeKey) {
      if (upgradeKey) {
        ConversationClient.init(
          upgradeKey,
          new SharedWorker('services/js/conversation/conversation_service.js')
        );
      } else {
        ConversationService.init();
        ConversationClient.init(App.instanceId, exports);
      }
    },

    upgrade(upgradeKey) {
      var destroyPromise = ConversationClient.destroy().then(() => {
        ConversationService.destroyService();
        delete exports.ConversationService;

        debug('Conversation service and client are unloaded');
      });

      this.initialize(upgradeKey);

      return destroyPromise;
    }
  };

  var MessagingServiceInitializer = {
    initialize(upgradeKey) {
      if (upgradeKey) {
        MessagingClient.init(
          upgradeKey,
          new SharedWorker('/services/js/messaging/messaging_service.js')
        );
      } else {
        MessagingService.init();
        MessagingClient.init(App.instanceId, exports);
      }
    },

    upgrade(upgradeKey) {
      var destroyPromise = MessagingClient.destroy().then(() => {
        MessagingService.destroyService();
        delete exports.MessagingService;

        debug('Messaging service and client are unloaded');
      });

      this.initialize(upgradeKey);

      return destroyPromise;
    }
  };

  var MozMobileConnectionsServiceInitializer = {
    initialize(upgradeKey) {
      if (upgradeKey) {
        getShimEndpoint(upgradeKey).then((endpoint) => {
          MozMobileConnectionsClient.init(upgradeKey, endpoint);
        });
      } else {
        MozMobileConnectionsClient.init(App.instanceId, exports);
      }
    },

    upgrade(upgradeKey) {
      var destroyPromise = MozMobileConnectionsClient.destroy().then(() => {
        MozMobileConnectionsShim.destroyService();
        delete exports.MozMobileConnectionsShim;

        debug('MozMobileConnections shim and client are unloaded');
      });

      this.initialize(upgradeKey);

      return destroyPromise;
    }
  };

  var MozSettingsServiceInitializer = {
    initialize() {},
    upgrade() {
      return new Promise((resolve) => {
        MozSettingsShim.destroyService();
        delete exports.MozSettingsShim;
        resolve();

        debug('MozSettings shim is unloaded');
      });
    }
  };

  const serviceInitializers = new Map([
    ['conversation', ConversationServiceInitializer],
    ['messaging', MessagingServiceInitializer],
    ['moz-mobile-connections', MozMobileConnectionsServiceInitializer],
    ['moz-settings', MozSettingsServiceInitializer]
  ]);

  function initializeShims(endpoint, upgradeKey) {
    if (endpoint.MozMobileMessageShim) {
      endpoint.MozMobileMessageShim.init(
        endpoint.navigator.mozMobileMessage,
        upgradeKey ? new endpoint.BroadcastChannel(
          `${endpoint.MozMobileMessageShim.name}-${upgradeKey}`
        ) : endpoint
      );

      debug('Initialized MozMobileMessageShim (upgrade key: %s)', upgradeKey);
    }

    if (endpoint.MozSettingsShim) {
      endpoint.MozSettingsShim.init(
        endpoint.navigator.mozSettings,
        upgradeKey ? new endpoint.BroadcastChannel(
          `${endpoint.MozSettingsShim.name}-${upgradeKey}`
        ) : endpoint
      );

      debug('Initialized MozSettingsShim (upgrade key: %s)', upgradeKey);
    }

    if (endpoint.MozMobileConnectionsShim) {
      endpoint.MozMobileConnectionsShim.init(
        endpoint.navigator.mozMobileConnections,
        upgradeKey ? new endpoint.BroadcastChannel(
          `${endpoint.MozMobileConnectionsShim.name}-${upgradeKey}`
        ) : endpoint
      );

      debug(
        'Initialized MozMobileConnectionsShim (upgrade key: %s)',
        upgradeKey
      );
    }
  }

  var shimHostPromise;
  function getShimEndpoint(upgradeKey) {
    debug('Request shim endpoint');

    if (shimHostPromise) {
      debug('Shim endpoint is ready');
      return shimHostPromise;
    }

    if (upgradeKey) {
      debug('Shim endpoint exists, but is not cached yet');
      shimHostPromise = Promise.resolve(window.open('', upgradeKey));
    } else {
      debug('Shim endpoint does not exist yet');
      shimHostPromise = new Promise((resolve) => {
        var shimHost = window.open(
          '/views/shared/shim_host.html', App.instanceId, 'alwaysLowered'
        );

        shimHost.addEventListener('load', function onLoad() {
          shimHost.removeEventListener('load', onLoad);
          resolve(shimHost);

          debug('New shim endpoint is created and cached');
        });
      });
    }

    return shimHostPromise;
  }

  var ServiceManager = {
    [priv.upgradeKey]: null,

    initialize(serviceKeys) {
      var upgradeKey = this[priv.upgradeKey] =
        sessionStorage.getItem(UPGRADE_KEY) || null;

      debug('Upgrade key: %s', upgradeKey);

      if (!upgradeKey) {
        initializeShims(exports, upgradeKey);
      }

      serviceKeys.forEach((serviceKey) => {
        serviceInitializers.get(serviceKey).initialize(upgradeKey);
      });
    },

    upgrade(serviceKeys) {
      debug('Upgrade is requested');

      if (this[priv.upgradeKey]) {
        return Promise.resolve();
      }

      var upgradeKey = App.instanceId;

      return getShimEndpoint().then((endpoint) => {
        initializeShims(endpoint, upgradeKey);

        return Promise.all(
          serviceKeys.map((serviceKey) => {
            return serviceInitializers.get(serviceKey).upgrade(upgradeKey);
          })
        );
      }).then(() => {
        sessionStorage.setItem(UPGRADE_KEY, upgradeKey);
        this[priv.upgradeKey] = upgradeKey;

        debug('Upgrade for application %s is finished!', upgradeKey);
      });
    }
  };

  exports.ServiceManager = Object.seal(ServiceManager);
})(self);
