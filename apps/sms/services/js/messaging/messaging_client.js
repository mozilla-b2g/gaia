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

  var serviceEndpoint = null;

  var MessagingClient = {
    init() {
      serviceEndpoint = new SharedWorker(
        '/services/js/messaging/messaging_service.js'
      );

      client = bridge.client({
        service: SERVICE_NAME,
        endpoint: serviceEndpoint,
        timeout: TIMEOUT
      });
    },

    sendSMS(options) {
      return client.method('sendSMS', options);
    },

    sendMMS(options) {
      return client.method('sendMMS', options);
    },

    resendMessage(message) {
      return client.method('resendMessage', message);
    },

    retrieveMMS(id) {
      return client.method('retrieveMMS', id);
    }
  };

  exports.MessagingClient = Object.freeze(MessagingClient);

})(window);