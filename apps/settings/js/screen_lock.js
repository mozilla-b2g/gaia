/* global SettingsListener */
(function(exports) {
  'use strict';

  var ScreenLock = {
    init: function() {
      this._mozSettings = window.navigator.mozSettings;
      if (!this._mozSettings) {
        return;
      }

      this._setAllElements();
      this._watchChanges();
    },

    _setAllElements: function() {
      var elementsId = [
        'screenLock-desc'
      ];
      var toCamelCase = function toCamelCase(str) {
        return str.replace(/\-(.)/g, function(str, p1) {
          return p1.toUpperCase();
        });
      };
      elementsId.forEach(function loopElement(name) {
        this[toCamelCase(name)] =
          document.getElementById(name);
      }, this);
    },

    _watchChanges: function() {
      var localize = navigator.mozL10n.localize;

      // reflect UI changes on screenLock-Desc
      SettingsListener.observe('lockscreen.enabled', false,
        function onLockscreenEnabledChange(enabled) {
          this.screenLockDesc.dataset.l10nId = enabled ? 'enabled' : 'disabled';
          localize(this.screenLockDesc, enabled ? 'enabled' : 'disabled');
      }.bind(this));
    }
  };

  exports.ScreenLock = ScreenLock;
}(window));
