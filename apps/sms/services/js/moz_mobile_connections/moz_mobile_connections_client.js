/* global bridge,
          finalizeClient
*/

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

  const priv = {
    client: Symbol('client'),
    appInstanceId: Symbol('appInstanceId')
  };

  var MozMobileConnectionsClient = {
    [priv.client]: null,
    [priv.appInstanceId]: null,

    /**
     * Initializes connection to mozMobileConnectionsShim hosted in iframe.
     * @param {string} appInstanceId Unique identifier of app instance
     * where client resides in.
     */
    init(appInstanceId, endpoint) {
      if (!appInstanceId) {
        throw new Error('AppInstanceId is required!');
      }

      this[priv.appInstanceId] = appInstanceId;
      this[priv.client] = bridge.client({
        service: SERVICE_NAME,
        endpoint: endpoint,
        timeout: TIMEOUT
      }).plugin(finalizeClient);
    },

    /**
     * Switch the default MMS and data to SIM that matches the given iccId.
     * @param {string} iccId Id that could map to the target SIM.
     * @returns {Promise} Promise of shim's method that returned when sim
     *  switching is ready or failed.
     */
    switchMmsSimHandler(iccId) {
      return this[priv.client].method(
        'switchMmsSimHandler', iccId, this[priv.appInstanceId]
      );
    },

    destroy() {
      return this[priv.client].finalize();
    }
  };

  exports.MozMobileConnectionsClient = Object.seal(MozMobileConnectionsClient);
})(window);
