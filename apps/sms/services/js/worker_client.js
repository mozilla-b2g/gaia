/*global bridge,
 ClientDisposer,
 disposableClient,
 streamClient
 */

(function(exports) {
  'use strict';

  const debug = 1 ?
    (arg1, ...args) => console.log(`[WorkerClient] ${arg1}`, ...args):
    () => {};

  /**
   * Supported worker types.
   * @enum {string}
   */
  const WORKER_TYPE = Object.freeze({
    WORKER: 'worker',
    SHARED_WORKER: 'shared-worker'
  });

  /**
   * Supported lifetime strategies or the way we manage workers.
   * @enum {string}
   */
  const LIFETIME_STRATEGY = Object.freeze({
    ALWAYS_ALIVE: 'always-alive',
    ALIVE_WHEN_VISIBLE: 'alive-when-visible'
  });

  /**
   * Default values for the options supported by WorkerClient.
   * @type {Object}
   */
  const DEFAULT_OPTIONS = Object.freeze({
    /**
     * Type of the worker to use to run service.
     * @type {WORKER_TYPE}
     */
    type: WORKER_TYPE.SHARED_WORKER,

    /**
     * Lifetime strategy to use.
     * @type {LIFETIME_STRATEGY}
     */
    lifetime: LIFETIME_STRATEGY.ALWAYS_ALIVE,

    /**
     * Indicates that both client and service support "streams", so that we
     * should load appropriate bridge plugin.
     * @type {boolean}
     */
    supportStreams: false,

    /**
     * Indicates if we want to run worker with the service immediately,
     * alternatively service will be run only on the first demand.
     * @type {boolean}
     */
    preRun: false,

    /**
     * Sets the number of milliseconds we should wait before actually shutting
     * down client once shut down has been requested.
     */
    disposeTimeout: 3000,

    /**
     * Default client-service response timeout. If "false" - then client request
     * will never be time outed.
     * @type {Boolean|Number}
     */
    timeout: false
  });

  const priv = Object.freeze({
    options: Symbol('options'),

    client: Symbol('client'),
    endpoint: Symbol('endpoint'),

    create: Symbol('create')
  });

  const WorkerClient = function(serviceName, servicePath, options = {}) {
    debug('Initialized');

    if (!serviceName || !servicePath) {
      throw new Error('Both service name and path are required!');
    }

    this[priv.options] = Object.assign(
      { serviceName, servicePath }, DEFAULT_OPTIONS, options
    );

    if (options.lifetime === LIFETIME_STRATEGY.ALIVE_WHEN_VISIBLE) {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          debug('Document is hidden');

          //this.dispose();
        }
      });
    }
  };

  WorkerClient.WORKER_TYPE = WORKER_TYPE;
  WorkerClient.LIFETIME_STRATEGY = LIFETIME_STRATEGY;

  WorkerClient.prototype = {
    /**
     * Bridge client instance.
     * @type {Client}
     * @private
     */
    [priv.client]: null,

    /**
     * Service endpoint instance (either Worker or SharedWorker).
     * @type {Worker|SharedWorker}
     * @private
     */
    [priv.endpoint]: null,

    method(...args) {
      return this[priv.getClient]().then((client) => client.method(...args));
    },

    stream(...args) {
      return this[priv.getClient]().then((client) => client.stream(...args));
    },

    on(...args) {
      this[priv.getClient]().then((client) => client.on(...args));
    },

    /**
     * Shuts down client and underlying service endpoint. It waits for
     * options.shutdownTimeout before actually starting to shut client down, so
     * that we can save resources if client is requested again soon enough.
     * @private
     */
    dispose() {
      return ClientDisposer.dispose(
        this[priv.client], this[priv.options].disposeTimeout
      ).then(() => {
        if (this[priv.options].type === WORKER_TYPE.SHARED_WORKER) {
          this[priv.endpoint].port.close();
        }

        this[priv.client] = this[priv.endpoint] = null;
      });
    },

    /**
     * Creates new bridge client.
     * @returns {Client} Bridge client instance.
     * @private
     */
    [priv.create]() {
      let options = this[priv.options];

      debug('Create client with options: ', options);

      this[priv.endpoint] = options.type === WORKER_TYPE.WORKER ?
        new Worker(options.servicePath):
        new SharedWorker(options.servicePath);

      let client = bridge.client({
        service: options.serviceName,
        endpoint: this[priv.endpoint],
        timeout: options.timeout
      });

      if (options.supportStreams) {
        debug('Client supports streams');
        client = client.plugin(streamClient);
      }

      if (options.lifetime !== LIFETIME_STRATEGY.ALWAYS_ALIVE) {
        debug('Client is disposable');
        client = client.plugin(disposableClient);
      }

      return (this[priv.client] = client);
    },

    /**
     * Returns bridge client instance. It creates a new client if it hasn't been
     * created yet or shit down previously, and cancels shutdown actions if it
     * has been scheduled. This method should be considered as the only way to
     * perform any bridge client method.
     * @returns {Promise.<Client>}
     * @private
     */
    [priv.getClient]() {
      let disposeCancelPromise;

      if (ClientDisposer.isDisposing(this[priv.client])) {
        debug('Client is in process of disposing. Cancelling...');
        disposeCancelPromise = ClientDisposer.cancel(this[priv.client]);
      } else {
        debug('Client is not being disposed');
        disposeCancelPromise = Promise.resolve();
      }

      return disposeCancelPromise.then(
        () => this[priv.client] || this[priv.create]()
      );
    }
  };

  exports.WorkerClient = WorkerClient;
})(self);
