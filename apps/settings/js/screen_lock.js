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
      var _ = navigator.mozL10n.get;

      // reflect UI changes on screenLock-Desc
      this._mozSettings.addObserver('lockscreen.enabled',
        function onLockscreenEnabledChange(event) {
          var enable = event.settingValue;
          this.screenLockDesc.textContent =
            enable ? _('enabled') : _('disabled');
          this.screenLockDesc.dataset.l10nId = enable ? 'enabled' : 'disabled';
      }.bind(this));
    }
  };

  exports.ScreenLock = ScreenLock;
}(window));
