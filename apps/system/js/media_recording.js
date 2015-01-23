/* global applications, ManifestHelper, RecordingIcon, LazyLoader, Service */
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
    name: 'MediaRecording',

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
      this.container = document.getElementById('media-recording-status-list');

      window.addEventListener('mozChromeEvent', this);
      LazyLoader.load(['js/recording_icon.js']).then(function() {
        this.icon = new RecordingIcon(this);
        this.icon.start();
      }.bind(this)).catch(function(err) {
        console.error(err);
      });
      Service.registerState('isRecording', this);
    },

    /**
     * Stop the MediaRecorder to reset variables and listeners
     * @memberof MediaRecording.prototype
     */
    stop: function mr_stop() {
      this.isRecording = false;
      if (this.icon) {
        this.icon.stop();
      }
      this.messages = [];
      this.container = null;

      window.removeEventListener('mozChromeEvent', this);
      Service.unregisterState('isRecording', this);
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

      // attach panel
      var panelElement, iconElement, titleContainerElement, originElement,
          messageElement, timerElement;
      /* create panel
       <div class="media-recording-status fake-notification" role="listitem">
         <div data-icon="video"></div>
         <div class="title-container">
           <div class="origin"></div>
           <div class="timestamp"></div>
         </div>
         <div class="message"></div>
       </div>
      */
      panelElement = document.createElement('div');
      panelElement.className = 'media-recording-status fake-notification';
      panelElement.setAttribute('role', 'listitem');

      iconElement = document.createElement('div');
      iconElement.dataset.icon = item.icon;
      iconElement.className = 'alert';
      panelElement.appendChild(iconElement);

      titleContainerElement = document.createElement('div');
      titleContainerElement.className = 'title-container';
      panelElement.appendChild(titleContainerElement);

      originElement = document.createElement('div');
      originElement.className = 'title';
      originElement.textContent = item.origin;
      titleContainerElement.appendChild(originElement);

      timerElement = document.createElement('div');
      timerElement.className = 'timestamp';
      timerElement.dataset.timestamp = item.timestamp;
      titleContainerElement.appendChild(timerElement);
      panelElement.appendChild(titleContainerElement);

      messageElement = document.createElement('div');
      messageElement.className = 'message detail';
      messageElement.setAttribute('data-l10n-id', item.message);
      panelElement.appendChild(messageElement);

      // remember element in item
      item.element = panelElement;

      this.container.appendChild(panelElement);
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
          if (message.element) { // remove element
            message.element.parentNode.removeChild(message.element);
          }
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
      if (this.messages.length) { // show
        if (!this.container.classList.contains('displayed')) {
          this.container.classList.add('displayed');
        }
      } else { // hide
        this.isRecording = false;
        if (this.container.classList.contains('displayed')) {
          this.container.classList.remove('displayed');
        }
      }

      // update statusbar status via custom event
      var event = new CustomEvent('recordingEvent', {
        detail: {
          type: 'recording-state-changed',
          active: this.isRecording
        }
      });
      window.dispatchEvent(event);
      this.icon && this.icon.update();
    },

    /**
     * Return the formatted time string
     * @memberof MediaRecording.prototype
     * @param {Date} now The date/time where we receive the object.
     * @returns {String}
     */
    getFormattedTimeString: function mr_getFormattedTimeString(now) {
      var _ = navigator.mozL10n.get;
      var f = new navigator.mozL10n.DateTimeFormat();
      var timeFormat = window.navigator.mozHour12 ?
        _('shortTimeFormat12') : _('shortTimeFormat24');
      timeFormat = timeFormat.replace('%p', '<span>%p</span>');
      var formatted = f.localeFormat(now, timeFormat);
      return formatted;
    }
  };

  exports.MediaRecording = MediaRecording;

})(window);
