/*global bridge */
/*jshint esnext: true */

'use strict';

(function(exports) {

  const priv = Object.freeze({
    client: Symbol('client'),
    serviceName: Symbol('serviceName'),
    appInstanceId: Symbol('appInstanceId'),
    pendingOperations: Symbol('pendingOperations'),

    initBridge: Symbol('initBridge'),
    registerOperation: Symbol('registerOperation')
  });

  /**
   * This mixin allows to expose easily a service from an object.
   *
   * This needs the following properties to work properly:
   *
   * - SERVICE_NAME holds the service name.
   */
  var clientMixin = {
    /**
     * Initialize service to listen on the default context and given endpoint.
     * @param {(Iframe|Worker|MessagePort|BroadcastChannel|Window)} endpoint
     *  The context/thread that service could listen for.
     */
    initClient({ appInstanceId, endpoint, plugins }) {
      if (!appInstanceId) {
        throw new Error('Application instance identifier is required!');
      }

      this[priv.appInstanceId] = appInstanceId;
      this[priv.initBridge](endpoint || exports, plugins);
    },

    clientMethod(...params) {
      var methodPromise = this[priv.client].method(
        ...params, this[priv.appInstanceId]
      );

      this[priv.registerOperation](methodPromise);

      return methodPromise;
    },

    clientStream(...params) {
      var stream = this[priv.client].stream(
        ...params, this[priv.appInstanceId]
      );

      this[priv.registerOperation](stream.closed);

      return stream;
    },

    onClientEvent(name, handler) {
      this[priv.client].on(name, handler);
    },

    offClientEvent(name, handler) {
      this[priv.client].off(name, handler);
    },

    upgradeClient(options) {
      // We should destroy old client once all pending operations are completed
      // and client is in idle state.
      var oldClient = this[priv.client];
      var oldClientPendingOperations = this[priv.pendingOperations];

      // All new requests will come through new client from now on.
      this.initClient(Object.assign({
        appInstanceId: this[priv.appInstanceId]
      }, options));

      return Promise.all(oldClientPendingOperations).then(() => {
        oldClient.destroy();
        oldClient = null;
      });
    },

    /**
     * Destroys client instance.
     */
    destroyClient() {
      this[priv.client].destroy();
      this[priv.client] = null;
    }
  };

  exports.BridgeClientMixin = {
    mixin(target, serviceName) {
      if (!serviceName) {
        throw new Error(
          'A service name is mandatory to define a client.'
        );
      }

      Object.keys(clientMixin).forEach(function(method) {
        if (typeof this[method] !== 'undefined') {
          throw new Error(
            'Object to mix into already has "' + method + '" property defined!'
          );
        }

        this[method] = clientMixin[method];
      }, target);

      target[priv.client] = null;
      target[priv.appInstanceId] = null;
      target[priv.pendingOperations] = null;
      target[priv.serviceName] = serviceName;

      target[priv.initBridge] = function(endpoint, plugins) {
        var client = bridge.client({
          service: this[priv.serviceName],
          endpoint: endpoint,
          timeout: false
        });

        if (Array.isArray(plugins)) {
          plugins.forEach((plugin) => client.plugin(plugin));
        }

        this[priv.client] = client;
        this[priv.pendingOperations] = new Set();
      };

      target[priv.registerOperation] = function(operation) {
        var pendingOperations = this[priv.pendingOperations];
        var unRegisterOperation = () => pendingOperations.delete(operation);

        pendingOperations.add(
          operation.then(unRegisterOperation, unRegisterOperation)
        );
      };

      return target;
    }
  };
})(self);
