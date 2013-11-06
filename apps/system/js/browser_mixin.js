'use strict';

(function(window) {
  window.BrowserMixin = {
    reload: function bm_reload() {
      if (this.browser.element) {
        this.browser.element.reload();
      }
    },

    focus: function bm_focus() {
      if (this.browser.element) {
        this.browser.element.focus();
      }
    },

    blur: function bm_blur() {
      if (this.browser.element) {
        this.browser.element.focus();
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

    canGoBack: function bm_cangoback(success, error) {
      if (this.browser.element) {
        var r = this.browser.element.getCanGoBack();
        r.onsuccess = function(evt) {
          success(evt.target.result);
        };
      } else {
        if (error)
          error();
      }
    },

    canGoForward: function bm_cangoforward(success, error) {
      if (this.browser.element) {
        var r = this.browser.element.getCanGoForward();
        r.onsuccess = function(evt) {
          success(evt.target.result);
        };
      } else {
        if (error)
          error();
      }
    }
  };

  AppWindow.addMixin(BrowserMixin);
}(this));
