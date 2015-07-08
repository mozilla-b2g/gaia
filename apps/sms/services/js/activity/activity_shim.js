/* global BridgeServiceMixin */
/* exported ActivityShim */
'use strict';

(function(exports) {
  const priv = Object.freeze({
    request: Symbol('request'),

    onActivityRequest: Symbol('onActivityRequest')
  });

  /**
   * Name of the service that is responsible for managing activities.
   * @type {string}
   */
  const SERVICE_NAME = 'activity-service';

  /**
   * Name of the system message that is leveraged by activities.
   * @type {string}
   */
  const SYSTEM_MESSAGE_NAME = 'activity';

  /**
   * List of methods exposed by shim.
   * @type {Array.<string>}
   */
  const METHODS = Object.freeze(['postResult', 'postError']);

  /**
   * List of event that can be broadcasted by shim.
   * @type {Array.<string>}
   */
  const EVENTS = Object.freeze(['activity-request']);

  /**
   * ActivityShim is a shim around "activity" system message handling code that
   * allows to access activity request data by the consumer that can't handle
   * system messages directly (document hosted in a different URl or worker) via
   * exposing bridge service with required methods.
   * @type {Object}
   */
  var ActivityShim = {
    /**
     * Reference to currently active activity request.
     * @type {ActivityRequestHandler}
     */
    [priv.request]: null,

    /**
     * Initialized activity service bridge.
     */
    init() {
      this.initService();

      // We use setTimeout here to allow activity client to do connection
      // handshake with the service first, so that it will be able to receive
      // event broadcasted by service.
      setTimeout(() => {
        navigator.mozSetMessageHandler(
          SYSTEM_MESSAGE_NAME, this[priv.onActivityRequest].bind(this)
        );
      });
    },

    /**
     * Checks if activity service has pending activity request.
     */
    hasPendingRequest() {
      return navigator.mozHasPendingMessage(SYSTEM_MESSAGE_NAME);
    },

    /**
     * Posts activity request result.
     * @param {*} result Data to post as activity request result.
     * @private
     */
    postResult(result) {
      var request = this[priv.request];
      if (!request) {
        throw new Error('There is no any activity request to post result to!');
      }

      request.postResult(result || { success: true });

      this[priv.request] = null;
    },

    /**
     * Posts activity request error.
     * @param {*} error Error to post as activity request error.
     * @private
     */
    postError(error) {
      var request = this[priv.request];
      if (!request) {
        throw new Error('There is no any activity request to post error to!');
      }

      request.postError(error);

      this[priv.request] = null;
    },

    /**
     * Handler that fires once app receives activity request via system message.
     * @param {ActivityRequestHandler} request Activity request.
     * @private
     */
    [priv.onActivityRequest](request) {
      this[priv.request] = request;

      this.broadcast('activity-request', request.source);
    }
  };

  exports.ActivityShim = Object.seal(
    BridgeServiceMixin.mixin(
      ActivityShim,
      SERVICE_NAME,
      { methods: METHODS, events: EVENTS }
    )
  );
})(window);
