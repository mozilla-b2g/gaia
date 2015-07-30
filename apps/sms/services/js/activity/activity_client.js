/* global EventDispatcher,
          bridge
*/

(function(exports) {
  'use strict';

  /**
   * Name of the service that is responsible for managing activities.
   * @type {string}
   */
  const SERVICE_NAME = 'activity-service';

  /**
   * Reference to active bridge client instance. For every app instance that is
   * run as inline activity we have only one bridge service (hosted in the main
   * window context) and only one bridge client (hosted in the same context).
   * Client should only communicate with the service that holds reference to
   * the corresponding activity request. Since we can potentially have more than
   * one inline activity instance we should use unique bridge service name for
   * every app instance to avoid message collision.
   *
   * @type {Client}
   */
  var client;

  /**
   * Indicates if there is pending activity request.
   * @type {boolean}
   */
  var hasPendingRequest;

  /**
   * ActivityClient is a wrapper around bridge client connected to the bridge
   * service hosted in the context that can handle system messages. It allows
   * to access "activity" request coming from system message when consumer can't
   * receive it directly (document in a different URL or even worker).
   * @type {Object}
   */
  var ActivityClient = {
    /**
     * Initialized activity service client bridge.
     */
    init() {
      client = bridge.client(SERVICE_NAME, exports);
      hasPendingRequest = false;

      client.on('activity-request', (request) => {
        // This case should never happen since we use "inline" activities only.
        if (hasPendingRequest) {
          this.postError('Concurrent activity requests are not allowed');
          return;
        }

        hasPendingRequest = true;
        this.emit(request.name + '-activity-request', request.data);
      });
    },

    /**
     * Posts results to the activity caller.
     * @param {*?} result
     * @returns {Promise} Promise that resolves once operation is completed.
     */
    postResult(result) {
      if (!hasPendingRequest) {
        return Promise.reject(
          new Error('There is no any activity request to post result to!')
        );
      }

      hasPendingRequest = false;
      return client.method('postResult', result);
    },

    /**
     * Notifies activity caller that exception occurred.
     * @param {*?} error
     * @returns {Promise} Promise that resolves once operation is completed.
     */
    postError(error) {
      if (!hasPendingRequest) {
        return Promise.reject(
          new Error('There is no any activity request to post error to!')
        );
      }

      hasPendingRequest = false;

      console.error('Activity request was rejected with "%s" reason', error);

      return client.method('postError', error);
    },

    /**
     * Checks if client has pending activity request.
     * @returns {boolean}
     */
    hasPendingRequest() {
      return hasPendingRequest;
    }
  };

  exports.ActivityClient = Object.freeze(
    EventDispatcher.mixin(
      ActivityClient, ['new-activity-request', 'share-activity-request']
    )
  );
})(window);
