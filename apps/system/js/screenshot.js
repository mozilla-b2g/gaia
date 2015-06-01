/* global MozActivity, Notification, Service */

'use strict';

(function(exports) {

  /**
  * This system module takes a screenshot of the currently running app
  * or homescreen and stores it with DeviceStorage when the user
  * presses the home and sleep buttons at the same time. It communicates
  * with gecko code running in b2g/chrome/content/shell.js using a private
  * event-based API. It is the gecko code that creates the screenshot.
  *
  * This script must be used with the defer attribute.
  *
  * @class Screenshot
  *
  */
  function Screenshot() {
    this._started = false;
  }

  Screenshot.prototype = {
    /** @lends Screenshot */

    /**
     * Assumption for making sure we have enough space to save the image.
     *
     * Assume that the maximum screenshot size is 4 bytes per device pixel
     * plus a bit extra. In practice, with compression, our PNG files will be
     * much smaller than this.
     *
     * @type {Number}
     * @memberof Screenshot.prototype
     */
    MAX_SCREENSHOT_SIZE:
      window.innerWidth * window.devicePixelRatio *
      window.innerHeight * window.devicePixelRatio * 4 + 4096,

    /**
     * Start to handle screenshot events.
     * @memberof Screenshot.prototype
     */
    start: function() {
      if (this._started) {
        throw 'Instance should not be start()\'ed twice.';
      }
      this._started = true;

      Service.request('handleSystemMessageNotification', 'screenshot', this);
      window.addEventListener('volumedown+sleep', this);
      window.addEventListener('mozChromeEvent', this);
    },

    /**
     * Stop handling screenshot events.
     * @memberof Screenshot.prototype
     */
    stop: function() {
      if (!this._started) {
        throw 'Instance was never start()\'ed but stop() is called.';
      }
      this._started = false;

      Service.request('unhandleSystemMessageNotification', 'screenshot', this);
      window.removeEventListener('volumedown+sleep', this);
      window.removeEventListener('mozChromeEvent', this);
    },

    /**
     * Handle screenshot events.
     * @param  {DOMEvent} evt DOM Event to handle.
     * @memberof Screenshot.prototype
     */
    handleEvent: function(evt) {
      switch (evt.type) {
        case 'volumedown+sleep':
          this.takeScreenshot();
          break;

        case 'mozChromeEvent':
          if (evt.detail.type === 'take-screenshot-success') {
            this.handleTakeScreenshotSuccess(evt.detail.file);
          } else if (evt.detail.type === 'take-screenshot-error') {
            this._notify('screenshotFailed', evt.detail.error);
          }
          break;

        default:
          console.debug('Unhandled event: ' + evt.type);
          break;
      }
    },

    /**
     * Gets called when a system message notification for a screenshots is being
     * hit.
     **/
    handleSystemMessageNotification: function(message) {
      this.openImage(message.body);
      this.closeSystemMessageNotification(message);
    },

    closeSystemMessageNotification: function(msg) {
      Notification.get({ tag: msg.tag }).then(notifs => {
        notifs.forEach(notif => {
          if (notif.tag) {
            // Close notification with the matching tag
            if (notif.tag === msg.tag) {
              notif.close && notif.close();
            }
          } else {
            // If we have notification without a tag, check on the body
            if (notif.body === msg.body) {
              notif.close && notif.close();
            }
          }
        });
      });
    },

    /**
     * Actually take a screenshot (by do some check and send a mozContentEvent.)
     * @memberof Screenshot.prototype
     */
    takeScreenshot: function() {
      // Give feedback that the screenshot request was received
      navigator.vibrate(100);

      // We don't need device storage here, but check to see that
      // it is available before sending the screenshot request to chrome.
      // If device storage is available, the callback will be called.
      // Otherwise, an error message notification will be displayed.
      this._getDeviceStorage(function() {
        // Let chrome know we'd like a screenshot.
        // This is a completely non-standard undocumented API
        // for communicating with our chrome code.
        var screenshotProps = {
          detail: {
            type: 'take-screenshot'
          }
        };
        window.dispatchEvent(
          new CustomEvent('mozContentEvent', screenshotProps));
      });
    },

    openImage: function(filename) {
      this._getDeviceStorage(function(storage) {
        var request = storage.get(filename);
        request.onsuccess = function() {
          var imgblob = this.result;
          /*jshint nonew: false */
          new MozActivity({
            name: 'open',
            data: {
              type: imgblob.type,
              filename: filename,
              blob: imgblob,
              exitWhenHidden: true
            }
          });
        };
      });
    },

    /**
     * Handle the take-screenshot-success mozChromeEvent.
     * @param  {Blob} file Blob object received from the event.
     * @memberof Screenshot.prototype
     */
    handleTakeScreenshotSuccess: function(file) {
      try {
        this._getDeviceStorage(function(storage) {
          var d = new Date();
          d = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
          var filename = 'screenshots/' +
            d.toISOString().slice(0, -5).replace(/[:T]/g, '-') + '.png';

          var saveRequest = storage.addNamed(file, filename);
          saveRequest.onsuccess = (function ss_onsuccess() {
            // Vibrate again when the screenshot is saved
            navigator.vibrate(100);

            // Display filename in a notification
            this._notify('screenshotSaved', filename, null,
                         this.openImage.bind(this, filename));
          }).bind(this);

          saveRequest.onerror = (function ss_onerror() {
            this._notify('screenshotFailed', saveRequest.error.name);
          }).bind(this);
        });
      } catch (e) {
        console.log('exception in screenshot handler', e);
        this._notify('screenshotFailed', e.toString());
      }
    },

    /**
     * Get a DeviceStorage object and pass it to the callback.
     * Or, if device storage is not available, display a notification.
     * @param {Function} callback Callback to run.
     * @memberof Screenshot.prototype
     */
    _getDeviceStorage: function(callback) {
      var storage = navigator.getDeviceStorage('pictures');
      var availreq = storage.available();

      availreq.onsuccess = (function() {
        var state = availreq.result;
        if (state === 'unavailable') {
          this._notify('screenshotFailed', null, 'screenshotNoSDCard');
        }
        else if (state === 'shared') {
          this._notify('screenshotFailed', null, 'screenshotSDCardInUse');
        }
        else if (state === 'available') {
          var freereq = storage.freeSpace();
          freereq.onsuccess = (function() {
            if (freereq.result < this.MAX_SCREENSHOT_SIZE) {
              this._notify('screenshotFailed', null, 'screenshotSDCardLow');
            } else {
              callback.call(this, storage);
            }
          }).bind(this);
          freereq.onerror = (function() {
            this._notify(
              'screenshotFailed', freereq.error && freereq.error.name);
          }).bind(this);
        }
      }).bind(this);

      availreq.onerror = (function() {
        this._notify(
          'screenshotFailed', availreq.error && availreq.error.name);
      }).bind(this);
    },

    /**
     * Display a screenshot success or failure notification.
     * Localize the first argument, and localize the third if the second is null
     * @param  {String} titleid  l10n ID of the string to show.
     * @param  {String} body     Label to show as body, or null.
     * @param  {String} bodyid   l10n ID of the label to show as body.
     * @param  {String} onClick  Optional handler if the notification is clicked
     * @memberof Screenshot.prototype
     */
    _notify: function notify(titleid, body, bodyid, onClick) {
      var title = navigator.mozL10n.get(titleid) || titleid;
      body = body || navigator.mozL10n.get(bodyid);
      var notification = new window.Notification(title, {
        body: body,
        icon: '/style/icons/Gallery.png',
        tag: 'screenshot:' + (new Date().getTime()),
        data: {
          systemMessageTarget: 'screenshot'
        }
      });

      notification.onclick = function() {
        notification.close();
        if (onClick) {
          onClick();
        }
      };
    }
  };

  exports.Screenshot = Screenshot;

  // XXX: We initialize ourselves here for now to avoid conflicts with other
  // system2 stage1 patches. This instance is de-initalized in unit tests.
  // We should move the initalization to somewhere sane (maybe System module)
  // in the future.
  exports.screenshot = new Screenshot();
  exports.screenshot.start();

}(window));
