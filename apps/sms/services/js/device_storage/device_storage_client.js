/* global bridge,
          BroadcastChannel */

(function(exports) {
  'use strict';

  /**
   * Name of the service that is responsible for device storage functionality.
   * @type {string}
   */
  const SERVICE_NAME = 'device-storage-shim';

  // TODO: Remove the flag once the low storage feature is completed.
  const LOW_STORAGE_ENABLE = false;

  const priv = {
    client: Symbol('client'),
    appInstanceId: Symbol('appInstanceId')
  };

  var DeviceStorageClient = {
    /**
     * Reference to active bridge client instance.
     * @type {Client}
     */
    [priv.client]: null,

    /**
     * Unique identifier of app instance where client resides in.
     * @type {string}
     */
    [priv.appInstanceId]: null,

    /**
     * Initializes connection to device storage api hosted in iframe.
     * @param {string} appInstanceId Unique identifier of app instance
     * where client resides in.
     */
    init(appInstanceId) {
      if (!appInstanceId) {
        throw new Error('AppInstanceId is required!');
      }

      this[priv.appInstanceId] = appInstanceId;

      var broadcastChannelName = `${SERVICE_NAME}-channel-${appInstanceId}`;

      this[priv.client] = bridge.client({
        service: SERVICE_NAME,
        endpoint: new BroadcastChannel(broadcastChannelName)
      });
    },

    /**
     * Bypass the event handler function to service with specific appInstanceId.
     * @param {string} event Event name.
     * @param {Function} func Handler function corresponding to event.
     */
    on(event, func) {
      LOW_STORAGE_ENABLE &&
        this[priv.client].on(`${event}-${this[priv.appInstanceId]}`, func);
    },

    lowDiskSpace: LOW_STORAGE_ENABLE && navigator.getDeviceStorage('apps') &&
      navigator.getDeviceStorage('apps').lowDiskSpace
  };

  exports.DeviceStorageClient = Object.seal(DeviceStorageClient);

})(window);
