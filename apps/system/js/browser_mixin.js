'use strict';

(function(window) {
  /**
   * @mixin BrowserMixin
   */

  window.BrowserMixin = {
    reload: function bm_reload() {
      if (this.browser) {
        this.browser.try('reload');
      }
    },

    waitForNextPaint: function bm_waitForNextPaint(callback) {
      if (this.browser) {
        this.browser.try('addNextPaintListener', callback);
      }
    },

    getScreenshot: function bm_getScreenshot(callback, width, height, timeout) {
      if (this.browser) {
        this.browser.try('getScreenshot', callback, width, height, timeout);
      }
    },

    focus: function bm_focus() {
      if (this.browser) {
        this.browser.try('focus');
      }
    },

    blur: function bm_blur() {
      if (this.browser) {
        this.browser.try('blur');
      }
    },

    back: function bm_back() {
      if (this.browser) {
        this.browser.try('goBack');
      }
    },

    forward: function bm_forward() {
      if (this.browser) {
        this.browser.try('goForward');
      }
    },

    _setVisible: function bm__setVisible(visible) {
      if (this.browser) {
        this.browser.try('setVisible', visible);
      }
    },

    canGoBack: function bm_cangoback(callback) {
      if (this.browser) {
        this.browser.try('getCanGoBack', callback);
      }
    },

    canGoForward: function bm_cangoforward(callback) {
      if (this.browser) {
        this.browser.try('getCanGoForward', callback);
      }
    },

    isOOP: function bm_isOOP() {
      return (this.browser_config && this.browser_config.oop);
    }
  };

  AppWindow.addMixin(BrowserMixin);
}(this));
