/* global bridge */

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
    init(applicationInstanceId) {
      if (!applicationInstanceId) {
        throw new Error('AppInstanceId is required!');
      }

      var serviceEndpoint = new SharedWorker(
        '/services/js/messaging/messaging_service.js'
      );

      appInstanceId = applicationInstanceId;

      client = bridge.client({
        service: SERVICE_NAME,
        endpoint: serviceEndpoint,
        timeout: TIMEOUT
      });

      return client.method('register', appInstanceId);
    },

    on(event, func) {
      client.on(`${event}-${appInstanceId}`, func);
    },

    off(event, func) {
      client.off(`${event}-${appInstanceId}`, func);
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
    }
  };

  exports.MessagingClient = Object.freeze(MessagingClient);

})(window);
