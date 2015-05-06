'use strict';
/* global ScreenManager, DevToolsAuthDialog */

(function(exports) {

  /**
   * DevToolsAuth displays a prompt asking the user to scan a QR code as part of
   * pairing the device with a machine running Firefox desktop.  This takes
   * place when debugging via WiFi to exchange keys.
   * @requires DevToolsAuthDialog
   * @requires ScreenManager
   * @class DevToolsAuth
   */
  function DevToolsAuth() {
    window.addEventListener('mozChromeEvent', this);
  }

  DevToolsAuth.prototype = {

    /**
     * General event handler interface.
     * Displays the pair dialog when needed.
     * @memberof DevToolsAuth.prototype
     * @param  {DOMEvent} evt The event.
     */
    handleEvent: function(e) {
      if (e.detail.type !== 'devtools-auth') {
        return;
      }
      if (e.detail.action === 'start') {
        this.start();
      }
      if (e.detail.action === 'capture') {
        this.capture();
      }
      if (e.detail.action === 'stop') {
        this.stop();
      }
    },

    get dialog() {
      if (!this._dialog) {
        this._dialog = new DevToolsAuthDialog({
          onHide: this.onHide.bind(this)
        });
      }
      return this._dialog;
    },

    get canvas() {
      if (!this._canvas) {
        this._canvas = document.createElement('canvas');
      }
      return this._canvas;
    },

    /**
     * Begin capturing images that DevTools will attempt to find a QR code in
     * for authentication.
     * @memberof DevToolsAuth.prototype
     */
    start: function() {
      // We want the user's attention, so we need to turn the screen on if it's
      // off.
      if (!ScreenManager.screenEnabled) {
        ScreenManager.turnScreenOn();
      }

      this.dialog.show();

      var getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia;
      getUserMedia = getUserMedia.bind(navigator);

      getUserMedia({
        video: {
          width: { min: 480 },
          height: { min: 480 }
        },
        audio: false
      }, function(stream) {
        var video = this.dialog.video;

        video.addEventListener('loadedmetadata', function onMetadata() {
          video.removeEventListener('loadedmetadata', onMetadata);
          this._resizeCanvas();
          this.capture();
        }.bind(this));

        video.mozSrcObject = stream;
        video.play();
      }.bind(this), function(e) {
        console.error('Unable to access camera: ' + e);
      });
    },

    /**
     * Capture another image and send to DevTools.
     * @memberof DevToolsAuth.prototype
     */
    capture: function() {
      var video = this.dialog.video;
      var canvas = this.canvas;
      var context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      var url = canvas.toDataURL('image/jpeg');
      this._checkImage(url);
    },

    /**
     * An image was successfully decoded, so further capture can stop.
     * @memberof DevToolsAuth.prototype
     */
    stop: function() {
      this.dialog.hide('complete');
    },

    /**
     * Dialog is now hidden, perform cleanup.
     * @memberof DevToolsAuth.prototype
     */
    onHide: function(reason) {
      var video = this.dialog.video;
      video.pause();
      if (video.mozSrcObject) {
        video.mozSrcObject.stop();
        video.mozSrcObject = null;
      }
      this._canvas = null;
      if (reason !== 'complete') {
        this.abort();
      }
    },

    /**
     * User chose to abort the auth process.
     * @memberof DevToolsAuth.prototype
     */
    abort: function() {
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentEvent', true, true,
                            { type: 'devtools-auth',
                              action: 'abort' });
      window.dispatchEvent(event);
    },

    _resizeCanvas: function() {
      var video = this.dialog.video;
      this.canvas.width = video.videoWidth;
      this.canvas.height = video.videoHeight;
    },

    /**
     * Dispatches an event to check a possible pairing candidate image.
     * @memberof DevToolsAuth.prototype
     * @param  {String} url Object URL of the image to check
     */
    _checkImage: function(url) {
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentEvent', true, true,
                            { type: 'devtools-auth',
                              action: 'capture',
                              url: url });
      window.dispatchEvent(event);
    }
  };

  exports.DevToolsAuth = DevToolsAuth;

}(window));
