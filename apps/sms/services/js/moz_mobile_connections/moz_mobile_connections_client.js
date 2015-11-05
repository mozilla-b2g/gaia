/* global bridge,
          BroadcastChannel */

(function(exports) {
  'use strict';

  /**
   * Name of the service that is responsible for messaging functionality.
   * @type {string}
   */
  const SERVICE_NAME = 'moz-mobile-connections-shim';

  /**
   * Disable default client timeout from bridge by setting the timeout to false.
   * @type {number|boolean}
   */
  const TIMEOUT = false;

  /**
   * Reference to active bridge client instance.
   *
   * @type {Client}
   */
  var client;

  var MozMobileConnectionsClient = {
    /**
     * Initializes connection to mozMobileConnectionsShim hosted in iframe.
     * @param {string} appInstanceId Unique identifier of app instance
     * where client resides in.
     */
    init(appInstanceId) {
      if (!appInstanceId) {
        throw new Error('AppInstanceId is required!');
      }

      var broadcastChannelName = `${SERVICE_NAME}-channel-${appInstanceId}`;

      client = bridge.client({
        service: SERVICE_NAME,
        endpoint: new BroadcastChannel(broadcastChannelName),
        timeout: TIMEOUT
      });
    },

    /**
     * Switch the default MMS and data to SIM that matches the given iccId.
     * @param {string} iccId Id that could map to the target SIM.
     * @returns {Promise} Promise of shim's method that returned when sim
     *  switching is ready or failed.
     */
    switchMmsSimHandler(iccId) {
      return client.method('switchMmsSimHandler', iccId);
    }
  };

  exports.MozMobileConnectionsClient = Object.freeze(
    MozMobileConnectionsClient
  );

})(window);
