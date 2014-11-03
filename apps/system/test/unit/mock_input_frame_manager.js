'use strict';

(function(exports) {
  var MockInputFrameManager = function() {
    this._inputWindows = {};

    return this;
  };

  MockInputFrameManager.prototype = {
    start: function mifm_start() {
    },

    stop: function mifm_stop() {
    },

    removeKeyboard: function mifm_removeKeyboard() {
    },

    getHeight: function mifm_getHeight() {
    },

    hasActiveKeyboard: function mifm_hasActiveKeyboard() {
    },

    preloadInputWindow: function mifm_preloadInputWindow() {
    },

    showInputWindow: function mifm_showInputWindow() {
    },

    hideInputWindow: function mifm_hideInputWindow() {
    },

    hideInputWindowImmediately: function mifm_hideInputWindowImmediately() {
    },

    getLoadedManifestURLs: function mifm_getLoadedManifestURLs() {
      return [];
    }

  };

  exports.MockInputFrameManager = MockInputFrameManager;
}(window));
