/* global applications, ManifestHelper */
(function(exports) {
  'use strict';

  /**
   * The visible indicator present in the Utility Tray indicating that the
   * mic/camera is active at a target app name or web url.
   * @class MediaRecording
   * @requires applications, ManifestHelper
   */
  function MediaRecording() {
  }

  MediaRecording.prototype = {
    /**
     * To tell if the current state is using any recording device, like mic or
     * camera. Used to control the present of statusbar status.
     * @memberof MediaRecording.prototype
     * @type {Boolean}
     */
    isRecording: false,
    /**
     * To store current media recording messages
     * @memberof MediaRecording.prototype
     * @type {Object[]}
     */
    messages: [],
    /**
     * Start the MediaRecorder to init variables and listeners
     * @memberof MediaRecording.prototype
     */
    start: function mr_start() {
      window.addEventListener('mozChromeEvent', this);
    },

    /**
     * Stop the MediaRecorder to reset variables and listeners
     * @memberof MediaRecording.prototype
     */
    stop: function mr_stop() {
      this.isRecording = false;
      this.messages = [];

      window.removeEventListener('mozChromeEvent', this);
    },

    /**
     * Return Panel data container
     * @memberof MediaRecording.prototype
     * @param {Object} detail The event.detail.
     */
    createItem: function mr_createItem(detail) {
      // To tell if the current state is using audio recording device, like
      // mic.
      var isAudio = detail.isAudio;
      // To tell if the current state is using video recording device, like
      // camera.
      var isVideo = detail.isVideo;
      // To store correspondent icons url
      var icon;
      // To store correspondent i10n string
      var message;

      if (isAudio && isVideo) {
        icon = 'video-mic';
        message = 'media-is-on';
      } else if (isAudio) {
        icon = 'mic';
        message = 'microphone-is-on';
      } else if (isVideo) {
        icon = 'video';
        message = 'camera-is-on';
      }

      return {
        isApp: detail.isApp,
        requestURL: detail.requestURL,
        isAudio: isAudio,
        isVideo: isVideo,
        origin: this.getOrigin(detail),
        icon: icon,
        message: message,
        timestamp: new Date()
      };
    },

    /**
     * Get the app name or url if it's not an app
     * @memberof MediaRecording.prototype
     * @param {DOMEvent} detail The event.detail.
     * @returns {String}
     */
    getOrigin: function mr_getOrigin(detail) {
      var origin;
      if (detail.isApp) {
        var app = applications.getByManifestURL(detail.requestURL);
        origin = new ManifestHelper(app.manifest).name;
      } else {
        var pathArray = detail.requestURL.split('/');
        origin = pathArray[0] + '//' + pathArray[2];
      }
      return origin;
    },

    /**
     * Event handler interface for mozChromeEvent.
     * Updates the informations on utility tray.
     * @memberof MediaRecording.prototype
     * @param {DOMEvent} evt The event.
     */
    handleEvent: function mr_handleEvent(evt) {
      if (evt.detail.type !== 'recording-status') {
        return;
      }

      if (evt.detail.active) {
        this.isRecording = true;
        var isAlreadyActive = this.messages.some(function(message) {
          if (message.requestURL === evt.detail.requestURL &&
              message.isApp === evt.detail.isApp) {
            return true;
          }
        }, this);
        if (!isAlreadyActive) {
          this.addMessage(evt.detail);
        }
      } else {
        this.removeMessage(evt.detail);
      }
    },

    /**
     * Create and append the DOM element
     * @memberof MediaRecording.prototype
     * @param {Object} detail The event.detail.
     */
    addMessage: function mr_addMessage(detail) {
      var item = this.createItem(detail);
      this.messages.push(item);
      this.updateRecordingStatus();
    },

    /**
     * Remove the DOM element
     * @memberof MediaRecording.prototype
     * @param {Object} detail The event.detail.
     */
    removeMessage: function mr_removeMessage(detail) {
      var self = this;
      this.messages.some(function(message, index) {
        if (message.requestURL === detail.requestURL &&
            message.isApp === detail.isApp) {
          self.messages.splice(index, 1);
          self.updateRecordingStatus();
          return true;
        }
      });
    },

    /**
     * Update utility tray status
     * @memberof MediaRecording.prototype
     */
    updateRecordingStatus: function mr_updateRecordingStatus() {
      this.isRecording = this.messages.length > 0;
      // update statusbar status via custom event
      var event = new CustomEvent('recordingEvent', {
        detail: {
          type: 'recording-state-changed',
          active: this.isRecording
        }
      });
      window.dispatchEvent(event);
    }
  };

  exports.MediaRecording = MediaRecording;

})(window);
