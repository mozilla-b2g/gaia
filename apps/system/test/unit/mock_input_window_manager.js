'use strict';

(function(exports) {
  var MockInputWindowManager = function() {
    this._inputWindows = {};

    return this;
  };

  MockInputWindowManager.prototype = {
    start: function miwm_start() {
    },

    stop: function miwm_stop() {
    },

    removeKeyboard: function miwm_removeKeyboard() {
    },

    getHeight: function miwm_getHeight() {
    },

    hasActiveKeyboard: function miwm_hasActiveKeyboard() {
    },

    preloadInputWindow: function miwm_preloadInputWindow() {
    },

    showInputWindow: function miwm_showInputWindow() {
    },

    hideInputWindow: function miwm_hideInputWindow() {
    },

    hideInputWindowImmediately: function miwm_hideInputWindowImmediately() {
    },

    getLoadedManifestURLs: function miwm_getLoadedManifestURLs() {
      return [];
    }

  };

  exports.MockInputWindowManager = MockInputWindowManager;
}(window));
