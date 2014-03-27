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
     * get the screenshot of mozbrowser iframe.
     * If it succeed, the blob would be stored in this._screenshotBlob.
     * @param  {Function} callback The callback function to be invoked
     *                             after we get the screenshot.
     */
    getScreenshot: function bm_getScreenshot(callback, width, height, timeout) {
      if (!this.browser || !this.browser.element) {
        if (callback) {
          callback();
        }
        return;
      }
      // We don't need the screenshot of homescreen because:
      // 1. Homescreen background is transparent,
      //    currently gecko only sends JPG to us.
      //    See bug 878003.
      // 2. Homescreen screenshot isn't required by card view.
      //    Since getScreenshot takes additional memory usage,
      //    let's early return here.
      var self = this;
      var invoked = false;
      var timer;

      if (timeout) {
        timer = window.setTimeout(function() {
          if (invoked)
            return;
          invoked = true;
          callback();
        }, timeout);
      }

      var req = this.iframe.getScreenshot(
        width || this.width || LayoutManager.width,
        height || this.height || (this.isFullScreen() ?
                                  LayoutManager.fullscreenHeight :
                                  LayoutManager.usualHeight));

      req.onsuccess = function gotScreenshotFromFrame(evt) {
        var result = evt.target.result;
        if (!width) {
          // Refresh _screenshotBlob when no width/height is specified.
          self._screenshotBlob = result;
        }
        if (invoked)
          return;
        invoked = true;
        if (timer)
          window.clearTimeout(timer);
        if (callback)
          callback(result);
      };

      req.onerror = function gotScreenshotFromFrameError(evt) {
        if (invoked)
          return;
        invoked = true;
        if (timer)
          window.clearTimeout(timer);
        if (callback)
          callback();
      };
    },

    focus: function bm_focus() {
      if (this.browser.element) {
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

    _setVisible: function bm__setVisible(visible) {
      if (this.browser && this.browser.element &&
          'setVisible' in this.browser.element) {
        this.debug('setVisible on browser element:' + visible);
        this.browser.element.setVisible(visible);
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
        r.onsuccess = function(evt) {
          self._backable = evt.target.result;
          if (callback)
            callback(evt.target.result);
        };
        r.onerror = function(evt) {
          if (callback)
            callback();
        };
      } else {
        if (callback)
          callback();
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
        r.onsuccess = function(evt) {
          self._forwardable = evt.target.result;
          if (callback)
            callback(evt.target.result);
        };
        r.onerror = function(evt) {
          if (callback)
            callback();
        };
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
