'use strict';

(function(window) {
  /**
   * @mixin BrowserMixin
   */
  window.BrowserMixin = {
    reload: function bm_reload() {
      if (this.browser.element) {
        this.browser.element.reload();
      }
    },

    /**
     * A static timeout to make sure
     * the next event don't happen too late.
     */
    NEXTPAINT_TIMEOUT: 500,

    /**
     * Wait for a next paint event from mozbrowser iframe,
     * The callback would be called in this.NEXTPAINT_TIMEOUT ms
     * if the next paint event doesn't happen.
     * The use case is for the moment just before we turn on
     * the iframe visibility, so the TIMEOUT isn't too long.
     *
     * Note: for some reason we intend to use ensureFullRepaint now.
     *
     * @param  {Function} callback The callback function to be invoked
     *                             after we get next paint event.
     */
    waitForNextPaint: function bm_waitForNextPaint(callback) {
      if (!this.browser || !this.browser.element) {
        if (callback) {
          callback();
        }
        return;
      }
      var iframe = this.browser.element;
      var nextPaintTimer;
      var self = this;
      var onNextPaint = function aw_onNextPaint() {
        self.debug(' nextpainted.');
        iframe.removeNextPaintListener(onNextPaint);
        clearTimeout(nextPaintTimer);

        callback();
      };

      nextPaintTimer = setTimeout(function ifNextPaintIsTooLate() {
        self.debug(' nextpaint is timeouted.');
        iframe.removeNextPaintListener(onNextPaint);
        callback();
      }, this.NEXTPAINT_TIMEOUT);

      iframe.addNextPaintListener(onNextPaint);
    },

    /**
     * This function will be called by window managers while top most app
     * window is changed to notify nfc module in gecko.
     */
    setNFCFocus: function(enable) {
      if (!this.browser || !this.browser.element ||
          this._nfcActive === enable ||
          (this.CLASS_NAME !== 'AppWindow' &&
           this.CLASS_NAME !== 'ActivityWindow' &&
           this.CLASS_NAME !== 'PopupWindow') &&
           this.CLASS_NAME !== 'HomescreenWindow') {
          // XXX: Implement this.belongToAppWindow()
        return;
      }
      this.debug(this.name + ':' + this.instanceID +
        ' is setting nfc active to: ' + enable);
      try {
        this._nfcActive = enable;
        this.browser.element.setNFCFocus(enable);
      } catch (err) {
        this.debug('set nfc active is not implemented');
      }
    },

    /**
     * get the screenshot of mozbrowser iframe.
     * If it succeed, the blob would be stored in this._screenshotBlob.
     * @param  {Function} callback The callback function to be invoked
     *                             after we get the screenshot.
     */
    getScreenshot: function bm_getScreenshot(callback, width, height, timeout,
                                             ignoreFront) {
      if (!this.browser || !this.browser.element) {
        if (callback) {
          callback();
        }
        return;
      }
      this.debug('getting screenshot..');
      var self = this;
      var invoked = false;
      var timer;


      // First, let's check if we have a frontWindow, if so this is the one
      // we will want a screenshot of, passing ignoreFront lets us skip this
      // if we want a screenshot of the browser element
      ignoreFront = (typeof ignoreFront === 'undefined') ? false : ignoreFront;
      if (!ignoreFront && this.frontWindow) {
        this.frontWindow.getScreenshot(callback, width, height, timeout);
        return;
      }

      if (timeout) {
        timer = window.setTimeout(function() {
          if (invoked) {
            return;
          }
          self.debug('getScreenshot timeout!');
          invoked = true;
          callback();
        }, timeout);
      }

      //
      // Since homescreen is the only app contains transparent background,
      // we only store png screenshot for homescreen to save more memory.
      //
      var type = this.isHomescreen ?
        'image/png' : 'image/jpeg';

      var _width = width || this.width ||
                   Service.query('LayoutManager.width');
      var _height = height || this.height ||
                    Service.query('LayoutManager.height');
      this.debug('w=' + _width + ';h=' + _height);
      var req = this.iframe.getScreenshot(_width, _height, type);

      var success = function(result) {
        if (!width) {
          // Refresh _screenshotBlob when no width/height is specified.
          self._screenshotBlob = result;
        }

        self.debug('getScreenshot succeed!');
        if (invoked) {
          return;
        }
        self.debug('get screenshot success!!!!');
        invoked = true;
        if (timer) {
          window.clearTimeout(timer);
        }
        if (callback) {
          callback(result);
        }
      };
      var error = function() {
        self.debug('getScreenshot failed!');
        if (invoked) {
          return;
        }
        invoked = true;
        if (timer) {
          window.clearTimeout(timer);
        }
        if (callback) {
          callback();
        }
      };
      if (req.then) {
        req.then(success, error);
      } else {
        req.onsuccess = function(evt) {
          success(evt.target.result);
        };
        req.onerror = error;
      }
    },

    focus: function bm_focus() {
      if (this.contextmenu && this.contextmenu.isShown()) {
        this.contextmenu.focus();
      } else if (this.browser && this.browser.element) {
        this.browser.element.focus();
      }
    },

    blur: function bm_blur() {
      if (this.browser.element) {
        this.browser.element.blur();
      }
    },

    back: function bm_back() {
      if (this.browser.element) {
        this.browser.element.goBack();
      }
    },

    forward: function bm_forward() {
      if (this.browser.element) {
        this.browser.element.goForward();
      }
    },

    stop: function bm_stop() {
      if (this.browser.element) {
        this.browser.element.stop();
      }
    },

    _setVisible: function bm__setVisible(visible) {
      if (this.browser && this.browser.element &&
          'setVisible' in this.browser.element) {
        this.debug('setVisible on browser element:' + visible);
        this.browser.element.setVisible(visible);
      }
    },

    _setActive: function bm__setActive(active) {
      if (this.browser && this.browser.element &&
          'setActive' in this.browser.element) {
        this.debug('setActive on browser element:' + active);
        this.browser.element.setActive(active);
        var topMostUI = Service.query('getTopMostUI');
      }
    },

    /**
     * Set aria-hidden attribute on browser's element to handle its screen
     * reader visibility.
     * @type {Boolean} visible A flag indicating if the element should be screen
     * reader visible.
     */
    _setVisibleForScreenReader:
      function bm__setVisibleForScreenReader(visible) {
        if (this.browser && this.browser.element) {
          this.debug('aria-hidden on browser element:' + !visible);
          this.browser.element.setAttribute('aria-hidden', !visible);
        }
      },

    /**
     * Fire a DOM Request to detect the history has previous page or not.
     * @param  {Function} callback Called when DOM Request is done.
     */
    canGoBack: function bm_cangoback(callback) {
      var self = this;
      if (this.browser.element) {
        var r = this.browser.element.getCanGoBack();
        var success = function(result) {
          self._backable = result;
          if (callback) {
            callback(result);
          }
        };
        var error = function() {
          if (callback) {
            callback();
          }
        };
        if (r.then) {
          r.then(success, error);
        } else {
          r.onsuccess = function(evt) {
            success(evt.target.result);
          };
          r.onerror = error;
        }
      } else {
        if (callback) {
          callback();
        }
      }
    },

    /**
     * Fire a DOM Request to detect the history has next page or not.
     * @param  {Function} callback Called when DOM Request is done.
     */
    canGoForward: function bm_cangoforward(callback) {
      var self = this;
      if (this.browser.element) {
        var r = this.browser.element.getCanGoForward();
        var success = function(result) {
          self._forwardable = result;
          if (callback) {
            callback(result);
          }
        };
        var error = function() {
          if (callback) {
            callback();
          }
        };
        if (r.then) {
          r.then(success, error);
        } else {
          r.onsuccess = function(evt) {
            success(evt.target.result);
          };
          r.onerror = error;
        }
      } else {
        if (callback)
          callback();
      }
    },

    /**
     * Decide we are in out of process or not.
     */
    isOOP: function bm_isOOP() {
      return (this.browser_config && this.browser_config.oop);
    }
  };

  AppWindow.addMixin(BrowserMixin);
}(this));
