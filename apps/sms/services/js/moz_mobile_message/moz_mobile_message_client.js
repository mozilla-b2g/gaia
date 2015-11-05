/*global bridge,
         BroadcastChannel,
         streamClient
 */
'use strict';

[
  ['bridge', '/lib/bridge/bridge.js'],
  ['streamClient', '/lib/bridge/plugins/stream/client.js']
].forEach(([dependencyName, dependencyPath]) => {
  if (!(dependencyName in self)) {
    importScripts(dependencyPath);
  }
});

(function(exports) {
  const debug = 0 ?
    (arg1, ...args) => console.log(`[MozMobileMessageClient] ${arg1}`, ...args):
    () => {};

  const priv = {
    bridgeClient: Symbol('bridgeClient')
  };

  /**
   * Disable default client timeout from bridge by setting the timeout to false.
   * @type {number|boolean}
   */
  const TIMEOUT = false;

  function MobileMessageClient(endpoint) {
    this[priv.bridgeClient] = bridge.client({
      service: 'moz-mobile-message-shim',
      endpoint: endpoint,
      timeout: TIMEOUT
    }).plugin(streamClient);
  }

  MobileMessageClient.prototype = {
    retrieveMMS(id) {
      return this[priv.bridgeClient].method('retrieveMMS', id);
    },

    getThreads() {
      return this[priv.bridgeClient].stream('getThreads');
    },

    send(recipient, content, sendOpts) {
      return this[priv.bridgeClient].method(
        'send', recipient, content, sendOpts
      );
    },

    sendMMS(dataOpts, sendOpts) {
      return this[priv.bridgeClient].method('sendMMS', dataOpts, sendOpts);
    },

    delete(id) {
      return this[priv.bridgeClient].method('delete', id);
    }
  };

  /**
   * List of MobileMessageClient mapped to specific application id.
   * @type {Map.<string, MobileMessageClient>}
   */
  const mobileMessageClients = new Map();

  exports.MozMobileMessageClient = Object.freeze({
    forApp(appInstanceId) {
      if (!appInstanceId) {
        throw new Error('AppInstanceId is required!');
      }

      var mobileMessageClient = mobileMessageClients.get(appInstanceId);

      if (!mobileMessageClient) {
        mobileMessageClient = new MobileMessageClient(
          new BroadcastChannel(
            'moz-mobile-message-shim-channel-' + appInstanceId
          )
        );

        mobileMessageClients.set(appInstanceId, mobileMessageClient);

        debug(
          'Create MobileMessageClient for app instance %s', appInstanceId
        );
      }

      return mobileMessageClient;
    },

    cleanup() {
      mobileMessageClients.clear();
    }
  });
})(self);
