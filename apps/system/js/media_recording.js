/* global Applications, ManifestHelper*/
(function(exports) {
  'use strict';

  /**
   * The visible indicator present in the Utility Tray indicating that the
   * mic/camera is active at a target web url.
   * @class MediaRecording
   * @requires Applications
   */
  function MediaRecording() {
  }

  MediaRecording.prototype = {
    /**
     * To tell if the current state is using audio recording device, like mic.
     * @memberof MediaRecording.prototype
     * @type {Boolean}
     */
    isAudio: false,
    /**
     * To tell if the current state is using video recording device, like
     * camera.
     * @memberof MediaRecording.prototype
     * @type {Boolean}
     */
    isVideo: false,
    /**
     * To tell if the current state is using any recording device, like mic or
     * camera.
     * @memberof MediaRecording.prototype
     * @type {Boolean}
     */
    isRecording: false,
    /**
     * start the MediaRecorder to init variables and listeners
     * @memberof MediaRecording.prototype
     */
    start: function mr_start() {
      this.container = document.getElementById('media-recoding-status-list');
      this.icon = this.container.querySelector('.icon');
      this.origin = this.container.querySelector('.origin');
      this.message = this.container.querySelector('.message');
      this.timer = this.container.querySelector('.timer');

      window.addEventListener('mozChromeEvent', this);
      return this;
    },
    /**
     * stop the MediaRecorder to reset variables and listeners
     * @memberof MediaRecording.prototype
     */
    stop: function mr_stop() {
      this.isAudio = false;
      this.isVideo = false;
      this.isRecording = false;
      this.container = null;
      this.icon = null;
      this.origin = null;
      this.message = null;
      this.timer = null;

      window.removeEventListener('mozChromeEvent', this);
    },

    /**
     * Event handler interface for mozChromeEvent.
     * Updates the icon, app title, and time.
     * @memberof MediaRecording.prototype
     * @param {DOMEvent} evt The event.
     */
    handleEvent: function mr_handleEvent(evt) {
      if (evt.detail.type !== 'recording-status') {
        return;
      }
      if (evt.detail.active) {
        this.isRecording = true;
        if (!this.container.classList.contains('displayed')) {
          var _ = navigator.mozL10n.get;
          this.container.classList.add('displayed');
          // Show proper icon
          if (this.isAudio != evt.detail.isAudio) {
            this.isAudio = evt.detail.isAudio;
          }
          if (this.isVideo != evt.detail.isVideo) {
            this.isVideo = evt.detail.isVideo;
          }

          if (this.isAudio && this.isVideo) {
            this.icon.style.backgroundImage =
              'url(style/media_recording/images/VideoRecorder.png)';
            this.message.textContent = _('media-is-on');
          } else if (this.isAudio) {
            this.icon.style.backgroundImage =
              'url(style/media_recording/images/Microphone.png)';
            this.message.textContent = _('microphone-is-on');
          } else if (this.isVideo) {
            this.icon.style.backgroundImage =
              'url(style/media_recording/images/Camera.png)';
            this.message.textContent = _('camera-is-on');
          }

          // Show proper app name or url
          if (evt.detail.isApp) {
            var app = Applications.getByManifestURL(evt.detail.requestURL);
            this.origin.textContent = new ManifestHelper(app.manifest).name;
          } else {
            var pathArray = evt.detail.requestURL.split('/');
            this.origin.textContent = pathArray[0] + '//' + pathArray[2];
          }

          this.updateTime(new Date());
        }
      } else {
        this.isRecording = false;
        if (this.container.classList.contains('displayed')) {
          this.container.classList.remove('displayed');
          this.isAudio = false;
          this.isVideo = false;
        }
      }
    },

    /**
     * Updates the time field of UI
     * @memberof MediaRecording.prototype
     * @param {Date} now The date/time where we receive the object.
     */
    updateTime: function mr_updateTime(now) {
      var _ = navigator.mozL10n.get;
      var f = new navigator.mozL10n.DateTimeFormat();

      var timeFormat = _('shortTimeFormat').replace('%p', '<span>%p</span>');
      var formatted = f.localeFormat(now, timeFormat);
      this.timer.innerHTML = formatted;
    }
  };

  exports.MediaRecording = MediaRecording;

})(window);
