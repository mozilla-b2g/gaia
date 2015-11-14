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
    },

    /**
     * Sends an SMS based on the specified parameter object.
     * @param {Object} options Options object that contains :-
     * - recipients (string or array of string): contains the list of
     *   recipients for this message
     * - content (string): the message's body
     * - serviceId (optional long or string): the SIM serviceId we use to send
     *   the message
     * - onsuccess (optional function): will be called when one SMS has been
     *   sent successfully, with the request's result as argument. Can be called
     *   several times.
     * - onerror (optional function): will be called when one SMS transmission
     *   failed, with the error object as argument. Can be called several times.
     * - oncomplete (optional function): will be called when all messages have
     *   been sent. Its argument will have the following properties:
     *   + hasError (boolean): whether we had at least one error
     *   + return (array): each item is an object with the following properties:
     *     . success (boolean): whether this is a success or an error
     *     . result (request's result): the request's result object
     *     . recipient (string): the recipient used for this transmission.
     * @return {Promise}
     */
    sendSMS(options) {
      return client.method('sendSMS', options, appInstanceId);
    },

    /**
     * Sends an MMS based on the specified parameter object.
     * @param {Object} options Options object is the options field with the
     * following properties:
     * - recipients (string or array of string): recipients for this message.
     * - subject (optional string): subject for this message.
     * - content (array of SMIL slides): this is the content for the message
     *   (see ConversationView for more information).
     * - serviceId (optional long or string): the SIM that should be used for
     *   sending this message. If this is not the current default configuration
     *   for sending MMS, then we'll first switch the configuration to this
     *   serviceId, and only then send the message. That means that the
     *   "sending" event will come quite late in this case.
     * - onsuccess (optional func): called only once, even for several
     *   recipients, when the message is successfully sent.
     * - onerror (optional func): called only once if there is an error.
     * @return {Promise}
     */
    sendMMS(options) {
      return client.method('sendMMS', options, appInstanceId);
    },

    /**
     * Resends message with the given opts.
     * Takes a formatted message in case you happen to have one.
     * @param {Object} message The message object containing all the information
     * depending on the type of the message which can be 'sms' or 'mms'.
     * @return {Promise}
     */
    resendMessage(message) {
      return client.method('resendMessage', message, appInstanceId);
    },

    /**
     * Gets the MMS object having a given id.
     * @param {number} id The id of the MMS we wish to get.
     * @return {Promise<MmsMessage>} A Promise object that handles the success
     * or error of the operation.
     */
    retrieveMMS(id) {
      return client.method('retrieveMMS', id, appInstanceId);
    }
  };

  exports.MessagingClient = Object.freeze(MessagingClient);

})(window);
