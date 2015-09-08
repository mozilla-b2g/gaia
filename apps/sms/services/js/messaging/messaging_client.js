/* global bridge,
          finalizeClient
*/

(function(exports) {
  'use strict';

  /**
   * Name of the service that is responsible for messaging functionality.
   * @type {string}
   */
  const SERVICE_NAME = 'messaging-service';
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

  /**
   * Unique identifier of app instance where client resides in.
   * @type {string}
   */
  var appInstanceId;

  var MessagingClient = {
    /**
     * Initializes connection to MessagingService hosted in a SharedWorker.
     * @param {string} applicationInstanceId Unique identifier of app instance
     * where client resides in.
     */
    init(applicationInstanceId, endpoint) {
      if (!applicationInstanceId) {
        throw new Error('AppInstanceId is required!');
      }

      appInstanceId = applicationInstanceId;

      client = bridge.client({
        service: SERVICE_NAME,
        endpoint: endpoint,
        timeout: TIMEOUT
      }).plugin(finalizeClient);
    },

    sendSMS(options) {
      return client.method('sendSMS', options, appInstanceId);
    },

    sendMMS(options) {
      return client.method('sendMMS', options, appInstanceId);
    },

    resendMessage(message) {
      return client.method('resendMessage', message, appInstanceId);
    },

    retrieveMMS(id) {
      return client.method('retrieveMMS', id, appInstanceId);
    },

    destroy() {
      return client.finalize();
    }
  };

  exports.MessagingClient = Object.freeze(MessagingClient);

})(window);
