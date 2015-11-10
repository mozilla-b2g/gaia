/* global BridgeServiceMixin,
          BroadcastChannel
*/
/* exported ActivityShim */
'use strict';

(function(exports) {
  const priv = Object.freeze({
    request: Symbol('request'),
    setMessageHandler: Symbol('setMessageHandler'),

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
     * @private
     */
    [priv.request]: null,

    /**
     * Reference to mozSetMessageHandler function.
     * @type {Function}
     * @private
     */
    [priv.setMessageHandler]: null,

    /**
     * Initialized activity shim bridge service.
     * @param {string} appInstanceId Unique identifier of app instance where
     * shim resides in.
     */
    init(appInstanceId, setMessageHandler) {
      if (!appInstanceId) {
        throw new Error('AppInstanceId is required!');
      }

      this[priv.setMessageHandler] = setMessageHandler;

      // We may consider using exports.parent as endpoint instead in patch for
      // bug 1223363, once it is unblocked.
      this.initService(
        new BroadcastChannel(`${SERVICE_NAME}-channel-${appInstanceId}`)
      );
    },

    /**
     * Method is called by bridge when a new client is connected to the service.
     * @private
     */
    onConnected() {
      // We subscribe for the system message only when we have client connected,
      // to avoid the case when service broadcasts message, but no one listens
      // for it yet.
      this[priv.setMessageHandler](
        SYSTEM_MESSAGE_NAME, this[priv.onActivityRequest].bind(this)
      );
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
