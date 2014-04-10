/* global define */
define(function(require) {
  'use strict';
  var MockSettingsService = {
    _cachedNavigation: [],
    getLastNavigation: function() {
      var length = this._cachedNavigation.length;
      return this._cachedNavigation[length - 1];
    },
    navigate: function(panelId, options) {
      this._cachedNavigation.push({
        panelId: panelId,
        options: options
      });
    }
  };

  return MockSettingsService;
});
