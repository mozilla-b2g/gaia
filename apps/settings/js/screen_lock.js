require([
  'shared/settings_listener'
], function(exports, SettingsListener) {
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
      // reflect UI changes on screenLock-Desc
      SettingsListener.observe('lockscreen.enabled', false,
        function onLockscreenEnabledChange(enabled) {
          this.screenLockDesc.setAttribute('data-l10n-id',
                                           enabled ? 'enabled' : 'disabled');
      }.bind(this));
    }
  };

  navigator.mozL10n.once(ScreenLock.init.bind(ScreenLock));
}.bind(null, window));
