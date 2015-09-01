/*global Promise */

(function(exports) {
  'use strict';

  /**
   * Class that is applied to body whenever application is ready for user.
   * @const {string}
   */
  const APPLICATION_READY_CLASS_NAME = 'js-app-ready';

  /**
   * Unique identifier of the app instance.
   * @type {number}
   */
  const INSTANCE_ID = Date.now();

  var app = {
    isReady: function app_isReady() {
      return document.body.classList.contains(APPLICATION_READY_CLASS_NAME);
    },

    /**
     * Sets application readiness, can be called only once
     */
    setReady: function app_setReady() {
      if (this.isReady()) {
        throw new Error('Application should be marked as ready only once!');
      }
      document.body.classList.add(APPLICATION_READY_CLASS_NAME);
      // Tell audio channel manager that we want to adjust the notification
      // channel if the user press the volumeup/volumedown buttons in Messages.
      if (navigator.mozAudioChannelManager) {
        navigator.mozAudioChannelManager.volumeControlChannel = 'notification';
      }
    },

    /**
     * Returns promise that will be resolved once application is ready for
     * interaction.
     * @returns {Promise}
     */
    whenReady: function whenReady() {
      if (this.isReady()) {
        return Promise.resolve();
      }
      return new Promise(function(resolve, reject) {
        var bodyClassObserver = new MutationObserver(function() {
          try {
            if (this.isReady()) {
              bodyClassObserver.disconnect();
              resolve();
            }
          } catch(e) {
            reject(e);
          }
        }.bind(this));

        bodyClassObserver.observe(document.body, {
          attributes: true,
          attributeFilter: ['class']
        });
      }.bind(this));
    },

    get instanceId() {
      return INSTANCE_ID;
    }
  };

  exports.App = app;
})(this);
