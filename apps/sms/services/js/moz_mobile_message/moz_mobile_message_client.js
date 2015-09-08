/*global bridge,
         finalizeClient,
         BroadcastChannel,
         streamClient
 */
'use strict';

(function(exports) {
  const debug = 0 ?
    (arg1, ...args) => console.log(`[MozMobileMessageClient] ${arg1}`, ...args):
    () => {};

  const priv = {
    client: Symbol('client'),
    instances: Symbol('instances')
  };

  /**
   * Disable default client timeout from bridge by setting the timeout to false.
   * @type {number|boolean}
   */
  const TIMEOUT = false;

  /**
   * Name of the shim service that provides access to mozMobileMessage API.
   * @type {string}
   * @const
   */
  const SERVICE_NAME = 'moz-mobile-message-shim';

  function MobileMessageClient(endpoint) {
    if (!('bridge' in self) || !('client' in bridge)) {
      importScripts('/lib/bridge/client.js');
    }

    if (!('streamClient' in self)) {
      importScripts('/lib/bridge/plugins/stream/client.js');
    }

    this[priv.client] = bridge.client({
      service: SERVICE_NAME,
      endpoint: endpoint,
      timeout: TIMEOUT
    }).plugin(streamClient).plugin(finalizeClient);
  }

  MobileMessageClient.prototype = {
    retrieveMMS(id) {
      return this[priv.client].method('retrieveMMS', id);
    },

    getThreads() {
      return this[priv.client].stream('getThreads');
    },

    send(recipient, content, sendOpts) {
      return this[priv.client].method('send', recipient, content, sendOpts);
    },

    sendMMS(dataOpts, sendOpts) {
      return this[priv.client].method('sendMMS', dataOpts, sendOpts);
    },

    delete(id) {
      return this[priv.client].method('delete', id);
    }
  };

  /**
   * List of MobileMessageClient mapped to specific application id.
   * @type {Map.<string, MobileMessageClient>}
   * @static
   */
  MobileMessageClient[priv.instances] = new Map();

  /**
   * Returns mozMobileMessageClient bound to a specific app instance, creates
   * one if it doesn't exist.
   * @returns {MobileMessageClient}
   * @static
   */
  MobileMessageClient.forApp = function(appInstanceId) {
    if (!appInstanceId) {
      throw new Error('AppInstanceId is required!');
    }

    var mobileMessageClient = MobileMessageClient[priv.instances].get(
      appInstanceId
    );

    if (mobileMessageClient) {
      return mobileMessageClient;
    }

    mobileMessageClient = new MobileMessageClient(
      exports.document ?
        exports : new BroadcastChannel(`${SERVICE_NAME}-${appInstanceId}`)
    );

    MobileMessageClient[priv.instances].set(appInstanceId, mobileMessageClient);

    debug(
      'Create MobileMessageClient for app instance %s', appInstanceId
    );

    return mobileMessageClient;
  };

  /**
   * Destroys all clients.
   * @static
   */
  MobileMessageClient.destroy = function() {
    var finalizers = [];

    MobileMessageClient[priv.instances].forEach(
      (instance) => finalizers.push(instance[priv.client].finalize())
    );

    return Promise.all(finalizers).then(
      () => MobileMessageClient[priv.instances].clear()
    );
  };

  exports.MozMobileMessageClient = Object.seal(MobileMessageClient);
})(self);
